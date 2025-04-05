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


 // --- Spotify Page Handlers ---

 // Extracts data and returns { item, artist } or null
 function handleSpotifyTrackPage() {
     console.log("TuneTransporter: Detected Spotify Track page.");
     const titleRegex = /^(.+?)\s*[-–—]\s*(?:song|lyrics)\s*(?:and lyrics)?\s*by\s+(.+?)\s*(?:\| Spotify)?$/i;
     let extractedData = _extractViaTitleRegex(titleRegex, 'Track');
     if (!extractedData) {
         const titleSelector = 'span[data-testid="entityTitle"] h1';
         const artistSelector = 'a[data-testid="creator-link"]';
         extractedData = _extractViaDOM(titleSelector, artistSelector, 'Track');
     }
     return extractedData ? { itemName: extractedData.item, artistName: extractedData.artist, isArtistSearch: false } : null;
 }

 // Extracts data and returns { item, artist } or null
 function handleSpotifyAlbumPage() {
     console.log("TuneTransporter: Detected Spotify Album/Single page.");
     const albumTitleRegex = /^(.+?)\s+-\s+(?:Album|Single) by\s+(.+?)\s*(?:\| Spotify)?$/i;
     let extractedData = _extractViaTitleRegex(albumTitleRegex, 'Album/Single');
     if (!extractedData) {
         const titleSelector = 'span[data-testid="entityTitle"] h1';
         const artistSelector = 'a[data-testid="creator-link"]';
         extractedData = _extractViaDOM(titleSelector, artistSelector, 'Album/Single');
     }
     return extractedData ? { itemName: extractedData.item, artistName: extractedData.artist, isArtistSearch: false } : null;
 }

 // Extracts data and returns { artist } or null
 function handleSpotifyArtistPage() {
     console.log("TuneTransporter: Detected Spotify Artist page.");
     const titleRegex = /^(.+?)\s*(?:•.*?)?\s*(?:\| Spotify|- Listen on Spotify)\s*$/i;
     let extractedData = _extractViaTitleRegex(titleRegex, 'Artist', true);
     if (!extractedData) {
         const titleSelector = 'span[data-testid="entityTitle"] h1';
         extractedData = _extractViaDOM(titleSelector, null, 'Artist', true);
     }
     return extractedData ? { itemName: null, artistName: extractedData.artist, isArtistSearch: true } : null;
 }

 // Handles search page auto-navigation (doesn't return data for redirection)
 function handleSpotifySearchPage() {
     console.log("TuneTransporter: Detected Spotify Search Results page.");
     const pathname = window.location.pathname;
     const isArtistResultsPage = pathname.includes('/artists');
     const isAlbumResultsPage = pathname.includes('/albums');
     const maxAttempts = 40;
     let attempts = 0;
     let intervalId = null;
     let feedbackMsg = "";
     let selector = "";
     let linkExtractor = null;

     if (isArtistResultsPage) {
         console.log("TuneTransporter: Detected Artist Search Results page. Trying to select the first artist...");
         feedbackMsg = "TuneTransporter: Trying to select the first artist result...";
         selector = 'div[data-testid="search-category-card-0"] a[href^="/artist/"]';
         linkExtractor = (element) => {
             const relativeUrl = element.getAttribute('href');
             const nameFromCard = element.closest('[data-testid="search-category-card-0"]')?.querySelector('[data-encore-id="cardTitle"]')?.textContent?.trim() || 'Unknown Artist';
             return { relativeUrl, name: nameFromCard, type: 'artist' };
         };
     } else if (isAlbumResultsPage) {
         console.log("TuneTransporter: Detected Album Search Results page. Trying to select the first album...");
         feedbackMsg = "TuneTransporter: Trying to select the first album result...";
         selector = 'div[data-testid="search-category-card-0"] a[href^="/album/"]';
         linkExtractor = (element) => {
             const relativeUrl = element.getAttribute('href');
             const nameFromCard = element.closest('[data-testid="search-category-card-0"]')?.querySelector('[data-encore-id="cardTitle"]')?.textContent?.trim() || 'Unknown Album';
             return { relativeUrl, name: nameFromCard, type: 'album' };
         };
     } else {
         console.log("TuneTransporter: Detected General/Track Search Results page. Trying to select the first track...");
         feedbackMsg = "TuneTransporter: Trying to select the first track result...";
         selector = 'div[data-testid="track-list"] div[data-testid="tracklist-row"]:first-of-type div[role="gridcell"][aria-colindex="2"] a[href^="/track/"]';
         linkExtractor = (element) => {
             const relativeUrl = element.getAttribute('href');
             const nameFromLink = element.textContent?.trim() || 'Unknown Track';
             return { relativeUrl, name: nameFromLink, type: 'track' };
         };
     }

     showFeedback(feedbackMsg);
     intervalId = setInterval(() => {
         attempts++;
         const firstLinkElement = document.querySelector(selector);
         if (firstLinkElement && linkExtractor) {
             clearInterval(intervalId);
             const linkData = linkExtractor(firstLinkElement);
             if (linkData.relativeUrl) {
                 const targetUrl = `https://open.spotify.com${linkData.relativeUrl}`;
                 showFeedback(`TuneTransporter: Automatically selecting first ${linkData.type}: ${linkData.name}`);
                 sessionStorage.setItem('tuneTransporterRedirected', 'true'); // Set flag before redirect
                 window.location.href = targetUrl;
             } else {
                 showFeedback(`TuneTransporter: Could not automatically select the first ${linkData.type} result (missing link).`);
             }
             return;
         }
         if (attempts >= maxAttempts) {
             clearInterval(intervalId);
             showFeedback(`TuneTransporter: Could not automatically select the first result (timeout).`);
         }
     }, 250);
 }

 function handleSpotifyPlaylistPage() {
     // Keep original playlist behavior (no redirection, no copy button activation here)
     console.log("TuneTransporter: Detected Spotify Playlist page. No automatic actions taken.");
     // Does not return data for redirection
     return null;
 }


 // --- Main Spotify Extraction and Redirection Logic ---
 function spotifyToYTM(settings) { // Pass settings in
     // Check for internal redirect flag first
     if (sessionStorage.getItem('tuneTransporterRedirected') === 'true') {
         sessionStorage.removeItem('tuneTransporterRedirected');
         console.log("TuneTransporter: Detected internal redirect from search page. Stopping script execution for this page load.");
         return; // Stop the script
     }

     const pathname = window.location.pathname;
     let pageData = null; // Will hold { itemName, artistName, isArtistSearch }

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
         // --- Route to Page Handler ---
         if (pathname.startsWith('/track/')) {
             pageData = handleSpotifyTrackPage();
         } else if (pathname.startsWith('/album/')) { // Covers Albums AND Singles
             pageData = handleSpotifyAlbumPage();
         } else if (pathname.startsWith('/artist/')) {
             pageData = handleSpotifyArtistPage();
         } else if (pathname.startsWith('/search/')) {
             handleSpotifySearchPage(); // Handles its own redirection/feedback
             return; // Stop further execution for search pages
         } else if (pathname.startsWith('/playlist/')) {
             pageData = handleSpotifyPlaylistPage(); // Returns null, no redirection needed
         } else if (pathname.startsWith('/collection/')) {
             // Currently handled by the message listener for track extraction, no redirection needed here.
             console.log("TuneTransporter: Detected Spotify Collection page. No automatic redirection.");
             return; // Stop further execution
         } else {
             console.log("TuneTransporter: Page type not recognized for redirection:", pathname);
             return; // Stop if page type is unknown
         }

         // --- Final Check and Redirect to YTM (if applicable) ---
         // Only proceed if pageData was returned (i.e., not search/playlist/collection/unknown)
         // and redirection is enabled and artistName was found.
         if (pageData && settings.spotifyEnabled !== false && pageData.artistName) {
             let searchQuery;
             if (pageData.isArtistSearch) {
                 searchQuery = pageData.artistName;
                 console.log(`TuneTransporter: Preparing YTM search for artist: "${searchQuery}" (Spotify->YTM enabled)`);
             } else if (pageData.itemName) { // Should be true for Track and Album/Single pages now
                 searchQuery = pageData.itemName + " " + pageData.artistName;
                 console.log(`TuneTransporter: Preparing YTM search for item: "${pageData.itemName}", artist: "${pageData.artistName}" (Spotify->YTM enabled)`);
             } else {
                 console.warn("TuneTransporter: Artist name found but item name is missing for non-artist search. Aborting YTM redirect.");
                 showFeedback("TuneTransporter: Could not find track/album info on this page.");
                 return; // Stop before YTM redirect
             }

             const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
             console.log(`TuneTransporter: Redirecting to YTM search: ${youtubeMusicSearchUrl}`);
             chrome.storage.local.set({ 'tuneTransporterFromSpotify': true }, () => {
                 console.log("TuneTransporter: Flag 'tuneTransporterFromSpotify' set in chrome.storage.local.");
                 window.location.href = youtubeMusicSearchUrl;
             });

         } else if (pageData && settings.spotifyEnabled === false && pageData.artistName) {
              console.log("TuneTransporter: Spotify -> YTM redirection is disabled. Skipping YTM redirect.");
         } else if (pageData && !pageData.artistName) {
             // This case applies if a handler ran (track/album/artist) but failed to extract artistName
             console.warn("TuneTransporter: Failed to extract required info (artist name) after processing. Cannot redirect to YTM.");
             showFeedback("TuneTransporter: Could not find artist/track/album info on this page.");
         }
         // No action needed if pageData is null (playlist, collection, unknown) or if artistName wasn't found.

     } catch (error) {
         console.error("TuneTransporter: Error during Spotify processing:", error);
         showFeedback("TuneTransporter: An unexpected error occurred.");
     }
 }
 // --- Helper for Title Regex Extraction --- [KEEP THIS HELPER]
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

 // --- Helper for DOM Extraction --- [KEEP THIS HELPER]
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

 /* REMOVE OLD LOGIC BLOCK
 */

 // --- Message Listener for Popup Actions ---
 // --- Helper Functions for Virtual Scrolling ---

 // Helper function to pause execution (Now loaded from utils.js)
 // function delay(ms) {
 //   return new Promise(resolve => setTimeout(resolve, ms));
 // }

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
        console.warn(`TuneTransporter: Failed partial extract - Title: ${!!title}, Artist: ${!!processedArtist}, Href: ${!!trackHref}`, rowElement); // Uncommented log
    }
    return null; // Failed to get required info
 }


 // --- Function to Extract Page Title ---
 function extractPageTitle() {
     const title = document.title;
     let pageTitle = null;

     // Try Album pattern first (more specific)
     let match = title.match(/^(.+?)\s+-\s+(?:Album|Single) by .+? \| Spotify$/i); // Updated to include Single
     if (match && match[1]) {
         pageTitle = match[1].trim();
         console.log(`TuneTransporter: Extracted Album/Single Title: "${pageTitle}"`);
         return pageTitle;
     }

     // Try Playlist pattern
     match = title.match(/^(.+?)\s+-\s+playlist by .+? \| Spotify$/i);
     if (match && match[1]) {
         pageTitle = match[1].trim();
         console.log(`TuneTransporter: Extracted Playlist Title: "${pageTitle}"`);
         return pageTitle;
     }

     // Try Collection pattern ("Liked Songs", etc.)
     match = title.match(/^Spotify – (.+)$/i);
     if (match && match[1]) {
         pageTitle = match[1].trim();
         console.log(`TuneTransporter: Extracted Collection Title: "${pageTitle}"`);
         return pageTitle;
     }

     // Fallback: Try to remove common suffixes if specific patterns fail
     if (!pageTitle) {
         pageTitle = title.replace(/\s*\| Spotify\s*$/i, '').replace(/\s*-\s*Spotify\s*$/i, '').trim();
         // Further cleanup for potential " - song by..." etc. if it wasn't caught earlier
         pageTitle = pageTitle.replace(/\s+-\s+(song|playlist|album|single) by .+$/i, '').trim(); // Added single
         console.warn(`TuneTransporter: Could not match specific title pattern. Using fallback title: "${pageTitle}" (Original: "${title}")`);
     }

     return pageTitle || "Unknown Title"; // Return "Unknown Title" if everything fails
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

     // Extract page title before starting scroll
     const pageTitle = extractPageTitle();

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
             // Send the array of track objects directly
             console.log(`TuneTransporter: Sending ${finalTracks.length} track objects and title "${pageTitle}" back to popup after scrolling.`);
             showFeedback(`TuneTransporter: Found ${finalTracks.length} total tracks.`, 2000);
             // Include pageTitle and the array of tracks in the response
             sendResponse({ success: true, count: finalTracks.length, tracks: finalTracks, pageTitle: pageTitle }); // Send finalTracks array
         } else {
             console.log("TuneTransporter: No tracks found or extracted after scrolling.");
             showFeedback("TuneTransporter: No tracks found after scrolling.", 3000);
             // Include pageTitle even if no tracks found
             sendResponse({ success: true, count: 0, tracks: [], pageTitle: pageTitle }); // Send empty array
         }

     } catch (error) {
         console.error("TuneTransporter: Error during scroll/extraction process:", error);
         showFeedback(`TuneTransporter: Error during scroll/extraction: ${error.message}`, 4000);
         // Include pageTitle in error response if possible
         sendResponse({ success: false, error: `Scroll/Extraction Error: ${error.message}`, pageTitle: pageTitle });
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