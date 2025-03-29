# TuneTransporter - Chrome Extension

TuneTransporter is a browser extension that seamlessly bridges Spotify and YouTube Music. It automatically redirects music links between the two services and provides tools to easily copy converted links and raw track information.

## Features

*   **Bidirectional Automatic Redirection:**
    *   **Spotify -> YouTube Music:** Automatically redirects Spotify track, album, and artist pages to equivalent search results on YouTube Music.
    *   **YouTube Music -> Spotify:** Automatically redirects YouTube Music song (`watch`), playlist/album (`playlist?list`), and channel/artist (`channel`) pages to equivalent search results on Spotify.
*   **Robust Extraction:** Uses the best available methods to identify music details:
    *   **Spotify:** Tries parsing the page title first, then falls back to querying specific `data-testid` attributes in the DOM for increased reliability.
    *   **YouTube Music:** Uses specific CSS selectors for headers on playlist/album/artist pages and a `MutationObserver` to reliably catch song/artist info on dynamically loaded watch pages.
*   **YTM Watch Page Fallback:** If the primary extraction method fails on a YTM song page (`watch?v=...`), and the YTM->Spotify direction is enabled, the extension will attempt a fallback (redirecting via `www.youtube.com` to extract info). *(This fallback uses the main YTM->Spotify toggle).*
*   **Popup Controls:**
    *   Access the popup via the extension icon in your toolbar.
    *   Independent toggles (with service icons) to enable/disable **Spotify -> YTM** and **YTM -> Spotify** automatic redirection. Settings are saved.
    *   **Copy Converted Link:** Buttons to easily copy a search link for the *other* service based on the page you are currently viewing (Spotify -> YTM link, YTM -> Spotify link).
    *   **Copy Raw Info:** (NEW!) A button to copy the extracted artist and track/album/playlist name as plain text (e.g., "Artist: Queen, Track: Bohemian Rhapsody") to your clipboard. Useful for pasting into searches or documents.
    *   Buttons are enabled/disabled based on whether you are on a supported page.
    *   Provides status feedback within the popup ("Copying...", "Copied!", "Error...", etc.).
*   **Visual Feedback:** Displays a temporary notification overlay on the page if automatic redirection fails (e.g., due to missing info or timeouts).

## Installation


1.  Install from **[Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/tunetransporter/)** .
2.  *Alternatively, for development/temporary installation:*
    *   Download or clone this repository.
    *   If downloaded as ZIP, extract it.
    *   Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
    *   Click "Load Temporary Add-on...".
    *   Browse to the extension's directory and select the `manifest.json` file.
    *   *(Note: Temporary add-ons are removed when Firefox closes).*

## Usage

1.  **Enable Redirection:** Click the TuneTransporter icon in your Firefox toolbar. Use the toggles to enable the automatic redirection direction(s) you want (both are enabled by default).
2.  **Automatic Redirect:** Simply open a supported Spotify or YouTube Music link in your browser. If the relevant toggle is enabled, you'll be automatically redirected to a search on the other service.
3.  **Copy Link / Info:**
    *   Navigate to a supported Spotify or YouTube Music page (track, album, artist, song, playlist, channel).
    *   Click the TuneTransporter icon.
    *   The relevant buttons should be enabled:
        *   Click "Copy YouTube Music Link" (if on Spotify) or "Copy Spotify Link" (if on YTM) to copy a search URL for the other service.
        *   (NEW!) Click "Copy Track/Page Info" to copy the extracted artist and item name as plain text to your clipboard.
    *   The link or text will be copied to your clipboard. Check the status message in the popup for confirmation or errors.

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

## Troubleshooting

*   **No Automatic Redirection:** Check toggles in the popup. Ensure you're on a supported URL. Make sure the extension is enabled (`about:addons`).
*   **Copy Buttons Disabled:** Ensure you are on a supported page. Reload the page and reopen the popup.
*   **Feedback Message Appears:** Automatic redirection failed to extract details. Fallback might trigger for YTM watch pages.
*   **Copying Fails:** Check the popup status for errors. Check console logs for details.
*   **Console Logs:**
    *   **Firefox:** Page (F12), Popup (Right-click icon -> Inspect), Background (`about:debugging#/runtime/this-firefox` -> Inspect). Also check the Browser Console (Ctrl+Shift+J or Cmd+Shift+J).

## Permissions Explained

*   **`storage`:** Saves user toggle preferences locally.
*   **`scripting`:** Allows injecting temporary scripts into pages *only* when "Copy" buttons are clicked in the popup, to extract music data.
*   **`tabs`:** Allows the popup to read the current tab's URL/ID to enable correct buttons and target the right page for `scripting`.
*   **`host_permissions` (`*://open.spotify.com/*`, `*://music.youtube.com/*`, `*://www.youtube.com/*`):** Required for content scripts (automatic redirection) and injected scripts (copying/fallback) to function on these specific music service domains.


## Limitations

*   **Search-Based Redirection/Copying:** Redirects and copied links point to the search results page of the target service, not necessarily the exact matching item (though often the first result is correct). Direct matching is significantly more complex.
*   **YTM Fallback Accuracy:** The fallback mechanism relies on potentially inaccurate data (video title, channel name) from `www.youtube.com` and may lead to poor Spotify search results.
*   **Website Changes:** Major redesigns of Spotify or YouTube Music websites could potentially break the data extraction logic (selectors), requiring updates to the extension.

## Contributing

Contributions are welcome! Please fork the repository, create a feature or bugfix branch, make your changes, and submit a pull request with a clear description.

## License

This project is licensed under the MIT License.