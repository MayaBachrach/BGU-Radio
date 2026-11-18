# Shared editorial curation

Run `python tools/curate.py` from the repository root to update selections against the current catalogue. It runs offline with the Python standard library. `python tools/catalog.py` refreshes the catalogue and regenerates the same index. Pages publishes both files under `data/`.

## Editing selections

Edit the arrays in [`data/curation-overrides.json`](../data/curation-overrides.json), then regenerate and commit the configuration and index together.

| Field | Value |
| --- | --- |
| `pinnedPrograms` | Program IDs copied from `curation.json`, in the intended order |
| `pinnedEpisodes` | Exact catalogue `source` URLs, in the intended order |
| `excludedPrograms` | Program IDs to suppress along with their explicitly associated episodes |
| `programOrder` | Program IDs to place immediately after pins |
| `episodeOrder` | Episode source URLs to place immediately after pins |

For each list, the first occurrence wins. Exclusion takes priority over a pin. Pins and then order overrides choose the representative when multiple eligible catalogue records point to the same recording. A missing, excluded, ineligible or duplicate override produces a warning and the generator continues. Invalid JSON or a field with the wrong type fails generation so a malformed edit cannot silently replace the selections.

## Automatic eligibility and rank

Program identities use explicit catalogue series names, normalized with Unicode NFKC, case folding and punctuation-to-space conversion. Case and punctuation variants are grouped together. Standalone recordings remain eligible as episodes. A program needs a non-generic image already present in the canonical metadata and either a playable episode or a recognized Spotify show player. Station imagery, profile pictures, placeholders and images shared by different series are skipped as covers. The cover reference prefers dedicated show metadata.

Program score combines cover provenance (up to eight points), the number of distinct playable episode titles (up to twelve), member metadata (up to seven) and dated activity (up to three). Episode score combines program-specific or episode artwork (four), description and credit fields (up to fourteen), and dated activity (up to three). Episode eligibility requires a catalogue audio URL or a recognized recording-level embed. A Spotify show embed provides program access. Media and artwork eligibility use metadata and URL shape offline.

The curator compares parseable release dates to the most recent usable day in the catalogue. The tiers are the past 90 days, the past year, and older dates. A lone date more than a year beyond the next newest day is ignored for recency. Undated and older entries remain eligible. Equal scores resolve by program ID or episode source. The generator has no wall-clock dependency.

Recordings with a shared playback identity or a sufficiently descriptive exact normalized title compete for one slot. Short titles match only within the same known series. Within the automatic episode list, one entry per explicit series or recurring title prefix gets a first pass before that group gets another slot. All eligible programs and up to 48 distinct episodes are emitted, with room for additional manual placements if there are more than 48.

## Website contract

From Soft Signal, After Hours or Pixel Frequency, fetch `../data/curation.json` and `../data/library.json`. The index uses `schemaVersion: 1`.

- `programs` is an ordered array of `{id, source, artworkField}`. Look up the row by its exact `source`. Use `row.series || row.title` for the display name and `row[artworkField]` for cover art.
- `episodes` is an ordered array of `{source, artworkField?}`. Resolve the row by its exact `source` and use its existing `audio` or recognized episode `embed` for playback. If `artworkField` is absent, the curator did not select supplied artwork for that episode.
- `pinned.programs` lists the program IDs retained from editorial pins. `pinned.episodes` lists retained episode source URLs. Both are already reflected in their respective ranked arrays.

Build a source-to-record lookup once, skip missing lookups if the two files were cached at different revisions, and preserve array order when taking the number of selections suited to the layout. Each website owns presentation and its existing playback handling.

Verify with `python tools/curate.py --check` and `python -m unittest discover -s tools -p test_curate.py`.
