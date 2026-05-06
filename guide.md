# TuneTransporter — Developer Guide

This document explains every file, function, and component in the extension.

---

## Architecture Overview

TuneTransporter is a Chrome Manifest V3 extension that **automatically redirects** music links between Spotify and YouTube Music, then **navigates directly to the best match**.

### Redirection Flow

```
User visits Spotify/YTM page
        ↓
Content script extracts artist + track/album info (title regex → DOM fallback)
        ↓
Builds a search URL with type filter (e.g. &sp=EgWKAQIIAWgB for Songs)
        ↓
Sets autoclick signal in chrome.storage.local
        ↓
Redirects to filtered search page
        ↓
Autoclick script waits for results to load, then navigates to first result
        ↓
No-redirect flag prevents the destination page from redirecting back
```

### YTM Watch Page Fallback

```
YTM watch page → MutationObserver tries to extract info
        ↓ (if it fails/times out after 10s)
Redirects to www.youtube.com/watch with #tunetransporter-fallback hash
        ↓
yt-fallback-content.js extracts from YouTube page instead
        ↓
Redirects to Spotify search
```

### Storage Signals

| Key | Purpose | Lifetime |
|---|---|---|
| `spotifyEnabled` / `ytmEnabled` | User toggle states | Persistent |
| `tunetransporterAutoclick` | Timestamp signal to trigger auto-click on search pages | Consumed immediately, expires after 30s |
| `tunetransporterNoRedirect` | Timestamp flag to prevent redirect loops at final destination | Consumed immediately, expires after 30s |

---

## Files

### `manifest.json`

Chrome extension manifest (Manifest V3).

| Field | Purpose |
|---|---|
| `manifest_version` | `3` (required for modern Chrome extensions) |
| `name` / `version` / `description` | Extension metadata |
| `icons` | Extension icons at 16/32/48/128px |
| `permissions` → `storage` | Toggle states and inter-script signals via `chrome.storage.local` |
| `host_permissions` | Content script access to Spotify, YouTube Music, and YouTube |
| `action.default_popup` | Points to `popup.html` |
| `background.service_worker` | Points to `service-worker.js` |
| `content_scripts` | Five content script entries (see below) |

**Content script entries:**

1. **Spotify pages** (`/track/*`, `/album/*`, `/artist/*`) → `utils.js` + `spotify2ytm-content.js`
2. **YTM pages** (`/watch*`, `/playlist?list=*`, `/channel/*`) → `utils.js` + `ytm2spotify-content.js`
3. **YouTube fallback** (`www.youtube.com/watch*`) → `yt-fallback-content.js`
4. **YTM search** (`music.youtube.com/search*`) → `ytm-autoclick-content.js`
5. **Spotify search** (`open.spotify.com/search/*`) → `spotify-autoclick-content.js`

All use `"run_at": "document_idle"`.

---

### `service-worker.js`

Background service worker. Initializes default toggle states on first install.

- **`onInstalled`**: Sets `spotifyEnabled` and `ytmEnabled` to `true` if not already set.
- **`onStartup`**: Logs browser startup (hook for future logic).

---

### `utils.js`

Shared utilities loaded by `spotify2ytm-content.js` and `ytm2spotify-content.js`.

#### `showFeedback(message, duration)`

Displays a temporary toast notification (top-right, light red) when extraction fails. Auto-fades after `duration` ms. Click to dismiss early.

#### `processArtistString(artistString)`

Cleans raw artist text:
1. Strips YTM bullet-point metadata (e.g. `"Artist • Album • 2024"` → `"Artist"`)
2. Splits on collaboration separators (`,`, `&`, `feat.`, `ft.`, `with`, `vs.`)
3. Returns cleaned artist name(s) joined by space, or `null`

---

### `spotify2ytm-content.js`

Handles **Spotify → YouTube Music** redirection.

#### Constants

| Constant | Value | Purpose |
|---|---|---|
| `SPOTIFY_MAX_RETRIES` | `15` | Max extraction attempts (7.5s window) |
| `SPOTIFY_RETRY_DELAY_MS` | `500` | Delay between retries |
| `SPOTIFY_INITIAL_DELAY_MS` | `300` | Wait before first attempt |

#### `spotifyToYTM()`

Detects page type from `pathname` and sets `pageType` (`track`, `album`, `artist`).

**Two-tier extraction per page type:**

| Page Type | Plan A (Title Regex) | Plan B (DOM Query) |
|---|---|---|
| `/track/` | `^(.+?) [-–—] (?:song\|lyrics) by (.+?) (?:\| Spotify)?$` | `span[data-testid="entityTitle"] h1` + `a[data-testid="creator-link"]` |
| `/album/` | `^(.+?) [-–—] (?:album\|single) by (.+?) (?:\| Spotify)?$` | Same selectors as track |
| `/artist/` | `^(.+?) (?:•.*?)? (?:\| Spotify\|- Listen on Spotify)$` | `span[data-testid="entityTitle"] h1` |

Both plans skip the generic SPA title (`"Spotify – Web Player"`).

**After extraction:**
- Appends YTM search filter (`sp` parameter): Songs / Albums / Artists
- Sets `tunetransporterAutoclick` signal in storage
- Redirects to `music.youtube.com/search?q=<query>&sp=<filter>`

**Main execution block:** Checks `tunetransporterNoRedirect` flag before starting. If flag is set (recent), skips redirection.

---

### `ytm2spotify-content.js`

Handles **YouTube Music → Spotify** redirection.

#### Selectors

| Selector | Used For |
|---|---|
| `ytmusic-responsive-header-renderer h1 yt-formatted-string.title` | Playlist/Album title |
| `ytmusic-responsive-header-renderer yt-formatted-string.strapline-text` | Playlist/Album artist |
| `ytmusic-immersive-header-renderer h1 yt-formatted-string.title` | Artist name |
| `ytmusic-player-queue-item[selected] .song-title` | Watch page track title |
| `ytmusic-player-queue-item[selected] .byline` | Watch page artist |

#### `tryExtractAndRedirect()`

Handles playlist/album and artist pages. Sets `spotifySearchType` (`albums` or `artists`) and redirects to `open.spotify.com/search/<query>/<type>`.

#### `initializeWatchPageObserver()`

Uses a `MutationObserver` on watch pages to wait for the selected queue item to render. Extracts track + artist, then redirects to Spotify search with `tracks` filter. Falls back to `www.youtube.com` if extraction fails after 10s timeout.

**Main execution block:** Same no-redirect check as `spotify2ytm-content.js`.

---

### `ytm-autoclick-content.js`

Runs on YTM search pages. Auto-navigates to the first result when the `tunetransporterAutoclick` signal is detected.

#### Navigation strategies (tried in order)

1. **Top card** — `ytmusic-card-shelf-renderer a.yt-simple-endpoint` (featured result)
2. **First list item** — `ytmusic-shelf-renderer ytmusic-responsive-list-item-renderer a.yt-simple-endpoint`
3. **Any result** — `ytmusic-responsive-list-item-renderer a.yt-simple-endpoint`

Sets `tunetransporterNoRedirect` before navigating to prevent `ytm2spotify-content.js` from redirecting back.

Retries up to 20 times (10s window) to handle dynamic loading.

---

### `spotify-autoclick-content.js`

Runs on Spotify search pages. Auto-navigates to the first result when the `tunetransporterAutoclick` signal is detected.

#### Navigation strategies (tried in order)

1. **Track result** — `[data-testid="tracklist-row"] a[href*="/track/"]`
2. **Album result** — `a[href*="/album/"]`
3. **Artist result** — `a[href*="/artist/"]`
4. **Any music link** — `a[href*="/track/"], a[href*="/album/"], a[href*="/artist/"]`

Sets `tunetransporterNoRedirect` before navigating to prevent `spotify2ytm-content.js` from redirecting back.

Retries up to 20 times (10s window).

---

### `yt-fallback-content.js`

Runs on `www.youtube.com/watch*`. Only activates when the URL hash is `#tunetransporter-fallback` (set by `ytm2spotify-content.js` when primary extraction fails).

Extracts video title from `document.title` and channel name from `#channel-name`, then redirects to Spotify search.

Retries up to 5 times (2.5s window).

---

### `popup.html` / `popup.js` / `popup.css`

The popup UI shown when clicking the extension icon.

- Two toggle checkboxes with service icons: **Spotify → YTM** and **YTM → Spotify**
- States saved to / loaded from `chrome.storage.local`
- Minimal styling, 250px wide
