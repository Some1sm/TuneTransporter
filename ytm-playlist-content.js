// TuneTransporter/ytm-playlist-content.js

// Helper function to pause execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to extract info from a single YTM row
// Assumes processArtistString is available (will be injected via popup.js)
function extractYtmTrackInfoFromRow(rowElement) {
    const titleSelector = 'div.flex-columns div.title-column yt-formatted-string.title';
    const artistColumnSelector = 'div.secondary-flex-columns yt-formatted-string.flex-column';
    const watchLinkSelector = 'a[href*="watch?v="]'; // For unique ID, check title or secondary cols

    const titleElement = rowElement.querySelector(titleSelector);
    const title = titleElement ? titleElement.getAttribute('title') || titleElement.textContent?.trim() : null; // Prefer title attribute

    // Try to find a unique video ID from any link within the row
    const watchLinkElement = rowElement.querySelector(watchLinkSelector);
    let videoId = null;
    if (watchLinkElement) {
        const href = watchLinkElement.getAttribute('href');
        try {
             // Ensure href is valid before splitting
             if (href && href.includes('?')) {
                 const urlParams = new URLSearchParams(href.split('?')[1]);
                 videoId = urlParams.get('v');
             } else {
                 // Keep this warning
                 console.warn("TuneTransporter: Watch link href invalid or missing '?'", href);
             }
        } catch (e) { console.warn("TuneTransporter: Could not parse video ID from href", href, e); }
    }
    const trackId = videoId ? `ytm_${videoId}` : null; // Create a unique ID if possible

    const secondaryColumns = rowElement.querySelectorAll(artistColumnSelector);
    let artistNames = [];
    // --- Refined Artist Logic: Focus primarily on the first secondary column ---
    if (secondaryColumns.length > 0) {
        const firstCol = secondaryColumns[0];
        const artistLink = firstCol.querySelector('a[href^="/channel/"]'); // Check for link inside first
        let name = null;

        if (artistLink) {
            // Found link inside, use its text
            name = artistLink.textContent?.trim();
        } else {
            // Fallback: No link inside, get text directly from the first column element
            const colText = firstCol.textContent?.trim();
            // Basic heuristic: Add text if it's not empty and doesn't look like a 4-digit year
            if (colText && !/^\d{4}$/.test(colText)) {
                name = colText;
             } else {
                 // Skip empty or year-like text
             }
        }
        // Add the extracted name if it's valid
        if (name) {
            artistNames.push(name);
        }
    } else {
        // No secondary columns found
    }
    // --- End Refined Artist Logic ---

    const combinedArtistString = artistNames.join(" ");
    // processArtistString needs to be defined in the execution context
    // It will be injected alongside this script from popup.js
    const processedArtist = typeof processArtistString === 'function'
        ? processArtistString(combinedArtistString)
        : combinedArtistString; // Fallback if injection fails

    let result = null;
    if (title && processedArtist && trackId) { // Require an ID now
        result = { id: trackId, title: title, artist: processedArtist };
    } else if (title && processedArtist) {
        // Fallback if ID couldn't be found (less ideal for uniqueness)
        // Keep this warning
        // console.warn("TuneTransporter: Track ID (videoId) not found for:", title, " - Using title+artist as temporary ID"); // Keep commented for potential future debug
        // Use a combination as a fallback ID, replacing spaces to make it slightly more robust
        const fallbackId = `ytm_fallback_${title.replace(/\s+/g, '_')}_${processedArtist.replace(/\s+/g, '_')}`;
        result = { id: fallbackId, title: title, artist: processedArtist };
    }

    return result; // Failed to get required info or successful extraction
}


// Main async function to scroll and extract YTM tracks and title
// This function will be executed in the target tab's context
async function scrollAndExtractAllYtmTracks(containerSelector, trackRowSelector) {
    // --- Extract Playlist Title ---
    const playlistTitleSelector = 'ytmusic-responsive-header-renderer h1 yt-formatted-string.title';
    const playlistTitleElement = document.querySelector(playlistTitleSelector);
    const playlistTitle = playlistTitleElement ? playlistTitleElement.textContent?.trim() : 'Unknown Playlist';
    console.log(`TuneTransporter: Found playlist title: "${playlistTitle}"`);
    // --- End Playlist Title Extraction ---

  // YTM often scrolls the main window or a specific container like '#contents' or 'ytmusic-browse-response'
  // Let's try scrolling the window first, then fallback to a container if needed
  const scrollTarget = window; // Or document.querySelector('#contents') or other container
  const playlistContainer = document.querySelector(containerSelector); // e.g., '#contents'

  if (!playlistContainer) {
      // Make this log more prominent if the container isn't found
      console.error(`TuneTransporter ERROR: Playlist container element not found using selector "${containerSelector}". Stopping extraction.`);
      showFeedback(`TuneTransporter Error: Playlist container ('${containerSelector}') not found. Cannot extract.`, 5000); // Use feedback util
      return [];
  }

  // Ensure feedback function is available (should be injected via utils.js)
  const feedback = typeof showFeedback === 'function' ? showFeedback : (msg) => console.log(msg);

  feedback("TuneTransporter: Starting YTM playlist extraction...", 2000);

  const extractedTracks = []; // Use Array to store all tracks, including duplicates
  const processedElements = new Set(); // Keep track of processed DOM elements
  let lastScrollHeight = 0;
  let stableScrollCount = 0;
  const maxStableScrolls = 3; // Keep at 3 as requested
  const scrollDelayMs = 2500; // Increase delay further
  const maxIterations = 250; // Increase max iterations
  let iterations = 0;

  console.log("TuneTransporter: Starting YTM playlist scroll extraction...");

  while (stableScrollCount < maxStableScrolls && iterations < maxIterations) {
    iterations++;

    // Extract currently rendered tracks within the container
    const currentRows = playlistContainer.querySelectorAll(trackRowSelector);
    let currentIterationFoundCount = 0;
    currentRows.forEach(row => {
      if (processedElements.has(row)) {
          // console.log("Skipping already processed row element"); // Optional debug
          return; // Skip if this specific element was already processed
      }
      processedElements.add(row); // Mark this element as processed

      const trackInfo = extractYtmTrackInfoFromRow(row);
      // Ensure trackInfo and trackInfo.id are valid before adding
      if (trackInfo && trackInfo.id) {
          extractedTracks.push({ title: trackInfo.title, artist: trackInfo.artist }); // Push directly to array
          currentIterationFoundCount++;
      } else if (trackInfo && !trackInfo.id) {
          // Keep this warning
          console.warn("TuneTransporter: Skipping track due to missing ID:", trackInfo?.title || "[Title not found]");
      }
    });
    // Keep this essential progress log
    console.log(`TuneTransporter Iteration ${iterations}: Found ${currentIterationFoundCount} new tracks this iteration. Total (incl. duplicates): ${extractedTracks.length}`); // Use .length for array
    feedback(`TuneTransporter: Found ${extractedTracks.length} total tracks...`, 1000); // Use .length for array


    // --- Scroll Logic ---
    // Get current scroll height *before* scrolling
    const currentScrollHeight = document.documentElement.scrollHeight; // Use document height for window scroll

    // Scroll down by a few viewport heights to encourage loading
    const scrollAmount = window.innerHeight * 3;
    scrollTarget.scrollBy(0, scrollAmount);
    // console.log(`TuneTransporter: Scrolled down by ${scrollAmount}px`); // Optional debug log
    // If scrolling a container: scrollTarget.scrollTop = scrollTarget.scrollHeight;

    // Wait for potential loading
    await delay(scrollDelayMs);

    // Get scroll height *after* scrolling and waiting
    const newScrollHeight = document.documentElement.scrollHeight;

    // --- Check Stability (Revised Logic) ---
    // Increment stable count ONLY if the scroll height hasn't changed.
    // Reset if the scroll height HAS changed, even if no new tracks were found yet,
    // as content might still be loading in.
    if (newScrollHeight === lastScrollHeight) {
        stableScrollCount++;
        console.log(`TuneTransporter: Scroll height stable. Count: ${stableScrollCount}/${maxStableScrolls}`);
    } else {
        stableScrollCount = 0; // Reset if height changed, assume more content might load
        console.log(`TuneTransporter: Scroll height changed (${lastScrollHeight} -> ${newScrollHeight}). Resetting stable count.`);
    }

     if (stableScrollCount >= maxStableScrolls) {
        console.log("TuneTransporter: No new tracks found or scroll height stable. Assuming end of list.");
        feedback("TuneTransporter: Reached end of list, performing final check...", 1500);
        // Optional: One last check after potential final load
        await delay(scrollDelayMs); // Wait a bit more
        let finalFoundCount = 0;
        const finalRows = playlistContainer.querySelectorAll(trackRowSelector);
        finalRows.forEach(row => {
           if (processedElements.has(row)) {
               // console.log("Skipping already processed row element in final check"); // Optional debug
               return; // Skip if this specific element was already processed
           }
           // No need to add to processedElements here as it's the final check

           const trackInfo = extractYtmTrackInfoFromRow(row);
           if (trackInfo && trackInfo.id) {
               extractedTracks.push({ title: trackInfo.title, artist: trackInfo.artist }); // Push directly to array
               finalFoundCount++;
           }
        });
        // Keep this essential log
        console.log(`TuneTransporter: Final check added ${finalFoundCount} more tracks.`);
        break; // Exit loop
    }

    lastScrollHeight = newScrollHeight;

  } // End while loop


  if (iterations >= maxIterations) {
      // Keep this essential warning
      console.warn(`TuneTransporter: Reached max scroll iterations (${maxIterations}). Stopping extraction.`);
      feedback("TuneTransporter Warning: Reached max scroll iterations.", 4000);
  }

  // Keep this essential final log
  console.log(`TuneTransporter: Finished YTM extraction. Total tracks found (incl. duplicates): ${extractedTracks.length}.`); // Use .length and update text
  feedback(`TuneTransporter: Finished. Found ${extractedTracks.length} total tracks.`, 3000);
  // Return both title and tracks
  return { title: playlistTitle, tracks: extractedTracks };
}

// Note: This script relies on `utils.js` (for processArtistString and showFeedback)
// being injected into the page context *before* this script is executed,
// specifically when calling scrollAndExtractAllYtmTracks via chrome.scripting.executeScript.