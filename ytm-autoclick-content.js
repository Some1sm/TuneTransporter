// TuneTransporter/ytm-autoclick-content.js
// Auto-navigates to the first search result on YTM when redirected from Spotify.
// Activates when a recent autoclick flag is found in chrome.storage.local.

const AUTOCLICK_MAX_RETRIES = 20;
const AUTOCLICK_RETRY_DELAY_MS = 300;
const AUTOCLICK_SIGNAL_MAX_AGE_MS = 30000;

chrome.storage.local.get('tunetransporterAutoclick', (result) => {
    const timestamp = result.tunetransporterAutoclick;
    if (!timestamp) return;

    const age = Date.now() - timestamp;
    if (age > AUTOCLICK_SIGNAL_MAX_AGE_MS) {
        chrome.storage.local.remove('tunetransporterAutoclick');
        return;
    }

    console.log('TuneTransporter: Auto-click signal detected on YTM search.');
    chrome.storage.local.remove('tunetransporterAutoclick');

    let currentRetry = 0;
    let navDone = false;

    function navigateTo(url, label) {
        navDone = true;
        console.log(`TuneTransporter: Navigating to ${label}: ${url}`);
        // Unblock resources on YTM before navigating to final page
        chrome.runtime.sendMessage({ action: 'disableBlocking', target: 'ytm' });
        chrome.storage.local.set({ tunetransporterNoRedirect: Date.now() }, () => {
            window.location.href = url;
        });
    }

    function attemptAutoNavigate() {
        if (navDone) return;

        // Strategy 1: Top result card
        const topCard = document.querySelector('ytmusic-card-shelf-renderer a.yt-simple-endpoint');
        if (topCard?.href) return navigateTo(topCard.href, 'top card');

        // Strategy 2: First list item
        const listItem = document.querySelector('ytmusic-shelf-renderer ytmusic-responsive-list-item-renderer a.yt-simple-endpoint');
        if (listItem?.href) return navigateTo(listItem.href, 'list item');

        // Strategy 3: Any result link
        const any = document.querySelector('ytmusic-responsive-list-item-renderer a.yt-simple-endpoint');
        if (any?.href) return navigateTo(any.href, 'fallback');

        currentRetry++;
        if (currentRetry < AUTOCLICK_MAX_RETRIES) {
            setTimeout(attemptAutoNavigate, AUTOCLICK_RETRY_DELAY_MS);
        } else {
            console.warn(`TuneTransporter: Auto-navigate failed after ${AUTOCLICK_MAX_RETRIES} attempts.`);
            // Unblock resources since we're staying on this page
            chrome.runtime.sendMessage({ action: 'disableBlocking', target: 'ytm' });
        }
    }

    setTimeout(attemptAutoNavigate, 500);
});
