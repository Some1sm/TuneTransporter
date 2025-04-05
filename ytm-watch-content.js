// TuneTransporter/ytm-watch-content.js

console.log("[YTM Watch Content Script] Loaded.");

// --- State Keys (should match ytm-library-content.js) ---
const PROCESSING_FLAG = 'tuneTransporterProcessing';
const NEXT_STEP_FLAG = 'tuneTransporterNextStep';
const CURRENT_TRACK_KEY = 'tuneTransporterCurrentTrack';
const TARGET_TITLE_KEY = 'tuneTransporterTargetTitle';

// Helper function (ensure utils.js is injected or define locally if needed)
const feedback = typeof showFeedback === 'function' ? showFeedback : (msg, duration = 3000) => console.log(`Feedback: ${msg}`);
// Key for remaining tracks (needed here now)
const TRACKS_KEY = 'tuneTransporterTracks';

// Helper function (ensure utils.js is injected or define locally if needed)
// const feedback = typeof showFeedback === 'function' ? showFeedback : (msg, duration = 3000) => console.log(`Feedback: ${msg}`); // Original declaration below is kept
async function waitForElement(selector, timeout = 5000, checkVisible = false) {
    console.log(`[waitForElement] Waiting for selector: "${selector}" (Timeout: ${timeout}ms)`);
    const interval = 250;
    let elapsedTime = 0;
    while (elapsedTime < timeout) {
        const element = document.querySelector(selector);
        if (element) {
            // Optional check for visibility (element might be in DOM but hidden)
            if (!checkVisible || (element.offsetParent !== null && !element.hasAttribute('hidden'))) {
                 console.log(`[waitForElement] Found element:`, element);
                 return element;
            }
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        elapsedTime += interval;
    }
    console.error(`[waitForElement] Timeout waiting for selector: "${selector}"`);
    throw new Error(`Element not found or not visible within timeout: ${selector}`);
}

async function waitForElementToDisappear(selector, timeout = 5000) {
    console.log(`[waitForElementToDisappear] Waiting for selector to disappear: "${selector}" (Timeout: ${timeout}ms)`);
    const interval = 250;
    let elapsedTime = 0;
    while (elapsedTime < timeout) {
        const element = document.querySelector(selector);
        if (!element) {
            console.log(`[waitForElementToDisappear] Element disappeared.`);
            return true; // Element is gone
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        elapsedTime += interval;
    }
    console.error(`[waitForElementToDisappear] Timeout waiting for element to disappear: "${selector}"`);
    throw new Error(`Element did not disappear within timeout: ${selector}`);
}

// function delay(ms) { // Now loaded from utils.js
//   return new Promise(resolve => setTimeout(resolve, ms));
// }


// --- Function to process the next track or finish ---
async function processNextTrackOrFinish() {
    console.log('[processNextTrackOrFinish] Determining next action...');
    try {
        const tracksJson = sessionStorage.getItem(TRACKS_KEY);
        let tracks = tracksJson ? JSON.parse(tracksJson) : [];
        const targetTitle = sessionStorage.getItem(TARGET_TITLE_KEY); // Keep for final message

        if (tracks.length > 0) {
            const nextTrack = tracks.shift(); // Get the next track
            const remainingTracksCount = tracks.length;

            console.log(`[processNextTrackOrFinish] Next track: ${nextTrack.title} - ${nextTrack.artist}`);
            console.log(`[processNextTrackOrFinish] Remaining tracks: ${remainingTracksCount}`);

            // Update storage for the next iteration
            sessionStorage.setItem(TRACKS_KEY, JSON.stringify(tracks)); // Update remaining tracks
            sessionStorage.setItem(CURRENT_TRACK_KEY, JSON.stringify(nextTrack)); // Set next track as current
            sessionStorage.setItem(NEXT_STEP_FLAG, 'findSongOnSearchPage'); // Set next step
            // Keep PROCESSING_FLAG and TARGET_TITLE_KEY

            // Navigate to search for the next track
            const query = `${nextTrack.title} ${nextTrack.artist || ''}`.trim();
            const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
            console.log(`[processNextTrackOrFinish] Navigating to search for next track: ${searchUrl}`);
            feedback(`Searching for song ${remainingTracksCount + 1}...`, 4000);
            window.location.href = searchUrl;

        } else {
            // No more tracks
            console.log('[processNextTrackOrFinish] No more tracks left.');
            feedback(`Finished adding songs to "${targetTitle || 'playlist'}"!`, 5000);
            // Clean up all flags
            sessionStorage.removeItem(PROCESSING_FLAG);
            sessionStorage.removeItem(TRACKS_KEY);
            sessionStorage.removeItem(TARGET_TITLE_KEY);
            sessionStorage.removeItem(CURRENT_TRACK_KEY);
            sessionStorage.removeItem(NEXT_STEP_FLAG);
            console.log('[processNextTrackOrFinish] Cleared all flags. Navigating to library.');
            // Navigate to library as final step
            window.location.href = `https://music.youtube.com/library/playlists`;
        }
    } catch (error) {
        console.error('[processNextTrackOrFinish] Error:', error);
        feedback(`Error processing next track: ${error.message}`, 5000);
        // Attempt to clean up flags even on error during this stage
        sessionStorage.removeItem(PROCESSING_FLAG);
        sessionStorage.removeItem(TRACKS_KEY);
        sessionStorage.removeItem(TARGET_TITLE_KEY);
        sessionStorage.removeItem(CURRENT_TRACK_KEY);
        sessionStorage.removeItem(NEXT_STEP_FLAG);
        // Navigate to library on error here too?
        window.location.href = `https://music.youtube.com/library/playlists`;
    }
}

// --- Main Logic ---
async function handleWatchPage() {
    console.log("======================================================");
    console.log("[YTM Watch Content Script] handleWatchPage called.");
    console.log(`[YTM Watch Content Script] Current URL: ${window.location.href}`);
    let shouldProcessNext = false; // Flag to indicate if we should proceed to next track/finish
    try {
        // Read state from chrome.storage.local
        chrome.storage.local.get([NEXT_STEP_FLAG], async (result) => {
            const nextStepFromStorage = result[NEXT_STEP_FLAG];
            const isProcessing = sessionStorage.getItem(PROCESSING_FLAG) === 'true'; // Still check processing flag from session
            console.log(`[YTM Watch Content Script] Read NEXT_STEP_FLAG from chrome.storage.local: ${nextStepFromStorage}`);
            console.log(`[YTM Watch Content Script] Found PROCESSING_FLAG in sessionStorage: ${isProcessing}`);

            // Clear the flag from storage now that we've read it
            if (nextStepFromStorage) {
                chrome.storage.local.remove(NEXT_STEP_FLAG, () => {
                    console.log('[YTM Watch Content Script] Removed NEXT_STEP_FLAG from chrome.storage.local.');
                });
            }

            if (isProcessing && nextStepFromStorage === 'addSongFromWatchPage') {
                console.log("[YTM Watch Content Script] Correct state found via chrome.storage. Proceeding to add song.");
            shouldProcessNext = true; // Mark that we entered the processing block

            const targetPlaylistTitle = sessionStorage.getItem(TARGET_TITLE_KEY);
            const currentTrackJson = sessionStorage.getItem(CURRENT_TRACK_KEY);
            const currentTrack = currentTrackJson ? JSON.parse(currentTrackJson) : null;

            if (!targetPlaylistTitle || !currentTrack) {
                console.error("[YTM Watch Content Script] Missing target title or current track data in sessionStorage.");
                feedback("Error: Missing data to add song.", 5000);
                throw new Error("Missing data for song add operation."); // Throw error to trigger cleanup
            }

            console.log(`[YTM Watch Content Script] Attempting to add "${currentTrack.title}" to "${targetPlaylistTitle}".`);
            feedback(`Adding "${currentTrack.title}"...`, 7000); // Increase feedback duration slightly

            const actionDelayMs = 1500; // Increased from 1000
            const dialogWaitMs = 2000; // Increased from 1500
            let success = false;

            // 1. (Skipped) Open Menu - User indicated it might not be necessary.
            console.log("[YTM Watch Content Script] Step 1: Skipped opening menu.");

            // 2. Click "Save to playlist"
            // 2. Click "Save to playlist" (Searching globally)
            console.log("[YTM Watch Content Script] Step 2: Find and Click 'Save to playlist'");
            const saveToPlaylistItemText = "Save to playlist";
            const saveItemSelector = `ytmusic-menu-navigation-item-renderer`; // Selector for the item
            let saveToPlaylistButton = null;
            const maxWaitTime = 10000; // Wait up to 10 seconds
            const checkInterval = 500; // Check every 500ms
            let elapsedTime = 0;

            console.log(`[YTM Watch Content Script] Starting poll for visible "${saveToPlaylistItemText}" button...`);
            while (elapsedTime < maxWaitTime) {
                const potentialItems = document.querySelectorAll(saveItemSelector);
                for (const item of potentialItems) {
                    const textElement = item.querySelector('yt-formatted-string.text');
                    if (textElement && textElement.textContent?.trim() === saveToPlaylistItemText) {
                        // Check if the element is visible and interactable
                        const isVisible = item.offsetParent !== null && !item.hasAttribute('hidden');
                        if (isVisible) {
                            console.log("[YTM Watch Content Script] Found visible 'Save to playlist' item:", item);
                            saveToPlaylistButton = item; // Assign the item itself
                            break; // Exit the inner loop
                        } else {
                             // console.log("[YTM Watch Content Script] Found 'Save to playlist' item but it seems hidden:", item); // Less verbose log
                        }
                    }
                }

                if (saveToPlaylistButton) {
                    break; // Exit the outer loop
                }

                await delay(checkInterval);
                elapsedTime += checkInterval;
                if (elapsedTime % 2000 === 0) { // Log progress every 2 seconds
                     console.log(`[YTM Watch Content Script] Still waiting for "${saveToPlaylistItemText}" button (${elapsedTime / 1000}s)...`);
                }
            }

            if (!saveToPlaylistButton) {
                console.error(`[YTM Watch Content Script] ERROR: "${saveToPlaylistItemText}" button not found in menu.`);
                feedback(`Error: "${saveToPlaylistItemText}" not found for "${currentTrack.title}". Skipping song.`, 5000);
                 // Try to close menu? For now, throw.
                 throw new Error("'Save to playlist' button not found.");
            }

            // Log result of polling
            if (saveToPlaylistButton) {
                console.log(`[YTM Watch Content Script] Successfully found visible "${saveToPlaylistItemText}" button after polling.`);
            } else {
                // Throw specific error if the button wasn't found after polling
                console.error(`[YTM Watch Content Script] Failed to find visible "${saveToPlaylistItemText}" button after ${maxWaitTime / 1000} seconds.`);
                throw new Error(`"${saveToPlaylistItemText}" button not found or not visible after ${maxWaitTime / 1000} seconds.`);
            }
            console.log("[YTM Watch Content Script] Found 'Save to playlist' button. Clicking...");
            saveToPlaylistButton.click();
            // Declarations moved inside the block below after button click confirmation

            // Declarations and logic moved inside the block below after button click confirmation


            // If button was found, proceed with clicking
            console.log(`[YTM Watch Content Script] Clicking '${saveToPlaylistItemText}' button...`);
            saveToPlaylistButton.click();

            // Wait for the "Add to playlist" dialog to appear
            const dialogSelector = 'tp-yt-paper-dialog ytmusic-add-to-playlist-renderer';
            const addToPlaylistDialog = await waitForElement(dialogSelector, 5000, true);
            console.log("[YTM Watch Content Script] Save dialog should be open.");

            // 3. Select Target Playlist (Moved the finding logic here)
            console.log("[YTM Watch Content Script] Step 3: Select Target Playlist");
            const playlistListSelector = `#playlists`; // Relative to dialog
            const playlistItemSelector = `ytmusic-playlist-add-to-option-renderer`;
            const playlistTitleSelector = `yt-formatted-string#title`;
            const playlistList = addToPlaylistDialog.querySelector(playlistListSelector);
            if (!playlistList) {
                 console.error("[YTM Watch Content Script] ERROR: Playlist list container not found in dialog.");
                 feedback(`Error: Playlist list not found for "${currentTrack.title}". Skipping song.`, 5000);
                 throw new Error("Playlist list container not found in dialog.");
            }

            let targetPlaylistElement = null;
            let found = false;
            attempts = 0; // Reset attempts for scrolling/finding
            const maxScrollAttempts = 10; // Scroll down a few times if needed

            while (!found && attempts < maxScrollAttempts) {
                playlistList.querySelectorAll(playlistItemSelector).forEach(item => {
                    if (found) return; // Already found in this iteration
                    const titleElement = item.querySelector(playlistTitleSelector);
                    // Check both textContent and title attribute for robustness
                    const currentTitle = titleElement?.textContent?.trim() || titleElement?.getAttribute('title')?.trim();
                    if (currentTitle && currentTitle.toLowerCase() === targetPlaylistTitle.toLowerCase()) {
                        targetPlaylistElement = item.querySelector('button'); // The clickable element is the button inside
                        found = true;
                    }
                });

                if (found) break;

                // Scroll down within the dialog if possible
                const scrollableDialogContent = addToPlaylistDialog.querySelector('.scrollable-content.scroller');
                if (scrollableDialogContent) {
                     console.log(`[YTM Watch Content Script] Target playlist not visible, scrolling dialog (Attempt ${attempts + 1})...`);
                     scrollableDialogContent.scrollTop += scrollableDialogContent.clientHeight * 0.8;
                     await delay(300);
                } else {
                     console.log("[YTM Watch Content Script] Cannot find scrollable content in dialog, stopping scroll attempts.");
                     break;
                }
                attempts++;
            }

            // Now check if the PLAYLIST element was found
            if (!targetPlaylistElement) {
                console.error(`[YTM Watch Content Script] ERROR: Playlist "${targetPlaylistTitle}" not found in the dialog list after scrolling.`);
                feedback(`Error: Playlist "${targetPlaylistTitle}" not found. Skipping song.`, 5000);
                const closeButton = addToPlaylistDialog.querySelector('yt-button-shape.close-icon button'); // Try to close dialog
                closeButton?.click();
                await delay(actionDelayMs); // Keep delay after potential close click
                throw new Error(`Target playlist "${targetPlaylistTitle}" not found in dialog.`);
            }

            // If playlist element found, click it
            console.log(`[YTM Watch Content Script] Found target playlist "${targetPlaylistTitle}" element. Clicking...`);
            targetPlaylistElement.click(); // Click the button inside the playlist item
            // Wait for the dialog to disappear after clicking the playlist
            await waitForElementToDisappear(dialogSelector, 5000);

            console.log(`[YTM Watch Content Script] Successfully added "${currentTrack.title}" to "${targetPlaylistTitle}".`);
            feedback(`Added "${currentTrack.title}"!`, 2000);
            success = true; // Mark success for potential logging, though navigation handles next step

        } else {
                console.log("[YTM Watch Content Script] Not in the correct processing state. Flags:", { isProcessing, nextStepFromStorage });
                // If not in correct state, we should NOT proceed to next track processing
                shouldProcessNext = false;
            }

        }); // End of chrome.storage.local.get callback

    } catch (error) {
        console.error("[YTM Watch Content Script] Error during add song process:", error);
        feedback(`Error adding song: ${error.message}`, 5000);
        // If an error occurred during the add process, we still want to try the next song.
        // shouldProcessNext should already be true if we were in the processing block.
        // No need to set success = false, as the flow proceeds regardless.

    } finally {
        // This block now only runs AFTER the try/catch for the current page logic.
        // Navigation is handled by processNextTrackOrFinish.
        console.log("[YTM Watch Content Script] Reached end of try/catch block.");
        // Decide whether to process the next track based on the flag
        if (shouldProcessNext) {
            console.log("[YTM Watch Content Script] Calling processNextTrackOrFinish...");
            // Use setTimeout to ensure this runs after the current execution context clears,
            // allowing any final DOM updates/feedback to potentially render.
            setTimeout(processNextTrackOrFinish, 100); // Small delay
        } else {
            console.log("[YTM Watch Content Script] Not processing next track (likely wasn't in correct state).");
        }
    }
}

// Run the logic when the script loads
// Use a small delay to ensure sessionStorage flags from previous page load are readable
setTimeout(handleWatchPage, 300); // Adjust delay if needed