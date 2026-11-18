"""Regression tests for the editorial rules and the published data contract."""
import json
import unittest
from pathlib import Path

from curate import curate, recording_keys


def episode(name, **fields):
    return {
        "title": name.replace("-", " "),
        "source": f"https://catalog.example/{name}",
        "kind": "episode",
        "series": "Studio One",
        "artwork": "https://images.example/studio-one.jpg",
        "audio": f"https://media.example/{name}.mp3",
        "date": "2020-03-01",
        **fields,
    }


class EditorialRules(unittest.TestCase):
    def setUp(self):
        self.one = episode("first-recorded-interview")
        self.two = episode("second-recorded-interview")
        self.other = episode("campus-music-special", series="Campus Music",
                             artwork="https://images.example/campus-music.jpg",
                             date="Mon, 02 Feb 2026 08:00:00 GMT")
        self.duplicate = episode("cross-posted-recording", audio=self.one["audio"])
        self.title_duplicate = episode("duplicate-title", title="First recorded interview!")
        self.unplayable = episode("empty-record", audio=None, embed="https://open.spotify.com/embed/show/123")
        self.generic_art = episode("no-real-art", series="Generic",
                                   artwork="https://images.example/image_user/generic.jpg")
        self.rows = [self.one, self.two, self.other, self.duplicate, self.title_duplicate,
                     self.unplayable, self.generic_art]

    def test_reordered_input_and_diversity(self):
        result = curate(self.rows, {}, {})
        self.assertEqual(result, curate(list(reversed(self.rows)), {}, {}))
        self.assertEqual(len(result["programs"]), 2)
        self.assertEqual(len(result["episodes"]), 4)
        index = {row["source"]: row for row in self.rows}
        featured_series = [index[row["source"]]["series"] for row in result["episodes"]]
        self.assertEqual(len(set(featured_series[:3])), 3)
        self.assertNotIn(self.unplayable["source"], [row["source"] for row in result["episodes"]])

    def test_manual_order_exclusions_duplicates_and_stale_ids(self):
        warnings = []
        result = curate(self.rows, {}, {
            "pinnedPrograms": ["studio one", "campus music", "missing"],
            "programOrder": ["campus music"],
            "pinnedEpisodes": [self.other["source"], self.one["source"]],
            "episodeOrder": [self.two["source"], self.duplicate["source"], self.unplayable["source"]],
        }, warnings.append)
        self.assertEqual(result["pinned"]["programs"], ["studio one", "campus music"])
        self.assertEqual([row["id"] for row in result["programs"]], result["pinned"]["programs"])
        self.assertEqual([row["source"] for row in result["episodes"][:3]],
                         [self.other["source"], self.one["source"], self.two["source"]])
        self.assertEqual(result["pinned"]["episodes"], [self.other["source"], self.one["source"]])
        self.assertEqual(len(warnings), 3)
        excluded = curate(self.rows, {}, {"excludedPrograms": ["studio one"],
                                          "pinnedPrograms": ["studio one"],
                                          "pinnedEpisodes": [self.one["source"]]})
        self.assertEqual(excluded["pinned"], {"programs": [], "episodes": []})
        self.assertNotIn(self.one["source"], [row["source"] for row in excluded["episodes"]])

    def test_curated_index_resolves_for_every_site(self):
        data = Path(__file__).resolve().parents[1] / "data"

        def read(name):
            return json.loads((data / name).read_text(encoding="utf-8"))

        library = read("library.json")
        rows = {row["source"]: row for row in library}
        self.assertEqual(len(rows), len(library))
        self.assertGreater(len(rows), 100)
        self.assertTrue(all(row["title"] and row["source"] for row in library))
        result = read("curation.json")
        self.assertEqual(result, curate(library, read("station.json"), read("curation-overrides.json")))
        self.assertGreaterEqual(len(result["programs"]), 3)
        self.assertGreaterEqual(len(result["episodes"]), 12)
        for site in read("sites.json")["sites"]:
            with self.subTest(site=site["id"]):
                for item in result["programs"]:
                    self.assertTrue(rows[item["source"]][item["artworkField"]])
                for item in result["episodes"]:
                    self.assertEqual(rows[item["source"]]["kind"], "episode")
                    self.assertTrue(recording_keys(rows[item["source"]]))
                    if "artworkField" in item:
                        self.assertTrue(rows[item["source"]][item["artworkField"]])


if __name__ == "__main__":
    unittest.main()
