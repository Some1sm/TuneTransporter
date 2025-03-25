// ytm2spotify-content.js
console.log("TuneTransporter: YouTube Music to Spotify script loaded.");

const YTM_OBSERVER_TIMEOUT_MS = 10000; // 10 seconds timeout for watch pages

function tryExtractAndRedirect() {
    const currentUrl = window.location.href;
    let trackName = null;
    let artistName = null;
    let extracted = false;

    try {
        // --- Logic for Playlist/Album/Single pages (playlist?list=...) ---
        if (currentUrl.startsWith("https://music.youtube.com/playlist")) {
            console.log("TuneTransporter: Detected YTM Playlist/Album page.");
            // Use selectors based on the provided HTML structure
            const titleElement = document.querySelector('h1 yt-formatted-string.title');
            // Artist is often in the 'strapline', get its title attribute which usually combines them
            const artistElement = document.querySelector('yt-formatted-string.strapline-text.complex-string');

            if (titleElement && titleElement.title && artistElement && artistElement.title) {
                // For albums/playlists, titleElement.title is the album/playlist name
                trackName = titleElement.title.trim();
                // artistElement.title usually contains the combined artist names
                artistName = artistElement.title.trim();
                console.log(`TuneTransporter: Extracted from Header - Title: "${trackName}", Artist: "${artistName}"`);
                extracted = true;
            } else {
                console.warn("TuneTransporter: Could not find title/artist header elements on playlist page. Structure might have changed.");
                // Optionally, could add a small delay and retry querySelector once, but avoid complex loops here.
            }
        }
        // --- Logic for Watch pages (watch?v=...) ---
        // This part remains largely the same, using MutationObserver
        else if (currentUrl.startsWith("https://music.youtube.com/watch")) {
            console.log("TuneTransporter: Detected YTM watch page. Initializing observer.");
            // Watch page logic needs the observer as elements load dynamically
            initializeWatchPageObserver();
            return; // Observer will handle redirection asynchronously
        } else {
            // Should not happen based on manifest matches, but good for safety
            console.log("TuneTransporter: URL doesn't match known YTM patterns for redirection.");
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
        }
        // If not extracted (e.g., elements not found on playlist page), do nothing further here.

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
        console.warn("TuneTransporter: Watch page observer timeout. Could not find song/artist elements within " + (YTM_OBSERVER_TIMEOUT_MS / 1000) + " seconds.");
        cleanup();
    }, YTM_OBSERVER_TIMEOUT_MS);

    observer = new MutationObserver((mutations, obs) => {
        // Selectors specific to the watch page player UI
        const songTitleElement = document.querySelector('ytmusic-player-queue-item[selected] .song-title');
        const artistElement = document.querySelector('ytmusic-player-queue-item[selected] .byline'); // Or '.byline yt-formatted-string a' ? Needs testing

        if (songTitleElement && songTitleElement.title && artistElement) {
            // Attempt to get artist text more reliably
            let artistText = artistElement.title || artistElement.textContent; // Fallback to textContent
            artistText = artistText.split('•')[0].trim(); // Often includes "• Album • Year", remove that part. Adjust if separator changes.


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
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true, // Keep watching attributes like 'selected'
        attributeFilter: ['selected', 'title'] // Optimization: only trigger on relevant attribute changes
    });
    console.log("TuneTransporter: YTM Watch observer started.");
}


// --- Main execution ---
chrome.storage.local.get(['ytmEnabled'], function (result) {
    if (result.ytmEnabled === true) {
        // Use a small timeout to allow the page structure (especially headers) to settle
        // run_at: document_idle + short timeout is usually robust enough.
        setTimeout(tryExtractAndRedirect, 200); // Small delay (e.g., 200ms) before trying extraction
    } else {
        console.log("TuneTransporter: YTM -> Spotify redirection is disabled in settings.");
    }
});