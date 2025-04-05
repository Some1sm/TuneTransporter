// TuneTransporter/ytm-library-content.js

// console.log("[YTM Library Content Script] Loaded."); // Removed debug log

// Helper function (ensure utils.js is injected or define locally if needed)
const feedback = typeof showFeedback === 'function' ? showFeedback : (msg, duration = 3000) => console.log(`Feedback: ${msg}`);

// --- State Keys ---
const PROCESSING_FLAG = 'tuneTransporterProcessing';
const NEXT_STEP_FLAG = 'tuneTransporterNextStep';
const TRACKS_KEY = 'tuneTransporterTracks';
const TARGET_TITLE_KEY = 'tuneTransporterTargetTitle'; // Playlist title
const CURRENT_TRACK_KEY = 'tuneTransporterCurrentTrack'; // Index of current track
// --- Function to initiate the search for the next song ---
// Removed startNextSongSearch function as logic is moved to message listener and search script

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
        
                             // --- Setup for the first song search ---
                             if (tracks && tracks.length > 0) {
                                 const firstTrack = tracks[0];
                                 const firstSearchQuery = `${firstTrack.title} ${firstTrack.artist || ''}`.trim();
                                 const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(firstSearchQuery)}`;

                                 // Store the FULL track list, target title, initial index (0), and flags
                                 sessionStorage.setItem(TRACKS_KEY, JSON.stringify(tracks)); // Store full list
                                 sessionStorage.setItem(TARGET_TITLE_KEY, createdTitle);
                                 sessionStorage.setItem(CURRENT_TRACK_KEY, '0'); // Start at index 0
                                 sessionStorage.setItem(PROCESSING_FLAG, 'true');
                                 sessionStorage.setItem(NEXT_STEP_FLAG, 'findSongOnSearchPage');

                                 console.log(`[YTM Library Content Script] Stored ${tracks.length} tracks, target "${createdTitle}", index 0. Set flags.`);
                                 console.log(`[YTM Library Content Script] Navigating to search for first song: ${searchUrl}`);
                                 feedback(`Starting search for first song: ${firstTrack.title}...`, 4000);

                                 // Navigate directly to the first search - NO reload needed here
                                 await delay(1000); // Short delay before navigation
                                 window.location.href = searchUrl;

                             } else {
                                 console.log("[YTM Library Content Script] No tracks provided, finishing process.");
                                 feedback("No tracks to add.", 3000);
                                 // No need to set flags if there are no tracks
                             }
        
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

// Removed 'load' event listener - library page no longer initiates subsequent searches

console.log("[YTM Library Content Script] Listener added.");