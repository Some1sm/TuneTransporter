// TuneTransporter/service-worker.js

const SPOTIFY_CONTEXT_MENU_ID = "spotifyToYtmContextMenu"; // Keep these even if not used now
const YTM_CONTEXT_MENU_ID = "ytmToSpotifyContextMenu";     // in case context menu is added later

// --- Function to create context menus (Currently unused but harmless to keep) ---
function setupContextMenus() {
    chrome.contextMenus.removeAll(() => { /* ... potentially add menus later ... */ });
}

// --- Setup menus and defaults on install/update ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log("TuneTransporter: onInstalled event triggered", details.reason);
    // setupContextMenus();

    // Initialize default settings if not present
    // Remove 'ytmFallbackEnabled'
    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled'], (result) => {
        const defaults = {};
        if (result.spotifyEnabled === undefined) {
            defaults.spotifyEnabled = true;
            console.log("TuneTransporter: Initializing spotifyEnabled to true");
        }
        if (result.ytmEnabled === undefined) {
            defaults.ytmEnabled = true;
            console.log("TuneTransporter: Initializing ytmEnabled to true");
        }
        // Remove Fallback default init
        // if (result.ytmFallbackEnabled === undefined) {
        //     defaults.ytmFallbackEnabled = false;
        //     console.log("TuneTransporter: Initializing ytmFallbackEnabled to false");
        // }

        if (Object.keys(defaults).length > 0) {
            chrome.storage.local.set(defaults, () => {
                if (chrome.runtime.lastError) { /* ... error handling ... */ }
                else { console.log("TuneTransporter: Default settings applied.", defaults); }
            });
        }
    });
});


// Optional: Listener for browser startup
chrome.runtime.onStartup.addListener(() => {
    console.log("TuneTransporter: Browser startup detected.");
});