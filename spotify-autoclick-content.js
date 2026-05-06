// TuneTransporter/spotify-autoclick-content.js
// Auto-navigates to the first search result on Spotify when redirected from YTM.
// Activates when a recent autoclick flag is found in chrome.storage.local.

console.log("TuneTransporter: Spotify auto-click script loaded.");

// --- Constants ---
const SP_AUTOCLICK_MAX_RETRIES = 20;
const SP_AUTOCLICK_RETRY_DELAY_MS = 500;
const SP_AUTOCLICK_SIGNAL_MAX_AGE_MS = 30000;

// Check for the autoclick signal in storage
chrome.storage.local.get('tunetransporterAutoclick', (result) => {
    const timestamp = result.tunetransporterAutoclick;

    if (!timestamp) {
        return;
    }

    const age = Date.now() - timestamp;
    if (age > SP_AUTOCLICK_SIGNAL_MAX_AGE_MS) {
        console.log(`TuneTransporter: Auto-click signal is stale (${age}ms old). Ignoring.`);
        chrome.storage.local.remove('tunetransporterAutoclick');
        return;
    }

    console.log("TuneTransporter: Auto-click signal detected on Spotify search! Starting auto-navigate...");
    chrome.storage.local.remove('tunetransporterAutoclick');

    let currentRetry = 0;
    let navDone = false;

    function attemptAutoNavigate() {
        if (navDone) return;

        console.log(`TuneTransporter: Spotify auto-navigate attempt ${currentRetry + 1}/${SP_AUTOCLICK_MAX_RETRIES}...`);

        // Strategy 1: First track result link (on /tracks filtered search)
        const trackLink = document.querySelector('[data-testid="tracklist-row"] a[href*="/track/"]');
        if (trackLink && trackLink.href) {
            navDone = true;
            console.log(`TuneTransporter: Navigating to first track result: ${trackLink.href}`);
            chrome.storage.local.set({ tunetransporterNoRedirect: Date.now() }, () => {
                window.location.href = trackLink.href;
            });
            return;
        }

        // Strategy 2: First album result link (on /albums filtered search)
        const albumLink = document.querySelector('a[href*="/album/"]');
        if (albumLink && albumLink.href) {
            navDone = true;
            console.log(`TuneTransporter: Navigating to first album result: ${albumLink.href}`);
            chrome.storage.local.set({ tunetransporterNoRedirect: Date.now() }, () => {
                window.location.href = albumLink.href;
            });
            return;
        }

        // Strategy 3: First artist result link (on /artists filtered search)
        const artistLink = document.querySelector('a[href*="/artist/"]');
        if (artistLink && artistLink.href) {
            navDone = true;
            console.log(`TuneTransporter: Navigating to first artist result: ${artistLink.href}`);
            chrome.storage.local.set({ tunetransporterNoRedirect: Date.now() }, () => {
                window.location.href = artistLink.href;
            });
            return;
        }

        // Strategy 4: Any track/album/artist link on the page
        const anyMusicLink = document.querySelector('a[href*="/track/"], a[href*="/album/"], a[href*="/artist/"]');
        if (anyMusicLink && anyMusicLink.href) {
            navDone = true;
            console.log(`TuneTransporter: Navigating to fallback result: ${anyMusicLink.href}`);
            chrome.storage.local.set({ tunetransporterNoRedirect: Date.now() }, () => {
                window.location.href = anyMusicLink.href;
            });
            return;
        }

        // Retry or give up
        currentRetry++;
        if (currentRetry < SP_AUTOCLICK_MAX_RETRIES) {
            setTimeout(attemptAutoNavigate, SP_AUTOCLICK_RETRY_DELAY_MS);
        } else {
            console.warn(`TuneTransporter: Spotify auto-navigate failed after ${SP_AUTOCLICK_MAX_RETRIES} attempts.`);
        }
    }

    // Start after delay to let the SPA render search results
    setTimeout(attemptAutoNavigate, 800);
});
