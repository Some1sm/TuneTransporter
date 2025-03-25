// --- (Feedback Function goes here) ---
let feedbackTimeoutId = null;
// ... (showFeedback function code) ...

// --- Helper Function for Artist String Processing ---
function processArtistString(artistString) {
    if (!artistString) return null;
    const primaryArtists = artistString.split(/,\s*|\s*&\s*|\s+feat\.\s+/i);
    // Filter out empty strings that might result from splitting
    return primaryArtists.map(artist => artist.trim()).filter(Boolean).join(" ");
}

// --- Spotify Extraction and Redirection Logic ---
function spotifyToYTM() {
    let itemName = null;    // Can be track OR album title
    let artistName = null;
    const pathname = window.location.pathname;

    try {
        // --- Detect Page Type ---
        if (pathname.startsWith('/track/')) {
            console.log("TuneTransporter: Detected Spotify Track page.");

            // --- Plan A: Track Title Regex ---
            console.log("TuneTransporter: Attempting Track title extraction (Plan A)...");
            const titleTagText = document.title;
            // Regex for tracks: "Track Name - song by Artist Name | Spotify"
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
                    // For tracks, artist is usually a single link here
                    const potentialArtist = artistElement.textContent?.trim();
                    if (potentialTrack && potentialArtist) {
                        itemName = potentialTrack;
                        artistName = potentialArtist; // Use directly
                        console.log(`TuneTransporter: Extracted Track via DOM (Plan B) - Item: "${itemName}", Artist: "${artistName}"`);
                    } else { console.log("TuneTransporter: Found Track DOM elements but text was empty."); }
                } else { console.log("TuneTransporter: Could not find Track DOM elements."); }
            }

        } else if (pathname.startsWith('/album/')) {
            console.log("TuneTransporter: Detected Spotify Album page.");

            // --- Plan A: Album Title Regex ---
            console.log("TuneTransporter: Attempting Album title extraction (Plan A)...");
            const titleTagText = document.title;
            // Regex for albums: "Album Title - album by Artist Name | Spotify"
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
            // NOTE: We assume the same data-testid attributes might be used for the main title/artist on album pages.
            // **This needs verification by inspecting an actual Spotify album page.**
            if (!itemName || !artistName) {
                console.log("TuneTransporter: Album Plan A failed, trying DOM (Plan B)...");
                const titleElement = document.querySelector('span[data-testid="entityTitle"] h1'); // **ASSUMPTION**
                const artistElement = document.querySelector('a[data-testid="creator-link"]');    // **ASSUMPTION**
                if (titleElement && artistElement) {
                    const potentialAlbum = titleElement.textContent?.trim();
                    // For albums, the creator link is likely the main artist
                    const potentialArtist = artistElement.textContent?.trim();
                    if (potentialAlbum && potentialArtist) {
                        itemName = potentialAlbum;
                        artistName = potentialArtist; // Use directly
                        console.log(`TuneTransporter: Extracted Album via DOM (Plan B) - Item: "${itemName}", Artist: "${artistName}"`);
                    } else { console.log("TuneTransporter: Found Album DOM elements but text was empty."); }
                } else { console.log("TuneTransporter: Could not find Album DOM elements (selectors might need updating)."); }
            }

        } else {
            console.log("TuneTransporter: Page type not recognized for redirection:", pathname);
            return; // Exit if not a recognized type
        }

        // --- Final Check and Redirect (Common for both track/album) ---
        if (itemName && artistName) {
            // Construct the YouTube Music *website* search URL
            const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(itemName + " " + artistName)}`;
            console.log(`TuneTransporter: Redirecting to YTM search for "${itemName}" by "${artistName}": ${youtubeMusicSearchUrl}`);
            window.location.href = youtubeMusicSearchUrl;
        } else {
            // If *all* methods failed for the detected page type
            console.warn("TuneTransporter: Failed to extract item/artist info for redirection.");
            // Update feedback message slightly
            showFeedback("TuneTransporter: Could not find track/album info on this page.");
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