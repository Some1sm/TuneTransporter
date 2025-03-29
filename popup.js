// popup.js

// --- Helper function to display status messages ---
let statusTimeout;
function showStatus(message, duration = 2500) {
    const statusElement = document.getElementById('statusMessage');
    if (!statusElement) return; // Exit if element not found
    statusElement.textContent = message;
    clearTimeout(statusTimeout); // Clear previous timeout if any
    if (duration > 0) {
        statusTimeout = setTimeout(() => {
            if (statusElement) { // Check if element still exists when timeout fires
                statusElement.textContent = '';
            }
        }, duration);
    }
}

// --- Injectable Extraction Functions (for Copy feature) ---

// Function to get data from Spotify page
function getSpotifyData() {
    const pathname = window.location.pathname;
    let item = null;
    let artist = null;
    let type = null;

    try {
        if (pathname.startsWith('/track/') || pathname.startsWith('/album/')) {
            type = pathname.startsWith('/track/') ? 'track' : 'album';
            const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            const artistElement = document.querySelector('a[data-testid="creator-link"]');
            if (titleElement) item = titleElement.textContent?.trim();
            if (artistElement) artist = artistElement.textContent?.trim();
        } else if (pathname.startsWith('/artist/')) {
            type = 'artist';
            const artistTitleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            if (artistTitleElement) artist = artistTitleElement.textContent?.trim();
        }
        // Return null only if artist extraction failed, allow missing item for artist pages
        return artist ? { type, item, artist } : null;
    } catch (e) {
        console.error("TuneTransporter Error (injected getSpotifyData):", e);
        return null; // Indicate failure on error
    }
}

// Function to get data from YTM page
function getYtmData() {
    const currentUrl = window.location.href;
    let item = null;
    let artist = null;
    let type = null;

    try {
        if (currentUrl.startsWith("https://music.youtube.com/playlist?list=")) {
            type = 'playlist';
            const titleElement = document.querySelector('ytmusic-responsive-header-renderer h1 yt-formatted-string.title');
            const artistElement = document.querySelector('ytmusic-responsive-header-renderer yt-formatted-string.strapline-text.complex-string');
            if (titleElement) item = titleElement.title?.trim();
            if (artistElement) artist = artistElement.title?.trim();
        } else if (currentUrl.includes("/channel/")) {
            type = 'artist';
            const artistElement = document.querySelector('ytmusic-immersive-header-renderer h1 yt-formatted-string.title');
            if (artistElement) artist = artistElement.title?.trim();
        } else if (currentUrl.startsWith("https://music.youtube.com/watch")) {
            type = 'track';
            const titleElement = document.querySelector('ytmusic-player-queue-item[selected] .song-title');
            const artistElement = document.querySelector('ytmusic-player-queue-item[selected] .byline');
            if (titleElement) item = titleElement.title?.trim();
            if (artistElement) {
                let artistText = (artistElement.title || artistElement.textContent || "").trim();
                if (artistText.includes('•') && artistText.split('•')[0].trim()) {
                    artistText = artistText.split('•')[0].trim();
                }
                artist = artistText;
            }
        }
        // Return null only if artist extraction failed
        return artist ? { type, item, artist } : null;
    } catch (e) {
        console.error("TuneTransporter Error (injected getYtmData):", e);
        return null; // Indicate failure on error
    }
}


// --- Main Popup Logic ---
document.addEventListener('DOMContentLoaded', function () {
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');
    const copyYtmLinkBtn = document.getElementById('copyYtmLinkBtn');
    const copySpotifyLinkBtn = document.getElementById('copySpotifyLinkBtn');

    // --- Load toggle settings ---
    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled'], function (data) {
        console.log("Loading settings:", data); // Log loaded data
        spotifyToggle.checked = data.spotifyEnabled !== false; // Default true
        ytmToggle.checked = data.ytmEnabled !== false;     // Default true
    });

    // --- Add toggle SAVE listeners ---
    spotifyToggle.addEventListener('change', function () {
        const isChecked = spotifyToggle.checked;
        console.log("Spotify toggle changed to:", isChecked); // Log change
        chrome.storage.local.set({ spotifyEnabled: isChecked }, function () {
            if (chrome.runtime.lastError) {
                console.error("Error saving spotifyEnabled:", chrome.runtime.lastError.message);
                showStatus("Error saving setting!", 3000);
            } else {
                console.log("spotifyEnabled saved successfully.");
                // showStatus("Settings saved", 1000);
            }
        });
    });

    ytmToggle.addEventListener('change', function () {
        const isChecked = ytmToggle.checked;
        console.log("YTM toggle changed to:", isChecked); // Log change
        chrome.storage.local.set({ ytmEnabled: isChecked }, function () {
            if (chrome.runtime.lastError) {
                console.error("Error saving ytmEnabled:", chrome.runtime.lastError.message);
                showStatus("Error saving setting!", 3000);
            } else {
                console.log("ytmEnabled saved successfully.");
                // showStatus("Settings saved", 1000);
            }
        });
    });

    // --- Logic for Copy Buttons ---
    console.log("Querying active tab...");
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        console.log("Tabs query result:", tabs); // Log the full result

        // Check for API errors first
        if (chrome.runtime.lastError) {
            console.error("[DEBUG] Error querying tabs:", chrome.runtime.lastError.message);
            showStatus(`Error accessing tab: ${chrome.runtime.lastError.message}`, 0);
            copyYtmLinkBtn.disabled = true;
            copySpotifyLinkBtn.disabled = true;
            return;
        }

        // Check if we got a valid tab array
        if (!tabs || tabs.length === 0 || !tabs[0] || !tabs[0].id) {
            console.warn("[DEBUG] Could not get valid active tab object or ID.");
            showStatus("Cannot access current tab info.", 0);
            copyYtmLinkBtn.disabled = true;
            copySpotifyLinkBtn.disabled = true;
            return;
        }

        // Check specifically if the URL is missing (likely restricted page)
        if (!tabs[0].url) {
            console.warn("[DEBUG] Active tab URL is inaccessible (likely a restricted page like chrome://, New Tab Page, etc.).");
            showStatus("Cannot access this type of page.", 0); // Slightly different message
            copyYtmLinkBtn.disabled = true;
            copySpotifyLinkBtn.disabled = true;
            return;
        }

        // --- If we reach here, we have a valid tab with a URL and ID ---
        const currentUrl = tabs[0].url;
        const tabId = tabs[0].id;
        console.log(`[DEBUG] Current Tab URL: ${currentUrl}, ID: ${tabId}`);

        let canCopyYtm = false;
        let canCopySpotify = false;
        let statusMsg = ""; // Default empty status

        // Check if URL matches supported patterns
        if (currentUrl.startsWith("https://open.spotify.com/")) {
            if (currentUrl.includes("/track/") || currentUrl.includes("/album/") || currentUrl.includes("/artist/")) {
                canCopyYtm = true;
            } else {
                statusMsg = "Not a Spotify track/album/artist page.";
            }
        }
        else if (currentUrl.startsWith("https://music.youtube.com/")) {
            if (currentUrl.includes("/watch?") || currentUrl.includes("/playlist?list=") || currentUrl.includes("/channel/")) {
                canCopySpotify = true;
            } else {
                statusMsg = "Not a YTM song/playlist/artist page.";
            }
        }
        else if (currentUrl.startsWith("https://www.youtube.com/watch")) {
            statusMsg = "Copying not supported from this page.";
        }
        else {
            statusMsg = "Not on a supported page for copying.";
        }

        // Set button states
        copyYtmLinkBtn.disabled = !canCopyYtm;
        copySpotifyLinkBtn.disabled = !canCopySpotify;

        // Add listeners using onclick for simplicity after checking state
        copyYtmLinkBtn.onclick = canCopyYtm ? () => handleCopyClick('spotify', tabId) : null;
        copySpotifyLinkBtn.onclick = canCopySpotify ? () => handleCopyClick('ytm', tabId) : null;


        // Show status only if buttons are disabled AND we have a specific reason
        if (copyYtmLinkBtn.disabled && copySpotifyLinkBtn.disabled && statusMsg) {
            showStatus(statusMsg, 0); // Show persistent message
        } else {
            showStatus(""); // Clear status if buttons are enabled or no specific message needed
        }
    }); // End chrome.tabs.query callback

    // --- Handle Copy Button Click (async function) ---
    async function handleCopyClick(sourceType, tabId) {
        let injectionFunction;
        let targetServiceName;

        if (sourceType === 'spotify') { injectionFunction = getSpotifyData; targetServiceName = "YouTube Music"; }
        else if (sourceType === 'ytm') { injectionFunction = getYtmData; targetServiceName = "Spotify"; }
        else { return; } // Should not happen

        showStatus(`Getting data from ${sourceType}...`, 0); // Show persistent status during operation
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: injectionFunction
            });

            // executeScript returns an array; check the first result
            if (results && results[0] && results[0].result) {
                const data = results[0].result;
                console.log("Extracted data:", data);

                // Artist is mandatory for any useful search
                if (!data.artist) {
                    // Use specific error message if extraction function returned null
                    throw new Error(`Could not find required info on the ${sourceType} page.`);
                }

                let searchQuery;
                let targetSearchUrl;

                // Construct search query based on type
                if (data.type === 'artist') {
                    searchQuery = data.artist;
                } else if (data.item && data.artist) { // Track or Album/Playlist
                    searchQuery = `${data.item} ${data.artist}`;
                } else {
                    // Fallback if item name wasn't found but artist was
                    searchQuery = data.artist;
                    console.warn("Item name not found, using artist only for search query.");
                }

                // Construct target URL
                if (targetServiceName === "YouTube Music") {
                    targetSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
                } else { // Spotify
                    targetSearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
                }

                // Copy to clipboard
                await navigator.clipboard.writeText(targetSearchUrl);
                showStatus(`Copied ${targetServiceName} link!`); // Auto-clears after default duration
                console.log(`Copied ${targetServiceName} search URL: ${targetSearchUrl}`);

            } else {
                // Handle cases where injection might have failed or returned null explicitly
                let errorMsg = "Failed to get data from page.";
                if (chrome.runtime.lastError) {
                    errorMsg += ` Error: ${chrome.runtime.lastError.message}`;
                } else if (results && results[0] && results[0].result === null) {
                    // If the injected function explicitly returned null because info wasn't found
                    errorMsg = `Could not find required info on the ${sourceType} page.`;
                }
                console.error("Extraction failed:", results, chrome.runtime.lastError);
                showStatus(errorMsg, 4000); // Show error for longer
            }
        } catch (error) {
            console.error(`Error during ${sourceType} copy process:`, error);
            // Show specific error message from the caught error
            showStatus(`Error: ${error.message}`, 4000);
        }
    } // End handleCopyClick

}); // End DOMContentLoaded