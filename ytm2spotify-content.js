// ytm2spotify-content.js
console.log("YouTube Music to Spotify content script loaded!");

function ytmToSpotify() {
    try {
        const url = window.location.href;

        // IMPORTANT: Keep this check!
        if (url.startsWith("https://music.youtube.com/watch")) {
            // --- DOM-based method for player page using MutationObserver ---

            const observer = new MutationObserver((mutations) => {
                const songTitleElement = document.querySelector('ytmusic-player-queue-item[selected] .song-title');
                const artistElement = document.querySelector('ytmusic-player-queue-item[selected] .byline');

                if (songTitleElement && artistElement) {
                    // Both elements are now present!
                    observer.disconnect(); // Stop observing

                    const trackName = songTitleElement.title;
                    const artistName = artistElement.title;

                    const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(trackName + " " + artistName)}`;
                    window.location.href = spotifyUrl;
                }
            });

            // Start observing the document body for changes
            observer.observe(document.body, {
                childList: true, // Watch for additions/removals of child nodes
                subtree: true    // Watch all descendants, not just direct children
            });

        } //  End of the if statement.  Crucial!

    } catch (error) {
        console.error("Error in YouTube Music to Spotify redirection:", error);
        if (error && error.message) {
            alert("Music Link Redirector:\n\nAn unexpected error occurred: " + error.message);
        } else {
            alert("Music Link Redirector:\n\nAn unexpected error occurred.");
        }
    }
}

// Check ytmEnabled setting before running
chrome.storage.local.get('ytmEnabled', function (data) {
    if (data.ytmEnabled) {
        ytmToSpotify();
    }
});