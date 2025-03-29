// TuneTransporter/spotify2ytm-content.js
// NOTE: showFeedback and processArtistString functions are now loaded from utils.js

// --- Spotify Extraction and Redirection Logic ---
function spotifyToYTM() {
    let itemName = null;    // Track OR album/single title
    let artistName = null;  // Artist name (always needed)
    const pathname = window.location.pathname;
    let isArtistSearch = false; // Flag for artist-only searches

    try {
        // --- Detect Page Type ---
        if (pathname.startsWith('/track/')) {
            console.log("TuneTransporter: Detected Spotify Track page.");
            // --- Plan A: Track Title Regex ---
            console.log("TuneTransporter: Attempting Track title extraction (Plan A)...");
            const titleTagText = document.title;
            const trackTitleMatch = titleTagText.match(/^(.+?)\s*[-–—]\s*(?:song|lyrics)\s*(?:and lyrics)?\s*by\s+(.+?)\s*(?:\| Spotify)?$/i);
            if (trackTitleMatch && trackTitleMatch[1] && trackTitleMatch[2]) {
                const potentialTrack = trackTitleMatch[1].trim();
                const potentialArtistStr = trackTitleMatch[2];
                if (potentialTrack && potentialArtistStr) {
                    itemName = potentialTrack;
                    artistName = processArtistString(potentialArtistStr);
                    if (artistName) {
                        console.log(`TuneTransporter: Extracted Track via Title (Plan A) - Item: "${itemName}", Artist: "${artistName}"`);
                    } else { /* ... error handling ... */ }
                } else { /* ... error handling ... */ }
            } else { console.log("TuneTransporter: Track title regex did not match."); }

            // --- Plan B: Track DOM Query ---
            if (!itemName || !artistName) {
                console.log("TuneTransporter: Track Plan A failed or incomplete, trying DOM (Plan B)...");
                const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
                const artistElement = document.querySelector('a[data-testid="creator-link"]');
                if (titleElement && artistElement) {
                    const potentialTrack = titleElement.textContent?.trim();
                    const potentialArtist = artistElement.textContent?.trim();
                    if (potentialTrack && potentialArtist) {
                        itemName = potentialTrack;
                        artistName = processArtistString(potentialArtist);
                        if (artistName) {
                            console.log(`TuneTransporter: Extracted Track via DOM (Plan B) - Item: "${itemName}", Artist: "${artistName}"`);
                        } else { /* ... error handling ... */ }
                    } else { /* ... error handling ... */ }
                } else { console.log("TuneTransporter: Could not find Track DOM elements."); }
            }


        } else if (pathname.startsWith('/album/')) { // This covers Albums AND Singles
            console.log("TuneTransporter: Detected Spotify Album/Single page."); // Updated log message
            // --- Plan A: Album/Single Title Regex ---
            console.log("TuneTransporter: Attempting Album/Single title extraction (Plan A)...");
            const titleTagText = document.title;
            // <<< MODIFIED REGEX: Accept 'album' OR 'single' >>>
            const albumTitleMatch = titleTagText.match(/^(.+?)\s*[-–—]\s*(?:album|single)\s*by\s+(.+?)\s*(?:\| Spotify)?$/i);
            if (albumTitleMatch && albumTitleMatch[1] && albumTitleMatch[2]) {
                const potentialAlbum = albumTitleMatch[1].trim();
                const potentialArtistStr = albumTitleMatch[2];
                if (potentialAlbum && potentialArtistStr) {
                    itemName = potentialAlbum;
                    artistName = processArtistString(potentialArtistStr);
                    if (artistName) {
                        console.log(`TuneTransporter: Extracted Album/Single via Title (Plan A) - Item: "${itemName}", Artist: "${artistName}"`);
                    } else {
                        itemName = null; // Reset if artist processing failed
                        console.log("TuneTransporter: Album/Single title regex processed to empty artist.");
                    }
                } else { console.log("TuneTransporter: Album/Single title regex matched empty groups."); }
            } else { console.log("TuneTransporter: Album/Single title regex did not match."); } // Expected fail on pages not matching pattern

            // --- Plan B: Album/Single DOM Query ---
            // NOTE: Assuming selectors work for both Albums and Singles. If Plan B still fails
            // specifically for Singles after Plan A is fixed, these selectors might need revisiting.
            if (!itemName || !artistName) {
                console.log("TuneTransporter: Album/Single Plan A failed or incomplete, trying DOM (Plan B)...");
                const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
                const artistElement = document.querySelector('a[data-testid="creator-link"]');
                if (titleElement && artistElement) {
                    const potentialAlbum = titleElement.textContent?.trim();
                    const potentialArtist = artistElement.textContent?.trim();
                    if (potentialAlbum && potentialArtist) {
                        itemName = potentialAlbum;
                        artistName = processArtistString(potentialArtist);
                        if (artistName) {
                            console.log(`TuneTransporter: Extracted Album/Single via DOM (Plan B) - Item: "${itemName}", Artist: "${artistName}"`);
                        } else {
                            itemName = null;
                            console.log("TuneTransporter: Album/Single DOM extraction processed to empty artist.");
                        }
                    } else { console.log("TuneTransporter: Found Album/Single DOM elements but text was empty."); }
                } else {
                    // Log slightly differently if it failed Plan A already
                    if (albumTitleMatch) { // Plan A matched but failed processing artist
                        console.log("TuneTransporter: Could not find Album/Single DOM elements (Plan B).");
                    } else { // Plan A didn't even match
                        console.log("TuneTransporter: Could not find Album/Single DOM elements (Plan B fallback).");
                    }
                }
            }


        } else if (pathname.startsWith('/artist/')) {
            console.log("TuneTransporter: Detected Spotify Artist page.");
            isArtistSearch = true;
            // --- Plan A: Artist Title Regex ---
            console.log("TuneTransporter: Attempting Artist title extraction (Plan A)...");
            const titleTagText = document.title;
            const artistTitleMatch = titleTagText.match(/^(.+?)\s*(?:•.*?)?\s*(?:\| Spotify|- Listen on Spotify)\s*$/i);
            if (artistTitleMatch && artistTitleMatch[1]) {
                const potentialArtist = artistTitleMatch[1].trim();
                if (potentialArtist) {
                    artistName = processArtistString(potentialArtist);
                    itemName = null;
                    if (artistName) {
                        console.log(`TuneTransporter: Extracted Artist via Title (Plan A) - Artist: "${artistName}"`);
                    } else { /* ... error handling ... */ }
                } else { /* ... error handling ... */ }
            } else { console.log("TuneTransporter: Artist title regex did not match."); }

            // --- Plan B: Artist DOM Query ---
            if (!artistName) {
                console.log("TuneTransporter: Artist Plan A failed, trying DOM (Plan B)...");
                const artistTitleElement = document.querySelector('span[data-testid="entityTitle"] h1');
                if (artistTitleElement) {
                    const potentialArtist = artistTitleElement.textContent?.trim();
                    if (potentialArtist) {
                        artistName = processArtistString(potentialArtist);
                        itemName = null;
                        if (artistName) {
                            console.log(`TuneTransporter: Extracted Artist via DOM (Plan B) - Artist: "${artistName}"`);
                        } else { /* ... error handling ... */ }
                    } else { /* ... error handling ... */ }
                } else { console.log("TuneTransporter: Could not find Artist DOM element (selector might need updating)."); }
            }


        } else {
            console.log("TuneTransporter: Page type not recognized for redirection:", pathname);
            return; // Exit if not a recognized type
        }

        // --- Final Check and Redirect (Common for all types) ---
        if (artistName) { // Check if artistName is truthy (not null or empty)
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName;
                console.log(`TuneTransporter: Preparing YTM search for artist: "${searchQuery}"`);
            } else if (itemName) {
                searchQuery = itemName + " " + artistName;
                console.log(`TuneTransporter: Preparing YTM search for item: "${itemName}", artist: "${artistName}"`);
            } else {
                console.warn("TuneTransporter: Artist name found but item name is missing for non-artist search. Aborting.");
                showFeedback("TuneTransporter: Could not find track/album/single info on this page.");
                return;
            }

            const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to YTM search: ${youtubeMusicSearchUrl}`);
            window.location.href = youtubeMusicSearchUrl;

        } else {
            console.warn("TuneTransporter: Failed to extract required info (artist name) after processing.");
            showFeedback("TuneTransporter: Could not find artist/track/album/single info on this page."); // Updated message
        }

    } catch (error) {
        console.error("TuneTransporter: Error during Spotify to YTM redirection:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// --- Main execution ---
chrome.storage.local.get(['spotifyEnabled'], function (result) {
    if (result.spotifyEnabled !== false) {
        // Wait a tiny bit for the page title/DOM to potentially stabilize further
        setTimeout(spotifyToYTM, 200);
    } else {
        console.log("TuneTransporter: Spotify -> YTM redirection is disabled in settings.");
    }
});