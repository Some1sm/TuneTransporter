// spotify2ytm-content.js
console.log("TuneTransporter: Spotify to YTM script loaded.");

function spotifyToYTM() {
    try {
        // Attempt to extract info from title tag (can be fragile)
        // Consider alternative methods like checking meta tags (og:title, etc.) or embedded JSON data.
        const titleTagText = document.title;
        // Updated regex to be slightly more flexible with separators and "song by" variations
        const match = titleTagText.match(/^(.+?)\s*[-–—]\s*(?:song|lyrics)\s*(?:and lyrics)?\s*by\s+(.+?)\s*(?:\| Spotify)?$/i);

        if (match && match[1] && match[2]) {
            const trackName = match[1].trim();
            // Split artists, handling "feat." and "&" variations slightly better
            const primaryArtists = match[2].split(/,\s*|\s*&\s*|\s+feat\.\s+/i);
            const artistName = primaryArtists.map(artist => artist.trim()).join(" "); // Join with spaces for search

            if (trackName && artistName) {
                console.log(`TuneTransporter: Extracted - Track: "${trackName}", Artist: "${artistName}"`);

                // Construct the YouTube Music *website* search URL
                const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(trackName + " " + artistName)}`;
                console.log(`TuneTransporter: Redirecting to YTM search: ${youtubeMusicSearchUrl}`);

                // Redirect
                window.location.href = youtubeMusicSearchUrl;

            } else {
                console.warn("TuneTransporter: Could not extract valid track or artist name from title match.");
            }

        } else {
            console.warn("TuneTransporter: Could not parse song information from page title:", titleTagText);
            // Avoid alert() - Consider injecting a subtle message onto the page if feedback is essential
            // E.g., injectBanner("TuneTransporter: Could not find song info on this Spotify page.");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during Spotify to YTM redirection:", error);
        // Avoid alert() for internal errors
    }
}

// Check spotifyEnabled setting before running
chrome.storage.local.get(['spotifyEnabled'], function (result) {
    // Check explicitly for true, handles undefined or false cases
    if (result.spotifyEnabled !== false) {
        // Run directly. `document_idle` should be sufficient for the title to be available.
        // If issues arise with dynamically updated titles, a small delay might be reintroduced,
        // but start without it.
        spotifyToYTM();
    } else {
        console.log("TuneTransporter: Spotify -> YTM redirection is disabled in settings.");
    }
});