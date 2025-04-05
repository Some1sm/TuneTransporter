// TuneTransporter/ytm-search-content.js

console.log("[YTM Search Content Script] Loaded.");

// --- State Keys (should match ytm-library-content.js) ---
const PROCESSING_FLAG = 'tuneTransporterProcessing';
const NEXT_STEP_FLAG = 'tuneTransporterNextStep';
const CURRENT_TRACK_KEY = 'tuneTransporterCurrentTrack';
const TARGET_TITLE_KEY = 'tuneTransporterTargetTitle'; // Needed if we have to skip back to library

// Helper function (ensure utils.js is injected or define locally if needed)
const feedback = typeof showFeedback === 'function' ? showFeedback : (msg, duration = 3000) => console.log(`Feedback: ${msg}`);
// function delay(ms) { // Now loaded from utils.js
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// --- Main Logic ---
async function handleSearchPage() {
    console.log("[YTM Search Content Script] handleSearchPage called.");
    try {
        const nextStep = sessionStorage.getItem(NEXT_STEP_FLAG);
        const isProcessing = sessionStorage.getItem(PROCESSING_FLAG) === 'true';

        if (isProcessing && nextStep === 'findSongOnSearchPage') {
            console.log("[YTM Search Content Script] Correct state found. Proceeding to find song link.");
            feedback("Finding song on search page...", 2000);

            // Selectors for potential song links (prioritize official songs)
            const songShelfSelector = 'ytmusic-shelf-renderer[page-type="MUSIC_PAGE_TYPE_SEARCH"]';
            const songResultSelector = `${songShelfSelector} div#contents ytmusic-responsive-list-item-renderer a[href*="watch?v="]`;
            const topResultSongLinkSelector = 'ytmusic-card-shelf-renderer[header="Top result"] a[href*="watch?v="]';
            // Consider adding video selector as fallback if necessary, but prioritize songs
            // const videoResultSelector = 'ytmusic-shelf-renderer[title^="Video"] div#contents ytmusic-responsive-list-item-renderer:first-of-type a[href*="watch?v="]';

            let songLinkElement = null;
            let attempts = 0;
            const maxAttempts = 20; // ~5 seconds
            const attemptDelay = 250;

            // Wait briefly for results to load
            while (!songLinkElement && attempts < maxAttempts) {
                 songLinkElement = document.querySelector(songResultSelector) || document.querySelector(topResultSongLinkSelector);
                 if (songLinkElement) {
                     console.log("[YTM Search Content Script] Found song link element:", songLinkElement);
                     break;
                 }
                 attempts++;
                 console.log(`[YTM Search Content Script] Song link not found (Attempt ${attempts}/${maxAttempts}). Waiting ${attemptDelay}ms...`);
                 await delay(attemptDelay);
            }


            if (songLinkElement) {
                const songUrl = songLinkElement.href;
                // const songUrl = songLinkElement.href; // Removed duplicate declaration
                console.log(`[YTM Search Content Script] Found song link: ${songUrl}`);
                // Use chrome.storage.local to pass the next step flag
                const dataToStore = { [NEXT_STEP_FLAG]: 'addSongFromWatchPage' };
                console.log('[YTM Search Content Script] Setting NEXT_STEP_FLAG in chrome.storage.local:', dataToStore);

                // Store the flag, then navigate in the callback to ensure it's saved first
                chrome.storage.local.set(dataToStore, async () => {
                    if (chrome.runtime.lastError) {
                        console.error('[YTM Search Content Script] Error setting flag in chrome.storage.local:', chrome.runtime.lastError);
                        feedback("Error saving state. Cannot proceed.", 5000);
                        // Optionally navigate back to library or stop here
                        return; // Stop execution within callback
                    }
                    console.log('[YTM Search Content Script] Flag successfully set in chrome.storage.local.');
                    console.log(`[YTM Search Content Script] Waiting 500ms before navigation...`);
                    feedback("Song found, navigating...", 2000);
                    await delay(500); // Keep delay
                    // Final check before navigation
                    console.log(`[YTM Search Content Script] Navigating NOW to: ${songUrl}`); // Navigate to original URL
                    window.location.href = songUrl; // Navigate to watch page
                });
                // Navigation is now handled within the chrome.storage.local.set callback above
            } else {
                console.error("[YTM Search Content Script] Could not find a suitable song link after waiting.");
                feedback("Could not find song on search page. Skipping.", 4000);
                // If song not found, skip to next song by navigating back to library
                // Clear relevant session storage items if skipping
                sessionStorage.removeItem(NEXT_STEP_FLAG); // Clear step from session storage if it was there
                sessionStorage.removeItem(CURRENT_TRACK_KEY); // Clear current track data from session storage
                // Keep PROCESSING_FLAG and TARGET_TITLE_KEY in session storage for library page
                console.log("[YTM Search Content Script] Navigating back to library to try next song.");
                window.location.href = `https://music.youtube.com/library/playlists`;
            }

        } else {
            console.log("[YTM Search Content Script] Not in the correct processing state. Flags:", { isProcessing, nextStep });
        }
    } catch (error) {
        console.error("[YTM Search Content Script] Error:", error);
        feedback(`Error on search page: ${error.message}`, 5000);
        // Attempt to clean up and go back to library on error
        try {
             sessionStorage.removeItem(PROCESSING_FLAG);
             sessionStorage.removeItem(NEXT_STEP_FLAG);
             sessionStorage.removeItem(CURRENT_TRACK_KEY);
             sessionStorage.removeItem(TARGET_TITLE_KEY);
             sessionStorage.removeItem(TRACKS_KEY); // Clear remaining tracks too
             console.log("[YTM Search Content Script] Cleared flags due to error. Navigating back to library.");
             window.location.href = `https://music.youtube.com/library/playlists`;
        } catch (cleanupError) {
             console.error("[YTM Search Content Script] Error during cleanup navigation:", cleanupError);
        }
    }
}

// Run the logic when the script loads
// Use a small delay to ensure sessionStorage flags from previous page load are readable
setTimeout(handleSearchPage, 300); // Adjust delay if needed