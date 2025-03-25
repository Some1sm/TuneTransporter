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


// --- Feedback Function ---
let feedbackTimeoutId = null; // Keep track of the timeout for the feedback message

function showFeedback(message, duration = 5000) {
    // Remove any existing feedback message instantly
    const existingFeedback = document.getElementById('tunetransporter-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
        if (feedbackTimeoutId) {
            clearTimeout(feedbackTimeoutId);
            feedbackTimeoutId = null;
        }
    }

    // Create the feedback element
    const feedbackDiv = document.createElement('div');
    feedbackDiv.id = 'tunetransporter-feedback';
    feedbackDiv.textContent = message;

    // Basic styling - feel free to customize
    Object.assign(feedbackDiv.style, {
        position: 'fixed',
        top: '15px',
        right: '15px',
        backgroundColor: 'rgba(255, 221, 221, 0.95)', // Light red background
        color: '#8B0000', // Dark red text
        padding: '10px 15px',
        borderRadius: '5px',
        zIndex: '99999', // Ensure it's on top
        fontSize: '14px',
        fontFamily: 'sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        opacity: '0', // Start hidden for fade-in
        transition: 'opacity 0.3s ease-in-out'
    });

    // Add to page
    document.body.appendChild(feedbackDiv);

    // Trigger fade-in after append (allows transition to work)
    setTimeout(() => {
        feedbackDiv.style.opacity = '1';
    }, 10);


    // Set timeout to fade out and remove
    feedbackTimeoutId = setTimeout(() => {
        feedbackDiv.style.opacity = '0';
        // Remove from DOM after fade-out completes
        setTimeout(() => {
            if (document.body.contains(feedbackDiv)) {
                document.body.removeChild(feedbackDiv);
            }
            feedbackTimeoutId = null;
        }, 300); // Matches the transition duration
    }, duration);

    // Optional: Allow clicking the message to dismiss it early
    feedbackDiv.addEventListener('click', () => {
        if (feedbackTimeoutId) {
            clearTimeout(feedbackTimeoutId);
            feedbackTimeoutId = null;
        }
        feedbackDiv.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(feedbackDiv)) {
                document.body.removeChild(feedbackDiv);
            }
        }, 300);
    }, { once: true }); // Remove listener after first click
}


// --- Core Logic Functions ---

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
                // Call feedback function here
                showFeedback("TuneTransporter: Could not find song info on this page header.");
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
            // Optionally show feedback if this unexpected case occurs
            // showFeedback("TuneTransporter: Unsupported YTM page type.");
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
            // Call feedback function here
            showFeedback("TuneTransporter: Could not extract song info (empty fields).");
        }
        // No feedback needed if !extracted, as the warning/feedback was shown inside the 'if' block

    } catch (error) {
        console.error("TuneTransporter: Error during YTM to Spotify extraction/redirection:", error);
        // showFeedback("TuneTransporter: An unexpected error occurred.");
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
        // Call feedback function on timeout
        showFeedback(`TuneTransporter: Timed out finding song info (${YTM_OBSERVER_TIMEOUT_MS / 1000}s).`);
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

            } else if (!timeoutId) { // Only log/show feedback if timeout hasn't already fired
                console.warn("TuneTransporter: Watch observer found elements but title/artist text was empty or processing failed.");
                // Call feedback function here
                showFeedback("TuneTransporter: Could not extract song info (empty fields).");
                // Decide if you want to cleanup() here too, or let it keep trying/timeout
                // cleanup(); // Optional: Stop trying if fields are empty once found
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
    // Check explicitly for !== false to handle true or undefined as enabled
    if (result.ytmEnabled !== false) {
        // Use a small timeout. `document_idle` might not guarantee that
        // dynamically loaded header elements (like on playlist/album pages)
        // are fully rendered and available for querySelector.
        setTimeout(tryExtractAndRedirect, 200); // Adjust delay if needed (e.g., 100-500ms)
    } else {
        console.log("TuneTransporter: YTM -> Spotify redirection is disabled in settings.");
    }
});