# TuneTransporter — Developer Guide

This document explains every file, function, and component in the extension.

---

## Architecture Overview

TuneTransporter is a Chrome Manifest V3 extension that **automatically redirects** music links between Spotify and YouTube Music. When a user opens a Spotify track/album/artist page, the extension redirects them to a YouTube Music search. When they open a YTM song/playlist/artist page, it redirects to a Spotify search.

The extension follows this flow:

```
User visits Spotify/YTM page
        ↓
Content script runs (if enabled via toggle)
        ↓
Extracts artist + track/album info from page title or DOM
        ↓
Builds a search URL for the other service
        ↓
Redirects the browser (window.location.href)
```

For YTM watch pages specifically, there's an additional fallback path:

```
YTM watch page → MutationObserver tries to extract info
        ↓ (if it fails/times out)
Redirects to www.youtube.com/watch with #tunetransporter-fallback hash
        ↓
yt-fallback-content.js picks up the hash, extracts from YT page instead
        ↓
Redirects to Spotify search
```

---

## Files

### `manifest.json`

The Chrome extension manifest (Manifest V3). Defines:

| Field | Purpose |
|---|---|
| `manifest_version` | Set to `3` (required for modern Chrome extensions) |
| `name` / `version` / `description` | Extension metadata shown in `chrome://extensions` |
| `icons` | Extension icons at 16/32/48/128px sizes (JPEG) |
| `permissions` → `storage` | Allows reading/writing toggle state via `chrome.storage.local` |
| `host_permissions` | Grants content script + redirect access to `open.spotify.com`, `music.youtube.com`, and `www.youtube.com` |
| `action.default_popup` | Points to `popup.html` — the UI shown when clicking the extension icon |
| `background.service_worker` | Points to `service-worker.js` — runs in the background |
| `content_scripts` | Four content script entries (see below) |

**Content script entries:**

1. **Spotify pages** (`/track/*`, `/album/*`, `/artist/*`) → loads `utils.js` + `spotify2ytm-content.js`
2. **YTM pages** (`/watch*`, `/playlist?list=*`, `/channel/*`) → loads `utils.js` + `ytm2spotify-content.js`
3. **YouTube fallback** (`www.youtube.com/watch*`) → loads `yt-fallback-content.js`
4. **YTM search pages** (`/search*`) → loads `ytm-autoclick-content.js`

All content scripts use `"run_at": "document_idle"` so they execute after the page DOM is ready.

---

### `service-worker.js`

The background service worker. Runs once when the extension is installed/updated and on browser startup.

#### `chrome.runtime.onInstalled` listener

- Fires on first install, extension update, or Chrome update.
- Reads `spotifyEnabled` and `ytmEnabled` from `chrome.storage.local`.
- If either key is `undefined` (first install), initializes it to `true` so both redirect directions are enabled by default.

#### `chrome.runtime.onStartup` listener

- Fires every time the browser starts.
- Currently just logs a message. Useful as a hook for future startup logic.

---

### `utils.js`

Shared utility functions loaded by both `spotify2ytm-content.js` and `ytm2spotify-content.js` as a dependency (listed first in `manifest.json` content script `js` arrays).

#### `showFeedback(message, duration = 5000)`

Displays a temporary floating notification overlay on the page when something goes wrong (e.g., extraction failed).

- Creates a `<div>` with id `tunetransporter-feedback`, styled as a fixed-position toast in the top-right corner (light red background, dark red text).
- Fades in via CSS `opacity` transition.
- Auto-removes after `duration` ms with a fade-out animation.
- Clicking the notification dismisses it early.
- If called again while a previous notification is visible, the old one is removed first.

#### `processArtistString(artistString)`

Cleans and normalizes a raw artist string extracted from a page.

**Processing steps:**

1. **Trim** — removes leading/trailing whitespace.
2. **Bullet separator** — if the string contains `•` (common in YTM metadata like `"Artist • Album • Year"`), takes only the part before the first bullet.
3. **Replacement character** — same handling for the `�` character.
4. **Collaboration splitting** — splits on commas (`,`), ampersands (`&`), and keywords (`feat`, `ft`, `with`, `vs`) to separate multiple artists.
5. **Join** — joins all extracted artist names with spaces to form a search-friendly string.
6. **Returns** the cleaned string, or `null` if the input was empty/invalid.

---

### `spotify2ytm-content.js`

Content script injected on Spotify track, album, and artist pages. Handles the **Spotify → YouTube Music** redirection direction.

#### Constants

| Constant | Value | Purpose |
|---|---|---|
| `SPOTIFY_MAX_RETRIES` | `15` | Maximum extraction attempts (7.5s total) |
| `SPOTIFY_RETRY_DELAY_MS` | `500` | Delay between retries |
| `SPOTIFY_INITIAL_DELAY_MS` | `300` | Initial wait before first attempt |

#### `spotifyToYTM()`

The main extraction and redirect function. Uses a **retry mechanism** to handle Spotify's SPA dynamic loading — the page title and DOM elements may not be available immediately. Retries up to `SPOTIFY_MAX_RETRIES` times, checking both title regex and DOM queries each attempt.

Detects the page type from `window.location.pathname` and sets `pageType` (`'track'`, `'album'`, or `'artist'`) for use in YTM search filtering.

**For each page type, uses a two-tier extraction strategy:**

| Page Type | Plan A (Title Regex) | Plan B (DOM Query) |
|---|---|---|
| `/track/` | Parses `document.title` with regex: `^(.+?) [-–—] (?:song\|lyrics).*?by (.+?) (?:\| Spotify)?$` | Queries `span[data-testid="entityTitle"] h1` for title and `a[data-testid="creator-link"]` for artist |
| `/album/` | Parses `document.title` with regex: `^(.+?) [-–—] (?:album\|single) by (.+?) (?:\| Spotify)?$` | Same DOM selectors as track |
| `/artist/` | Parses `document.title` with regex: `^(.+?) (?:•.*?)? (?:\| Spotify\|- Listen on Spotify)$` | Queries `span[data-testid="entityTitle"] h1` for artist name |

Plan A (title regex) runs first because `document.title` is available very early. Plan B (DOM query) is the fallback if the regex doesn't match. Both plans skip when the title is still the generic SPA title (`"Spotify – Web Player"`).

**After extraction:**
- Builds search query: `"trackName artistName"` for tracks/albums, or just `"artistName"` for artist pages.
- Appends a **YTM search filter** (`sp` parameter) based on `pageType`:
  - `track` → `sp=EgWKAQIIAWgB` (Songs filter)
  - `album` → `sp=EgWKAQIYAWgB` (Albums filter)
  - `artist` → `sp=EgWKAQIQAWgB` (Artists filter)
- Appends `#tunetransporter-autoclick` hash to signal the auto-click script.
- Constructs YouTube Music search URL: `https://music.youtube.com/search?q=<encoded query>&sp=<filter>#tunetransporter-autoclick`
- Redirects via `window.location.href`.
- If extraction fails on a given attempt, retries after `SPOTIFY_RETRY_DELAY_MS`. After all retries exhausted, calls `showFeedback()` to notify the user.

#### Main execution block (bottom of file)

- Reads `spotifyEnabled` from `chrome.storage.local`.
- If enabled (default), calls `spotifyToYTM()` which internally delays `SPOTIFY_INITIAL_DELAY_MS` before the first attempt.
- If disabled, logs a message and does nothing.

---

### `ytm-autoclick-content.js`

Content script injected on YTM search pages (`/search*`). Auto-clicks the first search result when the URL hash is `#tunetransporter-autoclick` (set by `spotify2ytm-content.js` during redirection).

#### Constants

| Constant | Value | Purpose |
|---|---|---|
| `AUTOCLICK_MAX_RETRIES` | `20` | Maximum click attempts (10s total) |
| `AUTOCLICK_RETRY_DELAY_MS` | `500` | Delay between retries |

#### Main logic flow

1. **Hash check**: If `window.location.hash !== '#tunetransporter-autoclick'`, does nothing.
2. **Remove hash**: Immediately calls `history.replaceState()` to prevent re-triggering on refresh.
3. **Retry loop** (`attemptAutoClick()`):
   - **Strategy 1** — Top card: Queries `ytmusic-card-shelf-renderer a.yt-simple-endpoint` (the featured result card at the top of filtered results).
   - **Strategy 2** — First list item: Queries `ytmusic-shelf-renderer ytmusic-responsive-list-item-renderer a.yt-simple-endpoint`.
   - **Strategy 3** — Broad fallback: Queries `ytmusic-responsive-list-item-renderer a.yt-simple-endpoint`.
   - If a link is found, calls `.click()` to navigate into it.
   - If nothing found, retries up to `AUTOCLICK_MAX_RETRIES` times.

---

### `ytm2spotify-content.js`

Content script injected on YouTube Music watch, playlist, and channel pages. Handles the **YTM → Spotify** redirection direction.

#### Constants

| Constant | Value | Purpose |
|---|---|---|
| `YTM_OBSERVER_TIMEOUT_MS` | `10000` | Max time (10s) the MutationObserver will wait on watch pages before triggering fallback |
| `YTM_PLAYLIST_TITLE_SELECTOR` | `ytmusic-responsive-header-renderer h1 yt-formatted-string.title` | CSS selector for playlist/album title |
| `YTM_PLAYLIST_ARTIST_SELECTOR` | `ytmusic-responsive-header-renderer yt-formatted-string.strapline-text.complex-string` | CSS selector for playlist/album artist |
| `YTM_ARTIST_NAME_SELECTOR` | `ytmusic-immersive-header-renderer h1 yt-formatted-string.title` | CSS selector for artist name on channel pages |
| `YTM_WATCH_QUEUE_ITEM_SELECTOR` | `ytmusic-player-queue-item[selected]` | CSS selector for the currently playing item in the queue |
| `YTM_WATCH_TITLE_SELECTOR` | (combined) `.song-title` within selected queue item | Song title on watch pages |
| `YTM_WATCH_ARTIST_SELECTOR` | (combined) `.byline` within selected queue item | Artist on watch pages |

#### `tryExtractAndRedirect()`

Handles **non-watch pages** (playlist/album and artist/channel pages). These pages load their metadata more reliably so a direct DOM query works.

- **Playlist/Album pages** (`/playlist?list=`): Queries title + artist elements, sets Spotify search filter to `/albums`.
- **Artist/Channel pages** (`/channel/`): Queries artist name element, sets Spotify search filter to `/artists`.
- Constructs Spotify search URL with type filter: `https://open.spotify.com/search/<query>/<type>`
- Redirects via `window.location.href`.

#### `initializeWatchPageObserver()`

Handles **watch pages** (`/watch?v=...`). YTM watch pages load content dynamically, so a `MutationObserver` is used to wait for the song info to appear.

**Flow:**

1. Sets a timeout (`YTM_OBSERVER_TIMEOUT_MS` = 10s). If the observer doesn't find data in time, triggers fallback.
2. Creates a `MutationObserver` watching `document.body` for `childList`, `subtree`, and `attributes` changes (specifically `title` and `class` attributes).
3. On each mutation, checks if `ytmusic-player-queue-item[selected] .song-title` and `.byline` exist and have content.
4. **Success path**: Extracts track + artist, builds Spotify search URL with `/tracks` filter, redirects.
5. **Failure path** (`triggerFallbackRedirect`): Changes `hostname` from `music.youtube.com` to `www.youtube.com` and appends `#tunetransporter-fallback` hash, then redirects. This hands off to `yt-fallback-content.js`.
6. `cleanup()` disconnects the observer and clears the timeout to prevent duplicate actions.

#### Main execution block (bottom of file)

- Reads `ytmEnabled` from `chrome.storage.local`.
- If enabled, after 200ms delay:
  - Watch pages → calls `initializeWatchPageObserver()`.
  - Other pages → calls `tryExtractAndRedirect()`.
- If disabled, logs and does nothing.

---

### `yt-fallback-content.js`

Content script injected on `www.youtube.com/watch*` pages. Only activates when the URL hash is `#tunetransporter-fallback` (set by the YTM watch page observer on failure).

#### Constants

| Constant | Value | Purpose |
|---|---|---|
| `MAX_RETRIES` | `5` | Maximum extraction attempts |
| `RETRY_DELAY_MS` | `500` | Delay between retries |

#### Main logic flow

1. **Hash check**: If `window.location.hash !== '#tunetransporter-fallback'`, does nothing.
2. **Remove hash**: Immediately calls `history.replaceState()` to remove the hash so refreshing won't re-trigger.
3. **Setting check**: Reads `ytmEnabled` — if disabled, aborts (user turned off YTM→Spotify).
4. **Retry loop** (`attemptExtraction()`):
   - Extracts video title from `document.title`, cleaning off `"(N) "` notification prefix and `" - YouTube"` suffix.
   - Skips if title is still just `"YouTube"` (page still loading).
   - Extracts channel name from `#channel-name yt-formatted-string#text a` (link text) or falls back to the `title` attribute.
   - If both title and channel name found → constructs `https://open.spotify.com/search/<title + channel>` and redirects.
   - If either is missing, retries up to `MAX_RETRIES` times with `RETRY_DELAY_MS` between each.

---

### `popup.html`

The popup UI shown when clicking the extension icon in the toolbar. Contains:

- **Title** (`<h1>TuneTransporter</h1>`).
- **Two toggle labels**, each with:
  - A service icon (`<img>` from `resources/`).
  - A checkbox (`<input type="checkbox">`).
  - Label text describing the direction.
- Loads `popup.css` for styling and `popup.js` for logic.

---

### `popup.js`

Handles the popup toggle logic.

#### `DOMContentLoaded` listener

1. **Load state**: Reads `spotifyEnabled` and `ytmEnabled` from `chrome.storage.local` and sets checkbox states. Both default to `true` if not set.
2. **Save state**: Adds `change` event listeners on both checkboxes to persist their state to `chrome.storage.local` immediately on toggle.

---

### `popup.css`

Styles for the popup UI.

| Selector | Purpose |
|---|---|
| `body` | Fixed width (250px), sans-serif font, padding |
| `h1` | Centered title, slightly larger font |
| `label` | Flexbox row layout for icon + checkbox + text alignment |
| `input[type="checkbox"]` | Right margin for spacing |
| `.popup-icon` | 18×18px service icons with right margin |

---

### `icons/`

Extension icons in JPEG format at four sizes required by Chrome:

| File | Size | Used for |
|---|---|---|
| `icon16.jpeg` | 16×16 | Favicon / toolbar (small) |
| `icon32.jpeg` | 32×32 | Toolbar (retina) |
| `icon48.jpeg` | 48×48 | Extensions management page |
| `icon128.jpeg` | 128×128 | Chrome Web Store / install dialog |

---

### `resources/`

SVG icons used in the popup UI:

| File | Purpose |
|---|---|
| `spotify_icon.svg` | Spotify logo shown next to the Spotify→YTM toggle |
| `ytm_icon.svg` | YouTube Music logo shown next to the YTM→Spotify toggle |

---

### `README.md`

User-facing documentation: features, installation instructions, usage guide, supported pages, troubleshooting, permissions explanation, and limitations.

### `CHANGELOG.md`

Version history documenting changes, additions, and fixes across releases.

### `LICENSE.txt`

MIT License file.
