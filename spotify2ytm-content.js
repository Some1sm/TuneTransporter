// TuneTransporter/spotify2ytm-content.js
// NOTE: showFeedback and processArtistString functions are now loaded from utils.js

// --- Constants ---
const SPOTIFY_MAX_RETRIES = 15;
const SPOTIFY_RETRY_DELAY_MS = 300;
const SPOTIFY_INITIAL_DELAY_MS = 150;

// --- Spotify Extraction and Redirection Logic ---
function spotifyToYTM() {
    let currentRetry = 0;
    let redirectionDone = false;

    function attemptExtraction() {
        if (redirectionDone) return;

        let itemName = null;
        let artistName = null;
        const pathname = window.location.pathname;
        let isArtistSearch = false;
        let pageType = null; // 'track', 'album', or 'artist'

        try {
            // --- Detect Page Type ---
            if (pathname.startsWith('/track/')) {
                pageType = 'track';
                console.log(`TuneTransporter: [Attempt ${currentRetry + 1}/${SPOTIFY_MAX_RETRIES}] Detected Spotify Track page.`);

                // --- Plan A: Track Title Regex ---
                const titleTagText = document.title;
                // Skip if title is still the generic SPA title
                if (titleTagText && titleTagText !== 'Spotify – Web Player' && titleTagText !== 'Spotify') {
                    const trackTitleMatch = titleTagText.match(/^(.+?)\s*[-–—]\s*(?:song|lyrics)\s*(?:and lyrics)?\s*by\s+(.+?)\s*(?:\| Spotify)?$/i);
                    if (trackTitleMatch && trackTitleMatch[1] && trackTitleMatch[2]) {
                        const potentialTrack = trackTitleMatch[1].trim();
                        const potentialArtistStr = trackTitleMatch[2];
                        if (potentialTrack && potentialArtistStr) {
                            itemName = potentialTrack;
                            artistName = processArtistString(potentialArtistStr);
                            if (artistName) {
                                console.log(`TuneTransporter: Extracted Track via Title (Plan A) - Item: "${itemName}", Artist: "${artistName}"`);
                            } else {
                                itemName = null;
                            }
                        }
                    }
                }

                // --- Plan B: Track DOM Query ---
                if (!itemName || !artistName) {
                    const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
                    const artistElement = document.querySelector('a[data-testid="creator-link"]');
                    if (titleElement && artistElement) {
                        const potentialTrack = titleElement.textContent?.trim();
                        const potentialArtist = artistElement.textContent?.trim();
                        if (potentialTrack && potentialArtist) {
                            itemName = potentialTrack;
                            artistName = processArtistString(potentialArtist);
                            if (artistName) {
                                console.log(`TuneTransporter: Extracted Track via DOM (Plan B) - Item: "${itemName}", Artist: "${artistName}"`);
                            } else {
                                itemName = null;
                            }
                        }
                    }
                }

            } else if (pathname.startsWith('/album/')) {
                pageType = 'album';
                console.log(`TuneTransporter: [Attempt ${currentRetry + 1}/${SPOTIFY_MAX_RETRIES}] Detected Spotify Album/Single page.`);

                // --- Plan A: Album/Single Title Regex ---
                const titleTagText = document.title;
                if (titleTagText && titleTagText !== 'Spotify – Web Player' && titleTagText !== 'Spotify') {
                    const albumTitleMatch = titleTagText.match(/^(.+?)\s*[-–—]\s*(?:album|single)\s*by\s+(.+?)\s*(?:\| Spotify)?$/i);
                    if (albumTitleMatch && albumTitleMatch[1] && albumTitleMatch[2]) {
                        const potentialAlbum = albumTitleMatch[1].trim();
                        const potentialArtistStr = albumTitleMatch[2];
                        if (potentialAlbum && potentialArtistStr) {
                            itemName = potentialAlbum;
                            artistName = processArtistString(potentialArtistStr);
                            if (artistName) {
                                console.log(`TuneTransporter: Extracted Album/Single via Title (Plan A) - Item: "${itemName}", Artist: "${artistName}"`);
                            } else {
                                itemName = null;
                            }
                        }
                    }
                }

                // --- Plan B: Album/Single DOM Query ---
                if (!itemName || !artistName) {
                    const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
                    const artistElement = document.querySelector('a[data-testid="creator-link"]');
                    if (titleElement && artistElement) {
                        const potentialAlbum = titleElement.textContent?.trim();
                        const potentialArtist = artistElement.textContent?.trim();
                        if (potentialAlbum && potentialArtist) {
                            itemName = potentialAlbum;
                            artistName = processArtistString(potentialArtist);
                            if (artistName) {
                                console.log(`TuneTransporter: Extracted Album/Single via DOM (Plan B) - Item: "${itemName}", Artist: "${artistName}"`);
                            } else {
                                itemName = null;
                            }
                        }
                    }
                }

            } else if (pathname.startsWith('/artist/')) {
                pageType = 'artist';
                console.log(`TuneTransporter: [Attempt ${currentRetry + 1}/${SPOTIFY_MAX_RETRIES}] Detected Spotify Artist page.`);
                isArtistSearch = true;

                // --- Plan A: Artist Title Regex ---
                const titleTagText = document.title;
                if (titleTagText && titleTagText !== 'Spotify – Web Player' && titleTagText !== 'Spotify') {
                    const artistTitleMatch = titleTagText.match(/^(.+?)\s*(?:•.*?)?\s*(?:\| Spotify|- Listen on Spotify)\s*$/i);
                    if (artistTitleMatch && artistTitleMatch[1]) {
                        const potentialArtist = artistTitleMatch[1].trim();
                        if (potentialArtist) {
                            artistName = processArtistString(potentialArtist);
                            itemName = null;
                            if (artistName) {
                                console.log(`TuneTransporter: Extracted Artist via Title (Plan A) - Artist: "${artistName}"`);
                            }
                        }
                    }
                }

                // --- Plan B: Artist DOM Query ---
                if (!artistName) {
                    const artistTitleElement = document.querySelector('span[data-testid="entityTitle"] h1');
                    if (artistTitleElement) {
                        const potentialArtist = artistTitleElement.textContent?.trim();
                        if (potentialArtist) {
                            artistName = processArtistString(potentialArtist);
                            itemName = null;
                            if (artistName) {
                                console.log(`TuneTransporter: Extracted Artist via DOM (Plan B) - Artist: "${artistName}"`);
                            }
                        }
                    }
                }

            } else {
                console.log("TuneTransporter: Page type not recognized for redirection:", pathname);
                return; // Exit entirely — no retries for unknown pages
            }

            // --- Success: Redirect ---
            if (artistName) {
                redirectionDone = true;
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

                // YTM search filter params: Songs=EgWKAQIIAWgB, Albums=EgWKAQIYAWgB, Artists=EgWKAQIQAWgB
                let spFilter = '';
                if (pageType === 'track') spFilter = '&sp=EgWKAQIIAWgB';       // Songs filter
                else if (pageType === 'album') spFilter = '&sp=EgWKAQIYAWgB';  // Albums filter
                else if (pageType === 'artist') spFilter = '&sp=EgWKAQIQAWgB'; // Artists filter

                const youtubeMusicSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}${spFilter}`;
                console.log(`TuneTransporter: Redirecting to YTM search (filter: ${pageType}): ${youtubeMusicSearchUrl}`);

                // Check autoclick setting to decide whether to block resources and auto-navigate
                chrome.storage.local.get('autoclickEnabled', (autoclickData) => {
                    const doAutoclick = autoclickData.autoclickEnabled !== false;
                    if (doAutoclick) {
                        // Block images/media on destination, set autoclick signal, then navigate
                        chrome.runtime.sendMessage({ action: 'enableBlocking', target: 'ytm' }, () => {
                            chrome.storage.local.set({ tunetransporterAutoclick: Date.now() }, () => {
                                window.location.href = youtubeMusicSearchUrl;
                            });
                        });
                    } else {
                        // Just redirect to search page without blocking or auto-clicking
                        window.location.href = youtubeMusicSearchUrl;
                    }
                });
                return;
            }

            // --- Failure: Retry or give up ---
            currentRetry++;
            if (currentRetry < SPOTIFY_MAX_RETRIES) {
                console.log(`TuneTransporter: Extraction incomplete, retrying in ${SPOTIFY_RETRY_DELAY_MS}ms... (${currentRetry}/${SPOTIFY_MAX_RETRIES})`);
                setTimeout(attemptExtraction, SPOTIFY_RETRY_DELAY_MS);
            } else {
                console.warn(`TuneTransporter: Failed to extract info after ${SPOTIFY_MAX_RETRIES} attempts.`);
                showFeedback("TuneTransporter: Could not find artist/track/album/single info on this page.");
            }

        } catch (error) {
            console.error("TuneTransporter: Error during Spotify to YTM redirection:", error);
            showFeedback("TuneTransporter: An unexpected error occurred.");
        }
    }

    // Start first attempt after initial delay
    setTimeout(attemptExtraction, SPOTIFY_INITIAL_DELAY_MS);
}

// --- Main execution ---
chrome.storage.local.get(['spotifyEnabled', 'tunetransporterNoRedirect'], function (result) {
    // Check if we should skip redirect (we were auto-navigated here as final destination)
    const noRedirectTimestamp = result.tunetransporterNoRedirect;
    if (noRedirectTimestamp && (Date.now() - noRedirectTimestamp) < 30000) {
        console.log("TuneTransporter: No-redirect flag detected. Skipping Spotify -> YTM redirect (this is the final destination).");
        chrome.storage.local.remove('tunetransporterNoRedirect');
        return;
    }

    if (result.spotifyEnabled !== false) {
        spotifyToYTM();
    } else {
        console.log("TuneTransporter: Spotify -> YTM redirection is disabled in settings.");
    }
});