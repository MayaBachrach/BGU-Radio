# BGU Radio architecture migration

## Before migration (verified 2026-11-18)

- Three design branches: `soft-signal`, `after-hours`, and `pixel-frequency`. The main Pages workflow assembled each branch's `index.html` + `edition.css` into matching deployed URL paths.
- All three HTML entry points imported `../main/core.css`, `../main/fonts/fonts.css`, `../main/radio.js`, `../main/station-info.js`, and generated `../main/media-map.js`. In other words their presentation, playback, routing, transitions and fonts were not independent.
- The shared catalogue was `catalog/library.json` (approximately 1.2 MB), assembled from Base44, hearthis.at, Mixcloud, RSS (Pinecast and Anchor), and Spotify artwork by `tools/catalog.py`. The browser loaded deployed `/library.json`.
- `tools/prepare_media.py` cached remote artwork and photos and `tools/preview_checks.py` generated Playwright desktop/mobile preview images and a comparison page. The Pages workflow refreshed the catalogue, committed updates, assembled previews and published GitHub Pages. `extension/` provided a downloadable Chrome player. No npm packages or external database were required for the preview websites; CI installed Python Playwright and Pillow.

## Target source layout

- `data/station.json`: canonical station copy/contact/supporters, gallery photographs, curated homepage program covers, live stream URL and now-playing API URL.
- `data/library.json`: canonical programs, episodes, episode artwork and playable URLs, maintained by the existing collection tool.
- `data/sites.json`: manifest of three permanent preview URLs and their desktop/mobile preview image URLs.
- `sites/<site>/`: fully independent HTML, stylesheets, JavaScript behavior, self-hosted fonts, and site-specific art. A site MUST NOT import another site's CSS, JS, or font files.
- `tools/`: shared build and collection tooling, not imported by a website runtime.

## Migration contract

1. Add canonical data and independent site source directories to main without touching the live workflow or deleting branches.
2. Adapt catalogue and media tools to publish the canonical data; update deployment to copy `sites/` from main to the same public URL paths. Retain existing legacy `/main/` preview and downloadable extension during migration.
3. Run targeted architecture/content validation, then smoke-test the three published URL paths, navigation, archive, gallery, artwork and playback state. Continue producing comparison previews.

Existing design branches are historical references and must not be deleted. Existing top-level source files (`content.js`, `station.js`, `index.html`, `radio/`) are legacy sources, not dependencies of the three independent site implementations.
