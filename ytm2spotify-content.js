// TuneTransporter/ytm2spotify-content.js
// NOTE: showFeedback and processArtistString functions are now loaded from utils.js
console.log("TuneTransporter: YouTube Music to Spotify script loaded.");

// --- Constants ---
const YTM_OBSERVER_TIMEOUT_MS = 10000; // 10 seconds timeout for watch pages

// Selectors (Keep as they are)
const YTM_PLAYLIST_TITLE_SELECTOR = 'ytmusic-responsive-header-renderer h1 yt-formatted-string.title';
const YTM_PLAYLIST_ARTIST_SELECTOR = 'ytmusic-responsive-header-renderer yt-formatted-string.strapline-text.complex-string';
const YTM_ARTIST_NAME_SELECTOR = 'ytmusic-immersive-header-renderer h1 yt-formatted-string.title';
const YTM_WATCH_QUEUE_ITEM_SELECTOR = 'ytmusic-player-queue-item[selected]';
const YTM_WATCH_TITLE_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .song-title`;
const YTM_WATCH_ARTIST_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .byline`;


// --- Core Logic Functions ---

function tryExtractAndRedirect() {
    const currentUrl = window.location.href;
    let itemName = null;
    let artistName = null; // Will hold the processed name
    let extracted = false;
    let isArtistSearch = false;

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
                // *** Use processArtistString from utils.js ***
                artistName = processArtistString(artistElement.title); // Pass the raw title

                if (itemName && artistName) { // Check if both are valid after processing
                    extracted = true;
                    console.log(`TuneTransporter: Extracted Playlist/Album - Item: "${itemName}", Artist: "${artistName}"`);
                } else {
                    console.warn("TuneTransporter: Playlist/Album elements found, but text was empty after processing.");
                    showFeedback("TuneTransporter: Could not extract playlist/album details.");
                }
            } else {
                console.warn("TuneTransporter: Could not find Playlist/Album title or artist elements.");
                showFeedback("TuneTransporter: Could not find playlist/album elements.");
            }
        }
        // --- Logic for Artist pages ---
        else if (currentUrl.includes("/channel/")) {
            console.log("TuneTransporter: Detected YTM Artist page.");
            const artistElement = document.querySelector(YTM_ARTIST_NAME_SELECTOR);
            if (artistElement && artistElement.title) {
                const rawArtistName = artistElement.title.trim();
                // *** Use processArtistString from utils.js ***
                artistName = processArtistString(rawArtistName);
                itemName = null;

                if (artistName) { // Check if valid after processing
                    extracted = true;
                    isArtistSearch = true;
                    console.log(`TuneTransporter: Extracted Artist - Artist: "${artistName}"`);
                } else {
                    console.warn("TuneTransporter: Artist element found, but text was empty after processing.");
                    showFeedback("TuneTransporter: Could not extract artist name.");
                }
            } else {
                console.warn("TuneTransporter: Could not find Artist name element.");
                showFeedback("TuneTransporter: Could not find artist element.");
            }
        }
        // --- Unknown Page Type ---
        else {
            console.log("TuneTransporter: URL doesn't match known YTM patterns for redirection:", currentUrl);
            return;
        }

        // --- Common Redirection Logic ---
        if (extracted && artistName) { // Check processed artistName
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName;
                console.log(`TuneTransporter: Preparing Spotify search for artist: "${searchQuery}"`);
            } else if (itemName) {
                searchQuery = itemName + " " + artistName;
                console.log(`TuneTransporter: Preparing Spotify search for item: "${itemName}", artist: "${artistName}"`);
            } else {
                console.error("TuneTransporter: Artist found but item missing for non-artist search.");
                showFeedback("TuneTransporter: Error preparing search query.");
                return;
            }

            const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
            window.location.href = spotifySearchUrl;
        } else if (extracted && !artistName) {
            console.warn("TuneTransporter: Extraction seemed successful but artist name is missing after processing.");
            showFeedback("TuneTransporter: Could not extract required artist information.");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during YTM to Spotify redirection:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// Observer is only initialized if main ytmEnabled is true
function initializeWatchPageObserver() {
    console.log("TuneTransporter: Initializing observer for watch page.");

    let observer = null;
    let timeoutId = null;
    let redirectionAttempted = false;

    const cleanup = (reason = "Cleanup called") => {
        if (redirectionAttempted) return;
        console.log(`TuneTransporter: Observer cleanup triggered - Reason: ${reason}`);
        if (observer) { observer.disconnect(); observer = null; }
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    };

    const triggerFallbackRedirect = (reason) => {
        if (redirectionAttempted) return;
        redirectionAttempted = true;
        console.warn(`TuneTransporter: Primary watch extraction failed (${reason}). Triggering www.youtube.com fallback.`);
        cleanup(`Fallback Triggered: ${reason}`);
        const currentUrl = new URL(window.location.href);
        currentUrl.hostname = 'www.youtube.com';
        currentUrl.hash = '#tunetransporter-fallback';
        console.log(`TuneTransporter: Redirecting to fallback URL: ${currentUrl.href}`);
        window.location.href = currentUrl.href;
    };

    timeoutId = setTimeout(() => {
        if (redirectionAttempted) return;
        triggerFallbackRedirect("Timeout");
    }, YTM_OBSERVER_TIMEOUT_MS);

    observer = new MutationObserver((mutations, obs) => {
        if (redirectionAttempted) return;

        const songTitleElement = document.querySelector(YTM_WATCH_TITLE_SELECTOR);
        const artistElement = document.querySelector(YTM_WATCH_ARTIST_SELECTOR);

        if (songTitleElement && artistElement) {
            // Prefer 'title' attribute, fall back to textContent if necessary
            const rawTitle = songTitleElement.title?.trim() || songTitleElement.textContent?.trim();
            const rawArtist = artistElement.title?.trim() || artistElement.textContent?.trim();

            if (rawTitle && rawArtist) {
                const trackName = rawTitle; // Title usually doesn't need complex processing
                // *** Use processArtistString from utils.js ***
                const artistName = processArtistString(rawArtist);

                if (trackName && artistName) { // Check if valid after processing
                    // --- SUCCESS CASE (Primary redirect) ---
                    console.log(`TuneTransporter: Extracted from Watch Observer - Track: "${trackName}", Artist: "${artistName}"`);
                    redirectionAttempted = true;
                    cleanup("Primary redirection successful");

                    const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(trackName + " " + artistName)}`;
                    console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
                    window.location.href = spotifySearchUrl;
                    // ---------------------------------------
                } else {
                    // Processing resulted in empty fields
                    console.warn("TuneTransporter: Watch observer - Names were empty after processing.");
                    triggerFallbackRedirect("Empty fields after processing");
                }
            }
            // else: Attributes/text not populated yet, observer will run again.
        }
        // else: Target elements not found yet, observer will run again.
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['title', 'class'] // Watch title changes, also class changes (like 'selected')
        // Consider observing textContent changes too if 'title' isn't always reliable
        // characterData: true
    });
    console.log("TuneTransporter: YTM Watch observer started.");
}


// --- Main execution ---
chrome.storage.local.get(['ytmEnabled'], function (result) {
    if (result.ytmEnabled !== false) {
        setTimeout(() => {
            if (window.location.href.startsWith("https://music.youtube.com/watch")) {
                initializeWatchPageObserver();
            } else {
                tryExtractAndRedirect();
            }
        }, 200);
    } else {
        console.log("TuneTransporter: YTM -> Spotify redirection is disabled in settings.");
    }
});