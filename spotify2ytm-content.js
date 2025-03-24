// content.js
console.log("Content script loaded on Spotify track page!");

function spotifyToYTM() {
    try {
        const titleTagText = document.title;
        const match = titleTagText.match(/(.*) - song and lyrics by (.*) \| Spotify/);

        if (match) {
            const trackName = match[1].trim();
            const artists = match[2].trim().split(", ");
            let artistName = "";
            for (let i = 0; i < artists.length; i++) {
                artistName += artists[i];
                if (i + 1 < artists.length)
                    artistName += " ";
            }

            // Construct the YouTube Music *website* search URL 
            const youtubeMusicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(trackName + " " + artistName)}`;

            // --- PWA URL Construction (Sadly seems like PWA doesn't accept custom URLs :( ) ---
            // const pwaUrl = `youtubemusic://search?q=${encodeURIComponent(trackName + " " + artistName)}`;
            

            // --- Fallback URL (NOT USED, since I always use the website URL now) ---
            // const fallbackUrl = `https://music.youtube.com/search?q=${encodeURIComponent(trackName + " " + artistName)}`;

            // --- PWA Launch Attempt (COMMENTED OUT) ---
            /*
            try {
                // Try launching the PWA using the protocol handler
                window.location.href = pwaUrl;
            } catch (error) {
                // If launching the PWA fails (e.g., it's not installed), use the fallback
                console.error("PWA launch failed, falling back to website:", error);
                window.location.href = fallbackUrl; // Use fallback in case of error.
            }
            */

            // --- Website Redirection ---
            window.location.href = youtubeMusicUrl;


        } else {
            alert("TuneTransporter:\n\nCould not find song information.  Please make sure you are on a Spotify track page.");
        }

    } catch (error) {
        console.error("Error extracting song info or redirecting:", error);
        if (error && error.message) {
            alert("TuneTransporter:\n\nAn unexpected error occurred: " + error.message);
        } else {
            alert("TuneTransporter:\n\nAn unexpected error occurred.");
        }
    }
}

// Check spotifyEnabled setting before running
chrome.storage.local.get('spotifyEnabled', function (data) {
    if (data.spotifyEnabled) {
        spotifyToYTM();
    }
});

