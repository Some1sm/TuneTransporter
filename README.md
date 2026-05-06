# TuneTransporter

A Chrome extension that automatically redirects music links between Spotify and YouTube Music — and navigates directly to the matching result.

## Features

- **Bidirectional Automatic Redirection**
  - **Spotify → YouTube Music:** Redirects track, album, and artist pages to a filtered YTM search.
  - **YouTube Music → Spotify:** Redirects watch, playlist/album, and channel/artist pages to a filtered Spotify search.

- **Smart Search Filtering**
  - Spotify tracks redirect to YTM with the **Songs** filter pre-applied.
  - Spotify albums redirect with the **Albums** filter.
  - Spotify artists redirect with the **Artists** filter.
  - YTM pages redirect to Spotify with the equivalent type filter (`/tracks`, `/albums`, `/artists`).

- **Auto-Navigate to First Result**
  - After landing on a search page, the extension automatically clicks the top result — taking you directly to the song, album, or artist page instead of leaving you on search results.
  - Works on both YTM and Spotify search pages.
  - Includes a no-redirect flag to prevent infinite loops between the two services.

- **Robust Extraction**
  - **Spotify:** Dual extraction strategy — tries parsing `document.title` first (fastest), then falls back to DOM queries using `data-testid` attributes.
  - **YouTube Music:** Uses CSS selectors for playlist/album/artist headers and a `MutationObserver` for dynamically loaded watch pages.
  - **Retry mechanism:** Handles SPA dynamic loading with up to 15 retries (7.5s window) on Spotify and 20 retries (10s window) for auto-click.

- **YTM Watch Page Fallback**
  - If primary extraction fails on a YTM watch page, the extension redirects through `www.youtube.com` to extract the video title and channel name as a fallback.

- **Popup Controls**
  - Independent toggles to enable/disable each redirection direction.
  - Settings persist across browser sessions.

## Supported Pages

| Service | Page Type | URL Pattern |
|---|---|---|
| **Spotify** | Track | `open.spotify.com/track/*` |
| **Spotify** | Album | `open.spotify.com/album/*` |
| **Spotify** | Artist | `open.spotify.com/artist/*` |
| **YouTube Music** | Song | `music.youtube.com/watch?v=*` |
| **YouTube Music** | Playlist/Album | `music.youtube.com/playlist?list=*` |
| **YouTube Music** | Artist | `music.youtube.com/channel/*` |

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the folder containing `manifest.json`.

## Usage

1. Click the TuneTransporter icon and enable the direction(s) you want (both enabled by default).
2. Navigate to any supported Spotify or YouTube Music page.
3. You'll be automatically redirected to the matching result on the other service.

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Saves toggle states and passes signals between content scripts |
| `host_permissions` | Allows content scripts to run on Spotify, YouTube Music, and YouTube |

## Limitations

- Redirection is search-based — it navigates to the best match, not a guaranteed exact match.
- The YTM fallback uses video title and channel name from YouTube, which may not always match the actual artist.
- Major website redesigns could break DOM selectors, requiring extension updates.

## Contributing

Contributions welcome! Fork the repo, create a branch, and submit a pull request.

## License

MIT License.