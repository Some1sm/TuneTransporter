// --- (Feedback Function goes here) ---
let feedbackTimeoutId = null; // Keep track of the timeout for the feedback message
// ... (showFeedback function code) ...

// --- Spotify Extraction Logic ---
function spotifyToYTM() {
    let trackName = null;
    let artistName = null;

    try {
        // --- Plan A: Try extracting from the page title ---
        console.log("TuneTransporter: Attempting title extraction (Plan A)...");
        const titleTagText = document.title;
        const titleMatch = titleTagText.match(/^(.+?)\s*[-–—]\s*(?:song|lyrics)\s*(?:and lyrics)?\s*by\s+(.+?)\s*(?:\| Spotify)?$/i);

        if (titleMatch && titleMatch[1] && titleMatch[2]) {
            const potentialTrack = titleMatch[1].trim();
            const potentialArtistString = titleMatch[2];

            // Basic validation that regex captured something
            if (potentialTrack && potentialArtistString) {
                trackName = potentialTrack;
                // Process artists like before
                const primaryArtists = potentialArtistString.split(/,\s*|\s*&\s*|\s+feat\.\s+/i);
                artistName = primaryArtists.map(artist => artist.trim()).join(" ");
                console.log(`TuneTransporter: Extracted via Title (Plan A) - Track: "${trackName}", Artist: "${artistName}"`);
            } else {
                console.log("TuneTransporter: Title regex matched but captured empty groups.");
            }
        } else {
            console.log("TuneTransporter: Title regex did not match.");
        }

        // --- Plan B: If Plan A failed, try extracting from DOM elements ---
        if (!trackName || !artistName) {
            console.log("TuneTransporter: Plan A failed or incomplete, trying DOM extraction (Plan B)...");
            // Selector for the H1 containing the track title, within the span with data-testid="entityTitle"
            const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            // Selector for the anchor tag containing the artist name, with data-testid="creator-link"
            const artistElement = document.querySelector('a[data-testid="creator-link"]');

            if (titleElement && artistElement) {
                const potentialTrack = titleElement.textContent?.trim();
                const potentialArtist = artistElement.textContent?.trim();

                if (potentialTrack && potentialArtist) {
                    trackName = potentialTrack;
                    artistName = potentialArtist; // Assuming single primary artist link is sufficient here
                    console.log(`TuneTransporter: Extracted via DOM (Plan B) - Track: "${trackName}", Artist: "${artistName}"`);
                } else {
                    console.log("TuneTransporter: Found DOM elements but text content was empty.");
                }
            } else {
                console.log("TuneTransporter: Could not find title/artist elements using DOM selectors.");
            }
        }

        // --- Final Check and Redirect ---
        if (trackName && artistName) {
            // Construct the YouTube Music *website* search URL
            const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(trackName + " " + artistName)}`;
            console.log(`TuneTransporter: Redirecting to YTM search: ${youtubeMusicSearchUrl}`);
            window.location.href = youtubeMusicSearchUrl;
        } else {
            // If *both* methods failed
            console.warn("TuneTransporter: Failed to extract song info using title or DOM methods.");
            showFeedback("TuneTransporter: Could not find song info on this page.");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during Spotify to YTM redirection:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// --- Main execution ---
chrome.storage.local.get(['spotifyEnabled'], function (result) {
    if (result.spotifyEnabled !== false) {
        // Run directly, document_idle should be enough for both title and main DOM elements
        spotifyToYTM();
    } else {
        console.log("TuneTransporter: Spotify -> YTM redirection is disabled in settings.");
    }
});