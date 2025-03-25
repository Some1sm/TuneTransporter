// ytm2spotify-content.js
console.log("TuneTransporter: YouTube Music to Spotify script loaded.");

// --- Constants ---
const YTM_OBSERVER_TIMEOUT_MS = 10000; // 10 seconds timeout for watch pages

// Selectors for Playlist/Album/Single pages (Header)
const YTM_PLAYLIST_TITLE_SELECTOR = 'h1 yt-formatted-string.title';
const YTM_PLAYLIST_ARTIST_SELECTOR = 'yt-formatted-string.strapline-text.complex-string';

// Selectors for Watch pages (Player Queue)
const YTM_WATCH_QUEUE_ITEM_SELECTOR = 'ytmusic-player-queue-item[selected]';
const YTM_WATCH_TITLE_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .song-title`;
const YTM_WATCH_ARTIST_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .byline`;

// --- Functions ---

function tryExtractAndRedirect() {
    const currentUrl = window.location.href;
    let trackName = null;
    let artistName = null;
    let extracted = false;

    try {
        // --- Logic for Playlist/Album/Single pages (playlist?list=...) ---
        if (currentUrl.startsWith("https://music.youtube.com/playlist?list=")) {
            console.log("TuneTransporter: Detected YTM Playlist/Album page.");
            // Use selectors based on the provided HTML structure
            const titleElement = document.querySelector(YTM_PLAYLIST_TITLE_SELECTOR);
            // Artist is often in the 'strapline', get its title attribute which usually combines them
            const artistElement = document.querySelector(YTM_PLAYLIST_ARTIST_SELECTOR);

            if (titleElement && titleElement.title && artistElement && artistElement.title) {
                // For albums/playlists, titleElement.title is the album/playlist name
                trackName = titleElement.title.trim();
                // artistElement.title usually contains the combined artist names
                artistName = artistElement.title.trim();
                console.log(`TuneTransporter: Extracted from Header - Title: "${trackName}", Artist: "${artistName}"`);
                extracted = true;
            } else {
                console.warn("TuneTransporter: Could not find title/artist header elements on playlist page using selectors:", YTM_PLAYLIST_TITLE_SELECTOR, YTM_PLAYLIST_ARTIST_SELECTOR);
            }
        }
        // --- Logic for Watch pages (watch?v=...) ---
        else if (currentUrl.startsWith("https://music.youtube.com/watch")) {
            console.log("TuneTransporter: Detected YTM watch page. Initializing observer.");
            // Watch page logic needs the observer as elements load dynamically
            initializeWatchPageObserver();
            return; // Observer will handle redirection asynchronously
        } else {
            // Should not happen based on manifest matches, but good for safety
            console.log("TuneTransporter: URL doesn't match known YTM patterns for redirection:", currentUrl);
            return;
        }

        // --- Common Redirection Logic (if extracted directly) ---
        if (extracted && trackName && artistName) {
            const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(trackName + " " + artistName)}`;
            console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
            // Redirect
            window.location.href = spotifySearchUrl;
        } else if (extracted) { // Extracted flag is true, but track/artist name is missing
            console.warn("TuneTransporter: Found elements but extracted names were empty.");
        } else {
            // If not extracted (e.g., elements not found on playlist page), log it
            console.warn("TuneTransporter: Could not extract track/artist info directly from page elements.");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during YTM to Spotify extraction/redirection:", error);
    }
}


function initializeWatchPageObserver() {
    let observer = null;
    let timeoutId = null;

    const cleanup = () => {
        if (observer) {
            observer.disconnect();
            observer = null;
            console.log("TuneTransporter: YTM Watch observer disconnected.");
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    timeoutId = setTimeout(() => {
        console.warn(`TuneTransporter: Watch page observer timeout. Could not find elements using selectors (${YTM_WATCH_TITLE_SELECTOR}, ${YTM_WATCH_ARTIST_SELECTOR}) within ${YTM_OBSERVER_TIMEOUT_MS / 1000} seconds.`);
        cleanup();
    }, YTM_OBSERVER_TIMEOUT_MS);

    observer = new MutationObserver((mutations, obs) => {
        // Selectors specific to the watch page player UI
        const songTitleElement = document.querySelector(YTM_WATCH_TITLE_SELECTOR);
        const artistElement = document.querySelector(YTM_WATCH_ARTIST_SELECTOR);

        if (songTitleElement && songTitleElement.title && artistElement) {
            // Attempt to get artist text more reliably
            let artistText = artistElement.title || artistElement.textContent; // Fallback to textContent
            // Clean up common extra text like "• Album • Year"
            artistText = artistText.split('•')[0].trim();

            if (songTitleElement.title.trim() && artistText) {
                const trackName = songTitleElement.title.trim();
                const artistName = artistText;

                console.log(`TuneTransporter: Extracted from Watch Observer - Track: "${trackName}", Artist: "${artistName}"`);
                const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(trackName + " " + artistName)}`;
                console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);

                cleanup(); // Stop observing *before* redirecting
                window.location.href = spotifySearchUrl;

            } else if (!timeoutId) { // Only log warning if timeout hasn't already occurred
                console.warn("TuneTransporter: Watch observer found elements but title/artist text was empty or processing failed.");
            }
        }
        // Else: Elements not found yet, observer continues...
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['selected', 'title'] // Optimization remains useful
    });
    console.log("TuneTransporter: YTM Watch observer started.");
}


// --- Main execution ---
chrome.storage.local.get(['ytmEnabled'], function (result) {
    if (result.ytmEnabled !== false) {
        // Use a small timeout. `document_idle` might not guarantee that
        // dynamically loaded header elements (like on playlist/album pages)
        // are fully rendered and available for querySelector.
        setTimeout(tryExtractAndRedirect, 200); // Adjust delay if needed (e.g., 100-500ms)
    } else {
        console.log("TuneTransporter: YTM -> Spotify redirection is disabled in settings.");
    }
});