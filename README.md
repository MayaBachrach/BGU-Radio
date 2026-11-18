# BGU Radio

Three independent radio website implementations live on one `main` branch. There is **one shared content layer** and **no shared presentation code** among the three websites.

| Site | Source | Live preview |
| --- | --- | --- |
| Soft Signal | `sites/soft-signal/` | https://mayabachrach.github.io/BGU-Radio/soft-signal/ |
| After Hours | `sites/after-hours/` | https://mayabachrach.github.io/BGU-Radio/after-hours/ |
| Pixel Frequency | `sites/pixel-frequency/` | https://mayabachrach.github.io/BGU-Radio/pixel-frequency/ |

**Shared data:** `data/station.json` (station information, artwork, photos, live stream), `data/library.json` (collected programs and episodes), and `data/sites.json` (preview URLs and images). All three websites fetch the same `data/station.json` and `data/library.json`. Websites own their own HTML, CSS, JavaScript, player, routing, transitions, animations, fonts and local assets. Do not create shared UI modules.

**Collection and deployment:** `python tools/catalog.py` refreshes `data/library.json` and regenerates `data/curation.json`, and `python tools/architecture_checks.py` validates the source boundaries. A push to `main` deploys all three previews to their existing URLs, preserving the old `/main/` player and extension download. The existing design branches remain available as historic snapshots; they are no longer deploy inputs. Details and the dependency audit: [docs/architecture.md](docs/architecture.md).

See [shared editorial curation](docs/curation.md) for override instructions and the data contract for the three sites.
