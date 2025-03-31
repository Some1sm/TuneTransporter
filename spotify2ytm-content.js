// TuneTransporter/spotify2ytm-content.js
// NOTE: showFeedback and processArtistString functions are now loaded from utils.js

// --- Track Extraction Function (for Albums/Playlists) ---
// (processArtistString is loaded from utils.js)
// Renamed from extractVisibleSpotifyPlaylistTracks
function extractVisibleSpotifyTracks() {
  const trackList = [];
  // Selector for all track rows currently in the DOM (should work for albums too)
  const rowSelector = 'div[data-testid="tracklist-row"]';
  const trackRows = document.querySelectorAll(rowSelector);

  if (trackRows.length === 0) {
    console.log("TuneTransporter: No track rows found.");
    return trackList; // Return empty array
  }

  console.log(`TuneTransporter: Found ${trackRows.length} visible track rows.`);

  trackRows.forEach((rowElement, index) => {
    // Find the title element within the current row
    // This selector might need adjustment if album track structure differs significantly,
    // but let's try the playlist selector first.
    const titleSelector = 'div[role="gridcell"][aria-colindex="2"] a[data-testid="internal-track-link"] > div[data-encore-id="text"]';
    const titleElement = rowElement.querySelector(titleSelector);
    const title = titleElement ? titleElement.textContent?.trim() : null;

    // Find all artist link elements within the current row
    const artistSelector = 'div[role="gridcell"][aria-colindex="2"] span a[href^="/artist/"]';
    const artistElements = rowElement.querySelectorAll(artistSelector);

    let artistNames = [];
    if (artistElements.length > 0) {
      // Extract text from each artist link found
      artistNames = Array.from(artistElements).map(el => el.textContent?.trim()).filter(Boolean); // filter(Boolean) removes any null/empty strings
    }

    // Combine multiple artists (if any) into a single string - processArtistString can handle this further
    const combinedArtistString = artistNames.join(" "); // Simple space join for now

    // Use the utility function for consistency
    const processedArtist = processArtistString(combinedArtistString); // Assumes processArtistString is available globally via utils.js

    if (title && processedArtist) {
      // console.log(`Row ${index + 1}: Title="${title}", Artist="${processedArtist}"`); // Keep console less noisy
      trackList.push({ title: title, artist: processedArtist });
    } else {
      // Log which part failed if possible
      console.warn(`TuneTransporter: Failed to extract info from row ${index + 1}. Title found: ${!!title}, Artist found: ${!!processedArtist}`, rowElement);
    }
  });

  return trackList;
}


// --- Spotify Extraction and Redirection Logic ---
function spotifyToYTM(settings) { // Pass settings in
    // Check for internal redirect flag first
    if (sessionStorage.getItem('tuneTransporterRedirected') === 'true') {
        sessionStorage.removeItem('tuneTransporterRedirected');
        console.log("TuneTransporter: Detected internal redirect from search page. Stopping script execution for this page load.");
        return; // Stop the script
    }

    let itemName = null;    // Track OR album/single title
    let artistName = null;  // Artist name (always needed)
    const pathname = window.location.pathname;
    let isArtistSearch = false; // Flag for artist-only searches
    let isAlbumPageForCopy = false; // Flag to prevent redirection on album pages

    // --- Helper for Title Regex Extraction ---
    function _extractViaTitleRegex(regex, typeLabel, isArtistOnly = false) {
        console.log(`TuneTransporter: Attempting ${typeLabel} title extraction (Plan A)...`);
        const titleTagText = document.title;
        const match = titleTagText.match(regex);
        if (match && match[1]) {
            const potentialItemOrArtist = match[1].trim();
            const potentialArtistStr = !isArtistOnly ? match[2]?.trim() : null; // Artist is group 2 unless it's artist-only search

            if (isArtistOnly) {
                if (potentialItemOrArtist) {
                    const processedArtist = processArtistString(potentialItemOrArtist);
                    if (processedArtist) {
                        console.log(`TuneTransporter: Extracted ${typeLabel} via Title (Plan A) - Artist: "${processedArtist}"`);
                        return { item: null, artist: processedArtist };
                    } else {
                        console.warn(`TuneTransporter: ${typeLabel} title regex processed to empty artist (Plan A).`);
                    }
                } else {
                    console.warn(`TuneTransporter: ${typeLabel} title regex matched empty potential artist (Plan A).`);
                }
            } else { // Track or Album/Single
                if (potentialItemOrArtist && potentialArtistStr) {
                    const processedArtist = processArtistString(potentialArtistStr);
                    if (processedArtist) {
                        console.log(`TuneTransporter: Extracted ${typeLabel} via Title (Plan A) - Item: "${potentialItemOrArtist}", Artist: "${processedArtist}"`);
                        return { item: potentialItemOrArtist, artist: processedArtist };
                    } else {
                        console.warn(`TuneTransporter: ${typeLabel} title regex processed to empty artist (Plan A).`);
                    }
                } else {
                    console.warn(`TuneTransporter: ${typeLabel} title regex matched empty groups (Plan A).`);
                }
            }
        } else {
            console.log(`TuneTransporter: ${typeLabel} title regex did not match.`);
        }
        return null; // Failed extraction
    }

    // --- Helper for DOM Extraction ---
    function _extractViaDOM(titleSelector, artistSelector, typeLabel, isArtistOnly = false) {
        console.log(`TuneTransporter: Attempting ${typeLabel} DOM extraction (Plan B)...`);
        const titleElement = document.querySelector(titleSelector);
        const artistElement = isArtistOnly ? null : document.querySelector(artistSelector); // Only need title for artist

        if (isArtistOnly) {
            if (titleElement) {
                const potentialArtist = titleElement.textContent?.trim();
                if (potentialArtist) {
                    const processedArtist = processArtistString(potentialArtist);
                    if (processedArtist) {
                        console.log(`TuneTransporter: Extracted ${typeLabel} via DOM (Plan B) - Artist: "${processedArtist}"`);
                        return { item: null, artist: processedArtist };
                    } else {
                        console.warn(`TuneTransporter: ${typeLabel} DOM extraction processed to empty artist (Plan B).`);
                    }
                } else {
                    console.warn(`TuneTransporter: Found ${typeLabel} DOM element but text was empty (Plan B).`);
                }
            } else {
                console.log(`TuneTransporter: Could not find ${typeLabel} DOM element (Plan B).`);
            }
        } else { // Track or Album/Single
            if (titleElement && artistElement) {
                const potentialItem = titleElement.textContent?.trim();
                const potentialArtist = artistElement.textContent?.trim();
                if (potentialItem && potentialArtist) {
                    const processedArtist = processArtistString(potentialArtist);
                    if (processedArtist) {
                        console.log(`TuneTransporter: Extracted ${typeLabel} via DOM (Plan B) - Item: "${potentialItem}", Artist: "${processedArtist}"`);
                        return { item: potentialItem, artist: processedArtist };
                    } else {
                        console.warn(`TuneTransporter: ${typeLabel} DOM extraction processed to empty artist (Plan B).`);
                    }
                } else {
                    console.warn(`TuneTransporter: Found ${typeLabel} DOM elements but text was empty (Plan B).`);
                }
            } else {
                console.log(`TuneTransporter: Could not find ${typeLabel} DOM elements (Plan B).`);
            }
        }
        return null; // Failed extraction
    }

    try {
        // --- Detect Page Type ---
        if (pathname.startsWith('/track/')) {
            console.log("TuneTransporter: Detected Spotify Track page.");
            // --- Attempt Extraction for redirection ---
            const titleRegex = /^(.+?)\s*[-–—]\s*(?:song|lyrics)\s*(?:and lyrics)?\s*by\s+(.+?)\s*(?:\| Spotify)?$/i;
            let extractedData = _extractViaTitleRegex(titleRegex, 'Track');
            if (!extractedData) {
                const titleSelector = 'span[data-testid="entityTitle"] h1';
                const artistSelector = 'a[data-testid="creator-link"]';
                extractedData = _extractViaDOM(titleSelector, artistSelector, 'Track');
            }
            if (extractedData) {
                itemName = extractedData.item;
                artistName = extractedData.artist;
            }

        } else if (pathname.startsWith('/album/')) { // This covers Albums AND Singles
            console.log("TuneTransporter: Detected Spotify Album/Single page. Automatic redirection disabled. Ready for manual copy.");
            isAlbumPageForCopy = true; // Set flag to prevent redirection later
            // No need to extract itemName/artistName here for redirection purposes

        } else if (pathname.startsWith('/artist/')) {
            console.log("TuneTransporter: Detected Spotify Artist page.");
            isArtistSearch = true;
            // --- Attempt Extraction for redirection ---
            const titleRegex = /^(.+?)\s*(?:•.*?)?\s*(?:\| Spotify|- Listen on Spotify)\s*$/i;
            let extractedData = _extractViaTitleRegex(titleRegex, 'Artist', true);
            if (!extractedData) {
                const titleSelector = 'span[data-testid="entityTitle"] h1';
                extractedData = _extractViaDOM(titleSelector, null, 'Artist', true);
            }
            if (extractedData) {
                artistName = extractedData.artist;
            }

        } else if (pathname.startsWith('/search/')) {
            console.log("TuneTransporter: Detected Spotify Search Results page.");
            const isArtistResultsPage = pathname.includes('/artists');
            const isAlbumResultsPage = pathname.includes('/albums');
            const maxAttempts = 40;
            let attempts = 0;

            if (isArtistResultsPage) {
                // ... (search artist logic remains the same) ...
                console.log("TuneTransporter: Detected Artist Search Results page. Trying to select the first artist...");
                showFeedback("TuneTransporter: Trying to select the first artist result...");
                const artistSelector = 'div[data-testid="search-category-card-0"] a[href^="/artist/"]';
                const artistIntervalId = setInterval(() => {
                    attempts++;
                    const firstArtistLinkElement = document.querySelector(artistSelector);
                    if (firstArtistLinkElement) {
                        clearInterval(artistIntervalId);
                        const relativeUrl = firstArtistLinkElement.getAttribute('href');
                        const artistNameFromCard = firstArtistLinkElement.closest('[data-testid="search-category-card-0"]')?.querySelector('[data-encore-id="cardTitle"]')?.textContent?.trim() || 'Unknown Artist';
                        if (relativeUrl) {
                            const artistUrl = `https://open.spotify.com${relativeUrl}`;
                            showFeedback(`TuneTransporter: Automatically selecting first artist: ${artistNameFromCard}`);
                            sessionStorage.setItem('tuneTransporterRedirected', 'true');
                            window.location.href = artistUrl;
                        } else {
                            showFeedback("TuneTransporter: Could not automatically select the first artist result (missing link).");
                        }
                        return;
                    }
                    if (attempts >= maxAttempts) {
                        clearInterval(artistIntervalId);
                        showFeedback("TuneTransporter: Could not automatically select the first artist result (timeout).");
                    }
                }, 250);
            } else if (isAlbumResultsPage) {
                 // ... (search album logic remains the same) ...
                 console.log("TuneTransporter: Detected Album Search Results page. Trying to select the first album...");
                 showFeedback("TuneTransporter: Trying to select the first album result...");
                 const albumSelector = 'div[data-testid="search-category-card-0"] a[href^="/album/"]';
                 const albumIntervalId = setInterval(() => {
                     attempts++;
                     const firstAlbumLinkElement = document.querySelector(albumSelector);
                     if (firstAlbumLinkElement) {
                         clearInterval(albumIntervalId);
                         const relativeUrl = firstAlbumLinkElement.getAttribute('href');
                         const albumNameFromCard = firstAlbumLinkElement.closest('[data-testid="search-category-card-0"]')?.querySelector('[data-encore-id="cardTitle"]')?.textContent?.trim() || 'Unknown Album';
                         if (relativeUrl) {
                             const albumUrl = `https://open.spotify.com${relativeUrl}`;
                             showFeedback(`TuneTransporter: Automatically selecting first album: ${albumNameFromCard}`);
                             sessionStorage.setItem('tuneTransporterRedirected', 'true');
                             window.location.href = albumUrl;
                         } else {
                             showFeedback("TuneTransporter: Could not automatically select the first album result (missing link).");
                         }
                         return;
                     }
                     if (attempts >= maxAttempts) {
                         clearInterval(albumIntervalId);
                         showFeedback("TuneTransporter: Could not automatically select the first album result (timeout).");
                     }
                 }, 250);
            } else {
                // ... (search track logic remains the same) ...
                console.log("TuneTransporter: Detected General/Track Search Results page. Trying to select the first track...");
                showFeedback("TuneTransporter: Trying to select the first track result...");
                const trackSelector = 'div[data-testid="track-list"] div[data-testid="tracklist-row"]:first-of-type div[role="gridcell"][aria-colindex="2"] a[href^="/track/"]';
                const trackIntervalId = setInterval(() => {
                    attempts++;
                    const firstTrackLinkElement = document.querySelector(trackSelector);
                    if (firstTrackLinkElement) {
                        clearInterval(trackIntervalId);
                        const relativeUrl = firstTrackLinkElement.getAttribute('href');
                        const trackTitle = firstTrackLinkElement.textContent?.trim() || 'Unknown Track';
                        if (relativeUrl) {
                            const trackUrl = `https://open.spotify.com${relativeUrl}`;
                            showFeedback(`TuneTransporter: Automatically selecting first track: ${trackTitle}`);
                            sessionStorage.setItem('tuneTransporterRedirected', 'true');
                            window.location.href = trackUrl;
                        } else {
                            showFeedback("TuneTransporter: Could not automatically select the first track result (missing link).");
                        }
                        return;
                    }
                    if (attempts >= maxAttempts) {
                        clearInterval(trackIntervalId);
                        showFeedback("TuneTransporter: Could not automatically select the first track result (timeout).");
                    }
                }, 250);
            }
            return; // Stop further execution for ALL search pages

        } else if (pathname.startsWith('/playlist/')) {
            // Keep original playlist behavior (no redirection, no copy button activation here)
            console.log("TuneTransporter: Detected Spotify Playlist page. No automatic actions taken.");

        } else { // Original 'else' block for unrecognized pages
            console.log("TuneTransporter: Page type not recognized for redirection:", pathname);
        }

        // --- Final Check and Redirect to YTM (Common for Track, Artist pages) ---
        // Will be skipped for Album pages because isAlbumPageForCopy is true OR artistName is null
        // Will be skipped for Playlist pages because artistName is null
        if (!isAlbumPageForCopy && settings.spotifyEnabled !== false && artistName) {
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName;
                console.log(`TuneTransporter: Preparing YTM search for artist: "${searchQuery}" (Spotify->YTM enabled)`);
            } else if (itemName) { // Should only be true for Track pages now
                searchQuery = itemName + " " + artistName;
                console.log(`TuneTransporter: Preparing YTM search for item: "${itemName}", artist: "${artistName}" (Spotify->YTM enabled)`);
            } else {
                console.warn("TuneTransporter: Artist name found but item name is missing for non-artist search. Aborting YTM redirect.");
                showFeedback("TuneTransporter: Could not find track info on this page.");
                return; // Stop before YTM redirect
            }

            const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to YTM search: ${youtubeMusicSearchUrl}`);
            chrome.storage.local.set({ 'tuneTransporterFromSpotify': true }, () => {
                console.log("TuneTransporter: Flag 'tuneTransporterFromSpotify' set in chrome.storage.local.");
                window.location.href = youtubeMusicSearchUrl;
            });

        } else if (settings.spotifyEnabled === false && artistName) {
             console.log("TuneTransporter: Spotify -> YTM redirection is disabled. Skipping YTM redirect.");
        }
         else if (!artistName && !pathname.startsWith('/search/') && !pathname.startsWith('/playlist/') && !pathname.startsWith('/album/')) { // Only log failure if not search/playlist/album
            console.warn("TuneTransporter: Failed to extract required info (artist name) after processing. Cannot redirect to YTM.");
            showFeedback("TuneTransporter: Could not find artist/track info on this page.");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during Spotify processing:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// --- Message Listener for Popup Actions ---
// --- Helper Functions for Virtual Scrolling ---

// Helper function to pause execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to extract info from a single row, using href as ID
// Assumes processArtistString is available in the global scope (from utils.js)
function extractTrackInfoFromRow(rowElement) {
   const titleSelector = 'div[role="gridcell"][aria-colindex="2"] a[data-testid="internal-track-link"] > div[data-encore-id="text"]'; // Use the existing title selector
   const artistSelector = 'div[role="gridcell"][aria-colindex="2"] span a[href^="/artist/"]';
   const linkSelector = 'div[role="gridcell"][aria-colindex="2"] a[data-testid="internal-track-link"]'; // For unique ID (href)

   const titleElement = rowElement.querySelector(titleSelector);
   const artistElements = rowElement.querySelectorAll(artistSelector);
   const linkElement = rowElement.querySelector(linkSelector);

   const title = titleElement ? titleElement.textContent?.trim() : null;
   const trackHref = linkElement ? linkElement.getAttribute('href') : null; // Use href as a potential unique ID

   let artistNames = [];
   if (artistElements.length > 0) {
       artistNames = Array.from(artistElements).map(el => el.textContent?.trim()).filter(Boolean);
   }
   const combinedArtistString = artistNames.join(" ");

   // Check if processArtistString is available before calling
   let processedArtist = null;
   if (typeof processArtistString === 'function') {
       processedArtist = processArtistString(combinedArtistString);
   } else {
       console.warn("TuneTransporter: processArtistString function not found. Using raw artist string.");
       processedArtist = combinedArtistString; // Fallback
   }


   if (title && processedArtist && trackHref) {
       return { id: trackHref, title: title, artist: processedArtist };
   } else {
       // console.warn(`TuneTransporter: Failed partial extract - Title: ${!!title}, Artist: ${!!processedArtist}, Href: ${!!trackHref}`, rowElement);
   }
   return null; // Failed to get required info
}


// --- Main Virtual Scrolling and Extraction Function ---
async function scrollAndExtractAllTracks(sendResponse) {
    // Try the suggested specific selector first
    const scrollContainerSelector = '.main-view-container__scroll-node div[data-overlayscrollbars-viewport]';
    const trackRowSelector = 'div[data-testid="tracklist-row"]'; // Existing track row selector

    let scrollContainer = null;
    const maxFindAttempts = 20; // Try finding the element for ~5 seconds
    let findAttempts = 0;

    // Retry finding the scroll container
    showFeedback("TuneTransporter: Locating scroll area...", 1000);
    while (!scrollContainer && findAttempts < maxFindAttempts) {
        scrollContainer = document.querySelector(scrollContainerSelector);
        if (!scrollContainer) {
            findAttempts++;
            console.log(`TuneTransporter: Scroll container ('${scrollContainerSelector}') not found (Attempt ${findAttempts}/${maxFindAttempts}). Waiting 250ms...`);
            await delay(250); // Use helper
        }
    }

    // If still not found after retries, give up
    if (!scrollContainer) {
        console.error(`TuneTransporter: Could not find the scroll viewport ('${scrollContainerSelector}') after ${maxFindAttempts} attempts. Scrolling cannot proceed.`);
        showFeedback("TuneTransporter: Could not find the scrollable content area.", 3000);
        sendResponse({ success: false, error: `Could not find the scrollable content area ('${scrollContainerSelector}') after retries` });
        return;
    }

    const extractedTracks = new Map(); // Use Map to store unique tracks by ID (href)
    let lastTrackCount = 0;
    let stableScrollCount = 0; // Count how many times we scrolled without finding new tracks
    const maxStableScrolls = 3; // Stop after 3 consecutive scrolls yield no new tracks
    const scrollDelayMs = 750; // Wait time after scrolling (adjust if needed)
    const maxIterations = 150; // Safety break for very long lists (adjust if needed)
    let iterations = 0;

    console.log("TuneTransporter: Starting playlist scroll extraction...");
    showFeedback("TuneTransporter: Starting scroll extraction...", 2000);

    try {
        while (stableScrollCount < maxStableScrolls && iterations < maxIterations) {
            iterations++;

            // Extract currently visible tracks
            const currentRows = document.querySelectorAll(trackRowSelector);
            let newTracksFoundThisIteration = 0;
            currentRows.forEach(row => {
                const trackInfo = extractTrackInfoFromRow(row);
                // Add to map only if valid and not already present
                if (trackInfo && trackInfo.id && !extractedTracks.has(trackInfo.id)) {
                    extractedTracks.set(trackInfo.id, { title: trackInfo.title, artist: trackInfo.artist });
                    newTracksFoundThisIteration++;
                }
            });

            const currentTrackCount = extractedTracks.size;
            console.log(`TuneTransporter: Iteration ${iterations}. Found: ${newTracksFoundThisIteration} new. Total Unique: ${currentTrackCount}`);
            showFeedback(`TuneTransporter: Scanned ${currentTrackCount} tracks...`, 1000);


            // Check if we found new tracks since last scroll
            if (currentTrackCount === lastTrackCount && iterations > 1) {
                stableScrollCount++;
                console.log(`TuneTransporter: Stable scroll count: ${stableScrollCount}/${maxStableScrolls}`);
            } else {
                stableScrollCount = 0; // Reset if new tracks were found
            }

            if (stableScrollCount >= maxStableScrolls) {
                console.log("TuneTransporter: No new tracks found after multiple scrolls. Assuming end of list.");
                showFeedback("TuneTransporter: Finished scanning.", 1500);
                break; // Exit loop
            }

            lastTrackCount = currentTrackCount;

            // Scroll down incrementally
            const scrollAmount = scrollContainer.clientHeight * 0.85; // Scroll ~85% of the visible height
            // console.log(`Scrolling down by ${scrollAmount.toFixed(0)}px...`); // Less verbose logging
            scrollContainer.scrollTop += scrollAmount;

            // Wait for content to load
            await delay(scrollDelayMs);

            // Optional check: If scroll position didn't change much, maybe we are truly at bottom
            if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 20) { // Add small buffer
                console.log("TuneTransporter: Scroll position appears to be at the bottom.");
                // Don't increment stableScrollCount here, let the track check handle stability
            }

        } // End while loop

        if (iterations >= maxIterations) {
            console.warn("TuneTransporter: Reached max scroll iterations. Stopping extraction.");
            showFeedback("TuneTransporter: Reached max scroll iterations.", 2000);
        }

        console.log(`TuneTransporter: Finished extraction. Total unique tracks found: ${extractedTracks.size}`);
        const finalTracks = Array.from(extractedTracks.values()); // Convert Map values to an array

        if (finalTracks.length > 0) {
            const formattedList = finalTracks.map(t => `${t.title} - ${t.artist}`).join('\n');
            console.log(`TuneTransporter: Sending ${finalTracks.length} tracks back to popup after scrolling.`);
            showFeedback(`TuneTransporter: Found ${finalTracks.length} total tracks.`, 2000);
            sendResponse({ success: true, count: finalTracks.length, tracks: formattedList });
        } else {
            console.log("TuneTransporter: No tracks found or extracted after scrolling.");
            showFeedback("TuneTransporter: No tracks found after scrolling.", 3000);
            sendResponse({ success: true, count: 0, tracks: null });
        }

    } catch (error) {
        console.error("TuneTransporter: Error during scroll/extraction process:", error);
        showFeedback(`TuneTransporter: Error during scroll/extraction: ${error.message}`, 4000);
        sendResponse({ success: false, error: `Scroll/Extraction Error: ${error.message}` });
    }
}


// --- Message Listener for Popup Actions ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Listen for the new action from popup.js
    if (request.action === "getSpotifyAlbumTracks") { // Changed action name
        console.log("TuneTransporter: Received request to get album/playlist/collection tracks."); // Updated log
        const currentPath = window.location.pathname;
        const allowedPaths = ['/album/', '/playlist/', '/collection/tracks'];
        const isAllowedPage = allowedPaths.some(path => currentPath.startsWith(path));

        if (!isAllowedPage) {
            console.warn(`TuneTransporter: Get tracks request received, but not on an allowed page (album, playlist, collection). Path: ${currentPath}`);
            showFeedback("TuneTransporter: Not a Spotify album, playlist, or collection page.", 3000);
            sendResponse({ success: false, error: "Not on an allowed page (album, playlist, collection)" });
            return true; // Stop processing
        }

        // Call the new function that handles virtual scrolling AND extraction
        scrollAndExtractAllTracks(sendResponse);

        return true; // Indicate async response is expected
    }
    return false; // Not our message
});


// --- Main execution ---
chrome.storage.local.get(['spotifyEnabled'], function (settings) {
    console.log("TuneTransporter: Executing spotifyToYTM with settings:", settings);
    spotifyToYTM(settings);
});