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


function initializeWatchPageObserver() {
    let observer = null;
    let timeoutId = null;
    let redirectionAttempted = false; // Flag to prevent multiple redirects/timeouts

    const cleanup = (reason = "Cleanup called") => {
        if (redirectionAttempted) return; // Already handled
        console.log(`TuneTransporter: Observer cleanup triggered - Reason: ${reason}`);
        if (observer) {
            observer.disconnect();
            observer = null;
            console.log("TuneTransporter: YTM Watch observer disconnected.");
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        redirectionAttempted = true; // Mark as handled
    };

    timeoutId = setTimeout(() => {
        if (redirectionAttempted) return;
        const reason = `Timeout finding elements (${YTM_WATCH_TITLE_SELECTOR}, ${YTM_WATCH_ARTIST_SELECTOR}) within ${YTM_OBSERVER_TIMEOUT_MS / 1000}s.`;
        console.warn(`TuneTransporter: ${reason}`);
        showFeedback(`TuneTransporter: Timed out finding song info.`);
        cleanup("Timeout");
    }, YTM_OBSERVER_TIMEOUT_MS);

    observer = new MutationObserver((mutations, obs) => {
        if (redirectionAttempted) return; // Don't process if already handled

        // Log when the observer callback fires to see if it's running
        // console.log("TuneTransporter: Watch observer callback fired.");

        // Try to find the elements *every time* the observer fires,
        // as the 'selected' attribute might appear/disappear/reappear
        const songTitleElement = document.querySelector(YTM_WATCH_TITLE_SELECTOR);
        const artistElement = document.querySelector(YTM_WATCH_ARTIST_SELECTOR);

        // Add detailed logging (Uncomment for debugging)
        // console.log("TuneTransporter: Checking elements:", {
        //     titleElementFound: !!songTitleElement,
        //     artistElementFound: !!artistElement,
        //     titleAttr: songTitleElement?.title, // Use optional chaining
        //     artistAttr: artistElement?.title    // Use optional chaining
        // });


        if (songTitleElement && songTitleElement.title && artistElement && artistElement.title) {
            // Both elements found AND they have non-empty title attributes

            const trackName = songTitleElement.title.trim();
            // Safer artist extraction: Use title attr first, fallback to text, then cleanup.
            let artistText = (artistElement.title || artistElement.textContent || "").trim();

            // Only split if '•' is present AND there's something before it.
            if (artistText.includes('•') && artistText.split('•')[0].trim()) {
                artistText = artistText.split('•')[0].trim();
            }
            // Ensure we still have something after potential split/trim
            const artistName = artistText;


            if (trackName && artistName) {
                console.log(`TuneTransporter: Extracted from Watch Observer - Track: "${trackName}", Artist: "${artistName}"`);
                const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(trackName + " " + artistName)}`;
                console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);

                cleanup("Redirection successful"); // Stop observing *before* redirecting
                window.location.href = spotifySearchUrl;

            } else if (!timeoutId) { // Should only happen if timeout occurred just before this check
                console.warn("TuneTransporter: Watch observer - Elements found, but processed names were empty.");
                // Don't show feedback here if timeout already did
                // showFeedback("TuneTransporter: Could not extract song info (empty fields).");
            }
        }
        // Else: Elements or their titles not found/ready yet, observer continues...
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        // Observe attributes more broadly in case 'selected' or 'title' aren't the only relevant changes
        attributes: true,
        // Optional: Remove attributeFilter if you suspect other attributes are changing relevantly
        // attributeFilter: ['selected', 'title', 'class'] // Maybe add 'class'? Or remove filter entirely?
    });
    console.log("TuneTransporter: YTM Watch observer started.");
}


// --- Main execution ---
chrome.storage.local.get(['ytmEnabled'], function (result) {
    if (result.ytmEnabled !== false) {
        // Use a small timeout to allow page elements to settle, especially headers
        setTimeout(tryExtractAndRedirect, 200);
    } else {
        console.log("TuneTransporter: YTM -> Spotify redirection is disabled in settings.");
    }
});