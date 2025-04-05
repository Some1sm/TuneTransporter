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

// --- Injectable Extraction Functions (Remain Global) ---
// Function to get data from Spotify page
function getSpotifyData() {
    function _processArtistString(artistString) { // Internal helper
        if (!artistString || typeof artistString !== 'string') return null;
        let primaryArtistPart = artistString.trim();
        if (primaryArtistPart.includes('•')) primaryArtistPart = primaryArtistPart.split('•')[0].trim();
        // if (primaryArtistPart.includes('')) primaryArtistPart = primaryArtistPart.split('')[0].trim(); // REMOVED - Incorrect logic
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
            type = 'track';
            const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
            const artistElement = document.querySelector('a[data-testid="creator-link"]');
            if (titleElement) item = titleElement.textContent?.trim();
            if (artistElement) artist = _processArtistString(artistElement.textContent);
        } else if (pathname.startsWith('/album/')) {
            type = 'album';
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
        // if (primaryArtistPart.includes('')) primaryArtistPart = primaryArtistPart.split('')[0].trim(); // REMOVED - Incorrect logic
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
// console.log("[Popup Debug] popup.js script loaded."); // Removed debug log
document.addEventListener('DOMContentLoaded', function () {
    try { // ADDED try block
    // console.log("[Popup Debug] DOMContentLoaded event fired."); // Removed debug log
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');
    const copyYtmLinkBtn = document.getElementById('copyYtmLinkBtn');
    const copySpotifyLinkBtn = document.getElementById('copySpotifyLinkBtn');
    const copyInfoBtn = document.getElementById('copyInfoBtn');
    const copySpotifyPlaylistBtn = document.getElementById('copySpotifyPlaylistBtn');
    const copyYtmPlaylistBtn = document.getElementById('copyYtmPlaylistBtn');
    const createYtmPlaylistBtn = document.getElementById('createYtmPlaylistBtn');
    // console.log("[Popup Debug] Button elements obtained:", { copyYtmLinkBtn, copySpotifyLinkBtn, copyInfoBtn, copySpotifyPlaylistBtn, copyYtmPlaylistBtn, createYtmPlaylistBtn }); // Removed debug log

    // --- Helper to process script execution results --- (Defined inside DOMContentLoaded)
    function _handleScriptResult(results, sourceType, actionType) {
        if (results && results[0] && results[0].result) {
            const data = results[0].result;
            console.log(`Extracted data for ${actionType}:`, data);
            return data;
        } else {
            let errorMsg = `Failed to get data from ${sourceType} page for ${actionType} copy.`;
            if (chrome.runtime.lastError) {
                errorMsg += ` Error: ${chrome.runtime.lastError.message}`;
            } else if (results && results[0] && results[0].result === null) {
                errorMsg = `Could not find required info on the ${sourceType} page.`;
            }
            console.error(`Extraction failed for ${actionType}:`, results, chrome.runtime.lastError);
            throw new Error(errorMsg);
        }
    }

    // --- Handler Functions (Defined inside DOMContentLoaded) ---

    // Handle Copy LINK Button Click
    async function handleCopyLinkClick(sourceType) { // Renamed from handleCopyYtmLinkClick / handleCopySpotifyLinkClick
        // console.log(`[Popup Debug] handleCopyLinkClick called with sourceType: ${sourceType}`); // Removed debug log
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0]?.id) {
            showStatus("Error: Could not get current tab.", 4000); // Keep error message
            // console.error("[Popup Debug] handleCopyLinkClick: Failed to get current tab."); // Removed debug log
            return;
        }
        const tabId = tabs[0].id;

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
            const data = _handleScriptResult(results, sourceType, 'link');
            let searchQuery;
            if (data.type === 'artist') searchQuery = data.artist;
            else if (data.item && data.artist) searchQuery = `${data.item} ${data.artist}`;
            else searchQuery = data.artist;

            let targetSearchUrl;
            if (targetServiceName === "YouTube Music") {
                targetSearchUrl = `https://music.youtube.com/search?q=${encodeURIComponent(searchQuery)}`;
            } else {
                let spotifyFilterType = null;
                switch (data.type) {
                    case 'track': spotifyFilterType = 'tracks'; break;
                    case 'playlist': spotifyFilterType = 'albums'; break;
                    case 'artist': spotifyFilterType = 'artists'; break;
                    default: console.warn(`Unexpected data type "${data.type}" from YTM, using general Spotify search.`);
                }
                if (spotifyFilterType) {
                    targetSearchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}/${spotifyFilterType}`;
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
    }

    // Handle Copy INFO Button Click
    async function handleCopyInfoClick() { // Renamed from handleCopyInfoBtnClick
        // console.log(`[Popup Debug] handleCopyInfoClick called`); // Removed debug log
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0]?.id || !tabs[0]?.url) {
            showStatus("Error: Could not get current tab info.", 4000); // Keep error message
            // console.error("[Popup Debug] handleCopyInfoClick: Failed to get current tab info."); // Removed debug log
            return;
        }
        const tabId = tabs[0].id;
        const currentUrl = tabs[0].url;

        let sourceType = null;
        let injectionFunction;
        if (currentUrl.startsWith("https://open.spotify.com/")) {
            sourceType = 'spotify';
            injectionFunction = getSpotifyData;
        } else if (currentUrl.startsWith("https://music.youtube.com/")) {
            sourceType = 'ytm';
            injectionFunction = getYtmData;
        } else {
             showStatus("Not on a supported page for copying info.", 4000);
             return;
        }

        showStatus(`Getting data from ${sourceType}...`, 0);
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: injectionFunction
            });
            const data = _handleScriptResult(results, sourceType, 'info');
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
    }

    // Handle Copy SPOTIFY PLAYLIST/ALBUM/COLLECTION TRACKS Button Click
    async function handleCopySpotifyPlaylistTracksClick() { // Renamed from handleCopySpotifyPlaylistBtnClick
        // console.log(`[Popup Debug] handleCopySpotifyPlaylistTracksClick called`); // Removed debug log
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0]?.id) {
            showStatus("Error: Could not get current tab.", 4000); // Keep error message
            // console.error("[Popup Debug] handleCopySpotifyPlaylistTracksClick: Failed to get current tab."); // Removed debug log
            return;
        }
        const tabId = tabs[0].id;

        showStatus("Getting album tracks...", 0);
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: "getSpotifyAlbumTracks" });
            if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message || "Failed to send message to content script.");
            }
            if (response && response.success && (response.tracks || response.pageTitle)) {
                const pageTitle = response.pageTitle || "Unknown Title";
                const trackCount = response.count || 0;
                const trackList = response.tracks || "";
                if (trackCount > 0) {
                    const clipboardText = `${pageTitle}\n\n${trackList}`;
                    await navigator.clipboard.writeText(clipboardText);
                    showStatus(`Copied "${pageTitle}" (${trackCount} tracks)!`);
                    console.log(`Successfully received ${trackCount} tracks and title "${pageTitle}" from content script and copied to clipboard.`);
                    // Store title and track ARRAY first
                    // console.log(`[Popup Debug] Preparing to save to storage. Type of trackList: ${typeof trackList}, Is Array: ${Array.isArray(trackList)}`); // Removed debug log
                    // console.log("[Popup Debug] trackList content:", trackList); // Optional: Log content if needed, might be large
                    chrome.storage.local.set({
                        lastSpotifyPlaylistTitle: pageTitle,
                        spotifyTracks: trackList // Ensure trackList is the array
                     }, () => {
                        console.log(`Stored Spotify playlist title "${pageTitle}" and track array (${trackCount} tracks).`);

                        // Now, show prompt and set trigger flag if confirmed
                        setTimeout(() => {
                            if (confirm(`Copied "${pageTitle}" (${trackCount} tracks). Go to YouTube Music library to create the playlist?`)) {
                                // Set trigger flag and title for service worker
                                chrome.storage.local.set({ triggerYtmPrompt: true, playlistTitleToCreate: pageTitle }, () => { // Keep flag setting
                                    // console.log(`[Popup Debug] Set triggerYtmPrompt flag for "${pageTitle}". Navigating...`); // Removed debug log
                                    chrome.tabs.update(tabId, { url: "https://music.youtube.com/library/playlists" });
                                });
                            }
                        }, 500); // Delay prompt slightly after storage save
                    });
                } else {
                    await navigator.clipboard.writeText(pageTitle);
                    showStatus(`Copied title "${pageTitle}" (0 tracks found).`);
                    console.log(`Content script reported success but 0 tracks found. Copied title: "${pageTitle}"`);
                    // Store title and EMPTY track array if 0 tracks found
                    chrome.storage.local.set({
                        lastSpotifyPlaylistTitle: pageTitle,
                        spotifyTracks: [] // Store empty array
                    }, () => {
                        console.log(`Stored Spotify playlist title "${pageTitle}" and cleared tracks (0 found).`);
                        // Now, show prompt and set trigger flag if confirmed
                        setTimeout(() => {
                            if (confirm(`Copied title "${pageTitle}" (0 tracks found). Go to YouTube Music library anyway?`)) {
                                // Set trigger flag and title for service worker
                                chrome.storage.local.set({ triggerYtmPrompt: true, playlistTitleToCreate: pageTitle }, () => { // Keep flag setting
                                    // console.log(`[Popup Debug] Set triggerYtmPrompt flag for "${pageTitle}" (0 tracks). Navigating...`); // Removed debug log
                                    chrome.tabs.update(tabId, { url: "https://music.youtube.com/library/playlists" });
                                });
                            }
                        }, 500); // Delay prompt slightly after storage save
                    });
                }
            } else {
                throw new Error(response?.error || "Content script failed to get tracks or title.");
            }
        } catch (error) {
            console.error("Error during Spotify album tracks copy request:", error);
            if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
                 showStatus("Error: Cannot connect to Spotify page. Try reloading the page.", 4000);
            } else {
                 showStatus(`Error: ${error.message}`, 4000);
            }
        }
    }

    // Handle Copy FULL YTM PLAYLIST Button Click
    async function handleCopyFullYtmPlaylist() { // Renamed from handleCopyYtmPlaylistBtnClick
        // console.log(`[Popup Debug] handleCopyFullYtmPlaylist called`); // Removed debug log
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0]?.id) {
            showStatus("Error: Could not get current tab.", 4000); // Keep error message
            // console.error("[Popup Debug] handleCopyFullYtmPlaylist: Failed to get current tab."); // Removed debug log
            return;
        }
        const tabId = tabs[0].id;

        showStatus("Extracting YTM playlist (may take time)...", 0);
        try {
            // console.log("[Popup Debug] Injecting YTM playlist scripts..."); // Removed debug log
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['utils.js', 'ytm-playlist-content.js']
            });
            // console.log("[Popup Debug] Scripts injected."); // Removed debug log

            // console.log("[Popup Debug] Executing YTM playlist extraction function..."); // Removed debug log
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (containerSelector, trackRowSelector) => {
                    // Ensure scrollAndExtractAllYtmTracks is defined in the content script context
                    if (typeof scrollAndExtractAllYtmTracks === 'function') {
                        return scrollAndExtractAllYtmTracks(containerSelector, trackRowSelector);
                    } else {
                        throw new Error("scrollAndExtractAllYtmTracks function not found after script injection.");
                    }
                },
                args: [
                    'ytmusic-playlist-shelf-renderer > div#contents',
                    'ytmusic-responsive-list-item-renderer'
                ]
            });
            // console.log("[Popup Debug] YTM playlist script execution results:", results); // Removed debug log

           if (chrome.runtime.lastError) {
               if (chrome.runtime.lastError.message.includes("Could not establish connection") || chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
                    console.warn("Connection to tab lost during YTM playlist extraction.");
                    showStatus("Error: Connection to YTM page lost.", 4000);
                    return;
               }
               throw new Error(`Script execution failed: ${chrome.runtime.lastError.message}`);
           }
           if (results && results[0] && typeof results[0].result !== 'undefined') {
                 const resultData = results[0].result;
                 if (!resultData || typeof resultData !== 'object' || !Array.isArray(resultData.tracks) || typeof resultData.title !== 'string') {
                     console.error("YTM playlist extraction script did not return the expected {title, tracks} object.", resultData);
                     throw new Error("Extraction script returned invalid data structure.");
                 }
                 const playlistTitle = resultData.title || "Unknown Playlist";
                 const tracks = resultData.tracks;
                 if (tracks.length > 0) {
                     const trackListString = tracks.map(t => `${t.title} - ${t.artist}`).join('\n');
                     const formattedList = `${playlistTitle}\n\n${trackListString}`;
                     await navigator.clipboard.writeText(formattedList);
                     showStatus(`Copied "${playlistTitle}" (${tracks.length} total tracks)!`);
                     console.log(`Copied "${playlistTitle}" (${tracks.length} total tracks) from YTM playlist to clipboard.`);
                 } else {
                      showStatus("No tracks found or extracted from YTM playlist.");
                      console.log("YTM playlist extraction script ran successfully but found 0 tracks.");
                 }
             } else {
                  console.error("YTM playlist extraction script did not return expected results structure.", results);
                  const frameResult = results && results[0];
                  if (frameResult && frameResult.error) {
                      throw new Error(`Script execution error: ${frameResult.error.message || 'Unknown error'}`);
                  } else {
                      throw new Error("Failed to execute YTM playlist extraction script or script returned invalid data.");
                  }
             }
        } catch (error) {
            console.error("Error copying full YTM playlist:", error);
            if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist") || error.message.includes("Cannot access contents of url") || error.message.includes("No tab with id")) {
                 showStatus("Error: Cannot access YTM page. Try reloading the page or ensure it's open.", 5000);
            } else if (error.message.includes("Playlist container not found")) {
                 showStatus("Error: Could not find playlist content on the page.", 5000);
            } else if (error.message.includes("processArtistString is not defined") || error.message.includes("showFeedback is not defined") || error.message.includes("delay is not defined")) {
                 showStatus("Error: Script dependency missing. Please report this bug.", 5000);
            } else {
                 showStatus(`Error: ${error.message}`, 5000);
            }
        }
    }

    // Handle Create YTM PLAYLIST Button Click
    async function handleCreateYtmPlaylistClick() { // Renamed from handleCreateYtmPlaylistBtnClick
        // console.log(`[Popup Debug] handleCreateYtmPlaylistClick called`); // Removed debug log
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0 || !tabs[0]?.id) {
            showStatus("Error: Could not get current tab.", 4000); // Keep error message
            // console.error("[Popup Debug] handleCreateYtmPlaylistClick: Failed to get current tab."); // Removed debug log
            return;
        }
        const tabId = tabs[0].id;

        showStatus("Initiating YTM playlist creation...", 0);
        try {
            const data = await chrome.storage.local.get(['lastSpotifyPlaylistTitle']);
            const playlistTitle = data.lastSpotifyPlaylistTitle;
            if (!playlistTitle) {
                throw new Error("No Spotify playlist title found in storage. Please copy a Spotify playlist first.");
            }
            console.log(`Retrieved Spotify title "${playlistTitle}" for YTM creation.`);

            // Add a small delay before injecting scripts, especially when called automatically
            // console.log("[Popup Debug] Adding short delay before script injection..."); // Removed debug log
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay

            // console.log("[Popup Debug] Injecting scripts for YTM playlist creation..."); // Removed debug log
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['utils.js', 'ytm-playlist-content.js']
            });
            // console.log("[Popup Debug] Scripts injected for creation."); // Removed debug log

            // console.log("[Popup Debug] Executing createYtmPlaylist function..."); // Removed debug log
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (title) => {
                    // Ensure createYtmPlaylist is defined in the content script context
                    if (typeof createYtmPlaylist === 'function') {
                        return createYtmPlaylist(title);
                    } else {
                        throw new Error("createYtmPlaylist function not found after script injection.");
                    }
                },
                args: [playlistTitle]
            });
            // console.log("[Popup Debug] YTM playlist creation script execution results:", results); // Removed debug log

            if (chrome.runtime.lastError) {
                 if (chrome.runtime.lastError.message.includes("Could not establish connection") || chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
                     console.warn("Connection to tab lost during YTM playlist creation.");
                     showStatus("Error: Connection to YTM page lost.", 4000);
                     return;
                 }
                 throw new Error(`Script execution failed: ${chrome.runtime.lastError.message}`);
            }
            if (results && results[0] && typeof results[0].result !== 'undefined') {
                const creationResult = results[0].result;
                if (creationResult.success) {
                    showStatus(`Successfully initiated creation of playlist "${playlistTitle}"!`, 3000);
                    console.log(`YTM playlist creation initiated for "${playlistTitle}".`);
                    // chrome.storage.local.remove('lastSpotifyPlaylistTitle');
                } else {
                    throw new Error(creationResult.error || "Playlist creation failed in content script.");
                }
            } else {
                 console.error("YTM playlist creation script did not return expected results structure.", results);
                 const frameResult = results && results[0];
                 if (frameResult && frameResult.error) {
                     throw new Error(`Script execution error: ${frameResult.error.message || 'Unknown error'}`);
                 } else {
                     throw new Error("Failed to execute YTM playlist creation script or script returned invalid data.");
                 }
            }
        } catch (error) {
            console.error("Error creating YTM playlist:", error);
             if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist") || error.message.includes("Cannot access contents of url") || error.message.includes("No tab with id")) {
                  showStatus("Error: Cannot access YTM page. Try reloading.", 5000);
             } else if (error.message.includes("not found")) {
                  showStatus(`Error: ${error.message}`, 5000);
             } else {
                  showStatus(`Error: ${error.message}`, 5000);
             }
        }
    }

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

    // --- Set Initial Button States and Attach Listeners ---
    const initializePopupState = async () => {
        // console.log("[Popup Debug] initializePopupState started."); // Removed debug log
        let currentUrl = '';
        let tabId = null;
        let isYtm = false;
        let canCopyYtm = false;
        let canCopySpotify = false;
        let canCopyInfo = false;
        let canCopySpotifyPlaylist = false;
        let canCopyYtmPlaylist = false;
        let canCreateYtmPlaylist = false;
        let statusMsg = "";

        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0 || !tabs[0]?.id || !tabs[0]?.url) {
                throw new Error(chrome.runtime.lastError?.message || "Cannot access current tab info.");
            }
            currentUrl = tabs[0].url;
            tabId = tabs[0].id;
            // console.log(`[Popup Debug] Initializing for Tab URL: ${currentUrl}, ID: ${tabId}`); // Removed debug log

            // Determine button capabilities based on URL
            // console.log("[Popup Debug] Determining button capabilities..."); // Removed debug log
            if (currentUrl.startsWith("https://open.spotify.com/")) {
                isYtm = false; // Explicitly set
                canCopyInfo = true;
                if (currentUrl.includes("/track/")) { canCopyYtm = true; }
                else if (currentUrl.includes("/album/")) { canCopyYtm = true; canCopySpotifyPlaylist = true; }
                else if (currentUrl.includes("/artist/")) { canCopyYtm = true; }
                else if (currentUrl.includes("/playlist/") || currentUrl.includes("/collection/tracks")) { canCopySpotifyPlaylist = true; }
                else { statusMsg = "Not a Spotify track/album/artist/playlist page."; }
            }
            else if (currentUrl.startsWith("https://music.youtube.com/")) {
                isYtm = true;
                canCopyInfo = true;
                if (currentUrl.includes("/watch?")) { canCopySpotify = true; }
                else if (currentUrl.includes("/playlist?list=")) { canCopySpotify = true; canCopyYtmPlaylist = true; }
                else if (currentUrl.includes("/channel/")) { canCopySpotify = true; }
                // Special check for library page to potentially enable create button later
                else if (currentUrl.includes("/library/playlists")) { // Keep check for library page
                    // console.log("[Popup Debug] On YTM library playlists page."); // Removed debug log
                }
                else { statusMsg = "Not a YTM song/playlist/artist page."; }
            }
            else if (currentUrl.startsWith("https://www.youtube.com/watch")) { statusMsg = "Copying not supported here."; }
            else { statusMsg = "Not on Spotify or YTM."; }

            // Check storage for create button state only if on YTM
            // console.log("[Popup Debug] Checking storage for YTM create state (isYtm=" + isYtm + ")..."); // Removed debug log
            if (isYtm) {
                try {
                    // Check 'lastSpotifyPlaylistTitle' to enable the create button
                    const storageResult = await chrome.storage.local.get(['lastSpotifyPlaylistTitle']);
                    if (storageResult.lastSpotifyPlaylistTitle) {
                       canCreateYtmPlaylist = true; // Keep logic
                        // console.log("[Popup Debug] Found lastSpotifyPlaylistTitle, enabling create button."); // Removed debug log
                    } else {
                        // console.log("[Popup Debug] No lastSpotifyPlaylistTitle found."); // Removed debug log
                    }
                } catch (storageError) {
                    console.error("Error getting lastSpotifyPlaylistTitle from storage:", storageError); // Keep error log
                    showStatus("Error accessing storage.", 4000);
                }
            }
            // console.log("[Popup Debug] Storage check complete (if applicable)."); // Removed debug log
            // console.log("[Popup Debug] Button capability determination complete."); // Removed debug log

        } catch (error) {
            console.warn("Error during initialization:", error); // Keep warning log
            showStatus(`Error: ${error.message}`, 0);
            // Reset all flags on error
            canCopyYtm = canCopySpotify = canCopyInfo = canCopySpotifyPlaylist = canCopyYtmPlaylist = canCreateYtmPlaylist = false;
        }


        // Set button disabled states
        // console.log("[Popup Debug] Setting button disabled states..."); // Removed debug log
        copyYtmLinkBtn.disabled = !canCopyYtm;
        copySpotifyLinkBtn.disabled = !canCopySpotify;
        copyInfoBtn.disabled = !canCopyInfo;
        copySpotifyPlaylistBtn.disabled = !canCopySpotifyPlaylist;
        copyYtmPlaylistBtn.disabled = !canCopyYtmPlaylist;
        createYtmPlaylistBtn.disabled = !canCreateYtmPlaylist;
        // console.log("[Popup Debug] Button disabled states set:", { ... }); // Removed debug log

        // Attach listeners directly (no need to clone/replace)
        // console.log("[Popup Debug] Attaching event listeners..."); // Removed debug log
        copyYtmLinkBtn.addEventListener('click', () => handleCopyLinkClick('spotify'));
        copySpotifyLinkBtn.addEventListener('click', () => handleCopyLinkClick('ytm'));
        copyInfoBtn.addEventListener('click', handleCopyInfoClick);
        copySpotifyPlaylistBtn.addEventListener('click', handleCopySpotifyPlaylistTracksClick);
        copyYtmPlaylistBtn.addEventListener('click', handleCopyFullYtmPlaylist);
        createYtmPlaylistBtn.addEventListener('click', handleCreateYtmPlaylistClick);
        // console.log("[Popup Debug] Event listeners attached."); // Removed debug log

        // Set status message
        // console.log("[Popup Debug] Setting status message..."); // Removed debug log
        if (!canCopyYtm && !canCopySpotify && !canCopyInfo && !canCopySpotifyPlaylist && !canCopyYtmPlaylist && !canCreateYtmPlaylist && statusMsg) {
            showStatus(statusMsg, 0);
        } else {
            showStatus("");
        }

        // SessionStorage check removed as creation is now triggered by ytm-library-content.js
    };

    // Initialize the popup state
        initializePopupState().then(async () => { // Make the .then callback async
            // console.log("[Popup Debug] initializePopupState promise resolved successfully."); // Removed debug log

            // --- NEW: Check for playlist creation prompt flag ---
            // console.log("[Popup Debug] Checking for playlist creation prompt flag..."); // Removed debug log
            try {
                const data = await chrome.storage.local.get(['promptCreatePlaylistOnLoad', 'playlistTitleToCreate']); // Keep check
                // console.log("[Popup Debug] Storage data retrieved for flag check:", data); // Removed debug log
                if (data.promptCreatePlaylistOnLoad && data.playlistTitleToCreate) { // Keep check
                    // console.log(`[Popup Debug] Found flag for "${data.playlistTitleToCreate}".`); // Removed debug log
                    // --- DELAYED FLAG REMOVAL ---
                // await chrome.storage.local.remove(['promptCreatePlaylistOnLoad', 'playlistTitleToCreate']);
                // console.log("[Popup Debug] Cleared playlist creation prompt flag.");

                // Check if we are actually on the YTM library page
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                const currentTab = tabs && tabs[0];
                // console.log("[Popup Debug] Current tab info:", currentTab); // Removed debug log
                if (currentTab && currentTab.url && currentTab.url.includes("/library/playlists")) { // Keep check
                    // console.log("[Popup Debug] URL matches YTM library page. Setting timeout for prompt..."); // Removed debug log
                     // Use setTimeout to ensure the popup is fully rendered before showing confirm
                    setTimeout(() => { // Keep timeout
                        // console.log("[Popup Debug] Timeout finished. Showing confirm dialog..."); // Removed debug log
                        if (confirm(`Do you want to create the YouTube Music playlist "${data.playlistTitleToCreate}" now?`)) { // Keep confirm
                            // console.log("[Popup Debug] User confirmed playlist creation."); // Removed debug log
                            // Trigger the creation function directly
                            // Ensure the button is enabled first (it should be if lastSpotifyPlaylistTitle is set)
                            if (!createYtmPlaylistBtn.disabled) { // Keep check
                                // console.log("[Popup Debug] Create button enabled. Calling handleCreateYtmPlaylistClick()."); // Removed debug log
                                handleCreateYtmPlaylistClick();
                            } else {
                                console.warn("Create button was disabled, cannot trigger creation automatically."); // Keep warning
                                showStatus("Cannot auto-create: Create button disabled.", 4000);
                            }
                        } else {
                            // console.log("[Popup Debug] User cancelled playlist creation prompt."); // Removed debug log
                        }
                        // --- REMOVE FLAG AFTER PROMPT ---
                        chrome.storage.local.remove(['promptCreatePlaylistOnLoad', 'playlistTitleToCreate'], () => { // Keep flag removal
                            // console.log("[Popup Debug] Cleared playlist creation prompt flag (after prompt)."); // Removed debug log
                        });
                    }, 100); // Short delay
                } else {
                    // console.log("[Popup Debug] Flag found, but not on YTM library page. Prompt skipped."); // Removed debug log
                     // --- REMOVE FLAG IF NOT ON CORRECT PAGE ---
                    chrome.storage.local.remove(['promptCreatePlaylistOnLoad', 'playlistTitleToCreate'], () => { // Keep flag removal
                         // console.log("[Popup Debug] Cleared playlist creation prompt flag (incorrect page)."); // Removed debug log
                     });
                }
            } else {
                // console.log("[Popup Debug] No playlist creation prompt flag found in storage."); // Removed debug log
            }
        } catch (error) {
            console.error("Error checking/handling playlist creation prompt flag:", error); // Keep error log
            showStatus("Error checking for auto-create prompt.", 4000);
        }
        // --- END NEW LOGIC ---

    }).catch(err => {
        console.error("initializePopupState failed:", err); // Keep error log
        showStatus("Error initializing popup.", 0);
    }); // Run the initialization logic and log completion/failure

    } catch (error) { // ADDED catch block
        console.error("CRITICAL ERROR in DOMContentLoaded listener:", error); // Keep error log
        // Try to display an error message in the popup itself
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
             statusElement.textContent = `CRITICAL ERROR! Check console. ${error.message}`;
        }
    }
}); // End DOMContentLoaded