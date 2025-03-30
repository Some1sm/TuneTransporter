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
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Listen for the new action from popup.js
    if (request.action === "getSpotifyAlbumTracks") { // Changed action name
        console.log("TuneTransporter: Received request to get album tracks."); // Updated log
        // *** MODIFIED CHECK: Now check for ALBUM page ***
        if (!window.location.pathname.startsWith('/album/')) {
            console.warn("TuneTransporter: Copy request received, but not on an album page.");
            showFeedback("TuneTransporter: Not a Spotify album page.", 3000);
            sendResponse({ success: false, error: "Not on an album page" });
            return true;
        }

        showFeedback("TuneTransporter: Extracting visible tracks...", 1500); // Show feedback briefly
        try {
            // Use the renamed function
            const tracks = extractVisibleSpotifyTracks();

            if (tracks.length > 0) {
                const formattedList = tracks.map(t => `${t.title} - ${t.artist}`).join('\n');
                // Send the formatted list back to the popup script
                console.log(`TuneTransporter: Sending ${tracks.length} tracks back to popup.`);
                sendResponse({ success: true, count: tracks.length, tracks: formattedList });
            } else {
                console.log("TuneTransporter: No tracks found or extracted from visible rows.");
                showFeedback("TuneTransporter: No visible tracks found.", 3000);
                // Still send success, but with count 0 and no tracks string
                sendResponse({ success: true, count: 0, tracks: null });
            }
        } catch (error) {
            console.error("TuneTransporter: Error during album track extraction:", error);
            showFeedback(`TuneTransporter: Error extracting tracks: ${error.message}`, 4000);
            sendResponse({ success: false, error: error.message });
        }
        return true; // Indicate async response
    }
    return false;
});


// --- Main execution ---
chrome.storage.local.get(['spotifyEnabled'], function (settings) {
    console.log("TuneTransporter: Executing spotifyToYTM with settings:", settings);
    spotifyToYTM(settings);
});