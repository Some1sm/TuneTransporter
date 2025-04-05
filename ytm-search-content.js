// TuneTransporter/ytm-search-content.js

console.log("[YTM Search Content Script] Loaded.");

// --- State Keys (should match ytm-library-content.js) ---
const PROCESSING_FLAG = 'tuneTransporterProcessing';
const NEXT_STEP_FLAG = 'tuneTransporterNextStep';
const CURRENT_TRACK_KEY = 'tuneTransporterCurrentTrack';
const TARGET_TITLE_KEY = 'tuneTransporterTargetTitle'; // Playlist title
const TRACKS_KEY = 'tuneTransporterTracks'; // Key for the array of tracks
// Helper functions (ensure utils.js is injected)
const feedback = typeof showFeedback === 'function' ? showFeedback : (msg, duration = 3000) => console.log(`Feedback: ${msg}`);
// const delay = typeof delay === 'function' ? delay : (ms) => new Promise(resolve => setTimeout(resolve, ms)); // Rely on utils.js for delay

/**
* Waits for an element to appear in the DOM.
* @param {string} selector CSS selector for the element.
* @param {number} [timeout=5000] Maximum time to wait in milliseconds.
* @param {number} [interval=250] Time between checks in milliseconds.
* @returns {Promise<Element|null>} Resolves with the element or null if timed out.
*/
function waitForElement(selector, timeout = 5000, interval = 250) {
   return new Promise((resolve) => {
       let elapsedTime = 0;
       const timer = setInterval(() => {
           const element = document.querySelector(selector);
           if (element) {
               clearInterval(timer);
               resolve(element);
           } else {
               elapsedTime += interval;
               if (elapsedTime >= timeout) {
                   clearInterval(timer);
                   resolve(null); // Timed out
               }
           }
       }, interval);
   });
}

// --- Core Logic Function ---
async function processFirstSongResult(targetPlaylistTitle) {
   console.log("[YTM Search Content Script] processFirstSongResult called.");
   try {
       // --- 1. Find the top result card or the first song item in the shelf ---
       const topResultCardSelector = 'ytmusic-card-shelf-renderer'; // Target the card itself for top result
       const songItemShelfSelector = 'ytmusic-shelf-renderer[shelf-id="Songs"] div#contents ytmusic-responsive-list-item-renderer'; // Fallback: Target item within the "Songs" shelf

       console.log("[YTM Search Content Script] Waiting for Top Result card...");
       let songItemElement = await waitForElement(topResultCardSelector, 5000); // Try card first
       let isTopResultCard = songItemElement !== null; // Flag if we found the card

       if (!songItemElement) {
           console.log("[YTM Search Content Script] Top Result card not found. Waiting for song item in 'Songs' shelf...");
           // Add a small delay before checking the shelf
           if (typeof delay === 'function') await delay(250); else await new Promise(resolve => setTimeout(resolve, 250)); // Reduced by 50%
           songItemElement = await waitForElement(songItemShelfSelector, 5000); // Fallback to regular song shelf item
           if (songItemElement) {
                console.log("[YTM Search Content Script] Found song item in shelf:", songItemElement);
           }
       } else {
            console.log("[YTM Search Content Script] Found Top Result card:", songItemElement);
       }

       if (!songItemElement) {
           console.error("[YTM Search Content Script] Could not find a suitable song item even after observer.");
           feedback("Could not find song item on search page. Skipping.", 4000);
           // Skip to next song logic (needs access to tracks/index) - Refactor needed or pass data
           // Disable image blocking before navigating on error
           console.log("[YTM Search Content Script] Error finding song item, sending message to disable image blocking.");
           chrome.runtime.sendMessage({ action: "disableImageBlocking" });
           goToLibraryForNextSong();
           return;
       }
       console.log("[YTM Search Content Script] Found song item:", songItemElement);

       // --- 2. Click the options menu (three dots) ---
       let optionsButtonSelector;
       if (isTopResultCard) { // Use the flag we set earlier
           // Selector for "Top result" card's menu button (applied directly to the card element)
           optionsButtonSelector = 'ytmusic-menu-renderer yt-button-shape button'; // Selector confirmed from HTML
            console.log("[YTM Search Content Script] Using options button selector for Top Result Card.");
       } else {
           // Selector for regular song shelf item's menu button (applied to the list item renderer)
           optionsButtonSelector = 'ytmusic-menu-renderer yt-button-shape button'; // Keep updated selector
           console.log("[YTM Search Content Script] Using options button selector for Regular Shelf Item.");
       }
       // Find the button within the identified element (card or list item)
       const optionsButton = songItemElement.querySelector(optionsButtonSelector);


       if (!optionsButton) {
           console.error("[YTM Search Content Script] Could not find options button (three dots) for the song/card.");
           feedback("Error finding song options. Skipping.", 4000);
           // Disable image blocking before navigating on error
           console.log("[YTM Search Content Script] Error finding options button, sending message to disable image blocking.");
           chrome.runtime.sendMessage({ action: "disableImageBlocking" });
           goToLibraryForNextSong();
           return;
       }

       console.log("[YTM Search Content Script] Clicking options button:", optionsButton);
       optionsButton.click();
       // Removed delay after clicking options - waitForElement for menu should suffice
       // and delay might break user gesture chain.


       // --- 3. Click "Save to playlist" in the menu ---
       const menuPopupSelector = 'ytmusic-menu-popup-renderer'; // The popup container
       const saveToPlaylistItemSelector = `${menuPopupSelector} ytmusic-menu-navigation-item-renderer yt-formatted-string.text`; // Selector for the text element

       const menuPopup = await waitForElement(menuPopupSelector, 3000);
       if (!menuPopup) {
           console.error("[YTM Search Content Script] Options menu popup did not appear.");
           feedback("Error opening song options menu. Skipping.", 4000);
           // Disable image blocking before navigating on error
           console.log("[YTM Search Content Script] Error opening options menu, sending message to disable image blocking.");
           chrome.runtime.sendMessage({ action: "disableImageBlocking" });
           goToLibraryForNextSong();
           return;
       }

       console.log("[YTM Search Content Script] Options menu appeared.");
       let savePlaylistLink = null; // Renamed variable
       const menuItems = menuPopup.querySelectorAll(saveToPlaylistItemSelector);
       menuItems.forEach(item => {
           if (item.textContent.trim().toLowerCase() === 'save to playlist') {
               // Go up to the clickable parent element
               const parentRenderer = item.closest('ytmusic-menu-navigation-item-renderer');
               if (parentRenderer) {
                   savePlaylistLink = parentRenderer.querySelector('a#navigation-endpoint');
               }
           }
       });


       if (!savePlaylistLink) {
           console.error("[YTM Search Content Script] Could not find 'Save to playlist' link (a#navigation-endpoint) in the menu.");
           feedback("Error finding 'Save to playlist' option. Skipping.", 4000);
            // Attempt to close the menu by clicking outside (optional)
           document.body.click();
            if (typeof delay === 'function') await delay(200);
           // Disable image blocking before navigating on error
           console.log("[YTM Search Content Script] Error finding save link, sending message to disable image blocking.");
           chrome.runtime.sendMessage({ action: "disableImageBlocking" });
           goToLibraryForNextSong();
           return;
       }

       console.log("[YTM Search Content Script] Clicking 'Save to playlist' link:", savePlaylistLink);
       savePlaylistLink.click();
       // Removed delay after clicking 'Save to playlist' - waitForElement for dialog should suffice
       // and delay might break user gesture chain.

       // --- 4. Find and click the target playlist in the dialog ---
       const dialogSelector = 'tp-yt-paper-dialog ytmusic-add-to-playlist-renderer';
       const playlistItemSelector = `${dialogSelector} ytmusic-playlist-add-to-option-renderer`;

       const dialogElement = await waitForElement(dialogSelector, 10000); // Increased timeout to 10 seconds
       if (!dialogElement) {
           console.error("[YTM Search Content Script] 'Save to playlist' dialog did not appear.");
           feedback("Error opening 'Save to playlist' dialog. Skipping.", 4000);
           // Disable image blocking before navigating on error
           console.log("[YTM Search Content Script] Error opening save dialog, sending message to disable image blocking.");
           chrome.runtime.sendMessage({ action: "disableImageBlocking" });
           goToLibraryForNextSong();
           return;
       }

       console.log("[YTM Search Content Script] 'Save to playlist' dialog appeared.");
       let targetPlaylistElement = null;
       const playlistItems = dialogElement.querySelectorAll(playlistItemSelector);

       console.log(`[YTM Search Content Script] Searching for playlist titled: "${targetPlaylistTitle}" among ${playlistItems.length} items.`);

       playlistItems.forEach(item => {
           const titleElement = item.querySelector('yt-formatted-string#title');
           if (titleElement && titleElement.textContent.trim() === targetPlaylistTitle) {
               targetPlaylistElement = item.querySelector('button'); // The clickable element is the button inside
           }
       });

       if (!targetPlaylistElement) {
           console.error(`[YTM Search Content Script] Could not find playlist "${targetPlaylistTitle}" in the dialog.`);
           feedback(`Error: Playlist "${targetPlaylistTitle}" not found in dialog. Skipping.`, 5000);
           // Attempt to close dialog
           const closeButton = dialogElement.querySelector('yt-button-shape[aria-label="Dismiss"] button');
           if (closeButton) closeButton.click();
           if (typeof delay === 'function') await delay(200);
           // Disable image blocking before navigating on error
           console.log("[YTM Search Content Script] Error finding target playlist, sending message to disable image blocking.");
           chrome.runtime.sendMessage({ action: "disableImageBlocking" });
           goToLibraryForNextSong();
           return;
       }

       console.log(`[YTM Search Content Script] Found target playlist element. Clicking:`, targetPlaylistElement);
       targetPlaylistElement.click();
       feedback(`Added song to playlist: ${targetPlaylistTitle}`, 2500);
       // Wait slightly longer here for action to complete and dialog to close fully before proceeding
       if (typeof delay === 'function') await delay(375); else await new Promise(resolve => setTimeout(resolve, 375)); // Reduced further

       // --- 5. Proceed to the next song or finish ---
       console.log("[YTM Search Content Script] Song added successfully. Checking for next song.");
       proceedToNextSongOrFinish(); // Call helper function

   } catch (error) {
       console.error("[YTM Search Content Script] Error in processFirstSongResult:", error);
       feedback(`Error processing song: ${error.message}. Skipping.`, 5000);
       // Disable image blocking before navigating on error
       console.log("[YTM Search Content Script] Error during song processing, sending message to disable image blocking.");
       chrome.runtime.sendMessage({ action: "disableImageBlocking" });
       goToLibraryForNextSong();
   }
}

// --- Helper Functions for Navigation/Next Step ---

function goToLibraryForNextSong() { // Removed delay parameter and async
   console.log("[YTM Search Content Script] Navigating back to library to try next song or on error.");
   sessionStorage.removeItem(NEXT_STEP_FLAG); // Clear step flag before navigating
   sessionStorage.removeItem(CURRENT_TRACK_KEY); // Clear current track data
   // Keep PROCESSING_FLAG and TARGET_TITLE_KEY
   // No delay needed anymore
   window.location.href = `https://music.youtube.com/library/playlists`;
}

function proceedToNextSongOrFinish() {
   const tracksJson = sessionStorage.getItem(TRACKS_KEY);
   const currentTrackIndexStr = sessionStorage.getItem(CURRENT_TRACK_KEY);

   if (!tracksJson || currentTrackIndexStr === null) {
       console.error("[YTM Search Content Script] Track list or current index missing. Cannot proceed.");
       feedback("Error: Missing track data. Finishing.", 5000);
        sessionStorage.removeItem(PROCESSING_FLAG);
        sessionStorage.removeItem(NEXT_STEP_FLAG);
        sessionStorage.removeItem(CURRENT_TRACK_KEY);
        sessionStorage.removeItem(TARGET_TITLE_KEY);
        sessionStorage.removeItem(TRACKS_KEY);
        // Disable image blocking before navigating on error
        console.log("[YTM Search Content Script] Error missing track data, sending message to disable image blocking.");
        chrome.runtime.sendMessage({ action: "disableImageBlocking" });
        window.location.href = `https://music.youtube.com/library/playlists`; // Go back on error
        return;
   }

   try {
       const tracks = JSON.parse(tracksJson);
       const currentTrackIndex = parseInt(currentTrackIndexStr, 10);
       const nextTrackIndex = currentTrackIndex + 1;

       if (nextTrackIndex < tracks.length) {
           // --- Prepare for next song ---
           const nextTrack = tracks[nextTrackIndex];
           const nextSearchQuery = `${nextTrack.artist} ${nextTrack.title}`; // Use artist first now
           console.log(`[YTM Search Content Script] Preparing for next song #${nextTrackIndex}: ${nextSearchQuery}`);
           feedback(`Searching for next song: ${nextTrack.title}...`, 2000);

           // Update session storage for the next iteration
           sessionStorage.setItem(CURRENT_TRACK_KEY, nextTrackIndex.toString());
           // NEXT_STEP_FLAG remains 'findSongOnSearchPage'
// --- Navigate directly to the search URL for the next song ---
const encodedSearchQuery = encodeURIComponent(nextSearchQuery);
const nextSearchUrl = `https://music.youtube.com/search?q=${encodedSearchQuery}`;
console.log(`[YTM Search Content Script] Navigating to search URL for next song: ${nextSearchUrl}`);

// Navigate to the new search page. This will cause a page load,
// and the script will re-run handleSearchPage on the new page.
window.location.href = nextSearchUrl;

       } else {
           // --- All songs processed ---
           console.log("[YTM Search Content Script] All songs processed successfully!");
           feedback("Finished adding all songs to playlist!", 5000);
           sessionStorage.removeItem(PROCESSING_FLAG);
           sessionStorage.removeItem(NEXT_STEP_FLAG);
           sessionStorage.removeItem(CURRENT_TRACK_KEY);
           sessionStorage.removeItem(TARGET_TITLE_KEY);
           sessionStorage.removeItem(TRACKS_KEY);
           console.log("[YTM Search Content Script] Cleared flags. Sending message to disable image blocking.");
           // Disable image blocking on successful completion
           chrome.runtime.sendMessage({ action: "disableImageBlocking" });
           console.log("[YTM Search Content Script] Navigating back to library.");
           // Use await delay here if needed, but it's inside a non-async function now
           setTimeout(() => {
                window.location.href = `https://music.youtube.com/library/playlists`;
           }, 500); // Brief pause before navigating
       }
   } catch (error) {
        console.error("[YTM Search Content Script] Error in proceedToNextSongOrFinish:", error);
        feedback(`Error preparing next song: ${error.message}. Finishing.`, 5000);
        sessionStorage.removeItem(PROCESSING_FLAG);
        sessionStorage.removeItem(NEXT_STEP_FLAG);
        sessionStorage.removeItem(CURRENT_TRACK_KEY);
        sessionStorage.removeItem(TARGET_TITLE_KEY);
        sessionStorage.removeItem(TRACKS_KEY);
        // Disable image blocking before navigating on error
        console.log("[YTM Search Content Script] Error preparing next song, sending message to disable image blocking.");
        chrome.runtime.sendMessage({ action: "disableImageBlocking" });
        window.location.href = `https://music.youtube.com/library/playlists`; // Go back on error
   }
}


// --- Main Logic ---
async function handleSearchPage() {
// Removed duplicate function declaration
   console.log("[YTM Search Content Script] handleSearchPage called.");
   try {
       const nextStep = sessionStorage.getItem(NEXT_STEP_FLAG);
       const isProcessing = sessionStorage.getItem(PROCESSING_FLAG) === 'true';

       if (isProcessing && nextStep === 'findSongOnSearchPage') {
           console.log("[YTM Search Content Script] Correct state found. Waiting for search results...");

           // --- Add progress to feedback ---
           let progressText = "";
           try {
               const currentTrackIndexStr = sessionStorage.getItem(CURRENT_TRACK_KEY);
               const tracksJson = sessionStorage.getItem(TRACKS_KEY);
               if (currentTrackIndexStr !== null && tracksJson) {
                   const currentTrackIndex = parseInt(currentTrackIndexStr, 10);
                   const tracks = JSON.parse(tracksJson);
                   if (!isNaN(currentTrackIndex) && Array.isArray(tracks)) {
                       progressText = ` (Song ${currentTrackIndex + 1}/${tracks.length})`;
                   }
               }
           } catch (e) {
               console.error("[YTM Search Content Script] Error getting progress data for feedback:", e);
           }
           feedback(`Waiting for search results${progressText}...`, 3000);
           // --- End progress feedback ---

           const targetPlaylistTitle = sessionStorage.getItem(TARGET_TITLE_KEY);
           if (!targetPlaylistTitle) {
               console.error("[YTM Search Content Script] Target playlist title not found in sessionStorage.");
               feedback("Error: Target playlist name missing. Cannot add song.", 5000);
               sessionStorage.removeItem(PROCESSING_FLAG);
               sessionStorage.removeItem(NEXT_STEP_FLAG);
               sessionStorage.removeItem(CURRENT_TRACK_KEY);
               sessionStorage.removeItem(TARGET_TITLE_KEY); // Also clear target title
               sessionStorage.removeItem(TRACKS_KEY); // Clear tracks
               window.location.href = `https://music.youtube.com/library/playlists`;
               return;
           }
           console.log(`[YTM Search Content Script] Target Playlist: ${targetPlaylistTitle}`);

           // --- Check if results are already present ---
           const resultsContainerSelector = 'ytmusic-search-page div#contents';
           const songItemShelfSelector = 'ytmusic-shelf-renderer div#contents ytmusic-responsive-list-item-renderer';
           const songItemCardSelector = 'ytmusic-card-shelf-renderer ytmusic-responsive-list-item-renderer';
           const resultsContainer = document.querySelector(resultsContainerSelector);

           if (resultsContainer && (resultsContainer.querySelector(songItemShelfSelector) || resultsContainer.querySelector(songItemCardSelector))) {
               console.log("[YTM Search Content Script] Search results already present on load.");
               // Wait a moment for stability before processing, similar to observer callback
                if (typeof delay === 'function') {
                    await delay(150); // Reduced by 50%
                } else {
                     await new Promise(resolve => setTimeout(resolve, 150)); // Reduced by 50%
                }
               processFirstSongResult(targetPlaylistTitle); // Process immediately
               return; // Don't set up the observer
           }

           // --- Results not present yet, set up MutationObserver ---
           console.log("[YTM Search Content Script] Results not present yet. Setting up MutationObserver.");
           let observer = null;
           let observerTimeout = null;
           // Selector constants are now defined above the 'if' check

           const observerCallback = (mutationsList, obs) => {
               // Check if results are present within the specific container if possible
                const resultsContainer = document.querySelector(resultsContainerSelector);
                if (resultsContainer && (resultsContainer.querySelector(songItemShelfSelector) || resultsContainer.querySelector(songItemCardSelector))) {
                   console.log("[YTM Search Content Script] Search results detected by observer.");
                   clearTimeout(observerTimeout); // Clear the safety timeout
                   observer.disconnect();
                   // Wait a moment for rendering stability before processing
                   // Use await delay if available
                   if (typeof delay === 'function') {
                       delay(150).then(() => processFirstSongResult(targetPlaylistTitle)); // Reduced by 50%
                   } else {
                        setTimeout(() => processFirstSongResult(targetPlaylistTitle), 150); // Reduced by 50%
                   }

               }
               // Optional: More specific checks on mutationsList if needed
           };

           observer = new MutationObserver(observerCallback);

           // Start observing the results container or body as fallback
           let targetNode = document.querySelector(resultsContainerSelector) || document.body;
           const config = { childList: true, subtree: true };
           observer.observe(targetNode, config);
           console.log("[YTM Search Content Script] MutationObserver started on:", targetNode.tagName);

           // Safety timeout for the observer
           const OBSERVER_TIMEOUT_MS = 15000; // 15 seconds
           observerTimeout = setTimeout(() => {
               console.error(`[YTM Search Content Script] Observer timed out after ${OBSERVER_TIMEOUT_MS}ms. Results not detected.`);
               if(observer) observer.disconnect(); // Ensure observer is disconnected
               feedback("Search results did not load in time. Skipping song.", 5000);
               goToLibraryForNextSong(); // Skip this song
           }, OBSERVER_TIMEOUT_MS);

           // The rest of the logic is now inside processFirstSongResult or helper functions

       } else {
            console.log("[YTM Search Content Script] Not in the correct processing state. Flags:", { isProcessing, nextStep });
       } // This closes the main if (isProcessing && nextStep === 'findSongOnSearchPage') block
   } catch (error) {
       console.error("[YTM Search Content Script] Error in handleSearchPage:", error);
       feedback(`Error on search page: ${error.message}`, 5000);
       // Attempt to clean up and go back to library on error
       try {
            sessionStorage.removeItem(PROCESSING_FLAG);
            sessionStorage.removeItem(NEXT_STEP_FLAG);
            sessionStorage.removeItem(CURRENT_TRACK_KEY);
            sessionStorage.removeItem(TARGET_TITLE_KEY);
            sessionStorage.removeItem(TRACKS_KEY); // Clear remaining tracks too on error
            console.log("[YTM Search Content Script] Cleared flags due to error. Navigating back to library.");
            // Disable image blocking before navigating on error
            console.log("[YTM Search Content Script] Error in handleSearchPage, sending message to disable image blocking.");
            chrome.runtime.sendMessage({ action: "disableImageBlocking" });
            window.location.href = `https://music.youtube.com/library/playlists`;
       } catch (cleanupError) {
            console.error("[YTM Search Content Script] Error during cleanup navigation:", cleanupError);
       }
   }
}
// Removed the old logic block that was directly inside handleSearchPage
// Removed stray catch block and closing brace from previous refactoring attempt

// Run the logic when the script loads
// Use a small delay to ensure sessionStorage flags from previous page load are readable
setTimeout(handleSearchPage, 300); // Adjust delay if needed