// TuneTransporter/ytm-autoclick-content.js
// Auto-navigates to the first search result on YTM when redirected from Spotify.
// Activates when a recent autoclick flag is found in chrome.storage.local.

console.log("TuneTransporter: YTM auto-click script loaded.");

// --- Constants ---
const AUTOCLICK_MAX_RETRIES = 20;      // Up to 20 attempts (10 seconds total)
const AUTOCLICK_RETRY_DELAY_MS = 500;  // 500ms between retries
const AUTOCLICK_SIGNAL_MAX_AGE_MS = 30000; // Signal valid for 30 seconds

// Check for the autoclick signal in storage
chrome.storage.local.get('tunetransporterAutoclick', (result) => {
    const timestamp = result.tunetransporterAutoclick;

    if (!timestamp) {
        return;
    }

    const age = Date.now() - timestamp;
    if (age > AUTOCLICK_SIGNAL_MAX_AGE_MS) {
        console.log(`TuneTransporter: Auto-click signal is stale (${age}ms old). Ignoring.`);
        chrome.storage.local.remove('tunetransporterAutoclick');
        return;
    }

    console.log("TuneTransporter: Auto-click signal detected! Starting auto-navigate...");
    chrome.storage.local.remove('tunetransporterAutoclick');

    let currentRetry = 0;
    let navDone = false;

    function attemptAutoNavigate() {
        if (navDone) return;

        console.log(`TuneTransporter: Auto-navigate attempt ${currentRetry + 1}/${AUTOCLICK_MAX_RETRIES}...`);

        // Strategy 1: Top result card link (featured card on filtered searches)
        const topCardLink = document.querySelector('ytmusic-card-shelf-renderer a.yt-simple-endpoint');
        if (topCardLink && topCardLink.href) {
            navDone = true;
            console.log(`TuneTransporter: Navigating to top card result: ${topCardLink.href}`);
            // Set no-redirect flag so ytm2spotify-content.js won't redirect back to Spotify
            chrome.storage.local.set({ tunetransporterNoRedirect: Date.now() }, () => {
                window.location.href = topCardLink.href;
            });
            return;
        }

        // Strategy 2: First list item title link
        const firstListItemLink = document.querySelector('ytmusic-shelf-renderer ytmusic-responsive-list-item-renderer a.yt-simple-endpoint');
        if (firstListItemLink && firstListItemLink.href) {
            navDone = true;
            console.log(`TuneTransporter: Navigating to first list result: ${firstListItemLink.href}`);
            chrome.storage.local.set({ tunetransporterNoRedirect: Date.now() }, () => {
                window.location.href = firstListItemLink.href;
            });
            return;
        }

        // Strategy 3: Broader fallback — any result link
        const anyResultLink = document.querySelector('ytmusic-responsive-list-item-renderer a.yt-simple-endpoint');
        if (anyResultLink && anyResultLink.href) {
            navDone = true;
            console.log(`TuneTransporter: Navigating to fallback result: ${anyResultLink.href}`);
            chrome.storage.local.set({ tunetransporterNoRedirect: Date.now() }, () => {
                window.location.href = anyResultLink.href;
            });
            return;
        }

        // Retry or give up
        currentRetry++;
        if (currentRetry < AUTOCLICK_MAX_RETRIES) {
            setTimeout(attemptAutoNavigate, AUTOCLICK_RETRY_DELAY_MS);
        } else {
            console.warn(`TuneTransporter: Auto-navigate failed after ${AUTOCLICK_MAX_RETRIES} attempts. Results may not have loaded.`);
        }
    }

    // Start after a short delay to let the search results render
    setTimeout(attemptAutoNavigate, 800);
});
