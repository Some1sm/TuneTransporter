# Changelog

## [2.0.0] - 2025-05-06

### Changed — Major Simplification

The extension has been stripped down to focus solely on automatic redirection. All playlist migration features have been removed.

### Added

- **YTM Search Filtering:** Redirects now include a `sp` filter parameter to pre-filter results (Songs, Albums, or Artists) based on the source Spotify page type.
- **Auto-Navigate to First Result:** New content scripts (`ytm-autoclick-content.js`, `spotify-autoclick-content.js`) automatically click the first search result on the destination site, navigating directly to the song/album/artist page.
- **No-Redirect Flag:** Prevents infinite redirect loops by setting a `tunetransporterNoRedirect` storage flag before navigating to the final destination page.
- **Autoclick Signal:** Uses `chrome.storage.local` to pass a `tunetransporterAutoclick` timestamp between content scripts (URL hash approach was unreliable due to SPA routers).
- **Spotify Search Auto-Click:** Mirrors YTM auto-click behavior for Spotify search result pages.
- **Developer Guide:** Added `guide.md` with comprehensive documentation of architecture, data flow, and every function.

### Removed

- `spotify-playlist-content.js` — Playlist migration from Spotify.
- `ytm-playlist-content.js` — Playlist migration from YTM.
- `ytm-search-content.js` — YTM search page interaction for migration.
- `ytm-watch-content.js` — YTM watch page interaction for migration.
- `ytm-library-content.js` — YTM library interaction for migration.
- `rules.json` — Declarative net request rules (no longer needed).
- `_metadata/` — Generated ruleset files.
- Copy link / Copy info popup buttons and related extraction logic.
- `scripting` and `tabs` permissions (no longer needed).