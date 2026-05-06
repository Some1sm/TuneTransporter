// TuneTransporter/spotify-autoclick-content.js
// Auto-navigates to the first search result on Spotify when redirected from YTM.
// Activates when a recent autoclick flag is found in chrome.storage.local.

const SP_AUTOCLICK_MAX_RETRIES = 20;
const SP_AUTOCLICK_RETRY_DELAY_MS = 300;
const SP_AUTOCLICK_SIGNAL_MAX_AGE_MS = 30000;

chrome.storage.local.get('tunetransporterAutoclick', (result) => {
    const timestamp = result.tunetransporterAutoclick;
    if (!timestamp) return;

    const age = Date.now() - timestamp;
    if (age > SP_AUTOCLICK_SIGNAL_MAX_AGE_MS) {
        chrome.storage.local.remove('tunetransporterAutoclick');
        return;
    }

    console.log('TuneTransporter: Auto-click signal detected on Spotify search.');
    chrome.storage.local.remove('tunetransporterAutoclick');

    let currentRetry = 0;
    let navDone = false;

    function navigateTo(url, label) {
        navDone = true;
        console.log(`TuneTransporter: Navigating to ${label}: ${url}`);
        // Unblock resources on Spotify before navigating to final page
        chrome.runtime.sendMessage({ action: 'disableBlocking', target: 'spotify' });
        chrome.storage.local.set({ tunetransporterNoRedirect: Date.now() }, () => {
            window.location.href = url;
        });
    }

    function attemptAutoNavigate() {
        if (navDone) return;

        // Strategy 1: Track result
        const track = document.querySelector('[data-testid="tracklist-row"] a[href*="/track/"]');
        if (track?.href) return navigateTo(track.href, 'track');

        // Strategy 2: Album result
        const album = document.querySelector('a[href*="/album/"]');
        if (album?.href) return navigateTo(album.href, 'album');

        // Strategy 3: Artist result
        const artist = document.querySelector('a[href*="/artist/"]');
        if (artist?.href) return navigateTo(artist.href, 'artist');

        // Strategy 4: Any music link
        const any = document.querySelector('a[href*="/track/"], a[href*="/album/"], a[href*="/artist/"]');
        if (any?.href) return navigateTo(any.href, 'fallback');

        currentRetry++;
        if (currentRetry < SP_AUTOCLICK_MAX_RETRIES) {
            setTimeout(attemptAutoNavigate, SP_AUTOCLICK_RETRY_DELAY_MS);
        } else {
            console.warn(`TuneTransporter: Spotify auto-navigate failed after ${SP_AUTOCLICK_MAX_RETRIES} attempts.`);
            // Unblock resources since we're staying on this page
            chrome.runtime.sendMessage({ action: 'disableBlocking', target: 'spotify' });
        }
    }

    setTimeout(attemptAutoNavigate, 500);
});
