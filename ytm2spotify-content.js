// TuneTransporter/ytm2spotify-content.js
// NOTE: showFeedback function is now loaded from utils.js
console.log("TuneTransporter: YouTube Music to Spotify script loaded.");

// --- Constants ---
const YTM_OBSERVER_TIMEOUT_MS = 10000; // 10 seconds timeout for watch pages

// NOTE: These selectors depend on YTM page structure and may need updates if YTM changes.
// Selectors for Playlist/Album/Single pages (Header)
const YTM_PLAYLIST_TITLE_SELECTOR = 'ytmusic-responsive-header-renderer h1 yt-formatted-string.title'; // Added context
const YTM_PLAYLIST_ARTIST_SELECTOR = 'ytmusic-responsive-header-renderer yt-formatted-string.strapline-text.complex-string'; // Added context

// Selector for Artist pages (Immersive Header)
const YTM_ARTIST_NAME_SELECTOR = 'ytmusic-immersive-header-renderer h1 yt-formatted-string.title';

// Selectors for Watch pages (Player Queue)
const YTM_WATCH_QUEUE_ITEM_SELECTOR = 'ytmusic-player-queue-item[selected]';
const YTM_WATCH_TITLE_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .song-title`;
const YTM_WATCH_ARTIST_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .byline`;


// --- Core Logic Functions ---

// This function now only handles non-watch pages
function tryExtractAndRedirect() {
    const currentUrl = window.location.href;
    let itemName = null;
    let artistName = null;
    let extracted = false;
    let isArtistSearch = false;

    // Watch pages are handled by observer initiated in main execution block
    if (currentUrl.startsWith("https://music.youtube.com/watch")) {
        console.log("TuneTransporter: Skipping direct extraction on watch page (observer handles this).");
        return;
    }

    try {
        // --- Logic for Playlist/Album/Single pages ---
        if (currentUrl.startsWith("https://music.youtube.com/playlist?list=")) {
            console.log("TuneTransporter: Detected YTM Playlist/Album page.");
            const titleElement = document.querySelector(YTM_PLAYLIST_TITLE_SELECTOR);
            const artistElement = document.querySelector(YTM_PLAYLIST_ARTIST_SELECTOR);

            if (titleElement && titleElement.title && artistElement && artistElement.title) {
                itemName = titleElement.title.trim();
                // Basic artist cleanup - might need refinement (like using processArtistString if added here/utils)
                artistName = artistElement.title.trim().split('•')[0].trim();
                if (itemName && artistName) {
                    extracted = true;
                    console.log(`TuneTransporter: Extracted Playlist/Album - Item: "${itemName}", Artist: "${artistName}"`);
                } else {
                    console.warn("TuneTransporter: Playlist/Album elements found, but text was empty after processing.");
                    // Use showFeedback from utils.js
                    showFeedback("TuneTransporter: Could not extract playlist/album details.");
                }
            } else {
                console.warn("TuneTransporter: Could not find Playlist/Album title or artist elements.");
                // Use showFeedback from utils.js
                showFeedback("TuneTransporter: Could not find playlist/album elements.");
            }
        }
        // --- Logic for Artist pages ---
        else if (currentUrl.includes("/channel/")) {
            console.log("TuneTransporter: Detected YTM Artist page.");
            const artistElement = document.querySelector(YTM_ARTIST_NAME_SELECTOR);
            if (artistElement && artistElement.title) {
                artistName = artistElement.title.trim();
                itemName = null; // Explicitly null for artist search
                if (artistName) {
                    extracted = true;
                    isArtistSearch = true;
                    console.log(`TuneTransporter: Extracted Artist - Artist: "${artistName}"`);
                } else {
                    console.warn("TuneTransporter: Artist element found, but text was empty after processing.");
                    // Use showFeedback from utils.js
                    showFeedback("TuneTransporter: Could not extract artist name.");
                }
            } else {
                console.warn("TuneTransporter: Could not find Artist name element.");
                // Use showFeedback from utils.js
                showFeedback("TuneTransporter: Could not find artist element.");
            }
        }
        // --- Unknown Page Type ---
        else {
            console.log("TuneTransporter: URL doesn't match known YTM patterns for redirection:", currentUrl);
            return;
        }

        // --- Common Redirection Logic ---
        if (extracted && artistName) {
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName;
                console.log(`TuneTransporter: Preparing Spotify search for artist: "${searchQuery}"`);
            } else if (itemName) {
                searchQuery = itemName + " " + artistName;
                console.log(`TuneTransporter: Preparing Spotify search for item: "${itemName}", artist: "${artistName}"`);
            } else {
                // Should only happen if itemName extraction failed for playlist/album but artist was found (unlikely with current checks)
                console.error("TuneTransporter: Artist found but item missing for non-artist search.");
                // Use showFeedback from utils.js
                showFeedback("TuneTransporter: Error preparing search query.");
                return;
            }

            const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
            window.location.href = spotifySearchUrl;
        } else if (extracted && !artistName) {
            // This case should be less likely now with checks above, but handle defensively
            console.warn("TuneTransporter: Extraction seemed successful but artist name is missing.");
            // Use showFeedback from utils.js
            showFeedback("TuneTransporter: Could not extract required artist information.");
        }
        // If not extracted, feedback was likely shown already in the specific block

    } catch (error) {
        console.error("TuneTransporter: Error during YTM to Spotify redirection:", error);
        // Use showFeedback from utils.js
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// Observer is only initialized if main ytmEnabled is true
function initializeWatchPageObserver() {
    console.log("TuneTransporter: Initializing observer for watch page.");

    let observer = null;
    let timeoutId = null;
    let redirectionAttempted = false; // Prevent multiple redirects/fallbacks

    const cleanup = (reason = "Cleanup called") => {
        if (redirectionAttempted) return; // Avoid cleanup if already acted
        console.log(`TuneTransporter: Observer cleanup triggered - Reason: ${reason}`);
        if (observer) { observer.disconnect(); observer = null; }
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    };

    // --- Fallback Redirect Helper ---
    // No longer needs to check storage, assumes ytmEnabled was true to get here
    const triggerFallbackRedirect = (reason) => {
        if (redirectionAttempted) return; // Prevent multiple fallbacks
        redirectionAttempted = true; // Mark that we are attempting *some* action

        // Fallback is triggered because primary failed AND ytmEnabled must be true
        console.warn(`TuneTransporter: Primary watch extraction failed (${reason}). Triggering www.youtube.com fallback.`);
        cleanup(`Fallback Triggered: ${reason}`); // Clean up observer/timer

        const currentUrl = new URL(window.location.href);
        currentUrl.hostname = 'www.youtube.com';
        currentUrl.hash = '#tunetransporter-fallback'; // Add signal for fallback script

        console.log(`TuneTransporter: Redirecting to fallback URL: ${currentUrl.href}`);
        window.location.href = currentUrl.href;
    };
    // ------------------------------------

    // Set a timeout for the whole observation process
    timeoutId = setTimeout(() => {
        if (redirectionAttempted) return; // Don't trigger fallback if primary redirect succeeded
        triggerFallbackRedirect("Timeout");
    }, YTM_OBSERVER_TIMEOUT_MS);

    observer = new MutationObserver((mutations, obs) => {
        if (redirectionAttempted) return; // Stop observing if we already redirected/fell back

        // Check if the target elements exist
        const songTitleElement = document.querySelector(YTM_WATCH_TITLE_SELECTOR);
        const artistElement = document.querySelector(YTM_WATCH_ARTIST_SELECTOR);

        if (songTitleElement && artistElement) {
            // Check if they have the 'title' attribute populated (YTM often uses this)
            if (songTitleElement.title && artistElement.title) {
                const trackName = songTitleElement.title.trim();
                // Attempt to clean up artist string (remove extra details after '•')
                let artistText = (artistElement.title || artistElement.textContent || "").trim();
                if (artistText.includes('•') && artistText.split('•')[0].trim()) {
                    artistText = artistText.split('•')[0].trim();
                }
                const artistName = artistText;

                if (trackName && artistName) {
                    // --- SUCCESS CASE (Primary redirect) ---
                    console.log(`TuneTransporter: Extracted from Watch Observer - Track: "${trackName}", Artist: "${artistName}"`);
                    redirectionAttempted = true; // Mark success
                    cleanup("Primary redirection successful"); // Clean up observer/timer

                    const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(trackName + " " + artistName)}`;
                    console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
                    window.location.href = spotifySearchUrl; // Perform the redirect
                    // ---------------------------------------
                } else {
                    // Found elements but processing resulted in empty fields
                    // This is an extraction failure, trigger fallback
                    console.warn("TuneTransporter: Watch observer - Elements found, but processed names were empty.");
                    triggerFallbackRedirect("Empty fields after processing");
                }
            }
            // else: Elements found but title attribute not yet populated, observer will run again.
        }
        // else: Target elements not found yet, observer will run again.
    });

    // Start observing the body for changes that might add/update our target elements
    observer.observe(document.body, {
        childList: true,  // Watch for addition/removal of children
        subtree: true,    // Watch descendants too
        attributes: true, // Watch for attribute changes (like the 'title' attribute)
        attributeFilter: ['title'] // Optional: More efficient if only title matters
    });
    console.log("TuneTransporter: YTM Watch observer started.");
}


// --- Main execution ---
// Only check the main YTM toggle
chrome.storage.local.get(['ytmEnabled'], function (result) {
    if (result.ytmEnabled !== false) { // If primary YTM->Spotify is enabled...
        // Use a timeout to allow the page (especially watch pages) to potentially load dynamic content
        setTimeout(() => {
            // Decide whether to run observer or direct extraction based on page type
            if (window.location.href.startsWith("https://music.youtube.com/watch")) {
                initializeWatchPageObserver();
            } else {
                tryExtractAndRedirect(); // Handles playlist/album/artist pages
            }
        }, 200); // Small delay
    } else {
        console.log("TuneTransporter: YTM -> Spotify redirection is disabled in settings.");
        // No need to check fallback settings here anymore
    }
});