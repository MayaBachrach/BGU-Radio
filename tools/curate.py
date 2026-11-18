"""Build the shared editorial index from the canonical catalogue, offline."""
import argparse
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

OVERRIDE_KEYS = (
    "pinnedPrograms", "pinnedEpisodes", "excludedPrograms", "programOrder", "episodeOrder"
)
EPISODE_LIMIT = 48


def normalized(value):
    return " ".join(re.findall(r"[^\W_]+", unicodedata.normalize("NFKC", value).casefold()))


def url(value):
    if isinstance(value, str):
        try:
            parts = urlsplit(value)
            if parts.scheme in {"http", "https"} and parts.hostname:
                return parts
        except ValueError:
            pass
    return None


def url_key(parts):
    return parts.hostname.removeprefix("www."), parts.path.rstrip("/")


def recording_keys(row):
    keys = set()
    audio = url(row.get("audio"))
    if audio and audio.path.strip("/"):
        host, path = url_key(audio)
        query = "" if host in {"hearthis.app", "hearthis.at"} else audio.query
        keys.add((host, path, query))
    embed = url(row.get("embed"))
    if embed:
        host, path = url_key(embed)
        if host == "mixcloud.com" and path == "/widget/iframe":
            feed = parse_qs(embed.query).get("feed", [""])[0]
            track = url(feed) if not feed.startswith("/") else url("https://mixcloud.com" + feed)
            if track and url_key(track)[0] == host and len(track.path.strip("/").split("/")) == 2:
                keys.add(url_key(track) + ("",))
        elif host == "open.spotify.com" and re.fullmatch(r"/embed/episode/[A-Za-z0-9]+", path):
            keys.add((host, path, ""))
    return keys


def has_show_player(row):
    embed = url(row.get("embed"))
    return (row.get("kind") == "series" and embed and embed.hostname == "open.spotify.com"
            and re.fullmatch(r"/embed/show/[A-Za-z0-9]+", embed.path))


def published_day(value):
    if not isinstance(value, str):
        return None
    try:
        try:
            date = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            date = parsedate_to_datetime(value)
        if date.tzinfo:
            date = date.astimezone(timezone.utc)
        if 2000 <= date.year < 2100:
            return date.date().toordinal()
    except (ValueError, OverflowError):
        pass
    return None


def art_key(value):
    parts = url(value)
    if parts and parts.path.strip("/"):
        host, path = url_key(parts)
        if not re.search(r"(?:placeholder|default[-_]?artwork|/image_user/|/profile/)", path, re.I):
            return host, path
    return None


def override_lists(config, warn):
    if not isinstance(config, dict):
        raise ValueError("Curation overrides must be a JSON object")
    for key in sorted(config.keys() - set(OVERRIDE_KEYS)):
        warn(f"Unknown override field: {key}")
    result = {}
    for key in OVERRIDE_KEYS:
        values = config.get(key, [])
        if not isinstance(values, list) or any(not isinstance(v, str) or not v.strip() for v in values):
            raise ValueError(f"{key} must be an array of non-empty strings")
        result[key] = list(dict.fromkeys(values))
    return result


def ordered_overrides(key, lists, eligible, warn):
    result = []
    for value in lists[key]:
        if value in eligible:
            result.append(value)
        else:
            warn(f"{key}: unknown or ineligible ID {value!r}")
    return result


def curate(library, station, config, warn=lambda message: None):
    overrides = override_lists(config, warn)
    rows = sorted(library, key=lambda row: row["source"])
    if len({row["source"] for row in rows}) != len(rows):
        raise ValueError("Catalogue sources must uniquely identify records")
    groups = defaultdict(list)
    for row in rows:
        series = row.get("series") or (row["title"] if row.get("kind") == "series" else "")
        if normalized(series):
            groups[normalized(series)].append(row)
    excluded = set(ordered_overrides("excludedPrograms", overrides, groups, warn))
    membership = {row["source"]: key for key, members in groups.items() for row in members}

    generic_art = {art_key(value) for _, value in station.get("gallery", [])}
    generic_art.update(art_key(value) for _, value in station.get("supporters", []))
    art_owners = defaultdict(set)
    for key, members in groups.items():
        for row in members:
            for field in ("artwork", "show_artwork"):
                image = art_key(row.get(field))
                if image:
                    art_owners[image].add(key)
    generic_art.update(image for image, owners in art_owners.items() if len(owners) > 1)
    generic_art.add(None)

    media = {row["source"]: recording_keys(row) for row in rows if row.get("kind") == "episode"}
    dates = {row["source"]: published_day(row.get("date")) for row in rows if media.get(row["source"])}
    dated = sorted(set(dates.values()) - {None})
    # A single anomalously late date cannot shift every other recording into an older tier.
    anchor = dated[-2] if len(dated) > 1 and dated[-1] - dated[-2] > 365 else (dated[-1] if dated else 0)

    def quality(row):
        fields = sum(bool(row.get(field)) for field in ("host", "production", "editor"))
        description = (row.get("description") or "").strip()
        return min(len(description) // 40, 4) + fields

    def freshness(source):
        day = dates.get(source)
        if day is None or day > anchor:
            return 0
        return 3 if anchor - day <= 90 else 2 if anchor - day <= 365 else 1

    programs = {}
    program_scores = {}
    for key, members in groups.items():
        if key in excluded:
            continue
        covers = []
        for row in members:
            for field in ("show_artwork", "artwork"):
                image = art_key(row.get(field))
                if image not in generic_art:
                    priority = 2 if row.get("kind") == "series" else int(field == "show_artwork")
                    covers.append((priority, quality(row), row["source"], field))
        playable = [row for row in members if media.get(row["source"])]
        if not covers or not (playable or any(map(has_show_player, members))):
            continue
        cover_priority, _, source, field = min(covers, key=lambda item: (-item[0], -item[1], item[2], item[3] != "show_artwork"))
        programs[key] = {"id": key, "source": source, "artworkField": field}
        unique_titles = {normalized(row["title"]) for row in playable}
        program_scores[key] = (4 * cover_priority + min(len(unique_titles), 6) * 2
                               + max(quality(row) for row in members)
                               + max(freshness(row["source"]) for row in members))

    episodes = {row["source"]: row for row in rows
                if media.get(row["source"]) and membership.get(row["source"]) not in excluded}

    pinned_programs = ordered_overrides("pinnedPrograms", overrides, programs, warn)
    program_order = ordered_overrides("programOrder", overrides, programs, warn)
    program_ids = list(dict.fromkeys(pinned_programs + program_order
                                    + sorted(programs, key=lambda key: (-program_scores[key], key))))
    pinned_episodes = ordered_overrides("pinnedEpisodes", overrides, episodes, warn)
    episode_order = ordered_overrides("episodeOrder", overrides, episodes, warn)

    def episode_score(row):
        has_art = art_key(row.get("artwork")) not in generic_art
        return 4 * has_art + 2 * quality(row) + freshness(row["source"])

    ranked_sources = sorted(episodes, key=lambda source: (-episode_score(episodes[source]), source))
    candidates = list(dict.fromkeys(pinned_episodes + episode_order + ranked_sources))

    # Group duplicates before selecting representatives so overlapping keys are transitive.
    parents = {source: source for source in candidates}
    owners = {}

    def representative(source):
        while parents[source] != source:
            parents[source] = parents[parents[source]]
            source = parents[source]
        return source

    for source in candidates:
        title = normalized(episodes[source]["title"])
        keys = [("recording", *key) for key in sorted(media[source])]
        if title:
            group = membership.get(source)
            # Short, generic titles such as "Episode 1" only match within a known series.
            if len(title.split()) >= 3 and len(title) >= 12:
                keys.append(("title", title))
            elif group:
                keys.append(("series-title", group, title))
        for key in keys:
            other = owners.setdefault(key, source)
            parents[representative(source)] = representative(other)

    unique = []
    seen = set()
    manual = set(pinned_episodes + episode_order)
    for source in candidates:
        key = representative(source)
        if key in seen:
            if source in manual:
                warn(f"Episode override skipped as a duplicate: {source!r}")
            continue
        seen.add(key)
        unique.append(source)

    def diversity_group(source):
        if source in membership:
            return membership[source]
        title = episodes[source]["title"]
        prefix = re.split(r"\s*(?:\||\s[-–—]\s|#\s*\d+|\b(?:episode|פרק|תכנית|תוכנית)\s+\d+)", title,
                          maxsplit=1, flags=re.I)[0]
        return normalized(prefix) or normalized(title) or source

    # Round-robin by program/recurring title prefix, preserving quality order within each round.
    counts = Counter(diversity_group(source) for source in unique if source in manual)
    automatic = []
    for source in unique:
        if source not in manual:
            group = diversity_group(source)
            automatic.append((counts[group], source))
            counts[group] += 1
    episode_ids = [source for source in unique if source in manual]
    episode_ids += [source for _, source in sorted(automatic, key=lambda entry: entry[0])]
    episode_ids = episode_ids[:max(EPISODE_LIMIT, len(manual & set(unique)))]

    return {
        "schemaVersion": 1,
        "programs": [programs[key] for key in program_ids],
        "episodes": [
            {"source": source, "artworkField": "artwork"}
            if art_key(episodes[source].get("artwork")) not in generic_art else {"source": source}
            for source in episode_ids
        ],
        "pinned": {
            "programs": pinned_programs,
            "episodes": [source for source in pinned_episodes if source in episode_ids],
        },
    }


def generate(folder, check=False):
    def read(name):
        return json.loads((folder / name).read_text(encoding="utf-8"))

    index = curate(read("library.json"), read("station.json"), read("curation-overrides.json"),
                   lambda message: print(f"Curation warning: {message}", file=sys.stderr))
    output = json.dumps(index, ensure_ascii=False, indent=2) + "\n"
    target = folder / "curation.json"
    if check:
        if not target.exists() or target.read_bytes() != output.encode("utf-8"):
            raise SystemExit("Curation is stale. Run python tools/curate.py.")
    else:
        target.write_bytes(output.encode("utf-8"))
    print(f"Curation: {len(index['programs'])} programs, {len(index['episodes'])} episodes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the committed index differs")
    args = parser.parse_args()
    generate(Path(__file__).resolve().parents[1] / "data", check=args.check)
