# Changelog

All notable changes to the "TuneTransporter" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (starting from 1.0.0).

## [1.2.1] - 2025-25-03

### Added

*   **Core Redirection:**
    *   Automatic redirection from Spotify Track pages (`/track/*`) to YouTube Music search.
    *   Automatic redirection from YouTube Music Watch pages (`/watch*`) to Spotify search.
*   **Popup & Settings:**
    *   Extension popup with independent toggles to enable/disable Spotify -> YTM and YTM -> Spotify redirection.
    *   Popup uses SVG icons for Spotify and YTM.
    *   Redirection preferences are saved to local storage and persist across sessions.
*   **Album Support:**
    *   Added redirection from Spotify Album pages (`/album/*`) to YTM search.
    *   Added redirection from YTM Playlist/Album pages (`/playlist*`) to Spotify search.
*   **Artist Support:**
    *   Added redirection from Spotify Artist pages (`/artist/*`) to YTM search.
    *   Added redirection from YTM Channel/Artist pages (`/channel/*`) to Spotify search.
*   **Visual Feedback:**
    *   Implemented a temporary, non-intrusive notification displayed on the page if automatic redirection fails (e.g., due to inability to extract song info or timeouts).

### Changed

*   **Spotify Extraction:** Improved robustness of data extraction from Spotify pages. Now uses `document.title` parsing as Plan A, with a fallback (Plan B) to querying specific DOM elements via more stable `data-testid` attributes (`entityTitle`, `creator-link`).
*   **YTM Extraction:** Refined CSS selectors for extracting data from YTM pages (Watch, Playlist/Album, Artist headers) for potentially better accuracy and resilience.
*   **Popup Styling:** Moved inline CSS from `popup.html` to a separate `popup.css` file.

### Fixed

*   **Initial Load State:** Resolved an issue where redirection toggles could be incorrectly treated as 'disabled' immediately after extension reload due to storage timing. Content scripts now correctly interpret the initial `undefined` state as 'enabled' (default).