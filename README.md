# TuneTransporter - Chrome Extension

TuneTransporter is a Chrome extension that seamlessly bridges Spotify and YouTube Music. It automatically redirects music links between the two services and provides tools to easily copy converted links.

## Features

*   **Bidirectional Automatic Redirection:**
    *   **Spotify -> YouTube Music:** Automatically redirects Spotify track, album, and artist pages to equivalent search results on YouTube Music.
    *   **YouTube Music -> Spotify:** Automatically redirects YouTube Music song (`watch`), playlist/album (`playlist?list`), and channel/artist (`channel`) pages to equivalent search results on Spotify.
*   **Robust Extraction:** Uses the best available methods to identify music details:
    *   **Spotify:** Tries parsing the page title first, then falls back to querying specific `data-testid` attributes in the DOM for increased reliability.
    *   **YouTube Music:** Uses specific CSS selectors for headers on playlist/album/artist pages and a `MutationObserver` to reliably catch song/artist info on dynamically loaded watch pages.
*   **YTM Watch Page Fallback:** If the primary extraction method fails on a YTM song page (`watch?v=...`), and the YTM->Spotify direction is enabled, the extension will attempt a fallback:
    1.  Redirects briefly to the corresponding `www.youtube.com` video page.
    2.  Attempts to extract the video title and channel name there (less accurate).
    3.  Redirects to a Spotify search using that information.
    *(This fallback uses the main YTM->Spotify toggle).*
*   **Popup Controls:**
    *   Access the popup via the extension icon in your toolbar.
    *   Independent toggles (with service icons) to enable/disable **Spotify -> YTM** and **YTM -> Spotify** automatic redirection.
    *   Settings are saved and persist across browser sessions.
*   **Copy Converted Link:**
    *   Buttons within the popup allow you to easily copy a search link for the *other* service based on the page you are currently viewing.
    *   If you're on a supported Spotify page, the "Copy YouTube Music Link" button will be active.
    *   If you're on a supported YouTube Music page, the "Copy Spotify Link" button will be active.
    *   Uses the same robust extraction methods as the automatic redirection to generate the link.
    *   Provides status feedback within the popup ("Copying...", "Copied!", "Error...", etc.).
*   **Visual Feedback:** Displays a temporary notification overlay on the page if automatic redirection fails (e.g., due to missing song/album/artist info or timeouts), explaining why it didn't work.

## Installation

1.  **Download:** Clone this repository or download it as a ZIP file.
2.  **Unzip:** If you downloaded a ZIP file, extract it to a folder on your computer.
3.  **Open Chrome Extensions:** In the Chrome browser, navigate to `chrome://extensions/`.
4.  **Enable Developer Mode:** In the top right corner, toggle the "Developer mode" switch ON.
5.  **Load Unpacked:** Click the "Load unpacked" button (usually top left).
6.  **Select Folder:** Browse to the folder where you extracted the extension files (the one containing `manifest.json`) and select it.

## Usage

1.  **Enable Redirection:** Click the TuneTransporter icon in your Chrome toolbar. Use the toggles to enable the automatic redirection direction(s) you want (both are enabled by default).
2.  **Automatic Redirect:** Simply open a supported Spotify or YouTube Music link in your browser. If the relevant toggle is enabled, you'll be automatically redirected to a search on the other service.
3.  **Copy Link:**
    *   Navigate to a supported Spotify or YouTube Music page (track, album, artist, song, playlist, channel).
    *   Click the TuneTransporter icon.
    *   The relevant "Copy [Other Service] Link" button should be enabled. Click it.
    *   A search URL for the other service will be copied to your clipboard.

## Supported Pages

*   **For Automatic Redirection & Copying From:**
    *   **Spotify:**
        *   Track pages (`https://open.spotify.com/track/...`)
        *   Album pages (`https://open.spotify.com/album/...`)
        *   Artist pages (`https://open.spotify.com/artist/...`)
    *   **YouTube Music:**
        *   Song/Watch pages (`https://music.youtube.com/watch?v=...`)
        *   Playlist/Album pages (`https://music.youtube.com/playlist?list=...`)
        *   Channel/Artist pages (`https://music.youtube.com/channel/...`)
*   **For Fallback (Intermediate Step):**
    *   Standard YouTube watch pages (`https://www.youtube.com/watch*`) - *The script only runs here if redirected from YTM as part of the fallback process.*

## Troubleshooting

*   **No Automatic Redirection:** Check the relevant toggle in the popup. Ensure you're on a supported URL. Make sure the extension is enabled in `chrome://extensions/`.
*   **Copy Button Disabled:** Ensure you are on a supported Spotify or YouTube Music page (not `www.youtube.com`, `chrome://...`, New Tab Page, etc.). Reload the page and reopen the popup.
*   **Feedback Message Appears:** If you see a notification like "TuneTransporter: Could not find..." or "...Timed out...", the automatic redirection failed to extract necessary details. The fallback might still trigger for YTM watch pages if enabled.
*   **Copying Fails:** If you click copy and get an error message in the popup, check the popup's console (Right-click extension icon -> Inspect popup -> Console) and the main page's console (F12) for errors.
*   **Console Errors:** Check the browser's developer console (F12) on the relevant music page, the popup's console, and the extension's service worker console (`chrome://extensions/` -> TuneTransporter -> "Service worker") for detailed error messages.

## Permissions

*   **`storage`:** Used to save the state of the popup toggle switches across browser sessions.
*   **`scripting`:** Needed by the popup to inject small scripts (`executeScript`) into Spotify/YTM pages to extract data accurately for the "Copy Link" feature.
*   **`tabs`:** Required by the popup to read the URL of the currently active tab (`chrome.tabs.query`) to determine which "Copy Link" button should be enabled.
*   **`host_permissions` (`*://open.spotify.com/*`, `*://music.youtube.com/*`, `*://www.youtube.com/*`):** Grants permission for the extension to run its automatic content scripts and injected scripts (for copying/fallback) on these specific domains.

## Limitations

*   **Search-Based Redirection/Copying:** Redirects and copied links point to the search results page of the target service, not necessarily the exact matching item (though often the first result is correct). Direct matching is significantly more complex.
*   **YTM Fallback Accuracy:** The fallback mechanism relies on potentially inaccurate data (video title, channel name) from `www.youtube.com` and may lead to poor Spotify search results.
*   **Website Changes:** Major redesigns of Spotify or YouTube Music websites could potentially break the data extraction logic (selectors), requiring updates to the extension.

## Contributing

Contributions are welcome! Please fork the repository, create a feature or bugfix branch, make your changes, and submit a pull request with a clear description.

## License

This project is licensed under the MIT License.