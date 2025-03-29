// TuneTransporter/spotify2ytm-content.js
// NOTE: showFeedback function is now loaded from utils.js

// --- Helper Function for Artist String Processing ---
// ***** ENSURE THIS FUNCTION IS PRESENT *****
function processArtistString(artistString) {
    if (!artistString) return null;
    // Splits by common separators like comma, ampersand, "feat."
    const primaryArtists = artistString.split(/,\s*|\s*&\s*|\s+feat\.\s+/i);
    // Trim whitespace and filter out any empty strings resulting from split
    return primaryArtists.map(artist => artist.trim()).filter(Boolean).join(" ");
}
// ********************************************


// --- Spotify Extraction and Redirection Logic ---
// ***** THIS FUNCTION MUST COME *AFTER* processArtistString *****
function spotifyToYTM() {
    let itemName = null;    // Track OR album title
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
                    // *** This is where the call happens ***
                    artistName = processArtistString(potentialArtistStr);
                    if (artistName) { // Check if processArtistString returned a valid name
                        console.log(`TuneTransporter: Extracted Track via Title (Plan A) - Item: "${itemName}", Artist: "${artistName}"`);
                    } else {
                        itemName = null; // Reset if artist processing failed
                        console.log("TuneTransporter: Track title regex processed to empty artist.");
                    }
                } else { console.log("TuneTransporter: Track title regex matched empty groups."); }
            } else { console.log("TuneTransporter: Track title regex did not match."); }

            // --- Plan B: Track DOM Query ---
            // NOTE: These selectors depend on Spotify page structure and may need updates if Spotify changes.
            if (!itemName || !artistName) {
                console.log("TuneTransporter: Track Plan A failed or incomplete, trying DOM (Plan B)...");
                const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
                const artistElement = document.querySelector('a[data-testid="creator-link"]');
                if (titleElement && artistElement) {
                    const potentialTrack = titleElement.textContent?.trim();
                    const potentialArtist = artistElement.textContent?.trim();
                    if (potentialTrack && potentialArtist) {
                        itemName = potentialTrack;
                        artistName = potentialArtist;
                        console.log(`TuneTransporter: Extracted Track via DOM (Plan B) - Item: "${itemName}", Artist: "${artistName}"`);
                    } else { console.log("TuneTransporter: Found Track DOM elements but text was empty."); }
                } else { console.log("TuneTransporter: Could not find Track DOM elements."); }
            }


        } else if (pathname.startsWith('/album/')) {
            console.log("TuneTransporter: Detected Spotify Album page.");
            // --- Plan A: Album Title Regex ---
            console.log("TuneTransporter: Attempting Album title extraction (Plan A)...");
            const titleTagText = document.title;
            const albumTitleMatch = titleTagText.match(/^(.+?)\s*[-–—]\s*(?:album)\s*by\s+(.+?)\s*(?:\| Spotify)?$/i);
            if (albumTitleMatch && albumTitleMatch[1] && albumTitleMatch[2]) {
                const potentialAlbum = albumTitleMatch[1].trim();
                const potentialArtistStr = albumTitleMatch[2];
                if (potentialAlbum && potentialArtistStr) {
                    itemName = potentialAlbum;
                    // *** This is where the call happens ***
                    artistName = processArtistString(potentialArtistStr);
                    if (artistName) { // Check if processArtistString returned a valid name
                        console.log(`TuneTransporter: Extracted Album via Title (Plan A) - Item: "${itemName}", Artist: "${artistName}"`);
                    } else {
                        itemName = null; // Reset if artist processing failed
                        console.log("TuneTransporter: Album title regex processed to empty artist.");
                    }
                } else { console.log("TuneTransporter: Album title regex matched empty groups."); }
            } else { console.log("TuneTransporter: Album title regex did not match."); }

            // --- Plan B: Album DOM Query ---
            // NOTE: These selectors depend on Spotify page structure and may need updates if Spotify changes.
            if (!itemName || !artistName) {
                console.log("TuneTransporter: Album Plan A failed or incomplete, trying DOM (Plan B)...");
                const titleElement = document.querySelector('span[data-testid="entityTitle"] h1'); // **ASSUMPTION**
                const artistElement = document.querySelector('a[data-testid="creator-link"]');    // **ASSUMPTION**
                if (titleElement && artistElement) {
                    const potentialAlbum = titleElement.textContent?.trim();
                    const potentialArtist = artistElement.textContent?.trim();
                    if (potentialAlbum && potentialArtist) {
                        itemName = potentialAlbum;
                        artistName = potentialArtist;
                        console.log(`TuneTransporter: Extracted Album via DOM (Plan B) - Item: "${itemName}", Artist: "${artistName}"`);
                    } else { console.log("TuneTransporter: Found Album DOM elements but text was empty."); }
                } else { console.log("TuneTransporter: Could not find Album DOM elements (selectors might need updating)."); }
            }


        } else if (pathname.startsWith('/artist/')) {
            console.log("TuneTransporter: Detected Spotify Artist page.");
            isArtistSearch = true; // Set flag
            // --- Plan A: Artist Title Regex ---
            console.log("TuneTransporter: Attempting Artist title extraction (Plan A)...");
            const titleTagText = document.title;
            const artistTitleMatch = titleTagText.match(/^(.+?)\s*(?:\| Spotify|- Listen on Spotify)\s*$/i);
            if (artistTitleMatch && artistTitleMatch[1]) {
                const potentialArtist = artistTitleMatch[1].trim();
                if (potentialArtist) {
                    artistName = potentialArtist;
                    itemName = null;
                    console.log(`TuneTransporter: Extracted Artist via Title (Plan A) - Artist: "${artistName}"`);
                } else { console.log("TuneTransporter: Artist title regex matched empty group."); }
            } else { console.log("TuneTransporter: Artist title regex did not match."); }

            // --- Plan B: Artist DOM Query ---
            // NOTE: This selector depends on Spotify page structure and may need updates if Spotify changes.
            if (!artistName) {
                console.log("TuneTransporter: Artist Plan A failed, trying DOM (Plan B)...");
                const artistTitleElement = document.querySelector('span[data-testid="entityTitle"] h1'); // **ASSUMPTION**
                if (artistTitleElement) {
                    const potentialArtist = artistTitleElement.textContent?.trim();
                    if (potentialArtist) {
                        artistName = potentialArtist;
                        itemName = null;
                        console.log(`TuneTransporter: Extracted Artist via DOM (Plan B) - Artist: "${artistName}"`);
                    } else { console.log("TuneTransporter: Found Artist DOM element but text was empty."); }
                } else { console.log("TuneTransporter: Could not find Artist DOM element (selector might need updating)."); }
            }


        } else {
            console.log("TuneTransporter: Page type not recognized for redirection:", pathname);
            return; // Exit if not a recognized type
        }

        // --- Final Check and Redirect (Common for all types) ---
        if (artistName) {
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName;
                console.log(`TuneTransporter: Preparing YTM search for artist: "${searchQuery}"`);
            } else if (itemName) {
                searchQuery = itemName + " " + artistName;
                console.log(`TuneTransporter: Preparing YTM search for item: "${itemName}", artist: "${artistName}"`);
            } else {
                console.warn("TuneTransporter: Artist name found but item name is missing for non-artist search.");
                // Use showFeedback from utils.js
                showFeedback("TuneTransporter: Could not find track/album info on this page.");
                return;
            }

            const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to YTM search: ${youtubeMusicSearchUrl}`);
            window.location.href = youtubeMusicSearchUrl;

        } else {
            console.warn("TuneTransporter: Failed to extract required info (artist name) for redirection.");
            // Use showFeedback from utils.js
            showFeedback("TuneTransporter: Could not find artist/track/album info on this page.");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during Spotify to YTM redirection:", error);
        // Use showFeedback from utils.js
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