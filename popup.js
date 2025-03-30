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

// --- Injectable Extraction Functions (for Copy feature - NOT used by playlist/album copy) ---
// Function to get data from Spotify page
function getSpotifyData() {
    function _processArtistString(artistString) { // Internal helper
        if (!artistString || typeof artistString !== 'string') return null;
        let primaryArtistPart = artistString.trim();
        if (primaryArtistPart.includes('•')) primaryArtistPart = primaryArtistPart.split('•')[0].trim();
        if (primaryArtistPart.includes('')) primaryArtistPart = primaryArtistPart.split('')[0].trim();
        const artists = primaryArtistPart.split(/,\s*|\s*&\s*|\s+(?:feat|ft|with|vs)\.?\s+/i);
        const cleanedArtists = artists.map(a => a.trim()).filter(Boolean);
        return cleanedArtists.length > 0 ? cleanedArtists.join(" ") : null;
    }
    const pathname = window.location.pathname;
    let item = null;
    let artist = null;
    let type = null; // Spotify types: 'track', 'album', 'artist'
    try {
        if (pathname.startsWith('/track/')) {
            type = 'track'; // <<< Set type
            const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            const artistElement = document.querySelector('a[data-testid="creator-link"]');
            if (titleElement) item = titleElement.textContent?.trim();
            if (artistElement) artist = _processArtistString(artistElement.textContent);
        } else if (pathname.startsWith('/album/')) {
            type = 'album'; // <<< Set type
            const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            const artistElement = document.querySelector('a[data-testid="creator-link"]');
            if (titleElement) item = titleElement.textContent?.trim();
            if (artistElement) artist = _processArtistString(artistElement.textContent);
        } else if (pathname.startsWith('/artist/')) {
            type = 'artist'; // <<< Set type
            const artistTitleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            if (artistTitleElement) artist = _processArtistString(artistTitleElement.textContent);
        }
        // Return type along with item and artist
        return artist ? { type, item, artist } : null;
    } catch (e) { console.error("TuneTransporter Error (injected getSpotifyData):", e); return null; }
}

// Function to get data from YTM page
function getYtmData() {
    function _processArtistString(artistString) { // Internal helper
        if (!artistString || typeof artistString !== 'string') return null;
        let primaryArtistPart = artistString.trim();
        if (primaryArtistPart.includes('•')) primaryArtistPart = primaryArtistPart.split('•')[0].trim();
        if (primaryArtistPart.includes('')) primaryArtistPart = primaryArtistPart.split('')[0].trim();
        const artists = primaryArtistPart.split(/,\s*|\s*&\s*|\s+(?:feat|ft|with|vs)\.?\s+/i);
        const cleanedArtists = artists.map(a => a.trim()).filter(Boolean);
        return cleanedArtists.length > 0 ? cleanedArtists.join(" ") : null;
    }
    const currentUrl = window.location.href;
    let item = null;
    let artist = null;
    let type = null; // YTM types: 'playlist' (for album/playlist), 'artist', 'track'
    try {
        if (currentUrl.startsWith("https://music.youtube.com/playlist?list=")) {
            type = 'playlist'; // <<< Set type
            const titleElement = document.querySelector('ytmusic-responsive-header-renderer h1 yt-formatted-string.title');
            const artistElement = document.querySelector('ytmusic-responsive-header-renderer yt-formatted-string.strapline-text.complex-string');
            if (titleElement) item = titleElement.title?.trim();
            if (artistElement) artist = _processArtistString(artistElement.title);
        } else if (currentUrl.includes("/channel/")) {
            type = 'artist'; // <<< Set type
            const artistElement = document.querySelector('ytmusic-immersive-header-renderer h1 yt-formatted-string.title');
            if (artistElement) artist = _processArtistString(artistElement.title);
        } else if (currentUrl.startsWith("https://music.youtube.com/watch")) {
            type = 'track'; // <<< Set type
            const titleElement = document.querySelector('ytmusic-player-queue-item[selected] .song-title');
            const artistElement = document.querySelector('ytmusic-player-queue-item[selected] .byline');
            if (titleElement) item = titleElement.title?.trim();
            if (artistElement) {
                let rawArtistText = artistElement.title?.trim() || artistElement.textContent?.trim();
                artist = _processArtistString(rawArtistText);
            }
        }
        // Return type along with item and artist
        return artist ? { type, item, artist } : null;
    } catch (e) { console.error("TuneTransporter Error (injected getYtmData):", e); return null; }
}


// --- Main Popup Logic ---
document.addEventListener('DOMContentLoaded', function () {
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');
    const copyYtmLinkBtn = document.getElementById('copyYtmLinkBtn');
    const copySpotifyLinkBtn = document.getElementById('copySpotifyLinkBtn');
    const copyInfoBtn = document.getElementById('copyInfoBtn');
    const copySpotifyPlaylistBtn = document.getElementById('copySpotifyPlaylistBtn'); // Keep ID for now, represents "Copy Album Tracks"

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
            console.warn("[Popup Debug] Error or invalid tab:", errorMsg, tabs);
            showStatus(`Error: ${errorMsg}`, 0);
            copyYtmLinkBtn.disabled = true;
            copySpotifyLinkBtn.disabled = true;
            copyInfoBtn.disabled = true;
            copySpotifyPlaylistBtn.disabled = true;
            return;
        }

        const currentUrl = tabs[0].url;
        const tabId = tabs[0].id;
        console.log(`[Popup Debug] Current Tab URL: ${currentUrl}, ID: ${tabId}`);

        let canCopyYtm = false;
        let canCopySpotify = false;
        let canCopyInfo = false;
        let canCopyAlbumTracks = false; // Renamed flag for clarity
        let currentSourceType = null;
        let statusMsg = "";

        console.log("[Popup Debug] Checking URL conditions...");
        if (currentUrl.startsWith("https://open.spotify.com/")) {
            console.log("[Popup Debug] URL is Spotify.");
            if (currentUrl.includes("/track/")) {
                 console.log("[Popup Debug] Spotify URL is track.");
                 canCopyYtm = true;
                 canCopyInfo = true;
                 currentSourceType = 'spotify';
            } else if (currentUrl.includes("/album/")) { // *** CHANGED LOGIC ***
                 console.log("[Popup Debug] Spotify URL is album.");
                 canCopyYtm = true; // Can still copy YTM link from album
                 canCopyInfo = true; // Can still copy basic album info
                 canCopyAlbumTracks = true; // *** Enable album track copy ***
                 currentSourceType = 'spotify';
            } else if (currentUrl.includes("/artist/")) {
                 console.log("[Popup Debug] Spotify URL is artist.");
                 canCopyYtm = true;
                 canCopyInfo = true;
                 currentSourceType = 'spotify';
            } else if (currentUrl.includes("/playlist/") || currentUrl.includes("/collection/tracks")) { // Added playlist and collection check
                 console.log("[Popup Debug] Spotify URL is playlist or collection.");
                 canCopyAlbumTracks = true; // *** Enable track copy for playlists/collection ***
                 canCopyInfo = true; // Can still copy basic info (though it might be less relevant for collection)
                 currentSourceType = 'spotify';
            } else {
                console.log("[Popup Debug] Spotify URL is other type.");
                statusMsg = "Not a Spotify track/album/artist page."; // Updated message
            }
        }
        else if (currentUrl.startsWith("https://music.youtube.com/")) {
            console.log("[Popup Debug] URL is YTM.");
            if (currentUrl.includes("/watch?") || currentUrl.includes("/playlist?list=") || currentUrl.includes("/channel/")) {
                console.log("[Popup Debug] YTM URL is song/playlist/artist.");
                canCopySpotify = true;
                canCopyInfo = true;
                currentSourceType = 'ytm';
            } else {
                console.log("[Popup Debug] YTM URL is other type.");
                statusMsg = "Not a YTM song/playlist/artist.";
            }
        }
        else if (currentUrl.startsWith("https://www.youtube.com/watch")) {
            console.log("[Popup Debug] URL is YouTube watch page.");
            statusMsg = "Copying not supported here.";
        }
        else {
            console.log("[Popup Debug] URL is not Spotify or YTM.");
            statusMsg = "Not on Spotify or YTM.";
        }
        // Log flags using the new name
        console.log(`[Popup Debug] Flags after check: canCopyYtm=${canCopyYtm}, canCopySpotify=${canCopySpotify}, canCopyInfo=${canCopyInfo}, canCopyAlbumTracks=${canCopyAlbumTracks}, currentSourceType=${currentSourceType}`);

        // --- Set disabled states ---
        copyYtmLinkBtn.disabled = !canCopyYtm;
        copySpotifyLinkBtn.disabled = !canCopySpotify;
        copyInfoBtn.disabled = !canCopyInfo;
        copySpotifyPlaylistBtn.disabled = !canCopyAlbumTracks; // Use the new flag
        // Log states using the new flag name
        console.log(`[Popup Debug] Button states set: copyYtmLinkBtn.disabled=${copyYtmLinkBtn.disabled}, copySpotifyLinkBtn.disabled=${copySpotifyLinkBtn.disabled}, copyInfoBtn.disabled=${copyInfoBtn.disabled}, copySpotifyPlaylistBtn.disabled=${copySpotifyPlaylistBtn.disabled}`);

        // *** FINAL CHECK LOGS ***
        console.log(`[Popup Debug] FINAL CHECK: copyInfoBtn element disabled property is: ${copyInfoBtn.disabled}`);
        console.log(`[Popup Debug] FINAL CHECK: copySpotifyPlaylistBtn element disabled property is: ${copySpotifyPlaylistBtn.disabled}`);

        // --- Set click handlers ---
        copyYtmLinkBtn.onclick = canCopyYtm ? () => handleCopyLinkClick('spotify', tabId) : null;
        copySpotifyLinkBtn.onclick = canCopySpotify ? () => handleCopyLinkClick('ytm', tabId) : null;
        copyInfoBtn.onclick = canCopyInfo ? () => handleCopyInfoClick(currentSourceType, tabId) : null;
        copySpotifyPlaylistBtn.onclick = canCopyAlbumTracks ? () => handleCopySpotifyAlbumTracksClick(tabId) : null; // Use new flag and renamed handler


        if (copyYtmLinkBtn.disabled && copySpotifyLinkBtn.disabled && copyInfoBtn.disabled && copySpotifyPlaylistBtn.disabled && statusMsg) {
            showStatus(statusMsg, 0);
        } else {
            showStatus("");
        }
    }); // End chrome.tabs.query

    // --- Helper to process script execution results ---
    function _handleScriptResult(results, sourceType, actionType) {
        if (results && results[0] && results[0].result) {
            const data = results[0].result;
            console.log(`Extracted data for ${actionType}:`, data);
            return data; // Return the extracted data if successful
        } else {
            let errorMsg = `Failed to get data from ${sourceType} page for ${actionType} copy.`;
            if (chrome.runtime.lastError) {
                errorMsg += ` Error: ${chrome.runtime.lastError.message}`;
            } else if (results && results[0] && results[0].result === null) {
                errorMsg = `Could not find required info on the ${sourceType} page.`;
            }
            console.error(`Extraction failed for ${actionType}:`, results, chrome.runtime.lastError);
            throw new Error(errorMsg); // Throw an error to be caught by the caller
        }
    }

    // --- Handle Copy LINK Button Click (MODIFIED for Spotify Filters) ---
    async function handleCopyLinkClick(sourceType, tabId) {
        let injectionFunction;
        let targetServiceName;

        if (sourceType === 'spotify') {
            injectionFunction = getSpotifyData;
            targetServiceName = "YouTube Music";
        } else if (sourceType === 'ytm') {
            injectionFunction = getYtmData;
            targetServiceName = "Spotify";
        } else { return; }

        showStatus(`Getting data from ${sourceType}...`, 0);
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: injectionFunction
            });

            const data = _handleScriptResult(results, sourceType, 'link'); // Use helper

            let searchQuery;
            if (data.type === 'artist') searchQuery = data.artist;
                else if (data.item && data.artist) searchQuery = `${data.item} ${data.artist}`;
                else searchQuery = data.artist; // Fallback

                let targetSearchUrl;
                if (targetServiceName === "YouTube Music") {
                    targetSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
                } else { // Spotify URL - Apply filter based on extracted type
                    let spotifyFilterType = null;
                    switch (data.type) {
                        case 'track': spotifyFilterType = 'tracks'; break;
                        case 'playlist': spotifyFilterType = 'albums'; break; // YTM playlist maps to Spotify album search
                        case 'artist': spotifyFilterType = 'artists'; break;
                        default: console.warn(`Unexpected data type "${data.type}" from YTM, using general Spotify search.`);
                    }

                    if (spotifyFilterType) {
                        targetSearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}/${spotifyFilterType}`;
                        console.log(`Applying Spotify filter: /${spotifyFilterType}`);
                    } else {
                        targetSearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}`;
                    }
                }

                await navigator.clipboard.writeText(targetSearchUrl);
                showStatus(`Copied ${targetServiceName} link!`);
                console.log(`Copied ${targetServiceName} search URL: ${targetSearchUrl}`);

        } catch (error) {
            console.error(`Error during ${sourceType} link copy process:`, error);
            showStatus(`Error: ${error.message}`, 4000);
        }
    } // End handleCopyLinkClick

    // --- Handle Copy INFO Button Click (No changes needed here) ---
    async function handleCopyInfoClick(sourceType, tabId) {
        let injectionFunction;

        if (sourceType === 'spotify') { injectionFunction = getSpotifyData; }
        else if (sourceType === 'ytm') { injectionFunction = getYtmData; }
        else { return; }

        showStatus(`Getting data from ${sourceType}...`, 0);
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: injectionFunction
            });

            const data = _handleScriptResult(results, sourceType, 'info'); // Use helper

            if (!data.artist) throw new Error(`Could not format info: Artist data missing from extraction.`);

            let infoString = `Artist: ${data.artist}`;
                if (data.item && data.type !== 'artist') {
                    let itemLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1);
                    if (sourceType === 'ytm' && data.type === 'playlist') { itemLabel = 'Playlist/Album'; }
                    else if (sourceType === 'spotify' && data.type === 'album') { itemLabel = 'Album'; }
                    else { itemLabel = 'Track'; }
                    infoString += `, ${itemLabel}: ${data.item}`;
                } else if (!data.item && data.type !== 'artist') {
                    console.warn("Info formatting: Item missing for non-artist type.");
                }

                await navigator.clipboard.writeText(infoString);
                showStatus(`Copied page info!`);
                console.log(`Copied info string: ${infoString}`);

        } catch (error) {
            console.error(`Error during ${sourceType} info copy process:`, error);
            showStatus(`Error: ${error.message}`, 4000);
        }
    } // End handleCopyInfoClick

    // --- Handle Copy SPOTIFY ALBUM TRACKS Button Click ---
    // Renamed function for clarity and modified to handle copy within popup
    async function handleCopySpotifyAlbumTracksClick(tabId) { // Renamed function
        showStatus("Getting album tracks...", 0); // Updated status message
        try {
            // Send message to the content script to GET the tracks
            const response = await chrome.tabs.sendMessage(tabId, { action: "getSpotifyAlbumTracks" }); // Changed action

            // Handle the response from the content script
            if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message || "Failed to send message to content script.");
            }

            if (response && response.success && response.tracks) {
                if (response.count > 0) {
                    // Perform the copy operation HERE in the popup
                    await navigator.clipboard.writeText(response.tracks);
                    showStatus(`Copied ${response.count} visible tracks!`);
                    console.log(`Successfully received ${response.count} tracks from content script and copied to clipboard.`);
                    console.log("Copied content:\n", response.tracks); // Log copied content for debugging
                } else {
                    showStatus("No visible tracks found on the page.");
                    console.log("Content script reported success but 0 tracks found.");
                }
            } else if (response && response.success && response.count === 0) {
                 showStatus("No visible tracks found on the page.");
                 console.log("Content script reported success but 0 tracks found.");
            }
             else {
                throw new Error(response?.error || "Content script failed to get album tracks.");
            }

        } catch (error) {
            console.error("Error during Spotify album tracks copy request:", error);
            if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
                 showStatus("Error: Cannot connect to Spotify page. Try reloading the page.", 4000);
            } else {
                 showStatus(`Error: ${error.message}`, 4000);
            }
        }
    } // End handleCopySpotifyAlbumTracksClick

}); // End DOMContentLoaded