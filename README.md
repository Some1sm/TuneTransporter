# TuneTransporter - Chrome Extension

TuneTransporter is a Chrome extension that automatically redirects music links between Spotify and YouTube Music, saving you time and clicks.

## Features

*   **Bidirectional Redirection:**
    *   Redirects Spotify track, album, and artist pages to YouTube Music search results.
    *   Redirects YouTube Music song, playlist/album, and channel/artist pages to Spotify search results.
*   **Automatic:** Redirection happens automatically when you open a supported link (if enabled via the popup).
*   **Popup Toggles:** Includes a popup accessed via the extension icon with:
    *   Separate toggles (with icons) to enable/disable Spotify -> YTM and YTM -> Spotify redirection independently.
    *   Settings are saved, remembering your preferences.
*   **Robust Extraction:** Uses multiple methods (page title parsing with fallback to specific DOM elements for Spotify, targeted selectors for YTM) to reliably identify the music information needed for redirection.
*   **Visual Feedback:** Displays a temporary notification on the page if redirection fails (e.g., due to missing song info or timeouts), making it clear why it didn't work.
*   **Search-Based:** Redirects to the search results page on the target service, ensuring broad compatibility.

## Installation

1.  **Download:** Clone this repository or download it as a ZIP file.
2.  **Unzip:** If you downloaded a ZIP file, extract it to a folder on your computer.
3.  **Open Chrome Extensions:** In the Chrome browser, navigate to `chrome://extensions/`.
4.  **Enable Developer Mode:** In the top right corner, toggle the "Developer mode" switch ON.
5.  **Load Unpacked:** Click the "Load unpacked" button (usually top left).
6.  **Select Folder:** Browse to the folder where you extracted the extension files (the one containing `manifest.json`) and select it.

## Usage

1.  **Enable Redirection:** Click the TuneTransporter icon in your Chrome toolbar. Use the toggles in the popup to enable the redirection direction(s) you want (both are enabled by default).
2.  **Navigate:** Simply open a supported Spotify or YouTube Music link in your browser.
    *   **Spotify -> YouTube Music:** Visiting a Spotify track, album, or artist page will automatically redirect you to a YouTube Music search for that item.
    *   **YouTube Music -> Spotify:** Visiting a YouTube Music song (`watch?v=...`), playlist/album (`playlist?list=...`), or channel/artist (`channel/...`) page will automatically redirect you to a Spotify search for that item.
3.  **Control:** Use the popup toggles anytime to turn specific redirection directions on or off.

## Supported Pages

*   **Spotify:**
    *   Track pages (`https://open.spotify.com/track/...`)
    *   Album pages (`https://open.spotify.com/album/...`)
    *   Artist pages (`https://open.spotify.com/artist/...`)
*   **YouTube Music:**
    *   Song/Watch pages (`https://music.youtube.com/watch?v=...`)
    *   Playlist/Album pages (`https://music.youtube.com/playlist?list=...`)
    *   Channel/Artist pages (`https://music.youtube.com/channel/...`)

## Troubleshooting

*   **No Redirection Occurs:**
    *   **Check Toggles:** Ensure the relevant redirection direction is enabled in the extension's popup.
    *   **Supported URL:** Verify you are on one of the supported page types listed above.
    *   **Extension Enabled:** Check `chrome://extensions/` to ensure TuneTransporter is enabled. Reload it if necessary.
*   **Feedback Message Appears:** If you see a notification like "TuneTransporter: Could not find track/album info..." or "...Timed out...", it means the extension couldn't reliably extract the necessary details from the page to perform the redirect. This might happen if the website structure changed significantly or on certain edge-case pages.
*   **Console Errors:** Check the browser's developer console (F12) on the page where redirection should occur, and the extension's service worker console (`chrome://extensions/` -> TuneTransporter -> "Service worker") for detailed error messages.

## Permissions

*   **`activeTab`:** Allows the extension (when its content script runs on a matching page) to potentially access properties of the tab it's running in. Used minimally. *(Note: While listed, its direct use might be limited now that content scripts handle redirection directly based on URL matches).*
*   **`storage`:** Used to save the state of the popup toggle switches (enabled/disabled) across browser sessions.

## Limitations

*   **Search-Based Redirection:** Redirects to the search results page of the target service, not necessarily the exact matching item (though often the first result is correct). Direct matching is significantly more complex.
*   **Website Changes:** Major redesigns of Spotify or YouTube Music websites could potentially break the data extraction logic, requiring updates to the extension's selectors.

## Contributing

Contributions are welcome! Please fork the repository, create a feature or bugfix branch, make your changes, and submit a pull request with a clear description.

## License

This project is licensed under the MIT License.