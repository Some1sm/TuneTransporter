// TuneTransporter/ytm-playlist-content.js

// Helper function to pause execution (Now loaded from utils.js)
// function delay(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// --- UPDATED Function to extract info from a single YTM row ---
// Targets specific column structure based on provided HTML
function extractYtmTrackInfoFromRow(rowElement, albumArtistFromHeader) {
    const titleSelector = 'div.title-column yt-formatted-string.title';
    const secondaryColumnsSelector = 'div.secondary-flex-columns';
    // Selector for the first column within the secondary columns (expected to be artist)
    const artistColumnSelector = `${secondaryColumnsSelector} yt-formatted-string.flex-column:first-of-type`;

    const titleElement = rowElement.querySelector(titleSelector);
    // Get title from its 'title' attribute or text content
    const title = titleElement ? titleElement.getAttribute('title')?.trim() || titleElement.textContent?.trim() : null;

    let artist = null;

    // 1. Prioritize album artist if provided (Album page scenario)
    if (albumArtistFromHeader) {
        artist = albumArtistFromHeader;
        // console.log(`DEBUG: Using album artist from header: ${artist}`);
    } else {
        // 2. Try extracting artist from the first secondary column (Playlist scenario)
        const artistColumnElement = rowElement.querySelector(artistColumnSelector);
        if (artistColumnElement) {
            // Prioritize the 'title' attribute of the artist column element
            artist = artistColumnElement.getAttribute('title')?.trim();
            if (!artist) {
                // Fallback to text content if title attribute is missing/empty
                artist = artistColumnElement.textContent?.trim();
            }
            // console.log(`DEBUG: Found artist in row column: ${artist}`);
        }
    }

    // 3. Apply external processing if artist found and function exists
    if (artist && typeof processArtistString === 'function') {
        // console.log(`DEBUG: Before processing: ${artist}`);
        artist = processArtistString(artist);
        // console.log(`DEBUG: After processing: ${artist}`);
    }

    // 4. Return result only if both title and artist are valid
    let result = null;
    if (title && artist) {
        result = { title: title, artist: artist };
    } else if (title && !artist) {
         // Log warning only if title was found but artist determination failed after all attempts
         console.warn(`TuneTransporter: Could not determine artist for track "${title}". Skipping.`);
    }
    // If title is null, result remains null

    return result; // Returns {title, artist} or null
}


// --- UPDATED Main async function to scroll and extract YTM tracks and title ---
async function scrollAndExtractAllYtmTracks() {
    const feedback = typeof showFeedback === 'function' ? showFeedback : (msg) => console.log(msg);
    feedback("TuneTransporter: Starting YTM content extraction...", 2000);
    // console.log("TuneTransporter: Starting YTM content extraction..."); // Removed debug log

    // --- Extract Page Title (Playlist or Album) ---
    let pageTitle = 'Unknown Title';
    let pageTitleElement = document.querySelector('ytmusic-detail-header-renderer h2.title yt-formatted-string'); // Album title
    if (pageTitleElement) {
        pageTitle = pageTitleElement.textContent?.trim() || pageTitle;
    } else {
        pageTitleElement = document.querySelector('ytmusic-responsive-header-renderer h1 yt-formatted-string.title'); // Playlist title
        if (pageTitleElement) {
            pageTitle = pageTitleElement.textContent?.trim() || pageTitle;
        }
    }
    // console.log(`TuneTransporter: Found page title: "${pageTitle}"`); // Removed debug log

    // --- Extract Album Artist (if applicable) ---
    let albumArtist = null; // Keep this variable name for clarity
    const albumArtistSelectors = [
        'ytmusic-detail-header-renderer .subtitle .byline-wrapper a',
        'ytmusic-detail-header-renderer .subtitle a',
        'ytmusic-responsive-header-renderer .subtitle a',
        'ytmusic-responsive-header-renderer .strapline-text a'
    ];
    for (const selector of albumArtistSelectors) {
        const artistElement = document.querySelector(selector);
        if (artistElement) {
            let potentialArtist = artistElement.textContent?.trim();
            if (potentialArtist && typeof processArtistString === 'function') {
                potentialArtist = processArtistString(potentialArtist);
            }
            if (potentialArtist) {
              albumArtist = potentialArtist; // Assign to albumArtist
              // console.log(`TuneTransporter: Found Album Artist in header: "${albumArtist}"`); // Removed debug log
               break;
            }
        }
    }
    if (!albumArtist) { // Keep check
        // console.log("TuneTransporter: Album Artist not found in header (might be a playlist or compilation)."); // Removed debug log
    }
    // --- End Artist Extraction ---

    // --- Determine Container and Track Selectors ---
    const playlistContainerSelector = 'ytmusic-playlist-shelf-renderer > div#contents';
    const albumContainerSelector = 'ytmusic-shelf-renderer[page-type="MUSIC_PAGE_TYPE_ALBUM"] > div#contents';
    const trackRowSelector = 'ytmusic-responsive-list-item-renderer';

    let listContainer = document.querySelector(playlistContainerSelector);
    let containerType = 'Playlist';
    if (!listContainer) {
        listContainer = document.querySelector(albumContainerSelector);
        containerType = 'Album';
    }

    if (!listContainer) { // Keep check
        console.error(`ERROR: Could not find playlist or album container. Stopping extraction.`); // Keep error log
        feedback(`TuneTransporter Error: Content container not found. Cannot extract.`, 5000);
        return { title: pageTitle, tracks: [] }; // Return title even on error
    }
    // console.log(`TuneTransporter: Found content container using ${containerType} selector.`); // Removed debug log
    // --- End Container Determination ---

  const scrollTarget = window;
  const extractedTracks = [];
  const processedElements = new Set();
  let lastScrollHeight = 0;
  let stableScrollCount = 0;
  const maxStableScrolls = 3;
  const scrollDelayMs = 2500;
  const maxIterations = 250;
  let iterations = 0;

  // console.log("TuneTransporter: Starting YTM scroll extraction loop..."); // Removed debug log

  while (stableScrollCount < maxStableScrolls && iterations < maxIterations) {
    iterations++;
    const currentRows = listContainer.querySelectorAll(trackRowSelector);
    let currentIterationFoundCount = 0;

    currentRows.forEach(row => {
      if (processedElements.has(row)) return;
      processedElements.add(row);

      // Pass the potentially found albumArtist to the extraction function
      // extractYtmTrackInfoFromRow will prioritize albumArtist if it exists,
      // otherwise it will try to parse the artist from the row itself.
      const trackInfo = extractYtmTrackInfoFromRow(row, albumArtist);

      // The check is now simpler as extractYtmTrackInfoFromRow returns null if incomplete
      if (trackInfo) { // trackInfo is {title, artist} or null
          extractedTracks.push(trackInfo);
          currentIterationFoundCount++;
      }
      // Warning for missing artist is now handled inside extractYtmTrackInfoFromRow
    });

    // console.log(`TuneTransporter Iteration ${iterations}: Found ${currentIterationFoundCount} new tracks. Total: ${extractedTracks.length}`); // Removed debug log
    feedback(`TuneTransporter: Found ${extractedTracks.length} total tracks...`, 1000);

    const currentScrollHeight = document.documentElement.scrollHeight;
    scrollTarget.scrollBy(0, window.innerHeight * 3);
    await delay(scrollDelayMs);
    const newScrollHeight = document.documentElement.scrollHeight;

    if (newScrollHeight === lastScrollHeight) {
        stableScrollCount++;
    } else {
        stableScrollCount = 0;
    }
    lastScrollHeight = newScrollHeight;

    if (stableScrollCount >= maxStableScrolls) { // Keep check
        // console.log("TuneTransporter: Scroll height stable. Performing final check..."); // Removed debug log
        feedback("TuneTransporter: Reached end of list, final check...", 1500);
        await delay(scrollDelayMs); // Wait a bit more
        let finalFoundCount = 0;
        const finalRows = listContainer.querySelectorAll(trackRowSelector);
        finalRows.forEach(row => {
           if (processedElements.has(row)) return;
           // Pass albumArtist here too for the final check
           const trackInfo = extractYtmTrackInfoFromRow(row, albumArtist);
           if (trackInfo) {
               extractedTracks.push(trackInfo);
               finalFoundCount++;
           }
        }); // Keep loop end
        // console.log(`TuneTransporter: Final check added ${finalFoundCount} more tracks.`); // Removed debug log
        break; // Exit loop
    }
  } // End while loop

  if (iterations >= maxIterations) { // Keep check
      console.warn(`Reached max scroll iterations (${maxIterations}).`); // Keep warning log
      feedback("TuneTransporter Warning: Reached max scroll iterations.", 4000);
  }

  // console.log(`TuneTransporter: Finished YTM extraction. Total tracks found: ${extractedTracks.length}.`); // Removed debug log
  feedback(`TuneTransporter: Finished extraction. Found ${extractedTracks.length} total tracks.`, 3000);
  return { title: pageTitle, tracks: extractedTracks };
}


// --- Function to Create a New YTM Playlist --- (Keep this function)
async function createYtmPlaylist(playlistTitle) {
    const feedback = typeof showFeedback === 'function' ? showFeedback : (msg) => console.log(msg);
    const newPlaylistButtonSelector = 'button[aria-label="New playlist"]';
    const dialogSelector = 'ytmusic-dialog';
    const titleInputSelector = 'ytmusic-dialog tp-yt-paper-input#title-input input';
    const createButtonSelector = 'ytmusic-dialog button[aria-label="Create"]';
    const dialogWaitMs = 1500;
    const actionDelayMs = 500;
    const creationConfirmDelayMs = 2000;

    feedback(`TuneTransporter: Attempting to create playlist "${playlistTitle}"...`, 2000);
    // console.log(`TuneTransporter: Attempting to create playlist "${playlistTitle}"...`); // Removed debug log

    try {
        // Add a delay before interacting with the DOM, especially when called automatically
        // console.log("[YTM Playlist Content] Adding delay before starting creation steps..."); // Removed debug log
        await delay(500); // 500ms delay - adjust if needed

        const newPlaylistButton = document.querySelector(newPlaylistButtonSelector);
        if (!newPlaylistButton) {
            console.error("ERROR: 'New playlist' button not found. Ensure you are on the Library > Playlists page."); // Keep error log
            feedback("TuneTransporter Error: 'New playlist' button not found. Go to Library > Playlists.", 6000);
            return { success: false, error: "Button not found", playlistTitle: null };
        }
        newPlaylistButton.click();
        await delay(dialogWaitMs);

        const dialogElement = document.querySelector(dialogSelector);
        if (!dialogElement) {
            console.error("ERROR: Playlist creation dialog did not appear."); // Keep error log
            feedback("TuneTransporter Error: Playlist creation dialog not found.", 5000);
            return { success: false, error: "Dialog not found", playlistTitle: null };
        }

        const titleInput = dialogElement.querySelector(titleInputSelector);
        if (!titleInput) {
            console.error("ERROR: Title input field not found in dialog."); // Keep error log
            feedback("TuneTransporter Error: Title input not found.", 5000);
            return { success: false, error: "Title input not found", playlistTitle: null };
        }

        titleInput.value = playlistTitle;
        titleInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        await delay(actionDelayMs);

        const createButton = dialogElement.querySelector(createButtonSelector);
        if (!createButton) {
            console.error("ERROR: 'Create' button not found in dialog."); // Keep error log
            feedback("TuneTransporter Error: 'Create' button not found.", 5000);
            return { success: false, error: "'Create' button not found", playlistTitle: null };
        }
        if (createButton.disabled || createButton.hasAttribute('aria-disabled') && createButton.getAttribute('aria-disabled') !== 'false') {
            console.error("ERROR: 'Create' button is disabled."); // Keep error log
             feedback("TuneTransporter Error: 'Create' button is disabled.", 5000);
             return { success: false, error: "'Create' button disabled", playlistTitle: null };
        }

        createButton.click();
        await delay(creationConfirmDelayMs);

        // console.log(`TuneTransporter: Playlist "${playlistTitle}" likely created. Getting URL...`); // Removed debug log
        const newPlaylistUrl = window.location.href; // Get the URL after creation/navigation
        // console.log(`TuneTransporter: New playlist URL: ${newPlaylistUrl}`); // Removed debug log
        return { success: true, playlistTitle: playlistTitle, playlistUrl: newPlaylistUrl };

    } catch (error) {
        console.error("ERROR: An unexpected error occurred during playlist creation:", error); // Keep error log
        feedback("TuneTransporter Error: Unexpected error during creation.", 5000);
        return { success: false, error: error.message, playlistTitle: null };
    }
}

// --- Function to Add a Single Song to a Playlist --- (Keep this function)
async function addSongToPlaylist(songTitle, songArtist, targetPlaylistTitle) {
    const feedback = typeof showFeedback === 'function' ? showFeedback : (msg, duration = 3000) => console.log(msg);
    const actionDelayMs = 1000;
    const navigationDelayMs = 4000;
    const dialogWaitMs = 1500;

    feedback(`Adding "${songTitle}" by ${songArtist || 'Unknown Artist'} to "${targetPlaylistTitle}"...`, actionDelayMs + navigationDelayMs + dialogWaitMs + 500); // Extend feedback duration
    // console.log(`[addSongToPlaylist] START: Adding "${songTitle}" by ${songArtist || 'Unknown Artist'}" to playlist "${targetPlaylistTitle}"`); // Removed debug log

    try {
        // console.log("[addSongToPlaylist] Step 1: Search"); // Removed debug log
        // 1. Search
        const query = `${songTitle} ${songArtist || ''}`.trim(); // Handle potentially null artist
        const searchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
        // console.log(`[addSongToPlaylist] Navigating to search URL: ${searchUrl}`); // Removed debug log
        window.location.href = searchUrl;
        // console.log("[addSongToPlaylist] Waiting for navigation after search..."); // Removed debug log
        await delay(navigationDelayMs);
        // console.log("[addSongToPlaylist] Navigation delay complete."); // Removed debug log

        // console.log("[addSongToPlaylist] Step 2: Find Result Link"); // Removed debug log
        const songShelfSelector = 'ytmusic-shelf-renderer[page-type="MUSIC_PAGE_TYPE_SEARCH"]';
        const songResultSelector = `${songShelfSelector} div#contents ytmusic-responsive-list-item-renderer a[href*="watch?v="]`;
        const topResultSongLinkSelector = 'ytmusic-card-shelf-renderer[header="Top result"] a[href*="watch?v="]';
        const videoResultSelector = 'ytmusic-shelf-renderer[title^="Video"] div#contents ytmusic-responsive-list-item-renderer:first-of-type a[href*="watch?v="]';

        let songLinkElement = document.querySelector(songResultSelector);
        if (!songLinkElement) songLinkElement = document.querySelector(topResultSongLinkSelector);
        if (!songLinkElement) songLinkElement = document.querySelector(videoResultSelector);

        if (!songLinkElement) {
            console.error(`ERROR: No suitable song/video link found for "${query}".`); // Keep error log
             feedback(`Error: Song/Video "${songTitle}" not found. Skipping.`, 5000);
             return false; // Indicate failure for this song
        }
        // console.log("[addSongToPlaylist] Found song link element:", songLinkElement); // Removed debug log
        songLinkElement.click();
        // console.log("[addSongToPlaylist] Clicked song link. Waiting for navigation..."); // Removed debug log
        await delay(navigationDelayMs);
        // console.log("[addSongToPlaylist] Navigation delay complete."); // Removed debug log

        // console.log("[addSongToPlaylist] Step 3: Open Menu"); // Removed debug log
        const menuButtonSelector = '#menu > ytmusic-menu-renderer > yt-icon-button';
        const menuButton = document.querySelector(menuButtonSelector);
        if (!menuButton) {
            console.error("ERROR: Song menu button not found on watch page."); // Keep error log
            feedback(`Error: Menu button not found for "${songTitle}". Skipping.`, 5000);
            return false; // Indicate failure
        }
        // console.log("[addSongToPlaylist] Found menu button:", menuButton); // Removed debug log
        menuButton.click();
        // console.log("[addSongToPlaylist] Clicked menu button. Waiting for dropdown..."); // Removed debug log
        await delay(dialogWaitMs);
        // console.log("[addSongToPlaylist] Menu dropdown delay complete."); // Removed debug log

        // console.log("[addSongToPlaylist] Step 4: Click 'Save to playlist'"); // Removed debug log
        const menuDropdownSelector = 'tp-yt-iron-dropdown';
        const saveToPlaylistItemText = "Save to playlist";
        const menuItemsSelector = `${menuDropdownSelector} ytmusic-menu-navigation-item-renderer, ${menuDropdownSelector} ytmusic-menu-service-item-renderer`;
        const menuDropdown = document.querySelector(menuDropdownSelector);
        if (!menuDropdown) {
            console.error("ERROR: Menu dropdown did not appear."); // Keep error log
             feedback(`Error: Song menu did not open for "${songTitle}". Skipping.`, 5000);
             return false; // Indicate failure
        }
        // console.log("[addSongToPlaylist] Found menu dropdown. Searching for 'Save to playlist' item..."); // Removed debug log
        let saveToPlaylistButton = null;
        menuDropdown.querySelectorAll(menuItemsSelector).forEach(item => {
            const textElement = item.querySelector('yt-formatted-string.text');
            if (textElement && textElement.textContent?.trim() === saveToPlaylistItemText) {
                saveToPlaylistButton = item;
            }
        });
        if (!saveToPlaylistButton) {
            console.error(`ERROR: "${saveToPlaylistItemText}" button not found in menu.`); // Keep error log
            feedback(`Error: "${saveToPlaylistItemText}" not found for "${songTitle}". Skipping.`, 5000);
            return false; // Indicate failure
        }
        // console.log("[addSongToPlaylist] Found 'Save to playlist' button:", saveToPlaylistButton); // Removed debug log
        saveToPlaylistButton.click();
        // console.log("[addSongToPlaylist] Clicked 'Save to playlist'. Waiting for dialog..."); // Removed debug log
        await delay(dialogWaitMs);
        // console.log("[addSongToPlaylist] Save dialog delay complete."); // Removed debug log

        // console.log("[addSongToPlaylist] Step 5: Select Target Playlist"); // Removed debug log
        const dialogSelector = 'tp-yt-paper-dialog ytmusic-add-to-playlist-renderer';
        const playlistListSelector = `${dialogSelector} #playlists`;
        const playlistItemSelector = `ytmusic-playlist-add-to-option-renderer`;
        const playlistTitleSelector = `yt-formatted-string#title`;

        const addToPlaylistDialog = document.querySelector(dialogSelector);
        if (!addToPlaylistDialog) {
            console.error("ERROR: 'Save to playlist' dialog did not appear."); // Keep error log
            feedback(`Error: 'Save to playlist' dialog did not open for "${songTitle}". Skipping.`, 5000);
            return false; // Indicate failure
        }
        // console.log("[addSongToPlaylist] Found 'Save to playlist' dialog."); // Removed debug log
        const playlistList = addToPlaylistDialog.querySelector(playlistListSelector);
        if (!playlistList) {
            console.error("ERROR: Playlist list container not found in dialog."); // Keep error log
             feedback(`Error: Playlist list not found for "${songTitle}". Skipping.`, 5000);
             return false; // Indicate failure
        }
        // console.log("[addSongToPlaylist] Found playlist list container. Searching for target playlist..."); // Removed debug log
        let targetPlaylistElement = null;
        playlistList.querySelectorAll(playlistItemSelector).forEach(item => {
            const titleElement = item.querySelector(playlistTitleSelector);
            const currentTitle = titleElement?.textContent?.trim() || titleElement?.getAttribute('title')?.trim();
            if (currentTitle && currentTitle.toLowerCase() === targetPlaylistTitle.toLowerCase()) {
                targetPlaylistElement = item.querySelector('button');
            }
        });
        if (!targetPlaylistElement) {
            console.error(`ERROR: Playlist "${targetPlaylistTitle}" not found in the dialog list.`); // Keep error log
            feedback(`Error: Playlist "${targetPlaylistTitle}" not found. Skipping.`, 5000);
            const closeButton = addToPlaylistDialog.querySelector('yt-button-shape.close-icon button'); // Try to close dialog
            closeButton?.click();
            await delay(actionDelayMs);
            return false; // Indicate failure
        }
        // console.log(`[addSongToPlaylist] Found target playlist "${targetPlaylistTitle}". Clicking...`); // Removed debug log
        targetPlaylistElement.click();
        await delay(actionDelayMs); // Wait for add confirmation/dialog close

        feedback(`Successfully added "${songTitle}" to "${targetPlaylistTitle}".`, 2000);
        // console.log(`[addSongToPlaylist] END: Successfully added "${songTitle}" to "${targetPlaylistTitle}".`); // Removed debug log
        return true; // Indicate success

    } catch (error) {
        console.error(`ERROR: An unexpected error occurred while adding "${songTitle}":`, error); // Keep error log
        feedback(`Error adding "${songTitle}": ${error.message}`, 5000);
        return false;
    }
}

// --- Main Processing Function (Called by Message Listener) ---
async function processPlaylist(playlistTitle, tracksToAdd, targetPlaylistTitle) {
    const feedback = typeof showFeedback === 'function' ? showFeedback : (msg, duration = 3000) => console.log(msg);
    const songAddDelayMs = 3000; // Delay between adding each song

    if (!tracksToAdd || tracksToAdd.length === 0) {
        feedback("TuneTransporter: No tracks provided to add.", 5000);
        // console.log("TuneTransporter: No tracks received. Exiting."); // Removed debug log
        return { success: false, added: 0, failed: 0, total: 0 };
    }

    // console.log(`[processPlaylist] START: Processing ${tracksToAdd.length} tracks for playlist "${targetPlaylistTitle}" (Original title: "${playlistTitle}")`); // Removed debug log
    feedback(`TuneTransporter: Processing ${tracksToAdd.length} tracks for "${targetPlaylistTitle}"...`, 3000);

    // Playlist should already be created by this point if needed.
    // We just need to add the songs.

    let addedCount = 0;
    let failedCount = 0;
    for (let i = 0; i < tracksToAdd.length; i++) {
        const track = tracksToAdd[i];
        if (!track || !track.title) { // Artist is helpful but not strictly required for search
            console.warn(`TuneTransporter: Skipping invalid track data at index ${i}:`, track);
            failedCount++;
            continue;
        }

        feedback(`Adding song ${i + 1}/${tracksToAdd.length}: "${track.title}"...`, songAddDelayMs + 500);
        // console.log(`\n[processPlaylist] --- Adding Song ${i + 1}/${tracksToAdd.length}: "${track.title}" by ${track.artist || 'Unknown Artist'} ---`); // Removed debug log

        // Pass the target playlist title explicitly
        const success = await addSongToPlaylist(track.title, track.artist, targetPlaylistTitle);

        if (success) {
            addedCount++;
        } else {
            failedCount++;
            console.warn(`Failed to add "${track.title}".`); // Keep warning log
            feedback(`Failed to add "${track.title}". Check console for details.`, 4000);
        }
        // console.log(`[processPlaylist] Finished attempt for song ${i + 1}. Waiting before next...`); // Removed debug log
        // Add delay between song additions *here* as well, after navigation back from watch page
        await delay(songAddDelayMs);
    }

    // Final Feedback
    // console.log(`\n[processPlaylist] END: Finished processing all tracks for "${targetPlaylistTitle}".`); // Removed debug log
    // console.log(`Playlist: ${targetPlaylistTitle}`); // Removed debug log
    // console.log(`Total Tracks Attempted: ${tracksToAdd.length}`); // Removed debug log
    // console.log(`Successfully Added: ${addedCount}`); // Removed debug log
    // console.log(`Failed: ${failedCount}`); // Removed debug log
    feedback(`Finished! Added ${addedCount}/${tracksToAdd.length} songs to "${targetPlaylistTitle}". ${failedCount > 0 ? `(${failedCount} failed)` : ''}`, 10000);

    // Flag removal is now handled by ytm-library-content.js when the queue is empty

    return { success: true, added: addedCount, failed: failedCount, total: tracksToAdd.length };
}


// --- Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const feedback = typeof showFeedback === 'function' ? showFeedback : (msg, duration = 3000) => console.log(msg);
    const storageKeyTitle = 'spotifyPlaylistTitle';
    const storageKeyTracks = 'spotifyTracks';

    if (message.action === "processYtmPlaylist") {
        // console.log("TuneTransporter (YTM): Received message:", message); // Removed debug log
        const source = message.source || 'ytm'; // Default to 'ytm' if source not provided

        (async () => { // Wrap async logic in an IIFE
            let playlistTitle;
            let tracksToAdd;
            let operationSuccess = false;
            let finalStats = { added: 0, failed: 0, total: 0 };

            try {
                if (source === 'spotify') {
                    feedback("TuneTransporter (YTM): Processing playlist from Spotify data...", 2000);
                    // console.log("TuneTransporter (YTM): Retrieving data from storage..."); // Removed debug log

                    // Retrieve data from storage
                    const result = await new Promise((resolve, reject) => {
                        chrome.storage.local.get([storageKeyTitle, storageKeyTracks], (data) => {
                            if (chrome.runtime.lastError) {
                                reject(chrome.runtime.lastError);
                            } else {
                                resolve(data);
                            }
                        });
                    });

                    playlistTitle = result[storageKeyTitle];
                    tracksToAdd = result[storageKeyTracks];

                    if (!playlistTitle || !tracksToAdd || tracksToAdd.length === 0) {
                        throw new Error("Playlist title or tracks not found in storage.");
                    }
                    // console.log(`TuneTransporter: Retrieved ${tracksToAdd.length} tracks for playlist "${playlistTitle}" from storage.`); // Removed debug log

                    // Create the playlist first
                    feedback("TuneTransporter: Ensure you are on the Library > Playlists page.", 5000);
                    await delay(2000); // Give user time to potentially navigate

                    const creationResult = await createYtmPlaylist(playlistTitle);
                    if (!creationResult || !creationResult.success) {
                        throw new Error(`Playlist creation failed: ${creationResult?.error || 'Unknown error'}`);
                    }
                    const targetPlaylistTitle = creationResult.playlistTitle; // Use the title returned/confirmed

                    // Now process (add) the tracks to the newly created playlist
                    const processResult = await processPlaylist(playlistTitle, tracksToAdd, targetPlaylistTitle);
                    operationSuccess = processResult.success;
                    finalStats = processResult;

                    // Clear storage after processing
                    chrome.storage.local.remove([storageKeyTitle, storageKeyTracks], () => {
                         if (chrome.runtime.lastError) {
                            console.error("ERROR: Failed to clear storage after Spotify processing:", chrome.runtime.lastError); // Keep error log
                         } else {
                            // console.log("TuneTransporter: Cleared Spotify playlist data from storage."); // Removed debug log
                         }
                    });

                } else if (source === 'ytm') {
                    feedback("TuneTransporter (YTM): Processing playlist from current YTM page...", 2000);
                    // 1. Extract from current page
                    const extractionResult = await scrollAndExtractAllYtmTracks();
                    playlistTitle = extractionResult.title; // Keep original title for processing
                    let targetPlaylistTitle = playlistTitle + " (Copy)"; // Append copy for creation
                    tracksToAdd = extractionResult.tracks;

                    if (!tracksToAdd || tracksToAdd.length === 0) {
                         throw new Error("No tracks extracted from the current YTM page.");
                    }

                    // 2. Create the new playlist
                    feedback("TuneTransporter: Ensure you are on the Library > Playlists page.", 5000);
                    await delay(2000);
                    const creationResult = await createYtmPlaylist(targetPlaylistTitle); // Use the modified title for creation
                     if (!creationResult || !creationResult.success) {
                        throw new Error(`Playlist creation failed: ${creationResult?.error || 'Unknown error'}`);
                    }
                    // Use the title confirmed by creation for adding songs
                    targetPlaylistTitle = creationResult.playlistTitle;

                    // 3. Process (add) tracks
                    const processResult = await processPlaylist(playlistTitle, tracksToAdd, targetPlaylistTitle);
                    operationSuccess = processResult.success;
                    finalStats = processResult;

                } else {
                    console.error(`Unknown source type "${source}" received.`); // Keep error log
                    feedback(`Error: Unknown processing source "${source}".`, 5000);
                }

                // Send success response back to caller if needed
                sendResponse({ success: operationSuccess, stats: finalStats });

            } catch (error) {
                console.error("ERROR in message listener:", error); // Keep error log
                feedback(`Error: ${error.message}`, 6000);
                // Send failure response back to caller
                sendResponse({ success: false, error: error.message, stats: finalStats });
                // Optionally clear storage in case of Spotify source failure
                if (source === 'spotify') {
                     chrome.storage.local.remove([storageKeyTitle, storageKeyTracks], () => {
                         if (chrome.runtime.lastError) {
                            console.error("ERROR: Failed to clear storage after Spotify error:", chrome.runtime.lastError); // Keep error log
                         } else {
                            // console.log("TuneTransporter: Cleared Spotify playlist data from storage after error."); // Removed debug log
                         }
                    });
                }
            }
        })(); // End async IIFE

        return true; // Indicates that the response will be sent asynchronously
    }
    // Handle other potential actions if needed
    // else if (message.action === "...") { ... }

    return false; // No async response planned for other actions
});

// console.log("TuneTransporter (YTM): Content script loaded and listener ready."); // Removed debug log


// Note: This script relies on `utils.js` (for showFeedback)
// being injected into the page context *before* this script is executed.
// It expects a message with { action: "processYtmPlaylist", source: "spotify" | "ytm" }
// to trigger its main logic.