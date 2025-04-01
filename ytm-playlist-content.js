// TuneTransporter/ytm-playlist-content.js

  // Helper function to pause execution
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Function to extract info from a single YTM row
  // Now focuses on Title and ID. Artist extraction is simplified as it's often handled by the caller (for albums).
  function extractYtmTrackInfoFromRow(rowElement) {
      const titleSelector = 'div.flex-columns div.title-column yt-formatted-string.title';
      const artistColumnSelector = 'div.secondary-flex-columns yt-formatted-string.flex-column a[href^="/browse/"]'; // More specific selector for playlist artist link
      const watchLinkSelector = 'a[href*="watch?v="]'; // For unique ID

      const titleElement = rowElement.querySelector(titleSelector);
      const title = titleElement ? titleElement.getAttribute('title') || titleElement.textContent?.trim() : null; // Prefer title attribute

      // Try to find a unique video ID from any link within the row
      const watchLinkElement = rowElement.querySelector(watchLinkSelector);
      let videoId = null;
      if (watchLinkElement) {
          const href = watchLinkElement.getAttribute('href');
          try {
               if (href && href.includes('?')) {
                   const urlParams = new URLSearchParams(href.split('?')[1]);
                   videoId = urlParams.get('v');
               } else {
                   console.warn("TuneTransporter: Watch link href invalid or missing '?'", href);
               }
          } catch (e) { console.warn("TuneTransporter: Could not parse video ID from href", href, e); }
      }
      const trackId = videoId ? `ytm_${videoId}` : null; // Create a unique ID if possible

      // Simplified Artist Extraction (Primarily for Playlists as a fallback)
      let artist = null;
      const artistLinkElement = rowElement.querySelector(artistColumnSelector);
      if (artistLinkElement) {
          artist = artistLinkElement.textContent?.trim();
          // Basic processing (can be enhanced in utils.js if needed)
          if (artist && typeof processArtistString === 'function') {
              artist = processArtistString(artist);
          }
      }

      let result = null;
      if (title && trackId) { // Require title and ID
          result = { id: trackId, title: title, artist: artist }; // Include artist if found (null otherwise)
      } else if (title && !trackId) {
          // Log if ID is missing but title is present
          console.warn("TuneTransporter: Track ID (videoId) not found for:", title);
          // Optionally create a fallback ID if needed, but prefer skipping if ID is crucial
          // const fallbackId = `ytm_fallback_${title.replace(/\s+/g, '_')}`;
          // result = { id: fallbackId, title: title, artist: artist };
      }

      return result; // Return extracted info (artist might be null)
  }


  // Main async function to scroll and extract YTM tracks and title
  async function scrollAndExtractAllYtmTracks() {
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
      console.log(`TuneTransporter: Found page title: "${pageTitle}"`);

      // --- Extract Album Artist (if applicable) ---
      let albumArtist = null;
      // Selectors for the main artist link in various header locations
      const albumArtistSelectors = [
          'ytmusic-detail-header-renderer .subtitle .byline-wrapper a', // Common detail header subtitle
          'ytmusic-detail-header-renderer .subtitle a',                 // Simpler detail header subtitle
          'ytmusic-responsive-header-renderer .subtitle a',             // Responsive header subtitle
          'ytmusic-responsive-header-renderer .strapline-text a'        // Responsive header strapline (NEW)
      ];
      for (const selector of albumArtistSelectors) {
          const artistElement = document.querySelector(selector);
          if (artistElement) {
              albumArtist = artistElement.textContent?.trim();
              if (albumArtist && typeof processArtistString === 'function') {
                  albumArtist = processArtistString(albumArtist); // Process the album artist name
              }
              if (albumArtist) {
                 console.log(`TuneTransporter: Found Album Artist in header using selector "${selector}": "${albumArtist}"`);
                 break; // Stop searching once found
              }
          }
      }
      if (!albumArtist) {
          console.log("TuneTransporter: Album Artist not found in header (might be a playlist or compilation).");
      }
      // --- End Artist Extraction ---

      // --- Determine Container and Track Selectors ---
      const playlistContainerSelector = 'ytmusic-playlist-shelf-renderer > div#contents';
      const albumContainerSelector = 'ytmusic-shelf-renderer[page-type="MUSIC_PAGE_TYPE_ALBUM"] > div#contents';
      const trackRowSelector = 'ytmusic-responsive-list-item-renderer'; // Consistent row selector

      let listContainer = document.querySelector(playlistContainerSelector);
      let containerType = 'Playlist';
      if (!listContainer) {
          listContainer = document.querySelector(albumContainerSelector);
          containerType = 'Album';
      }

      if (!listContainer) {
          console.error(`TuneTransporter ERROR: Could not find playlist container ('${playlistContainerSelector}') or album container ('${albumContainerSelector}'). Stopping extraction.`);
          showFeedback(`TuneTransporter Error: Content container not found. Cannot extract.`, 5000);
          return { title: pageTitle, tracks: [] }; // Return title even on error
      }
      console.log(`TuneTransporter: Found content container using ${containerType} selector.`);
      // --- End Container Determination ---

    const scrollTarget = window;
    const feedback = typeof showFeedback === 'function' ? showFeedback : (msg) => console.log(msg);
    feedback("TuneTransporter: Starting YTM content extraction...", 2000);

    const extractedTracks = [];
    const processedElements = new Set();
    let lastScrollHeight = 0;
    let stableScrollCount = 0;
    const maxStableScrolls = 3;
    const scrollDelayMs = 2500;
    const maxIterations = 250;
    let iterations = 0;

    console.log("TuneTransporter: Starting YTM scroll extraction...");

    while (stableScrollCount < maxStableScrolls && iterations < maxIterations) {
      iterations++;
      const currentRows = listContainer.querySelectorAll(trackRowSelector);
      let currentIterationFoundCount = 0;

      currentRows.forEach(row => {
        if (processedElements.has(row)) return;
        processedElements.add(row);

        const trackInfo = extractYtmTrackInfoFromRow(row);

        if (trackInfo && trackInfo.title) { // Need at least a title
            let finalArtist = null;
            if (albumArtist) { // If we found an album artist in the header, always use it
                finalArtist = albumArtist;
            } else if (trackInfo.artist) { // Otherwise, use the artist found in the row (playlist case)
                finalArtist = trackInfo.artist;
            }
            // If neither albumArtist nor trackInfo.artist is found, finalArtist remains null

            if (finalArtist) {
                extractedTracks.push({ title: trackInfo.title, artist: finalArtist });
                currentIterationFoundCount++;
            } else {
                // Only warn if *no* artist could be determined (neither album nor row)
                console.warn(`TuneTransporter: Skipping track "${trackInfo.title}" due to missing Artist info (and no Album Artist found).`);
            }
        } else if (!trackInfo?.title) {
             // Optional: Log if title extraction failed for a row
             // console.warn("TuneTransporter: Failed to extract title from a row.", row);
        }
      });

      console.log(`TuneTransporter Iteration ${iterations}: Found ${currentIterationFoundCount} new tracks this iteration. Total: ${extractedTracks.length}`);
      feedback(`TuneTransporter: Found ${extractedTracks.length} total tracks...`, 1000);

      const currentScrollHeight = document.documentElement.scrollHeight;
      const scrollAmount = window.innerHeight * 3;
      scrollTarget.scrollBy(0, scrollAmount);
      await delay(scrollDelayMs);
      const newScrollHeight = document.documentElement.scrollHeight;

      if (newScrollHeight === lastScrollHeight) {
          stableScrollCount++;
          console.log(`TuneTransporter: Scroll height stable. Count: ${stableScrollCount}/${maxStableScrolls}`);
      } else {
          stableScrollCount = 0;
          console.log(`TuneTransporter: Scroll height changed (${lastScrollHeight} -> ${newScrollHeight}). Resetting stable count.`);
      }

       if (stableScrollCount >= maxStableScrolls) {
          console.log("TuneTransporter: Scroll height stable. Assuming end of list.");
          feedback("TuneTransporter: Reached end of list, performing final check...", 1500);
          await delay(scrollDelayMs); // Wait a bit more
          let finalFoundCount = 0;
          const finalRows = listContainer.querySelectorAll(trackRowSelector);
          finalRows.forEach(row => {
             if (processedElements.has(row)) return;
             // No need to add to processedElements here

             const trackInfo = extractYtmTrackInfoFromRow(row);
             if (trackInfo && trackInfo.title) {
                 let finalArtist = null;
                 if (albumArtist) {
                     finalArtist = albumArtist;
                 } else if (trackInfo.artist) {
                     finalArtist = trackInfo.artist;
                 }

                 if (finalArtist) {
                     extractedTracks.push({ title: trackInfo.title, artist: finalArtist });
                     finalFoundCount++;
                 }
                 // No warning here, just final pass
             }
          });
          console.log(`TuneTransporter: Final check added ${finalFoundCount} more tracks.`);
          break; // Exit loop
      }
      lastScrollHeight = newScrollHeight;
    } // End while loop

    if (iterations >= maxIterations) {
        console.warn(`TuneTransporter: Reached max scroll iterations (${maxIterations}). Stopping extraction.`);
        feedback("TuneTransporter Warning: Reached max scroll iterations.", 4000);
    }

    console.log(`TuneTransporter: Finished YTM extraction. Total tracks found: ${extractedTracks.length}.`);
    feedback(`TuneTransporter: Finished. Found ${extractedTracks.length} total tracks.`, 3000);
    return { title: pageTitle, tracks: extractedTracks };
  }


  // --- Function to Create a New YTM Playlist ---
  async function createYtmPlaylist(playlistTitle) {
      const feedback = typeof showFeedback === 'function' ? showFeedback : (msg) => console.log(msg);
      const newPlaylistButtonSelector = 'button[aria-label="New playlist"]';
      const dialogSelector = 'ytmusic-dialog';
      const titleInputSelector = 'ytmusic-dialog tp-yt-paper-input#title-input input';
      const createButtonSelector = 'ytmusic-dialog button[aria-label="Create"]';
      const dialogWaitMs = 1500;
      const actionDelayMs = 500;

      feedback(`TuneTransporter: Attempting to create playlist "${playlistTitle}"...`, 2000);
      console.log(`TuneTransporter: Attempting to create playlist "${playlistTitle}"...`);

      try {
          const newPlaylistButton = document.querySelector(newPlaylistButtonSelector);
          if (!newPlaylistButton) {
              console.error("TuneTransporter ERROR: 'New playlist' button not found.");
              feedback("TuneTransporter Error: 'New playlist' button not found.", 5000);
              return { success: false, error: "Button not found" };
          }
          console.log("TuneTransporter: Found 'New playlist' button.");
          newPlaylistButton.click();
          await delay(dialogWaitMs);

          const dialogElement = document.querySelector(dialogSelector);
          if (!dialogElement) {
              console.error("TuneTransporter ERROR: Playlist creation dialog did not appear.");
              feedback("TuneTransporter Error: Playlist creation dialog not found.", 5000);
              return { success: false, error: "Dialog not found" };
          }
          console.log("TuneTransporter: Found playlist creation dialog.");

          const titleInput = dialogElement.querySelector(titleInputSelector);
          if (!titleInput) {
              console.error("TuneTransporter ERROR: Title input field not found in dialog.");
              feedback("TuneTransporter Error: Title input not found.", 5000);
              return { success: false, error: "Title input not found" };
          }
          console.log("TuneTransporter: Found title input field.");

          titleInput.value = playlistTitle;
          titleInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          console.log(`TuneTransporter: Set playlist title to "${playlistTitle}".`);
          await delay(actionDelayMs);

          const createButton = dialogElement.querySelector(createButtonSelector);
          if (!createButton) {
              console.error("TuneTransporter ERROR: 'Create' button not found in dialog.");
              feedback("TuneTransporter Error: 'Create' button not found.", 5000);
              return { success: false, error: "'Create' button not found" };
          }
          if (createButton.disabled || createButton.hasAttribute('aria-disabled') && createButton.getAttribute('aria-disabled') !== 'false') {
               console.error("TuneTransporter ERROR: 'Create' button is disabled. Title might be invalid or empty.");
               feedback("TuneTransporter Error: 'Create' button is disabled.", 5000);
               return { success: false, error: "'Create' button disabled" };
          }

          console.log("TuneTransporter: Found 'Create' button.");
          createButton.click();
          console.log("TuneTransporter: Clicked 'Create' button.");
          feedback(`TuneTransporter: Playlist "${playlistTitle}" creation initiated.`, 3000);

          return { success: true };

      } catch (error) {
          console.error("TuneTransporter ERROR: An unexpected error occurred during playlist creation:", error);
          feedback("TuneTransporter Error: Unexpected error during creation.", 5000);
          return { success: false, error: error.message };
      }
  }


  // Note: This script relies on `utils.js` (for processArtistString and showFeedback)
  // being injected into the page context *before* this script is executed,
  // specifically when calling scrollAndExtractAllYtmTracks or createYtmPlaylist via chrome.scripting.executeScript.