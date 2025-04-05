// TuneTransporter/ytm-library-content.js

// console.log("[YTM Library Content Script] Loaded."); // Removed debug log

// Helper function (ensure utils.js is injected or define locally if needed)
const feedback = typeof showFeedback === 'function' ? showFeedback : (msg, duration = 3000) => console.log(`Feedback: ${msg}`);

// --- State Keys ---
const PROCESSING_FLAG = 'tuneTransporterProcessing';
const NEXT_STEP_FLAG = 'tuneTransporterNextStep';
const TRACKS_KEY = 'tuneTransporterTracks';
const TARGET_TITLE_KEY = 'tuneTransporterTargetTitle';
const CURRENT_TRACK_KEY = 'tuneTransporterCurrentTrack';

// --- Function to initiate the search for the next song ---
function startNextSongSearch() { // Renamed from startNextSongSearch
    // console.log('[startNextSongSearch] Function called.'); // Removed debug log
    try {
        const tracksJson = sessionStorage.getItem(TRACKS_KEY);
        const targetTitle = sessionStorage.getItem(TARGET_TITLE_KEY);
        let tracks = tracksJson ? JSON.parse(tracksJson) : [];

        // console.log(`[startNextSongSearch] Retrieved ${tracks.length} tracks. Target: "${targetTitle}"`); // Removed debug log

        if (!targetTitle) { // Keep check
            console.error('Target playlist title not found in sessionStorage.'); // Keep error log
            feedback("Error: Target playlist title missing.", 5000);
            sessionStorage.removeItem(PROCESSING_FLAG); // Clean up processing flag
            return;
        }

        if (tracks.length === 0) {
            // console.log('[startNextSongSearch] No more tracks left to process.'); // Removed debug log
            feedback(`Finished adding songs to "${targetTitle}"!`, 5000);
            sessionStorage.removeItem(PROCESSING_FLAG);
            sessionStorage.removeItem(TRACKS_KEY);
            sessionStorage.removeItem(TARGET_TITLE_KEY);
            sessionStorage.removeItem(CURRENT_TRACK_KEY);
            sessionStorage.removeItem(NEXT_STEP_FLAG);
            return;
        }

        const currentTrack = tracks.shift(); // Get the next track
        const remainingTracks = tracks; // The rest of the array

        // console.log(`[startNextSongSearch] Next track: ${currentTrack.title} - ${currentTrack.artist}`); // Removed debug log
        // console.log(`[startNextSongSearch] Remaining tracks: ${remainingTracks.length}`); // Removed debug log

        // Store remaining tracks and current track/target
        sessionStorage.setItem(TRACKS_KEY, JSON.stringify(remainingTracks));
        sessionStorage.setItem(CURRENT_TRACK_KEY, JSON.stringify(currentTrack));
        // TARGET_TITLE_KEY should already be set

        // Set next step and navigate
        sessionStorage.setItem(NEXT_STEP_FLAG, 'findSongOnSearchPage');
        const query = `${currentTrack.title} ${currentTrack.artist || ''}`.trim();
        const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
        // console.log(`[startNextSongSearch] Navigating to search: ${searchUrl}`); // Removed debug log
        feedback(`Searching for song ${remainingTracks.length + 1}...`, 4000);
        window.location.href = searchUrl;

    } catch (error) {
        console.error('Error in startNextSongSearch:', error); // Keep error log
        feedback(`Error starting next song search: ${error.message}`, 5000);
        // Clean up flags on error
        sessionStorage.removeItem(PROCESSING_FLAG);
        sessionStorage.removeItem(TRACKS_KEY);
        sessionStorage.removeItem(TARGET_TITLE_KEY);
        sessionStorage.removeItem(CURRENT_TRACK_KEY);
        sessionStorage.removeItem(NEXT_STEP_FLAG);
    }
}


// --- Message Listener (from Service Worker) ---
// Make the listener async to allow awaiting directly
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => { // Keep listener
    // console.log("[YTM Library Content Script] Received message:", message); // Removed debug log

    if (message.action === "showCreatePromptAndPrepareTracks" && message.playlistTitle && message.tracks) { // Keep check
        // console.log(`[YTM Library Content Script] Received prompt request for "${message.playlistTitle}" with ${message.tracks.length} tracks.`); // Removed debug log
        const initialPlaylistTitle = message.playlistTitle;
        const tracks = message.tracks; // This should be the array

        // Ensure createYtmPlaylist function is available
        if (typeof createYtmPlaylist !== 'function') {
            console.error("createYtmPlaylist function is not available!"); // Keep error log
             alert("Error: Playlist creation function is missing. Please reload the extension.");
             return false; // Stop processing
        }

                // Removed setTimeout wrapper - handle directly in async listener
                if (confirm(`Do you want to create the YouTube Music playlist "${initialPlaylistTitle}" now?`)) { // Keep confirm
                    // console.log("[YTM Library Content Script] User confirmed creation. Calling createYtmPlaylist..."); // Removed debug log
                    try {
                         feedback("Initiating playlist creation...", 0); // Show feedback immediately
                         // Await the creation directly
                        const creationResult = await createYtmPlaylist(initialPlaylistTitle); // Keep call
                        // console.log("[YTM Library Content Script] createYtmPlaylist result:", creationResult); // Removed debug log
        
                         if (creationResult.success) {
                             const createdTitle = creationResult.playlistTitle || initialPlaylistTitle;
                             feedback(`Playlist "${createdTitle}" created successfully! Starting song adding process...`, 3000);
        
                             // Store tracks and target title in sessionStorage
                             sessionStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
                             sessionStorage.setItem(TARGET_TITLE_KEY, createdTitle);
                            sessionStorage.setItem(PROCESSING_FLAG, 'true'); // Keep flag setting
                            // console.log(`[YTM Library Content Script] Stored ${tracks.length} tracks and target title "${createdTitle}" to sessionStorage. Set processing flag.`); // Removed debug log
        
                             // Add a SIGNIFICANT delay AFTER awaiting creation result
                            const creationDelay = 8000; // Keep delay
                            // console.log(`[YTM Library Content Script] Playlist creation reported success. Waiting ${creationDelay}ms before starting search...`); // Removed debug log
                             await delay(creationDelay); // Assuming delay function exists or is added
        
                            // Reload the page to ensure YTM state is updated after creation + delay
                            // console.log(`[YTM Library Content Script] Reloading library page before starting search...`); // Removed debug log
                             window.location.reload();
                             // The 'load' event listener at the bottom will trigger startNextSongSearch after reload
        
                        } else { // Keep else block
                              feedback(`Playlist creation failed: ${creationResult.error || 'Unknown error'}`, 6000);
                         } // Keep else block
                    } catch (error) { // Keep catch block
                        console.error("Error calling createYtmPlaylist:", error); // Keep error log
                         feedback(`Error during creation: ${error.message}`, 6000);
            }
        } else { // Keep else block
            // console.log("[YTM Library Content Script] User cancelled creation prompt."); // Removed debug log
                // Clear potentially stored tracks if user cancels here? Maybe not necessary.
            }
        // Removed dangling setTimeout closing syntax: }, 100);

        return true; // Indicate async response (though we don't send one back here)
    }
    return false; // Indicate message not handled
}); // Keep listener end

// --- Check on Load ---
// Use a simple delay on load to check if we need to continue processing
// This handles the case where the script reloads after navigating back from search/watch
window.addEventListener('load', () => { // Keep listener
    // console.log('[YTM Library Content Script] Page loaded.'); // Removed debug log
    setTimeout(() => { // Delay slightly to ensure sessionStorage is stable after load
        try {
            if (sessionStorage.getItem(PROCESSING_FLAG) === 'true') { // Keep check
                // console.log('[YTM Library Content Script] Processing flag found on load. Triggering next song search.'); // Removed debug log
                startNextSongSearch();
            } else {
                // console.log('[YTM Library Content Script] No processing flag found on load.'); // Removed debug log
            }
        } catch (error) {
            console.error('Error checking processing flag on load:', error); // Keep error log
        }
    }, 500); // Adjust delay if needed
});

console.log("[YTM Library Content Script] Listener added.");