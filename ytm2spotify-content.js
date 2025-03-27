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

function tryExtractAndRedirect(isPrimaryEnabled, isFallbackEnabled) {
    const currentUrl = window.location.href;
    let itemName = null;
    let artistName = null;
    let extracted = false;
    let isArtistSearch = false;

    // --- This function no longer handles watch pages directly ---
    // --- They are handled by the observer initialized in the main execution block ---

    try {
        // --- Logic for Playlist/Album/Single pages (playlist?list=...) ---
        if (currentUrl.startsWith("https://music.youtube.com/playlist?list=")) {
            // This logic only runs if isPrimaryEnabled is true
            if (!isPrimaryEnabled) {
                console.log("TuneTransporter: Primary YTM->Spotify disabled for Playlist/Album page.");
                return;
            }
            console.log("TuneTransporter: Detected YTM Playlist/Album page.");
            // ... (rest of Playlist/Album extraction remains the same) ...
            const titleElement = document.querySelector(YTM_PLAYLIST_TITLE_SELECTOR);
            const artistElement = document.querySelector(YTM_PLAYLIST_ARTIST_SELECTOR);
            if (titleElement && titleElement.title && artistElement && artistElement.title) {
                itemName = titleElement.title.trim();
                artistName = artistElement.title.trim();
                console.log(`TuneTransporter: Extracted from Header - Item: "${itemName}", Artist: "${artistName}"`);
                extracted = true;
            } else {
                console.warn("TuneTransporter: Could not find title/artist header elements on playlist page...");
                showFeedback("TuneTransporter: Could not find playlist/album info on this page header.");
            }

        }
        // --- Logic for Artist pages (channel/...) ---
        else if (currentUrl.includes("/channel/")) {
            // This logic only runs if isPrimaryEnabled is true
            if (!isPrimaryEnabled) {
                console.log("TuneTransporter: Primary YTM->Spotify disabled for Artist page.");
                return;
            }
            console.log("TuneTransporter: Detected YTM Artist page.");
            // ... (rest of Artist extraction remains the same) ...
            const artistElement = document.querySelector(YTM_ARTIST_NAME_SELECTOR);
            if (artistElement && artistElement.title) {
                artistName = artistElement.title.trim();
                itemName = null;
                console.log(`TuneTransporter: Extracted Artist Name: "${artistName}"`);
                extracted = true;
                isArtistSearch = true;
            } else {
                console.warn("TuneTransporter: Could not find artist name element on channel page...");
                showFeedback("TuneTransporter: Could not find artist info on this page header.");
            }
        }
        // --- Watch pages are handled by observer, non-matching URLs ignored ---
        else if (!currentUrl.startsWith("https://music.youtube.com/watch")) {
            console.log("TuneTransporter: URL doesn't match known YTM patterns for redirection (excluding watch):", currentUrl);
            return;
        }


        // --- Common Redirection Logic (only runs if extracted and primary enabled) ---
        if (extracted && artistName) {
            let searchQuery;
            // ... (searchQuery logic remains the same) ...
            if (isArtistSearch) { searchQuery = artistName; }
            else if (itemName) { searchQuery = itemName + " " + artistName; }
            else { /* handle error */ showFeedback("TuneTransporter: Error preparing search query."); return; }

            const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
            window.location.href = spotifySearchUrl;

        } else if (extracted) {
            console.warn("TuneTransporter: Extraction flag set but missing artist name.");
            showFeedback("TuneTransporter: Could not extract required info (artist missing).");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during YTM to Spotify extraction/redirection:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// Observer now accepts enabled states as parameters
function initializeWatchPageObserver(isPrimaryEnabled, isFallbackEnabled) {
    // Only proceed if either primary or fallback is enabled
    if (!isPrimaryEnabled && !isFallbackEnabled) {
        console.log("TuneTransporter: Both primary and fallback YTM->Spotify are disabled. Observer not starting.");
        return;
    }

    console.log(`TuneTransporter: Initializing observer for watch page. Primary: ${isPrimaryEnabled}, Fallback: ${isFallbackEnabled}`);

    let observer = null;
    let timeoutId = null;
    let redirectionAttempted = false;

    const cleanup = (reason = "Cleanup called") => {
        if (redirectionAttempted) return;
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
        redirectionAttempted = true;
    };

    // --- Fallback Redirect Helper ---
    // Now only needs to check isFallbackEnabled (passed to outer function)
    const triggerFallbackRedirect = (reason) => {
        if (redirectionAttempted) return;

        // Check if the fallback setting passed to the observer is enabled
        if (!isFallbackEnabled) {
            console.log(`TuneTransporter: Primary watch extraction failed (${reason}), and fallback is disabled.`);
            cleanup(`Fallback Disabled: ${reason}`);
            // Show feedback only if primary also failed (or was disabled)
            showFeedback("TuneTransporter: Could not extract song info.");
            return;
        }

        // Fallback is enabled, proceed
        console.warn(`TuneTransporter: Watch page action failed (${reason}). Triggering www.youtube.com fallback.`);
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
                    // --- SUCCESSFUL PRIMARY EXTRACTION ---
                    console.log(`TuneTransporter: Extracted from Watch Observer - Track: "${trackName}", Artist: "${artistName}"`);

                    // **** Check if primary redirection is enabled ****
                    if (isPrimaryEnabled) {
                        const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(trackName + " " + artistName)}`;
                        console.log(`TuneTransporter: Primary redirect enabled. Redirecting to Spotify search: ${spotifySearchUrl}`);
                        cleanup("Primary redirection successful");
                        window.location.href = spotifySearchUrl;
                    } else {
                        // Primary is disabled, but extraction succeeded. Trigger fallback *if enabled*.
                        console.log("TuneTransporter: Primary redirect disabled, but extraction succeeded. Checking fallback.");
                        triggerFallbackRedirect("Primary disabled");
                    }
                    // ---------------------------------------
                } else { // Found elements but empty fields -> Trigger Fallback
                    if (timeoutId) { // Check if timeout hasn't already handled it
                        console.warn("TuneTransporter: Watch observer - Elements found, but processed names were empty.");
                        triggerFallbackRedirect("Empty fields");
                    }
                }
            }
            // Else: Elements exist, but title attributes are not ready yet...
        }
        // Else: Elements not found yet...
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
    });
    console.log("TuneTransporter: YTM Watch observer started.");
}


// --- Main execution ---
// Read BOTH settings initially
chrome.storage.local.get(['ytmEnabled', 'ytmFallbackEnabled'], function (settings) {
    const isPrimaryEnabled = settings.ytmEnabled !== false; // Default true
    const isFallbackEnabled = settings.ytmFallbackEnabled === true; // Default false

    // If it's a watch page, always call the observer initialization function,
    // passing the settings. The observer function itself will decide if it needs to run.
    if (window.location.href.startsWith("https://music.youtube.com/watch")) {
        // Use a timeout to let page settle before starting observer
        setTimeout(() => initializeWatchPageObserver(isPrimaryEnabled, isFallbackEnabled), 200);
    }
    // For other page types (Playlist/Artist), only run the direct extraction if primary is enabled
    else if (isPrimaryEnabled) {
        // Use a timeout to let page settle
        setTimeout(() => tryExtractAndRedirect(isPrimaryEnabled, isFallbackEnabled), 200);
    }
    // If primary is disabled and it's not a watch page, do nothing.
    else {
        console.log("TuneTransporter: YTM -> Spotify primary redirection is disabled for this page type.");
    }
});