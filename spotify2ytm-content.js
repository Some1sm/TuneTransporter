// TuneTransporter/spotify2ytm-content.js
// NOTE: showFeedback and processArtistString functions are now loaded from utils.js

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
            // --- Attempt Extraction ---
            const titleRegex = /^(.+?)\s*[-–—]\s*(?:song|lyrics)\s*(?:and lyrics)?\s*by\s+(.+?)\s*(?:\| Spotify)?$/i;
            let extractedData = _extractViaTitleRegex(titleRegex, 'Track');

            if (!extractedData) { // If Plan A failed, try Plan B
                const titleSelector = 'span[data-testid="entityTitle"] h1';
                const artistSelector = 'a[data-testid="creator-link"]';
                extractedData = _extractViaDOM(titleSelector, artistSelector, 'Track');
            }

            if (extractedData) {
                itemName = extractedData.item;
                artistName = extractedData.artist;
            }


        } else if (pathname.startsWith('/album/')) { // This covers Albums AND Singles
            console.log("TuneTransporter: Detected Spotify Album/Single page.");
            // --- Attempt Extraction ---
            const titleRegex = /^(.+?)\s*[-–—]\s*(?:album|single)\s*by\s+(.+?)\s*(?:\| Spotify)?$/i;
            let extractedData = _extractViaTitleRegex(titleRegex, 'Album/Single');

            if (!extractedData) { // If Plan A failed, try Plan B
                const titleSelector = 'span[data-testid="entityTitle"] h1';
                const artistSelector = 'a[data-testid="creator-link"]';
                extractedData = _extractViaDOM(titleSelector, artistSelector, 'Album/Single');
            }

            if (extractedData) {
                itemName = extractedData.item;
                artistName = extractedData.artist;
            }


        } else if (pathname.startsWith('/artist/')) {
            console.log("TuneTransporter: Detected Spotify Artist page.");
            isArtistSearch = true;
            // --- Attempt Extraction ---
            const titleRegex = /^(.+?)\s*(?:•.*?)?\s*(?:\| Spotify|- Listen on Spotify)\s*$/i;
            // For artist pages, the first group (match[1]) is the artist name.
            let extractedData = _extractViaTitleRegex(titleRegex, 'Artist', true); // isArtistOnly = true

            if (!extractedData) { // If Plan A failed, try Plan B
                const titleSelector = 'span[data-testid="entityTitle"] h1';
                // We only need the title selector for artist pages.
                extractedData = _extractViaDOM(titleSelector, null, 'Artist', true); // isArtistOnly = true
            }

            if (extractedData) {
                // itemName is implicitly null for artist searches
                artistName = extractedData.artist;
            }


        } else if (pathname.startsWith('/search/')) {
            console.log("TuneTransporter: Detected Spotify Search Results page.");
            const isArtistResultsPage = pathname.includes('/artists'); // Check for artist results view
            const isAlbumResultsPage = pathname.includes('/albums');   // Check for album results view
            const maxAttempts = 40; // 10 seconds timeout
            let attempts = 0;

            if (isArtistResultsPage) {
                // --- Handle Artist Search Results Page ---
                console.log("TuneTransporter: Detected Artist Search Results page. Trying to select the first artist...");
                showFeedback("TuneTransporter: Trying to select the first artist result...");

                const artistSelector = 'div[data-testid="search-category-card-0"] a[href^="/artist/"]';
                console.log(`TuneTransporter: Starting to poll for first artist link using selector: "${artistSelector}"`);

                const artistIntervalId = setInterval(() => {
                    attempts++;
                    const firstArtistLinkElement = document.querySelector(artistSelector);

                    if (firstArtistLinkElement) {
                        clearInterval(artistIntervalId);
                        console.log(`TuneTransporter: Found first artist link element after ${attempts} attempts.`);
                        const relativeUrl = firstArtistLinkElement.getAttribute('href');
                        // Try to get artist name from the card title for better feedback
                        const artistNameFromCard = firstArtistLinkElement.closest('[data-testid="search-category-card-0"]')?.querySelector('[data-encore-id="cardTitle"]')?.textContent?.trim() || 'Unknown Artist';

                        if (relativeUrl) {
                            const artistUrl = `https://open.spotify.com${relativeUrl}`;
                            console.log(`TuneTransporter: Found first artist link: ${artistUrl}. Redirecting...`);
                            showFeedback(`TuneTransporter: Automatically selecting first artist: ${artistNameFromCard}`);
                            sessionStorage.setItem('tuneTransporterRedirected', 'true'); // Set flag BEFORE redirecting
                            window.location.href = artistUrl;
                        } else {
                            console.warn("TuneTransporter: Found artist link element but href attribute is missing or empty. Stopping auto-selection.");
                            showFeedback("TuneTransporter: Could not automatically select the first artist result (missing link).");
                        }
                        return; // Exit interval callback
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(artistIntervalId);
                        console.log(`TuneTransporter: Could not find the first artist link element after ${maxAttempts} attempts. Stopping auto-selection.`);
                        showFeedback("TuneTransporter: Could not automatically select the first artist result (timeout).");
                    }
                }, 250); // Check every 250ms

            } else if (isAlbumResultsPage) {
                 // --- Handle Album Search Results Page ---
                 console.log("TuneTransporter: Detected Album Search Results page. Trying to select the first album...");
                 showFeedback("TuneTransporter: Trying to select the first album result...");

                 const albumSelector = 'div[data-testid="search-category-card-0"] a[href^="/album/"]';
                 console.log(`TuneTransporter: Starting to poll for first album link using selector: "${albumSelector}"`);

                 const albumIntervalId = setInterval(() => {
                     attempts++;
                     const firstAlbumLinkElement = document.querySelector(albumSelector);

                     if (firstAlbumLinkElement) {
                         clearInterval(albumIntervalId);
                         console.log(`TuneTransporter: Found first album link element after ${attempts} attempts.`);
                         const relativeUrl = firstAlbumLinkElement.getAttribute('href');
                         const albumNameFromCard = firstAlbumLinkElement.closest('[data-testid="search-category-card-0"]')?.querySelector('[data-encore-id="cardTitle"]')?.textContent?.trim() || 'Unknown Album';

                         if (relativeUrl) {
                             const albumUrl = `https://open.spotify.com${relativeUrl}`;
                             console.log(`TuneTransporter: Found first album link: ${albumUrl}. Redirecting...`);
                             showFeedback(`TuneTransporter: Automatically selecting first album: ${albumNameFromCard}`);
                             sessionStorage.setItem('tuneTransporterRedirected', 'true'); // Set flag BEFORE redirecting
                             window.location.href = albumUrl;
                         } else {
                             console.warn("TuneTransporter: Found album link element but href attribute is missing or empty. Stopping auto-selection.");
                             showFeedback("TuneTransporter: Could not automatically select the first album result (missing link).");
                         }
                         return; // Exit interval callback
                     }

                     if (attempts >= maxAttempts) {
                         clearInterval(albumIntervalId);
                         console.log(`TuneTransporter: Could not find the first album link element after ${maxAttempts} attempts. Stopping auto-selection.`);
                         showFeedback("TuneTransporter: Could not automatically select the first album result (timeout).");
                     }
                 }, 250); // Check every 250ms

            } else {
                // --- Handle General/Track Search Results Page (Default Fallback) ---
                console.log("TuneTransporter: Detected General/Track Search Results page. Trying to select the first track...");
                showFeedback("TuneTransporter: Trying to select the first track result...");

                const trackSelector = 'div[data-testid="track-list"] div[data-testid="tracklist-row"]:first-of-type div[role="gridcell"][aria-colindex="2"] a[href^="/track/"]';
                console.log(`TuneTransporter: Starting to poll for first track link using selector: "${trackSelector}"`);

                const trackIntervalId = setInterval(() => {
                    attempts++;
                    const firstTrackLinkElement = document.querySelector(trackSelector);

                    if (firstTrackLinkElement) {
                        clearInterval(trackIntervalId);
                        console.log(`TuneTransporter: Found first track link element after ${attempts} attempts.`);
                        const relativeUrl = firstTrackLinkElement.getAttribute('href');
                        const trackTitle = firstTrackLinkElement.textContent?.trim() || 'Unknown Track';

                        if (relativeUrl) {
                            const trackUrl = `https://open.spotify.com${relativeUrl}`;
                            console.log(`TuneTransporter: Found first track link: ${trackUrl}. Redirecting...`);
                            showFeedback(`TuneTransporter: Automatically selecting first track: ${trackTitle}`);
                            sessionStorage.setItem('tuneTransporterRedirected', 'true'); // Set flag BEFORE redirecting
                            window.location.href = trackUrl;
                        } else {
                            console.warn("TuneTransporter: Found track link element but href attribute is missing or empty. Stopping auto-selection.");
                            showFeedback("TuneTransporter: Could not automatically select the first track result (missing link).");
                        }
                        return; // Exit interval callback
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(trackIntervalId);
                        console.log(`TuneTransporter: Could not find the first track link element after ${maxAttempts} attempts. Stopping auto-selection.`);
                        showFeedback("TuneTransporter: Could not automatically select the first track result (timeout).");
                    }
                }, 250); // Check every 250ms
            }

            // Stop further execution in spotifyToYTM for ALL search pages, as redirection is handled async
            return;

        } else { // Original 'else' block for unrecognized pages
            console.log("TuneTransporter: Page type not recognized for redirection:", pathname);
            // For non-search pages, proceed to the YTM redirection logic below if applicable
        }

        // --- Final Check and Redirect to YTM (Common for Track, Album, Artist pages) ---
        // This part will only be reached if it's NOT a search page OR if extraction failed on other pages
        // Crucially, only redirect to YTM if the main setting is enabled.
        if (settings.spotifyEnabled !== false && artistName) {
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName;
                console.log(`TuneTransporter: Preparing YTM search for artist: "${searchQuery}" (Spotify->YTM enabled)`);
            } else if (itemName) {
                searchQuery = itemName + " " + artistName;
                console.log(`TuneTransporter: Preparing YTM search for item: "${itemName}", artist: "${artistName}" (Spotify->YTM enabled)`);
            } else {
                console.warn("TuneTransporter: Artist name found but item name is missing for non-artist search. Aborting YTM redirect.");
                showFeedback("TuneTransporter: Could not find track/album/single info on this page.");
                return; // Stop before YTM redirect
            }

            const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to YTM search: ${youtubeMusicSearchUrl}`);
            window.location.href = youtubeMusicSearchUrl;

        } else if (settings.spotifyEnabled === false && artistName) {
             console.log("TuneTransporter: Spotify -> YTM redirection is disabled. Skipping YTM redirect.");
        }
         else if (!artistName && !pathname.startsWith('/search/')) { // Only log failure if not a search page (search handles its own failures)
            console.warn("TuneTransporter: Failed to extract required info (artist name) after processing. Cannot redirect to YTM.");
            showFeedback("TuneTransporter: Could not find artist/track/album/single info on this page.");
        }

    } catch (error) {
        console.error("TuneTransporter: Error during Spotify processing:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// --- Main execution ---
// Always run the script on Spotify pages to handle search auto-selection,
// but pass the setting to control the final YTM redirection.
chrome.storage.local.get(['spotifyEnabled'], function (settings) {
    console.log("TuneTransporter: Executing spotifyToYTM with settings:", settings);
    spotifyToYTM(settings); // Pass the whole settings object
});