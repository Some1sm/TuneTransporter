# Changelog

## [1.4.3] - 2025-03-30 

### Added

*   **Automatic First Result Selection on Search Pages:**
    *   **Spotify:** When redirected to a Spotify search page (`/search/...`), the extension now attempts to automatically navigate to the first relevant result.
        *   Detects if the search page is specifically showing tracks, albums, or artists based on the URL (`/search/.../tracks`, `/search/.../albums`, `/search/.../artists`).
        *   Uses polling (`setInterval`) to wait for the results to load.
        *   Selects the appropriate first result link (`div[data-testid="track-list"]... a[href^="/track/"]` for tracks, `div[data-testid="search-category-card-0"]... a[href^="/album/"]` for albums, `div[data-testid="search-category-card-0"]... a[href^="/artist/"]` for artists).
        *   Navigates directly to the first result's page (`spotify2ytm-content.js`).
        *   Includes a timeout and provides feedback (`showFeedback`) if the first result cannot be found or clicked.
        *   Uses `sessionStorage` (`tuneTransporterRedirected`) to prevent re-running the main script logic after this internal navigation occurs.
    *   **YouTube Music:** When redirected to a YTM search page (`music.youtube.com/search*`), a new content script (`ytm-autoclick-content.js`) attempts to automatically navigate to the most likely intended result.
        *   Uses a `MutationObserver` to efficiently detect when search results appear.
        *   Prioritizes clicking the link for the "Top result" track card (`ytmusic-card-shelf-renderer ... a[href^="watch?v="]`).
        *   If no top track link is found, it looks for and clicks the chevron button (`yt-button-shape[icon-name="yt-sys-icons:chevron_right"] ...`) often associated with the top album/playlist result.
        *   Includes a timeout for the observer.

### Changed

*   **Manifest (`manifest.json`):**
    *   Added a new content script entry for `ytm-autoclick-content.js` targeting `https://music.youtube.com/search*` pages.
    *   Updated `spotify2ytm-content.js` `matches` to exclude `/search/*` as the primary extraction/redirection logic shouldn't run there (auto-selection handles it). *(Self-correction: Reviewing your provided code, it seems `spotify2ytm-content.js` *does* still match `/search/*` to handle the auto-selection logic within that script. Correcting this point.)*
    *   Adjusted `spotify2ytm-content.js` logic to detect `/search/` pages and trigger the auto-selection behavior instead of attempting regular track/album/artist extraction.
*   **Spotify Content Script (`spotify2ytm-content.js`):**
    *   Refactored to include specific logic for handling `/search/` pages, distinguishing between track, album, and artist result views.
    *   Implemented the polling mechanism for finding and navigating to the first result link.