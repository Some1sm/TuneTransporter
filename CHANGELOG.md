# Changelog

## [1.3.1] - 2025-29-03

### Added

*   **Copy Converted Link Feature:**
    *   Added "Copy YouTube Music Link" and "Copy Spotify Link" buttons to the extension popup (`popup.html`).
    *   Buttons are enabled only when viewing a supported page on the corresponding service (Spotify or YTM).
    *   Clicking an enabled button extracts track/album/artist information from the current page using injected scripts (`chrome.scripting.executeScript`).
    *   Constructs a search URL for the *target* music service (e.g., clicking "Copy YTM Link" on Spotify generates a YTM search URL).
    *   Copies the generated search URL to the user's clipboard (`navigator.clipboard.writeText`).
    *   Added a status message area (`<p id="statusMessage">`) in the popup to provide feedback ("Copying...", "Copied!", "Error...", "Not on a supported page", etc.) (`popup.js`, `popup.css`).
*   **Copy Raw Info Feature:**
    *   Added a "Copy Track/Page Info" button (`#copyInfoBtn`) to the extension popup (`popup.html`).
    *   Button is enabled only when viewing a supported page on Spotify or YTM.
    *   Clicking the button extracts track/album/artist information using the same injected scripts as the "Copy Link" feature.
    *   Formats the extracted data into a plain text string (e.g., "Artist: Queen, Track: Bohemian Rhapsody" or "Artist: The Beatles").
    *   Copies the formatted text string to the user's clipboard (`navigator.clipboard.writeText`).
    *   Provides feedback in the popup status message area (`popup.js`).
*   **Injectable Extraction Functions:** Defined self-contained `getSpotifyData` and `getYtmData` functions (including internal artist processing logic) within `popup.js` for use with `executeScript`.

### Changed

*   **Manifest (`manifest.json`):**
    *   Added the `"scripting"` permission required for `chrome.scripting.executeScript`.
    *   Added the `"tabs"` permission required by `popup.js` to access the active tab's URL via `chrome.tabs.query`.
    *   Consolidated necessary `host_permissions` (`*://open.spotify.com/*`, `*://music.youtube.com/*`, `*://www.youtube.com/*`) to ensure both content script injection and `executeScript` function correctly.
*   **Popup Logic (`popup.js`):**
    *   Refactored to query the active tab on load to determine URL and enable/disable all copy buttons (`#copyYtmLinkBtn`, `#copySpotifyLinkBtn`, `#copyInfoBtn`) appropriately.
    *   Implemented robust checks for tab query results and potential errors.
    *   Renamed `handleCopyClick` to `handleCopyLinkClick` for clarity.
    *   Added new `handleCopyInfoClick` async function to manage the script injection, data processing, text formatting, and clipboard writing process for the raw info feature.
    *   Updated button enabling logic to handle the state of the new `#copyInfoBtn`.
    *   Duplicated artist processing logic inside injectable functions (`getSpotifyData`, `getYtmData`) as they run in an isolated context.
*   **Artist Processing (`utils.js`, `spotify2ytm-content.js`, `ytm2spotify-content.js`):**
    *   Centralized artist string cleanup logic into a `processArtistString` function in `utils.js`.
    *   Updated content scripts (`spotify2ytm-content.js`, `ytm2spotify-content.js`) to use the shared `processArtistString` function for consistent artist name handling during automatic redirection.
*   **File Encoding:** Ensured `utils.js` and `popup.js` are saved with UTF-8 encoding to handle special characters correctly and prevent Chrome loading errors.

### Fixed

*   **Popup Button State:** Fixed issue where copy buttons were incorrectly disabled due to the popup script's inability to read the active tab's URL (resolved by adding `"tabs"` permission).
*   **Script Execution Error:** Fixed "Cannot access contents of url..." error when trying to copy by ensuring correct host permissions were declared alongside the `"scripting"` permission in the manifest.
*   **Popup Styling:** Fixed oversized Spotify icon by ensuring the `popup-icon` class was correctly applied in `popup.html`. Moved button/status styles from inline HTML to `popup.css`.
*   **Content Script Loading:** Fixed "Could not load file ... It isn't UTF-8 encoded" errors by resaving affected files (`utils.js`, `popup.js`) with UTF-8 encoding.