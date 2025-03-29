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
    if (!artistString || typeof artistString !== 'string') return null;
    let primaryArtistPart = artistString.trim();
    if (primaryArtistPart.includes('•')) primaryArtistPart = primaryArtistPart.split('•')[0].trim();
    if (primaryArtistPart.includes('�')) primaryArtistPart = primaryArtistPart.split('�')[0].trim();
    const artists = primaryArtistPart.split(/,\s*|\s*&\s*|\s+(?:feat|ft|with|vs)\.?\s+/i);
    const cleanedArtists = artists.map(a => a.trim()).filter(Boolean);
    return cleanedArtists.length > 0 ? cleanedArtists.join(" ") : null;
}
// ----------------------------------------------------------------------

// --- Injectable Extraction Functions (for Copy feature) ---
// Function to get data from Spotify page
function getSpotifyData() {
    function _processArtistString(artistString) { // Internal helper
        if (!artistString || typeof artistString !== 'string') return null;
        let primaryArtistPart = artistString.trim();
        if (primaryArtistPart.includes('•')) primaryArtistPart = primaryArtistPart.split('•')[0].trim();
        if (primaryArtistPart.includes('�')) primaryArtistPart = primaryArtistPart.split('�')[0].trim();
        const artists = primaryArtistPart.split(/,\s*|\s*&\s*|\s+(?:feat|ft|with|vs)\.?\s+/i);
        const cleanedArtists = artists.map(a => a.trim()).filter(Boolean);
        return cleanedArtists.length > 0 ? cleanedArtists.join(" ") : null;
    }
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
            if (artistElement) artist = _processArtistString(artistElement.textContent);
        } else if (pathname.startsWith('/artist/')) {
            type = 'artist';
            const artistTitleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            if (artistTitleElement) artist = _processArtistString(artistTitleElement.textContent);
        }
        return artist ? { type, item, artist } : null;
    } catch (e) { console.error("TuneTransporter Error (injected getSpotifyData):", e); return null; }
}

// Function to get data from YTM page
function getYtmData() {
    function _processArtistString(artistString) { // Internal helper
        if (!artistString || typeof artistString !== 'string') return null;
        let primaryArtistPart = artistString.trim();
        if (primaryArtistPart.includes('•')) primaryArtistPart = primaryArtistPart.split('•')[0].trim();
        if (primaryArtistPart.includes('�')) primaryArtistPart = primaryArtistPart.split('�')[0].trim();
        const artists = primaryArtistPart.split(/,\s*|\s*&\s*|\s+(?:feat|ft|with|vs)\.?\s+/i);
        const cleanedArtists = artists.map(a => a.trim()).filter(Boolean);
        return cleanedArtists.length > 0 ? cleanedArtists.join(" ") : null;
    }
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
            if (artistElement) artist = _processArtistString(artistElement.title);
        } else if (currentUrl.includes("/channel/")) {
            type = 'artist';
            const artistElement = document.querySelector('ytmusic-immersive-header-renderer h1 yt-formatted-string.title');
            if (artistElement) artist = _processArtistString(artistElement.title);
        } else if (currentUrl.startsWith("https://music.youtube.com/watch")) {
            type = 'track';
            const titleElement = document.querySelector('ytmusic-player-queue-item[selected] .song-title');
            const artistElement = document.querySelector('ytmusic-player-queue-item[selected] .byline');
            if (titleElement) item = titleElement.title?.trim();
            if (artistElement) {
                let rawArtistText = artistElement.title?.trim() || artistElement.textContent?.trim();
                artist = _processArtistString(rawArtistText);
            }
        }
        return artist ? { type, item, artist } : null;
    } catch (e) { console.error("TuneTransporter Error (injected getYtmData):", e); return null; }
}


// --- Main Popup Logic ---
document.addEventListener('DOMContentLoaded', function () {
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');
    const copyYtmLinkBtn = document.getElementById('copyYtmLinkBtn');
    const copySpotifyLinkBtn = document.getElementById('copySpotifyLinkBtn');
    // --- Get reference to the new button ---
    const copyInfoBtn = document.getElementById('copyInfoBtn');

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
            copyInfoBtn.disabled = true; // Disable new button too
            return;
        }

        const currentUrl = tabs[0].url;
        const tabId = tabs[0].id;
        console.log(`[DEBUG] Current Tab URL: ${currentUrl}, ID: ${tabId}`);

        let canCopyYtm = false;
        let canCopySpotify = false;
        let canCopyInfo = false; // --- Flag for the new button ---
        let currentSourceType = null; // Store 'spotify' or 'ytm'
        let statusMsg = "";

        if (currentUrl.startsWith("https://open.spotify.com/")) {
            if (currentUrl.includes("/track/") || currentUrl.includes("/album/") || currentUrl.includes("/artist/")) {
                canCopyYtm = true;
                canCopyInfo = true; // Enable info copy
                currentSourceType = 'spotify';
            } else { statusMsg = "Not a Spotify track/album/artist."; }
        }
        else if (currentUrl.startsWith("https://music.youtube.com/")) {
            if (currentUrl.includes("/watch?") || currentUrl.includes("/playlist?list=") || currentUrl.includes("/channel/")) {
                canCopySpotify = true;
                canCopyInfo = true; // Enable info copy
                currentSourceType = 'ytm';
            } else { statusMsg = "Not a YTM song/playlist/artist."; }
        }
        else if (currentUrl.startsWith("https://www.youtube.com/watch")) { statusMsg = "Copying not supported here."; }
        else { statusMsg = "Not on Spotify or YTM."; }

        // --- Set disabled states ---
        copyYtmLinkBtn.disabled = !canCopyYtm;
        copySpotifyLinkBtn.disabled = !canCopySpotify;
        copyInfoBtn.disabled = !canCopyInfo; // Disable based on flag

        // --- Set click handlers ---
        copyYtmLinkBtn.onclick = canCopyYtm ? () => handleCopyLinkClick('spotify', tabId) : null;
        copySpotifyLinkBtn.onclick = canCopySpotify ? () => handleCopyLinkClick('ytm', tabId) : null;
        // --- Add click handler for the new button ---
        copyInfoBtn.onclick = canCopyInfo ? () => handleCopyInfoClick(currentSourceType, tabId) : null;


        if (copyYtmLinkBtn.disabled && copySpotifyLinkBtn.disabled && copyInfoBtn.disabled && statusMsg) {
            showStatus(statusMsg, 0);
        } else {
            showStatus("");
        }
    }); // End chrome.tabs.query

    // --- Handle Copy LINK Button Click (Renamed for clarity) ---
    async function handleCopyLinkClick(sourceType, tabId) {
        let injectionFunction;
        let targetServiceName;

        if (sourceType === 'spotify') { injectionFunction = getSpotifyData; targetServiceName = "YouTube Music"; }
        else if (sourceType === 'ytm') { injectionFunction = getYtmData; targetServiceName = "Spotify"; }
        else { return; }

        showStatus(`Getting data from ${sourceType}...`, 0);
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: injectionFunction
            });

            if (results && results[0] && results[0].result) {
                const data = results[0].result;
                console.log("Extracted data for link:", data);

                if (!data.artist) throw new Error(`Could not find required info (artist) on the ${sourceType} page.`);

                let searchQuery;
                if (data.type === 'artist') searchQuery = data.artist;
                else if (data.item && data.artist) searchQuery = `${data.item} ${data.artist}`;
                else searchQuery = data.artist; // Fallback

                let targetSearchUrl;
                if (targetServiceName === "YouTube Music") targetSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
                else targetSearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;

                await navigator.clipboard.writeText(targetSearchUrl);
                showStatus(`Copied ${targetServiceName} link!`);
                console.log(`Copied ${targetServiceName} search URL: ${targetSearchUrl}`);

            } else {
                let errorMsg = "Failed to get data from page.";
                if (chrome.runtime.lastError) { errorMsg += ` Error: ${chrome.runtime.lastError.message}`; }
                else if (results && results[0] && results[0].result === null) { errorMsg = `Could not find required info on the ${sourceType} page.`; }
                console.error("Extraction failed for link:", results, chrome.runtime.lastError);
                showStatus(errorMsg, 4000);
            }
        } catch (error) {
            console.error(`Error during ${sourceType} link copy process:`, error);
            showStatus(`Error: ${error.message}`, 4000);
        }
    } // End handleCopyLinkClick

    // --- Handle Copy INFO Button Click ---
    async function handleCopyInfoClick(sourceType, tabId) {
        let injectionFunction;

        if (sourceType === 'spotify') { injectionFunction = getSpotifyData; }
        else if (sourceType === 'ytm') { injectionFunction = getYtmData; }
        else { return; } // Should not happen

        showStatus(`Getting data from ${sourceType}...`, 0);
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: injectionFunction
            });

            if (results && results[0] && results[0].result) {
                const data = results[0].result;
                console.log("Extracted data for info:", data);

                // Artist is mandatory based on extraction logic returning non-null
                if (!data.artist) {
                    throw new Error(`Could not format info: Artist data missing from extraction.`);
                }

                // Format the string
                let infoString = `Artist: ${data.artist}`;
                if (data.item && data.type !== 'artist') {
                    // Capitalize type (Track, Album, Playlist)
                    let itemLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1);
                    infoString += `, ${itemLabel}: ${data.item}`;
                } else if (!data.item && data.type !== 'artist') {
                    // Only artist was found for a non-artist page (less likely now)
                    console.warn("Info formatting: Item missing for non-artist type.");
                    // infoString remains "Artist: [Name]"
                }
                // For type 'artist', infoString is already correct ("Artist: [Name]")

                // Copy to clipboard
                await navigator.clipboard.writeText(infoString);
                showStatus(`Copied page info!`);
                console.log(`Copied info string: ${infoString}`);

            } else {
                // Handle extraction failures
                let errorMsg = "Failed to get data from page for info copy.";
                if (chrome.runtime.lastError) { errorMsg += ` Error: ${chrome.runtime.lastError.message}`; }
                else if (results && results[0] && results[0].result === null) { errorMsg = `Could not find required info on the ${sourceType} page.`; }
                console.error("Extraction failed for info:", results, chrome.runtime.lastError);
                showStatus(errorMsg, 4000);
            }
        } catch (error) {
            console.error(`Error during ${sourceType} info copy process:`, error);
            showStatus(`Error: ${error.message}`, 4000);
        }
    } 

}); 