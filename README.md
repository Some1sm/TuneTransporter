# TuneTransporter - Chrome Extension

TuneTransporter is a Chrome extension that automatically redirects music links between Spotify and YouTube Music, saving you time and clicks.

## Features

*   **Bidirectional Redirection:**
    *   Redirects Spotify track links (`https://open.spotify.com/track/...`) to the YouTube Music website's search results.
    *   Redirects YouTube Music song/watch links (`https://music.youtube.com/watch?v=...`) to Spotify's search results.
*   **Automatic:** Redirection happens automatically when you open a supported link. No interaction with the extension icon is required for the core redirection functionality.
*   **Toggle Switches:** Includes a popup with two toggle switches:
    *   One to enable/disable Spotify -> YouTube Music redirection.
    *   One to enable/disable YouTube Music -> Spotify redirection.
    *   Settings are saved across browser sessions, so your preferences are remembered.
*   **Website-Based Redirection:** Redirects to the *website* versions of YouTube Music and Spotify, ensuring broad compatibility and reliable search functionality.
*   **Robust Error Handling:** Includes checks to prevent redirection on incorrect page types and displays user-friendly error messages if song information cannot be extracted.
*   **Efficient and Fast:** Uses `MutationObserver` for fast and reliable detection of song information on YouTube Music player pages, minimizing performance impact and ensuring redirection happens as soon as possible.

## Installation

1.  **Download:** Clone this repository or download it as a ZIP file.
2.  **Unzip:** If you downloaded a ZIP file, extract it to a folder on your computer.
3.  **Open Chrome Extensions:** In the Chrome browser, navigate to `chrome://extensions/`.
4.  **Enable Developer Mode:** In the top right corner of the `chrome://extensions/` page, toggle the "Developer mode" switch to the "on" position.
5.  **Load Unpacked:** Click the "Load unpacked" button (usually located in the top left corner).
6.  **Select the Extension Folder:** Browse to the folder where you extracted the extension files (the folder containing the `manifest.json` file) and select it.

## Usage

1.  **Default Behavior:** By default, both redirection directions (Spotify -> YTM and YTM -> Spotify) are enabled.
2.  **Spotify to YouTube Music:** Open any Spotify *track* link (e.g., `https://open.spotify.com/track/12345`). The extension will automatically redirect you to the YouTube Music website, performing a search for the song and artist.
3.  **YouTube Music to Spotify:** Open a YouTube Music *song* page (e.g., `https://music.youtube.com/watch?v=...`). The extension will automatically redirect you to the Spotify website, performing a search for the song and artist.
4.  **Toggle Redirection On/Off:**
    *   Click the TuneTransporter extension icon in the Chrome toolbar to open the popup.
    *   Use the "Enable Spotify -> YTM" and "Enable YTM -> Spotify" checkboxes to control which redirection directions are active. Your settings will be saved automatically and persist across browser sessions.

## Troubleshooting

*   **No Redirection Occurs:**
    *   **Check Toggle Switches:** Make sure that the relevant redirection direction is enabled in the extension's popup. Click the extension icon to check.
    *   **Correct URL Format:** Verify that you are on a supported URL.
        *   For Spotify, it *must* be a *track* URL (`https://open.spotify.com/track/...`).
        *   For YouTube Music, it *must* be a *song* URL (`https://music.youtube.com/watch?v=...`).
        *   The extension will *not* redirect from Spotify playlist, album, or artist pages.  It will also not redirect from general YouTube search pages.
    *   **Extension Loaded and Enabled:** Ensure that the TuneTransporter extension is loaded and enabled in `chrome://extensions/`. The extension icon should *not* be greyed out.
    *   **Developer Mode:** If the icon *is* greyed out, double-check that "Developer mode" is enabled in `chrome://extensions/`, and look for any error messages reported there. Reload the extension after fixing any errors.
*   **Alert Message Appears:** If you see an alert saying "Could not find song information...", it means the extension couldn't extract the song title and artist from the page. This could happen if the website structure changes or if you're on an unsupported page type.

## Limitations

*   **Website-Based Search Only:** The extension currently redirects to the *website* versions of YouTube Music and Spotify. Direct redirection to the YouTube Music Progressive Web App (PWA) with search functionality is not supported because the PWA's protocol handler (`youtubemusic://`) does not currently accept search parameters.

## Permissions

*   **`activeTab`:** This permission is required to access the URL of the currently active tab *when the extension is invoked*. In TuneTransporter, invocation happens automatically when a page matching the defined URL patterns (Spotify track pages or YouTube Music watch pages) is loaded. This is a very limited permission and is preferred for privacy reasons, as it only grants access to the tab's URL when necessary.
*   **`storage`:** This permission is used to save the state of the toggle switches (enabled/disabled) in the extension's popup. This allows your preferences for redirection directions to be remembered across browser sessions and restarts.

## Contributing

Contributions to TuneTransporter are welcome! If you find a bug, have a feature request, or would like to contribute code, please follow these steps:

1.  **Fork the Repository:** Create a fork of the repository on GitHub.
2.  **Create a Branch:** Create a new branch for your changes (e.g., `feature/add-new-platform` or `bugfix/fix-redirection-issue`).
3.  **Make Changes:** Make your code changes and commit them with clear, descriptive commit messages.
4.  **Test Thoroughly:** Test your changes to ensure they work as expected and don't introduce any regressions.
5.  **Submit a Pull Request:** Create a pull request from your branch to the main branch of the original repository.  Provide a clear description of your changes and why they are needed.

## License

This project is licensed under the MIT License. 