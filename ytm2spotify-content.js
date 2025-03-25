// ytm2spotify-content.js
console.log("TuneTransporter: YouTube Music to Spotify script loaded.");

// --- Constants ---
const YTM_OBSERVER_TIMEOUT_MS = 10000; // 10 seconds timeout for watch pages

// Selectors for Playlist/Album/Single pages (Header)
const YTM_PLAYLIST_TITLE_SELECTOR = 'ytmusic-responsive-header-renderer h1 yt-formatted-string.title'; // Added context
const YTM_PLAYLIST_ARTIST_SELECTOR = 'ytmusic-responsive-header-renderer yt-formatted-string.strapline-text.complex-string'; // Added context

// Selector for Artist pages (Immersive Header)
const YTM_ARTIST_NAME_SELECTOR = 'ytmusic-immersive-header-renderer h1 yt-formatted-string.title';

// Selectors for Watch pages (Player Queue)
const YTM_WATCH_QUEUE_ITEM_SELECTOR = 'ytmusic-player-queue-item[selected]';
const YTM_WATCH_TITLE_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .song-title`;
const YTM_WATCH_ARTIST_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .byline`;


// --- Feedback Function ---
let feedbackTimeoutId = null; // Keep track of the timeout for the feedback message
// ... (showFeedback function code remains the same) ...


// --- Core Logic Functions ---

function tryExtractAndRedirect() {
    const currentUrl = window.location.href;
    let itemName = null; // Track/Album/Playlist name
    let artistName = null;
    let extracted = false;
    let isArtistSearch = false; // Flag for artist-only searches

    try {
        // --- Logic for Playlist/Album/Single pages (playlist?list=...) ---
        if (currentUrl.startsWith("https://music.youtube.com/playlist?list=")) {
            console.log("TuneTransporter: Detected YTM Playlist/Album page.");
            const titleElement = document.querySelector(YTM_PLAYLIST_TITLE_SELECTOR);
            const artistElement = document.querySelector(YTM_PLAYLIST_ARTIST_SELECTOR);

            if (titleElement && titleElement.title && artistElement && artistElement.title) {
                itemName = titleElement.title.trim(); // Album/Playlist title
                artistName = artistElement.title.trim(); // Associated artist(s)
                console.log(`TuneTransporter: Extracted from Header - Item: "${itemName}", Artist: "${artistName}"`);
                extracted = true;
            } else {
                console.warn("TuneTransporter: Could not find title/artist header elements on playlist page using selectors:", YTM_PLAYLIST_TITLE_SELECTOR, YTM_PLAYLIST_ARTIST_SELECTOR);
                showFeedback("TuneTransporter: Could not find playlist/album info on this page header.");
            }
        }
        // --- Logic for Artist pages (channel/...) ---
        else if (currentUrl.includes("/channel/")) { // Use includes() as base URL might vary slightly
            console.log("TuneTransporter: Detected YTM Artist page.");
            const artistElement = document.querySelector(YTM_ARTIST_NAME_SELECTOR);

            if (artistElement && artistElement.title) {
                artistName = artistElement.title.trim(); // The main H1 title is the artist name
                itemName = null; // No specific item name needed for artist search
                console.log(`TuneTransporter: Extracted Artist Name: "${artistName}"`);
                extracted = true;
                isArtistSearch = true; // Set flag
            } else {
                console.warn("TuneTransporter: Could not find artist name element on channel page using selector:", YTM_ARTIST_NAME_SELECTOR);
                showFeedback("TuneTransporter: Could not find artist info on this page header.");
            }
        }
        // --- Logic for Watch pages (watch?v=...) ---
        else if (currentUrl.startsWith("https://music.youtube.com/watch")) {
            console.log("TuneTransporter: Detected YTM watch page. Initializing observer.");
            initializeWatchPageObserver();
            return; // Observer handles redirection asynchronously
        }
        // --- Unknown Page Type ---
        else {
            console.log("TuneTransporter: URL doesn't match known YTM patterns for redirection:", currentUrl);
            return;
        }

        // --- Common Redirection Logic ---
        if (extracted && artistName) { // Artist name is the minimum requirement
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName; // Just search for the artist name
                console.log(`TuneTransporter: Preparing Spotify search for artist: "${searchQuery}"`);
            } else if (itemName) {
                searchQuery = itemName + " " + artistName; // Combine item and artist
                console.log(`TuneTransporter: Preparing Spotify search for item: "${itemName}", artist: "${artistName}"`);
            } else {
                console.warn("TuneTransporter: Extracted artist but item name is missing for non-artist search.");
                showFeedback("TuneTransporter: Error preparing search query.");
                return; // Don't proceed if item name is expected but missing
            }

            const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
            window.location.href = spotifySearchUrl;

        } else if (extracted) { // Extracted but missing required info (e.g., artist name)
            console.warn("TuneTransporter: Extraction flag set but missing artist name.");
            showFeedback("TuneTransporter: Could not extract required info (artist missing).");
        }
        // If !extracted, feedback was already shown inside the specific 'if' block

    } catch (error) {
        console.error("TuneTransporter: Error during YTM to Spotify extraction/redirection:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// --- (initializeWatchPageObserver function remains the same) ---
function initializeWatchPageObserver() {
    // ... existing observer code ...
    // Important: Observer logic remains specific to watch pages (track/artist extraction)
    // It should NOT be modified to handle artist pages.
}


// --- Main execution ---
chrome.storage.local.get(['ytmEnabled'], function (result) {
    if (result.ytmEnabled !== false) {
        // Use a small timeout to allow page elements to settle
        setTimeout(tryExtractAndRedirect, 200);
    } else {
        console.log("TuneTransporter: YTM -> Spotify redirection is disabled in settings.");
    }
});