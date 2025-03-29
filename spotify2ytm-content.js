// TuneTransporter/spotify2ytm-content.js
// NOTE: showFeedback and processArtistString functions are now loaded from utils.js

// --- Spotify Extraction and Redirection Logic ---
function spotifyToYTM() {
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


        } else {
            console.log("TuneTransporter: Page type not recognized for redirection:", pathname);
            return; // Exit if not a recognized type
        }

        // --- Final Check and Redirect (Common for all types) ---
        if (artistName) { // Check if artistName is truthy (not null or empty)
            let searchQuery;
            if (isArtistSearch) {
                searchQuery = artistName;
                console.log(`TuneTransporter: Preparing YTM search for artist: "${searchQuery}"`);
            } else if (itemName) {
                searchQuery = itemName + " " + artistName;
                console.log(`TuneTransporter: Preparing YTM search for item: "${itemName}", artist: "${artistName}"`);
            } else {
                console.warn("TuneTransporter: Artist name found but item name is missing for non-artist search. Aborting.");
                showFeedback("TuneTransporter: Could not find track/album/single info on this page.");
                return;
            }

            const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
            console.log(`TuneTransporter: Redirecting to YTM search: ${youtubeMusicSearchUrl}`);
            window.location.href = youtubeMusicSearchUrl;

        } else {
            console.warn("TuneTransporter: Failed to extract required info (artist name) after processing.");
            showFeedback("TuneTransporter: Could not find artist/track/album/single info on this page."); // Updated message
        }

    } catch (error) {
        console.error("TuneTransporter: Error during Spotify to YTM redirection:", error);
        showFeedback("TuneTransporter: An unexpected error occurred.");
    }
}

// --- Main execution ---
chrome.storage.local.get(['spotifyEnabled'], function (result) {
    if (result.spotifyEnabled !== false) {
        // Wait a tiny bit for the page title/DOM to potentially stabilize further
        setTimeout(spotifyToYTM, 200);
    } else {
        console.log("TuneTransporter: Spotify -> YTM redirection is disabled in settings.");
    }
});