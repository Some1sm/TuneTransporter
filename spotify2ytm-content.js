// spotify2ytm-content.js
console.log("TuneTransporter: Spotify to YTM script loaded.");

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

// --- Core Logic ---
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
                // Call feedback function here
                showFeedback("TuneTransporter: Could not extract song info.");
            }

        } else {
            console.warn("TuneTransporter: Could not parse song information from page title:", titleTagText);
            // Call feedback function here as well
            showFeedback("TuneTransporter: Could not find song info on this page.");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during Spotify to YTM redirection:", error);
        // Optionally show feedback for unexpected errors too
        // showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// --- Main execution ---
// Check spotifyEnabled setting before running
chrome.storage.local.get(['spotifyEnabled'], function (result) {
    // Check explicitly for !== false to handle true or undefined as enabled
    if (result.spotifyEnabled !== false) {
        // Run directly. `document_idle` should be sufficient for the title to be available.
        spotifyToYTM();
    } else {
        console.log("TuneTransporter: Spotify -> YTM redirection is disabled in settings.");
    }
});