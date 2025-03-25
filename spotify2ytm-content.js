// --- (Feedback Function goes here) ---
// ... (showFeedback function code) ...

// --- (processArtistString Helper Function goes here) ---
// ... (processArtistString function code) ...

// --- Spotify Extraction and Redirection Logic ---
function spotifyToYTM() {
    let itemName = null;    // Track OR album title
    let artistName = null;  // Artist name (always needed)
    const pathname = window.location.pathname;
    let isArtistSearch = false; // Flag for artist-only searches

    try {
        // --- Detect Page Type ---
        if (pathname.startsWith('/track/')) {
            console.log("TuneTransporter: Detected Spotify Track page.");
            // ... (Track extraction logic remains the same) ...
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
                    console.log(`TuneTransporter: Extracted Track via Title (Plan A) - Item: "${itemName}", Artist: "${artistName}"`);
                } else { console.log("TuneTransporter: Track title regex matched empty groups."); }
            } else { console.log("TuneTransporter: Track title regex did not match."); }

            // --- Plan B: Track DOM Query ---
            if (!itemName || !artistName) {
                console.log("TuneTransporter: Track Plan A failed, trying DOM (Plan B)...");
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
            // ... (Album extraction logic remains the same) ...
            // --- Plan A: Album Title Regex ---
            console.log("TuneTransporter: Attempting Album title extraction (Plan A)...");
            const titleTagText = document.title;
            const albumTitleMatch = titleTagText.match(/^(.+?)\s*[-–—]\s*(?:album)\s*by\s+(.+?)\s*(?:\| Spotify)?$/i);
            if (albumTitleMatch && albumTitleMatch[1] && albumTitleMatch[2]) {
                const potentialAlbum = albumTitleMatch[1].trim();
                const potentialArtistStr = albumTitleMatch[2];
                if (potentialAlbum && potentialArtistStr) {
                    itemName = potentialAlbum;
                    artistName = processArtistString(potentialArtistStr);
                    console.log(`TuneTransporter: Extracted Album via Title (Plan A) - Item: "${itemName}", Artist: "${artistName}"`);
                } else { console.log("TuneTransporter: Album title regex matched empty groups."); }
            } else { console.log("TuneTransporter: Album title regex did not match."); }

            // --- Plan B: Album DOM Query ---
            // ** VERIFICATION STILL NEEDED FOR ALBUM DOM SELECTORS **
            if (!itemName || !artistName) {
                console.log("TuneTransporter: Album Plan A failed, trying DOM (Plan B)...");
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
            // Regex for artists: "Artist Name | Spotify" (Simpler)
            // Or potentially "Artist Name - Listen on Spotify"
            // Let's try a flexible one: Match anything before " | Spotify" or " - Listen on Spotify"
            const artistTitleMatch = titleTagText.match(/^(.+?)\s*(?:\| Spotify|- Listen on Spotify)\s*$/i);
            if (artistTitleMatch && artistTitleMatch[1]) {
                const potentialArtist = artistTitleMatch[1].trim();
                if (potentialArtist) {
                    artistName = potentialArtist; // Use directly, no need for processArtistString
                    itemName = null; // Explicitly null for artist search
                    console.log(`TuneTransporter: Extracted Artist via Title (Plan A) - Artist: "${artistName}"`);
                } else { console.log("TuneTransporter: Artist title regex matched empty group."); }
            } else { console.log("TuneTransporter: Artist title regex did not match."); }

            // --- Plan B: Artist DOM Query ---
            // On artist pages, the main H1 *is* the artist name.
            // We assume the same 'entityTitle' data-testid is used for the main heading.
            // **This needs verification by inspecting an actual Spotify artist page.**
            if (!artistName) {
                console.log("TuneTransporter: Artist Plan A failed, trying DOM (Plan B)...");
                const artistTitleElement = document.querySelector('span[data-testid="entityTitle"] h1'); // **ASSUMPTION**
                if (artistTitleElement) {
                    const potentialArtist = artistTitleElement.textContent?.trim();
                    if (potentialArtist) {
                        artistName = potentialArtist;
                        itemName = null; // Explicitly null for artist search
                        console.log(`TuneTransporter: Extracted Artist via DOM (Plan B) - Artist: "${artistName}"`);
                    } else { console.log("TuneTransporter: Found Artist DOM element but text was empty."); }
                } else { console.log("TuneTransporter: Could not find Artist DOM element (selector might need updating)."); }
            }


        } else {
            console.log("TuneTransporter: Page type not recognized for redirection:", pathname);
            return; // Exit if not a recognized type
        }

        // --- Final Check and Redirect (Common for all types) ---
        if (artistName) { // Artist name is the minimum requirement now
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName; // Just search for the artist name
                console.log(`TuneTransporter: Preparing YTM search for artist: "${searchQuery}"`);
            } else if (itemName) { // If it's a track or album
                searchQuery = itemName + " " + artistName; // Combine item and artist
                console.log(`TuneTransporter: Preparing YTM search for item: "${itemName}", artist: "${artistName}"`);
            } else {
                // This case shouldn't happen if logic is correct (would mean track/album failed extraction)
                console.warn("TuneTransporter: Artist name found but item name is missing for non-artist search.");
                showFeedback("TuneTransporter: Could not find track/album info on this page.");
                return;
            }

            const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to YTM search: ${youtubeMusicSearchUrl}`);
            window.location.href = youtubeMusicSearchUrl;

        } else {
            // If artistName is still null after all attempts for the detected page type
            console.warn("TuneTransporter: Failed to extract required info (artist name) for redirection.");
            showFeedback("TuneTransporter: Could not find artist/track/album info on this page."); // More generic message
        }

    } catch (error) {
        console.error("TuneTransporter: Error during Spotify to YTM redirection:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// --- Main execution ---
chrome.storage.local.get(['spotifyEnabled'], function (result) {
    if (result.spotifyEnabled !== false) {
        spotifyToYTM();
    } else {
        console.log("TuneTransporter: Spotify -> YTM redirection is disabled in settings.");
    }
});