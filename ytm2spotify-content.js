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

// This function now only handles non-watch pages
function tryExtractAndRedirect() {
    const currentUrl = window.location.href;
    let itemName = null;
    let artistName = null;
    let extracted = false;
    let isArtistSearch = false;

    // Watch pages are handled by observer initiated in main execution block
    if (currentUrl.startsWith("https://music.youtube.com/watch")) {
        return; // Should not be called for watch pages anymore
    }

    try {
        // --- Logic for Playlist/Album/Single pages ---
        if (currentUrl.startsWith("https://music.youtube.com/playlist?list=")) {
            console.log("TuneTransporter: Detected YTM Playlist/Album page.");
            // ... (Playlist/Album extraction logic as before) ...
            const titleElement = document.querySelector(YTM_PLAYLIST_TITLE_SELECTOR);
            const artistElement = document.querySelector(YTM_PLAYLIST_ARTIST_SELECTOR);
            if (titleElement && titleElement.title && artistElement && artistElement.title) { /* ... set itemName, artistName, extracted = true ... */ }
            else { /* ... log warning, showFeedback ... */ }
        }
        // --- Logic for Artist pages ---
        else if (currentUrl.includes("/channel/")) {
            console.log("TuneTransporter: Detected YTM Artist page.");
            // ... (Artist extraction logic as before) ...
            const artistElement = document.querySelector(YTM_ARTIST_NAME_SELECTOR);
            if (artistElement && artistElement.title) { /* ... set artistName, itemName = null, extracted = true, isArtistSearch = true ... */ }
            else { /* ... log warning, showFeedback ... */ }
        }
        // --- Unknown Page Type ---
        else {
            console.log("TuneTransporter: URL doesn't match known YTM patterns for redirection:", currentUrl);
            return;
        }

        // --- Common Redirection Logic ---
        if (extracted && artistName) {
            // ... (searchQuery construction and redirect as before) ...
            let searchQuery;
            if (isArtistSearch) { searchQuery = artistName; }
            else if (itemName) { searchQuery = itemName + " " + artistName; }
            else { /* handle error */ showFeedback("TuneTransporter: Error preparing search query."); return; }

            const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
            window.location.href = spotifySearchUrl;
        } else if (extracted) {
            // ... (handle missing artist name as before) ...
        }

    } catch (error) {
        // ... (error handling) ...
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
        redirectionAttempted = true;
    };

    // --- Fallback Redirect Helper ---
    // No longer needs to check storage, assumes ytmEnabled was true to get here
    const triggerFallbackRedirect = (reason) => {
        if (redirectionAttempted) return;

        // Fallback is triggered because primary failed AND ytmEnabled must be true
        console.warn(`TuneTransporter: Primary watch extraction failed (${reason}). Triggering www.youtube.com fallback.`);
        cleanup(`Fallback Triggered: ${reason}`);

        const currentUrl = new URL(window.location.href);
        currentUrl.hostname = 'www.youtube.com';
        currentUrl.hash = '#tunetransporter-fallback';

        console.log(`TuneTransporter: Redirecting to fallback URL: ${currentUrl.href}`);
        window.location.href = currentUrl.href;
        redirectionAttempted = true;
    };
    // ------------------------------------

    timeoutId = setTimeout(() => {
        if (redirectionAttempted) return;
        triggerFallbackRedirect("Timeout");
    }, YTM_OBSERVER_TIMEOUT_MS);

    observer = new MutationObserver((mutations, obs) => {
        if (redirectionAttempted) return;

        const songTitleElement = document.querySelector(YTM_WATCH_TITLE_SELECTOR);
        const artistElement = document.querySelector(YTM_WATCH_ARTIST_SELECTOR);

        if (songTitleElement && artistElement) {
            if (songTitleElement.title && artistElement.title) {
                const trackName = songTitleElement.title.trim();
                let artistText = (artistElement.title || artistElement.textContent || "").trim();
                if (artistText.includes('•') && artistText.split('•')[0].trim()) {
                    artistText = artistText.split('•')[0].trim();
                }
                const artistName = artistText;

                if (trackName && artistName) {
                    // --- SUCCESS CASE (Primary redirect) ---
                    console.log(`TuneTransporter: Extracted from Watch Observer - Track: "${trackName}", Artist: "${artistName}"`);
                    const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(trackName + " " + artistName)}`;
                    console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
                    cleanup("Primary redirection successful");
                    window.location.href = spotifySearchUrl;
                    // ---------------------------------------
                } else { // Found elements but empty fields -> Trigger Fallback
                    if (timeoutId) {
                        console.warn("TuneTransporter: Watch observer - Elements found, but processed names were empty.");
                        triggerFallbackRedirect("Empty fields");
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    console.log("TuneTransporter: YTM Watch observer started.");
}


// --- Main execution ---
// Only check the main YTM toggle
chrome.storage.local.get(['ytmEnabled'], function (result) {
    if (result.ytmEnabled !== false) { // If primary YTM->Spotify is enabled...
        // Use a timeout to let page settle
        setTimeout(() => {
            // Decide whether to run observer or direct extraction based on page type
            if (window.location.href.startsWith("https://music.youtube.com/watch")) {
                initializeWatchPageObserver();
            } else {
                tryExtractAndRedirect(); // Handles playlist/artist pages
            }
        }, 200);
    } else {
        console.log("TuneTransporter: YTM -> Spotify redirection is disabled in settings.");
        // No need to check fallback here anymore
    }
});