// yt-fallback-content.js
console.log("TuneTransporter: YouTube Fallback script loaded.");

// --- Constants for Retry ---
const MAX_RETRIES = 5; // Try up to 5 times
const RETRY_DELAY_MS = 500; // Wait 500ms between retries
// --------------------------

if (window.location.hash === '#tunetransporter-fallback') {
    console.log("TuneTransporter: Fallback signal detected.");

    try {
        // Immediately remove the hash to prevent re-triggering on refresh/navigation
        history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {
        console.warn("TuneTransporter: Could not remove hash from URL.", e);
    }

    // Check if the *PRIMARY* YTM->Spotify setting is enabled
    chrome.storage.local.get('ytmEnabled', (result) => {
        // Note: Using !== false to treat undefined (shouldn't happen often here) as true, matching content script logic
        if (result.ytmEnabled === false) {
            console.log("TuneTransporter: YTM -> Spotify primary redirection is disabled in settings. Aborting fallback.");
            // No feedback needed here, user explicitly disabled the direction.
            return;
        }

        // Primary setting is enabled, proceed with fallback extraction
        console.log("TuneTransporter: Fallback active (YTM->Spotify enabled). Starting extraction attempt...");

        let currentRetry = 0;
        let extractionDone = false; // Flag to stop retries once successful or failed definitively

        function attemptExtraction() {
            if (extractionDone) return; // Stop if already succeeded or errored

            console.log(`TuneTransporter Fallback: Attempt ${currentRetry + 1}/${MAX_RETRIES}...`);

            let videoTitle = null;
            let channelName = null; // WARNING: Often NOT the actual artist!

            try {
                // --- Extract Video Title (Adjusted Check) ---
                const titleTagText = document.title;
                // Check if title exists, is not empty, AND is not just "YouTube" (initial loading state)
                if (typeof titleTagText === 'string' && titleTagText.trim() && titleTagText.trim().toLowerCase() !== 'youtube') {
                    videoTitle = titleTagText.replace(/^\(\d+\)\s*/, '').replace(/\s*-\s*YouTube$/, '').trim();
                    if (!videoTitle) {
                        // Title became empty after cleaning (unlikely but possible)
                        console.warn(`Attempt ${currentRetry + 1}: Title became empty after cleaning.`);
                        videoTitle = null; // Treat as failure for this attempt
                    } else {
                        console.log(`Attempt ${currentRetry + 1}: Found valid title base: "${videoTitle}" (Raw: "${titleTagText}")`);
                    }
                } else {
                    console.log(`Attempt ${currentRetry + 1}: Document title not ready or invalid: "${titleTagText}"`);
                    videoTitle = null; // Treat as failure for this attempt
                }

                // --- Extract Channel Name (Same refined logic as before) ---
                const channelLinkElement = document.querySelector('#channel-name yt-formatted-string#text a');
                const channelTextElement = document.querySelector('#channel-name yt-formatted-string#text');
                let extractedName = null;
                if (channelLinkElement && typeof channelLinkElement.textContent === 'string' && channelLinkElement.textContent.trim()) {
                    extractedName = channelLinkElement.textContent.trim();
                    console.log(`Attempt ${currentRetry + 1}: Found channel name via link: "${extractedName}"`);
                } else if (channelTextElement && typeof channelTextElement.title === 'string' && channelTextElement.title.trim()) {
                    // Fallback using title attribute only if link text didn't work
                    extractedName = channelTextElement.title.trim();
                    console.log(`Attempt ${currentRetry + 1}: Found channel name via title attribute: "${extractedName}"`);
                }

                if (extractedName) {
                    channelName = extractedName;
                } else {
                    console.log(`Attempt ${currentRetry + 1}: Channel name element/content not found yet.`);
                    channelName = null; // Treat as failure for this attempt
                }

                // --- Check if successful ---
                if (videoTitle && channelName) {
                    extractionDone = true; // Set flag to stop retries
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
                        // Max retries reached, stop trying
                        extractionDone = true; // Mark as done to prevent any late-firing attempts
                        console.warn(`TuneTransporter Fallback: Failed to extract title and/or channel name after ${MAX_RETRIES} attempts.`);
                        if (!videoTitle) console.warn("Reason: Video title check failed.");
                        if (!channelName) console.warn("Reason: Channel name check failed.");
                        // Maybe show feedback here?
                        // showFeedback("TuneTransporter Fallback: Extraction failed.");
                    }
                }

            } catch (error) {
                extractionDone = true; // Stop retries on error
                console.error(`TuneTransporter Fallback: Error during attempt ${currentRetry + 1}:`, error);
                // Maybe show feedback here?
                // showFeedback("TuneTransporter Fallback Error: Check console.");
            }
        }

        // Start the first attempt
        attemptExtraction();

    }); // End storage.get callback

} else {
    // This script only acts if the specific hash is present.
    // console.log("TuneTransporter: Fallback script loaded, but no signal detected."); // Optional log
}