// yt-fallback-content.js
console.log("TuneTransporter: YouTube Fallback script loaded.");

// --- Constants for Retry ---
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 750;
// --------------------------

if (window.location.hash === '#tunetransporter-fallback') {
    console.log("TuneTransporter: Fallback signal detected.");

    try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) { /* ... */ }

    chrome.storage.local.get('ytmFallbackEnabled', (result) => {
        if (result.ytmFallbackEnabled !== true) {
            console.log("TuneTransporter: Fallback disabled.");
            return;
        }

        console.log("TuneTransporter: Fallback enabled. Starting extraction attempt...");

        let currentRetry = 0;
        let extractionDone = false;

        function attemptExtraction() {
            if (extractionDone) return;

            console.log(`TuneTransporter Fallback: Attempt ${currentRetry + 1}/${MAX_RETRIES}...`);

            let videoTitle = null;
            let channelName = null;

            try {
                // --- Extract Video Title (Adjusted Check) ---
                const titleTagText = document.title;
                // Check if title exists, is not empty, AND is not just "YouTube" (initial loading state)
                if (typeof titleTagText === 'string' && titleTagText.trim() && titleTagText.trim().toLowerCase() !== 'youtube') {
                    videoTitle = titleTagText.replace(/^\(\d+\)\s*/, '').replace(/\s*-\s*YouTube$/, '').trim();
                    if (!videoTitle) {
                        console.warn(`Attempt ${currentRetry + 1}: Title became empty after cleaning.`);
                        videoTitle = null;
                    } else {
                        console.log(`Attempt ${currentRetry + 1}: Found valid title base: "${videoTitle}" (Raw: "${titleTagText}")`);
                    }
                } else {
                    console.log(`Attempt ${currentRetry + 1}: Document title not ready or invalid: "${titleTagText}"`);
                    videoTitle = null; // Ensure it's null if check fails
                }

                // --- Extract Channel Name (Same logic as before) ---
                const channelLinkElement = document.querySelector('#channel-name yt-formatted-string#text a');
                const channelTextElement = document.querySelector('#channel-name yt-formatted-string#text');
                let extractedName = null;
                if (channelLinkElement && typeof channelLinkElement.textContent === 'string' && channelLinkElement.textContent.trim()) {
                    extractedName = channelLinkElement.textContent.trim();
                    console.log(`Attempt ${currentRetry + 1}: Found channel name via link: "${extractedName}"`);
                } else if (channelTextElement && typeof channelTextElement.title === 'string' && channelTextElement.title.trim()) {
                    extractedName = channelTextElement.title.trim();
                    console.log(`Attempt ${currentRetry + 1}: Found channel name via title attribute: "${extractedName}"`);
                }

                if (extractedName) {
                    channelName = extractedName;
                } else {
                    console.log(`Attempt ${currentRetry + 1}: Channel name element/content not found yet.`);
                    channelName = null;
                }

                // --- Check if successful ---
                if (videoTitle && channelName) {
                    extractionDone = true;
                    console.log("TuneTransporter Fallback: Successfully extracted Title and Channel Name.");
                    const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(videoTitle + " " + channelName)}`;
                    console.log(`TuneTransporter Fallback: Redirecting to Spotify search: ${spotifySearchUrl}`);
                    window.location.href = spotifySearchUrl;
                }
                // --- If not successful, schedule retry or give up ---
                else {
                    currentRetry++;
                    if (currentRetry < MAX_RETRIES) {
                        console.log(`TuneTransporter Fallback: Scheduling retry in ${RETRY_DELAY_MS}ms.`);
                        setTimeout(attemptExtraction, RETRY_DELAY_MS);
                    } else {
                        console.warn(`TuneTransporter Fallback: Failed to extract title and/or channel name after ${MAX_RETRIES} attempts.`);
                        if (!videoTitle) console.warn("Reason: Video title check failed.");
                        if (!channelName) console.warn("Reason: Channel name check failed.");
                    }
                }

            } catch (error) {
                extractionDone = true;
                console.error(`TuneTransporter Fallback: Error during attempt ${currentRetry + 1}:`, error);
            }
        }

        attemptExtraction(); // Initial attempt
    });

} else {
    // console.log("TuneTransporter: Fallback script loaded, but no signal detected.");
}