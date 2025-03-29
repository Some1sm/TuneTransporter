// popup.js

// --- Helper function to display status messages ---
let statusTimeout;
function showStatus(message, duration = 2500) {
    const statusElement = document.getElementById('statusMessage');
    if (!statusElement) return;
    statusElement.textContent = message;
    clearTimeout(statusTimeout);
    if (duration > 0) {
        statusTimeout = setTimeout(() => {
            if (statusElement) {
                statusElement.textContent = '';
            }
        }, duration);
    }
}

// --- Artist String Processing Logic (Duplicated for Injection Scope) ---
// This function needs to be self-contained within the injected scope.
function _processArtistStringForInjection(artistString) {
    if (!artistString || typeof artistString !== 'string') {
        return null; // Return null for invalid input
    }

    let primaryArtistPart = artistString.trim();

    // 1. Handle YTM style separators
    if (primaryArtistPart.includes('•')) {
        primaryArtistPart = primaryArtistPart.split('•')[0].trim();
    }
    if (primaryArtistPart.includes('�')) { // Handle specific weird character
        primaryArtistPart = primaryArtistPart.split('�')[0].trim();
    }

    // 2. Handle common collaboration/separator patterns
    const artists = primaryArtistPart.split(/,\s*|\s*&\s*|\s+(?:feat|ft|with|vs)\.?\s+/i);

    // 3. Clean up and join
    const cleanedArtists = artists.map(artist => artist.trim()).filter(Boolean);

    // 4. Return processed string or null
    return cleanedArtists.length > 0 ? cleanedArtists.join(" ") : null;
}
// ----------------------------------------------------------------------

// --- Injectable Extraction Functions (for Copy feature) ---

// Function to get data from Spotify page
function getSpotifyData() {
    // --- Re-define the processing function INSIDE the injection scope ---
    function _processArtistString(artistString) {
        if (!artistString || typeof artistString !== 'string') return null;
        let primaryArtistPart = artistString.trim();
        if (primaryArtistPart.includes('•')) primaryArtistPart = primaryArtistPart.split('•')[0].trim();
        if (primaryArtistPart.includes('�')) primaryArtistPart = primaryArtistPart.split('�')[0].trim();
        const artists = primaryArtistPart.split(/,\s*|\s*&\s*|\s+(?:feat|ft|with|vs)\.?\s+/i);
        const cleanedArtists = artists.map(a => a.trim()).filter(Boolean);
        return cleanedArtists.length > 0 ? cleanedArtists.join(" ") : null;
    }
    // ---------------------------------------------------------------------

    const pathname = window.location.pathname;
    let item = null;
    let artist = null; // Will hold processed artist name
    let type = null;

    try {
        if (pathname.startsWith('/track/') || pathname.startsWith('/album/')) {
            type = pathname.startsWith('/track/') ? 'track' : 'album';
            const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            const artistElement = document.querySelector('a[data-testid="creator-link"]');
            if (titleElement) item = titleElement.textContent?.trim();
            // Process artist name if found
            if (artistElement) artist = _processArtistString(artistElement.textContent); // Use internal helper

        } else if (pathname.startsWith('/artist/')) {
            type = 'artist';
            const artistTitleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            // Process artist name if found
            if (artistTitleElement) artist = _processArtistString(artistTitleElement.textContent); // Use internal helper
        }
        // Return null only if processed artist is null/empty
        return artist ? { type, item, artist } : null;
    } catch (e) {
        console.error("TuneTransporter Error (injected getSpotifyData):", e);
        return null; // Indicate failure on error
    }
}

// Function to get data from YTM page
function getYtmData() {
    // --- Re-define the processing function INSIDE the injection scope ---
    function _processArtistString(artistString) {
        if (!artistString || typeof artistString !== 'string') return null;
        let primaryArtistPart = artistString.trim();
        if (primaryArtistPart.includes('•')) primaryArtistPart = primaryArtistPart.split('•')[0].trim();
        if (primaryArtistPart.includes('�')) primaryArtistPart = primaryArtistPart.split('�')[0].trim();
        const artists = primaryArtistPart.split(/,\s*|\s*&\s*|\s+(?:feat|ft|with|vs)\.?\s+/i);
        const cleanedArtists = artists.map(a => a.trim()).filter(Boolean);
        return cleanedArtists.length > 0 ? cleanedArtists.join(" ") : null;
    }
    // ---------------------------------------------------------------------

    const currentUrl = window.location.href;
    let item = null;
    let artist = null; // Will hold processed artist name
    let type = null;

    try {
        if (currentUrl.startsWith("https://music.youtube.com/playlist?list=")) {
            type = 'playlist'; // Could be album/single too
            const titleElement = document.querySelector('ytmusic-responsive-header-renderer h1 yt-formatted-string.title');
            const artistElement = document.querySelector('ytmusic-responsive-header-renderer yt-formatted-string.strapline-text.complex-string');
            if (titleElement) item = titleElement.title?.trim();
            // Process artist name if found
            if (artistElement) artist = _processArtistString(artistElement.title); // Use internal helper

        } else if (currentUrl.includes("/channel/")) {
            type = 'artist';
            const artistElement = document.querySelector('ytmusic-immersive-header-renderer h1 yt-formatted-string.title');
            // Process artist name if found
            if (artistElement) artist = _processArtistString(artistElement.title); // Use internal helper

        } else if (currentUrl.startsWith("https://music.youtube.com/watch")) {
            type = 'track';
            const titleElement = document.querySelector('ytmusic-player-queue-item[selected] .song-title');
            const artistElement = document.querySelector('ytmusic-player-queue-item[selected] .byline');
            if (titleElement) item = titleElement.title?.trim();
            // Process artist name if found (prefer title, fallback to textContent)
            if (artistElement) {
                let rawArtistText = artistElement.title?.trim() || artistElement.textContent?.trim();
                artist = _processArtistString(rawArtistText); // Use internal helper
            }
        }
        // Return null only if processed artist is null/empty
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

    // Load toggle settings
    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled'], function (data) {
        spotifyToggle.checked = data.spotifyEnabled !== false;
        ytmToggle.checked = data.ytmEnabled !== false;
    });

    // Add toggle SAVE listeners
    spotifyToggle.addEventListener('change', function () {
        chrome.storage.local.set({ spotifyEnabled: spotifyToggle.checked });
    });
    ytmToggle.addEventListener('change', function () {
        chrome.storage.local.set({ ytmEnabled: ytmToggle.checked });
    });


    // --- Logic for Copy Buttons ---
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0 || !tabs[0] || !tabs[0].id || !tabs[0].url) {
            const errorMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : "Cannot access current tab info.";
            console.warn("[DEBUG] Error or invalid tab:", errorMsg, tabs);
            showStatus(`Error: ${errorMsg}`, 0);
            copyYtmLinkBtn.disabled = true;
            copySpotifyLinkBtn.disabled = true;
            return;
        }

        const currentUrl = tabs[0].url;
        const tabId = tabs[0].id;
        console.log(`[DEBUG] Current Tab URL: ${currentUrl}, ID: ${tabId}`);

        let canCopyYtm = false;
        let canCopySpotify = false;
        let statusMsg = "";

        if (currentUrl.startsWith("https://open.spotify.com/")) {
            if (currentUrl.includes("/track/") || currentUrl.includes("/album/") || currentUrl.includes("/artist/")) {
                canCopyYtm = true;
            } else { statusMsg = "Not a Spotify track/album/artist."; }
        }
        else if (currentUrl.startsWith("https://music.youtube.com/")) {
            if (currentUrl.includes("/watch?") || currentUrl.includes("/playlist?list=") || currentUrl.includes("/channel/")) {
                canCopySpotify = true;
            } else { statusMsg = "Not a YTM song/playlist/artist."; }
        }
        else if (currentUrl.startsWith("https://www.youtube.com/watch")) { statusMsg = "Copying not supported here."; }
        else { statusMsg = "Not on Spotify or YTM."; }

        copyYtmLinkBtn.disabled = !canCopyYtm;
        copySpotifyLinkBtn.disabled = !canCopySpotify;
        copyYtmLinkBtn.onclick = canCopyYtm ? () => handleCopyClick('spotify', tabId) : null;
        copySpotifyLinkBtn.onclick = canCopySpotify ? () => handleCopyClick('ytm', tabId) : null;

        if (copyYtmLinkBtn.disabled && copySpotifyLinkBtn.disabled && statusMsg) {
            showStatus(statusMsg, 0);
        } else {
            showStatus("");
        }
    }); // End chrome.tabs.query

    // --- Handle Copy Button Click (async function) ---
    async function handleCopyClick(sourceType, tabId) {
        let injectionFunction;
        let targetServiceName;

        if (sourceType === 'spotify') { injectionFunction = getSpotifyData; targetServiceName = "YouTube Music"; }
        else if (sourceType === 'ytm') { injectionFunction = getYtmData; targetServiceName = "Spotify"; }
        else { return; }

        showStatus(`Getting data from ${sourceType}...`, 0);
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: injectionFunction // This function now includes the processing logic internally
            });

            if (results && results[0] && results[0].result) {
                const data = results[0].result;
                console.log("Extracted data:", data);

                // Artist is mandatory (checked within the injection function now)
                if (!data.artist) {
                    // This path is less likely if injection succeeded and returned non-null,
                    // as the injection function itself checks for artist.
                    throw new Error(`Could not find required info (artist) on the ${sourceType} page.`);
                }

                let searchQuery;
                let targetSearchUrl;

                if (data.type === 'artist') {
                    searchQuery = data.artist; // Already processed artist name
                } else if (data.item && data.artist) {
                    searchQuery = `${data.item} ${data.artist}`; // Use processed artist name
                } else {
                    // Fallback: Should ideally not happen if item is expected but missing
                    searchQuery = data.artist;
                    console.warn("Item name not found, using artist only for search query.");
                }

                if (targetServiceName === "YouTube Music") {
                    targetSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
                } else {
                    targetSearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
                }

                await navigator.clipboard.writeText(targetSearchUrl);
                showStatus(`Copied ${targetServiceName} link!`);
                console.log(`Copied ${targetServiceName} search URL: ${targetSearchUrl}`);

            } else {
                let errorMsg = "Failed to get data from page.";
                if (chrome.runtime.lastError) { errorMsg += ` Error: ${chrome.runtime.lastError.message}`; }
                else if (results && results[0] && results[0].result === null) {
                    errorMsg = `Could not find required info on the ${sourceType} page.`;
                }
                console.error("Extraction failed:", results, chrome.runtime.lastError);
                showStatus(errorMsg, 4000);
            }
        } catch (error) {
            console.error(`Error during ${sourceType} copy process:`, error);
            showStatus(`Error: ${error.message}`, 4000);
        }
    } // End handleCopyClick

}); // End DOMContentLoaded