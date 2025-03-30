// TuneTransporter/ytm-autoclick-content.js

function handleYtmSearchResultRedirect() {
    const trackLinkSelector = 'ytmusic-card-shelf-renderer div.details-container yt-formatted-string.title a.yt-simple-endpoint[href^="watch?v="]';
    const chevronButtonSelector = 'div.main-action-container yt-button-shape[icon-name="yt-sys-icons:chevron_right"] button.yt-spec-button-shape-next--icon-button';

    const observerTargetNode = document.body; // Watch the whole body for simplicity
    const observerConfig = { childList: true, subtree: true };
    let observer = null; // Declare observer variable
    let observerTimeout = null; // Declare timeout variable

    console.log("TuneTransporter (YTM AutoClick): Script loaded, starting observer for track link or chevron button...");

    const observerCallback = function(mutationsList, obs) {
        // --- Priority 1: Check for Top Result Track Link ---
        const trackLinkElement = document.querySelector(trackLinkSelector);
        if (trackLinkElement) {
            const relativeUrl = trackLinkElement.getAttribute('href');
            if (relativeUrl && relativeUrl.startsWith('watch?v=')) {
                const fullUrl = `https://music.youtube.com/${relativeUrl}`;
                console.log(`TuneTransporter (YTM AutoClick): Found top result track link: ${fullUrl}. Navigating...`);
                // Small delay might prevent race conditions with page scripts
                setTimeout(() => {
                    window.location.href = fullUrl;
                }, 100);
                obs.disconnect();
                console.log("TuneTransporter (YTM AutoClick): Observer disconnected after finding track link.");
                if (observerTimeout) clearTimeout(observerTimeout);
                return; // Stop processing this mutation event
            } else {
                 console.warn("TuneTransporter (YTM AutoClick): Found track link element but href was invalid:", relativeUrl);
                 // Continue to check for the button below
            }
        }

        // --- Priority 2: Check for Chevron Button (Album/Playlist) ---
        const buttonElement = document.querySelector(chevronButtonSelector);
        if (buttonElement) {
            console.log("TuneTransporter (YTM AutoClick): Found chevron button (album/playlist?), attempting click via observer...");
            // Small delay before click might help in some dynamic loading scenarios
            setTimeout(() => {
                buttonElement.click();
                console.log("TuneTransporter (YTM AutoClick): Chevron button click simulated via observer.");
            }, 100); // 100ms delay
            obs.disconnect(); // Stop observing once clicked
            console.log("TuneTransporter (YTM AutoClick): Observer disconnected after clicking chevron button.");
            if (observerTimeout) clearTimeout(observerTimeout);
            return; // Stop processing this mutation event
        }

        // If neither element is found yet, the observer continues...
    };

    observer = new MutationObserver(observerCallback); // Assign to the outer variable
    observer.observe(observerTargetNode, observerConfig);
    console.log("TuneTransporter (YTM AutoClick): MutationObserver started, waiting for track link or chevron button...");

    // Add a timeout to disconnect the observer if neither element appears after a while
    observerTimeout = setTimeout(() => {
        if (observer) { // Check if observer still exists (hasn't been disconnected by success)
             observer.disconnect();
             console.warn("TuneTransporter (YTM AutoClick): Observer timed out after 15 seconds. Neither track link nor chevron button found.");
        }
    }, 15000); // 15 seconds timeout
}

// --- Trigger the observer ---
// Run the function when the content script loads on a matching page
handleYtmSearchResultRedirect();