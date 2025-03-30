﻿// TuneTransporter/ytm2spotify-content.js
// NOTE: showFeedback and processArtistString functions are now loaded from utils.js
console.log("TuneTransporter: YouTube Music to Spotify script loaded.");

// --- Constants ---
const YTM_OBSERVER_TIMEOUT_MS = 10000; // 10 seconds timeout for watch pages

// Selectors
const YTM_PLAYLIST_TITLE_SELECTOR = 'ytmusic-responsive-header-renderer h1 yt-formatted-string.title';
const YTM_PLAYLIST_ARTIST_SELECTOR = 'ytmusic-responsive-header-renderer yt-formatted-string.strapline-text.complex-string';
const YTM_ARTIST_NAME_SELECTOR = 'ytmusic-immersive-header-renderer h1 yt-formatted-string.title';
const YTM_WATCH_QUEUE_ITEM_SELECTOR = 'ytmusic-player-queue-item[selected]';
const YTM_WATCH_TITLE_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .song-title`;
const YTM_WATCH_ARTIST_SELECTOR = `${YTM_WATCH_QUEUE_ITEM_SELECTOR} .byline`;


// --- Core Logic Functions ---

function tryExtractAndRedirect() {
    // NOTE: The check for arrival from Spotify is now handled asynchronously
    // at the main execution entry point using chrome.storage.local.get
    // before this function is potentially called.

    // Check for internal YTM redirect flag (e.g., from search to watch page within YTM)
    if (sessionStorage.getItem('tuneTransporterYTMRedirected') === 'true') {
        sessionStorage.removeItem('tuneTransporterYTMRedirected');
        console.log("TuneTransporter: Detected internal redirect within YTM. Stopping script execution for this specific check.");
        // Note: We might still want the observer to run on watch pages even after internal YTM redirect,
        // so we don't return completely here, just from this initial tryExtractAndRedirect call.
        // The main execution logic below will handle starting the observer if needed.
    }

    const currentUrl = window.location.href;
    let itemName = null;
    let artistName = null;
    let extracted = false;
    let isArtistSearch = false;
    let spotifySearchType = null;

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
                artistName = processArtistString(artistElement.title);

                if (itemName && artistName) {
                    extracted = true;
                    spotifySearchType = 'albums';
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
                artistName = processArtistString(rawArtistName);
                itemName = null;

                if (artistName) {
                    extracted = true;
                    isArtistSearch = true;
                    spotifySearchType = 'artists';
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
        if (extracted && artistName) {
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName;
            } else if (itemName) {
                searchQuery = itemName + " " + artistName;
            } else {
                console.error("TuneTransporter: Artist found but item missing for non-artist search.");
                showFeedback("TuneTransporter: Error preparing search query.");
                return;
            }

            let spotifySearchUrl;
            if (spotifySearchType) {
                spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}/${spotifySearchType}`;
                console.log(`TuneTransporter: Preparing Spotify search with filter '${spotifySearchType}': "${searchQuery}"`);
            } else {
                spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
                console.warn(`TuneTransporter: Using general search for: "${searchQuery}"`);
            }

            console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
            sessionStorage.setItem('tuneTransporterYTMRedirected', 'true');
            window.location.href = spotifySearchUrl;

        } else if (extracted && !artistName) {
            console.warn("TuneTransporter: Extraction seemed successful but artist name is missing.");
            showFeedback("TuneTransporter: Could not extract required artist information.");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during YTM to Spotify redirection:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// Observer for watch pages
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
            const rawTitle = songTitleElement.title?.trim() || songTitleElement.textContent?.trim();
            const rawArtist = artistElement.title?.trim() || artistElement.textContent?.trim();

            if (rawTitle && rawArtist) {
                const trackName = rawTitle;
                const artistName = processArtistString(rawArtist);

                if (trackName && artistName) {
                    console.log(`TuneTransporter: Extracted from Watch Observer - Track: "${trackName}", Artist: "${artistName}"`);
                    redirectionAttempted = true;
                    cleanup("Primary redirection successful");

                    const searchQuery = trackName + " " + artistName;
                    const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}/tracks`;
                    console.log(`TuneTransporter: Preparing Spotify track search: "${searchQuery}"`);

                    console.log(`TuneTransporter: Redirecting to Spotify search: ${spotifySearchUrl}`);
                    sessionStorage.setItem('tuneTransporterYTMRedirected', 'true');
                    window.location.href = spotifySearchUrl;
                } else {
                    console.warn("TuneTransporter: Watch observer - Names were empty after processing.");
                    triggerFallbackRedirect("Empty fields after processing");
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['title', 'class']
    });
    console.log("TuneTransporter: YTM Watch observer started.");
}


// --- Main execution ---
// First, check if we arrived from Spotify via the persistent flag
chrome.storage.local.get(['tuneTransporterFromSpotify'], function (flagResult) {
    if (flagResult.tuneTransporterFromSpotify === true) {
        console.log("TuneTransporter: Detected 'tuneTransporterFromSpotify' flag in storage. Stopping YTM->Spotify script.");
        // Remove the flag so it doesn't interfere with subsequent navigations
        chrome.storage.local.remove('tuneTransporterFromSpotify', () => {
            console.log("TuneTransporter: Removed 'tuneTransporterFromSpotify' flag.");
        });
        // IMPORTANT: Stop execution here, do not proceed to the ytmEnabled check
        return;
    }

    // If the flag wasn't set, proceed with the normal logic
    console.log("TuneTransporter: No 'tuneTransporterFromSpotify' flag found. Proceeding with normal execution.");
    chrome.storage.local.get(['ytmEnabled'], function (settingsResult) {
        // Global sessionStorage check: Was there an internal YTM redirect?
        // This check remains relevant for internal YTM navigations unrelated to Spotify->YTM flow.
        if (sessionStorage.getItem('tuneTransporterYTMRedirected') === 'true') {
            sessionStorage.removeItem('tuneTransporterYTMRedirected');
            console.log("TuneTransporter: Detected internal redirect within YTM at script start. Allowing script to continue (e.g., for observer).");
            // Don't return here, allow the rest of the logic (like observer init) to proceed if enabled.
        }

        // Check if the YTM->Spotify feature is enabled in settings
        if (settingsResult.ytmEnabled !== false) {
            // Use a small delay to allow the page to potentially load more elements
            setTimeout(() => {
                if (window.location.href.startsWith("https://music.youtube.com/watch")) {
                    // On watch pages, initialize the observer (which handles its own extraction/redirect)
                    initializeWatchPageObserver();
                } else {
                    // On other pages (like playlist, album, artist), attempt direct extraction/redirect
                    tryExtractAndRedirect();
                }
            }, 200);
        } else {
            console.log("TuneTransporter: YTM -> Spotify redirection is disabled in settings.");
        }
    });
});