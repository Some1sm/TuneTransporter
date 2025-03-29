// TuneTransporter/service-worker.js

// --- Setup defaults on install/update ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log("TuneTransporter: onInstalled event triggered", details.reason);

    // Initialize default settings if not present
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

        if (Object.keys(defaults).length > 0) {
            chrome.storage.local.set(defaults, () => {
                if (chrome.runtime.lastError) {
                    console.error("TuneTransporter: Error setting default storage:", chrome.runtime.lastError);
                } else {
                    console.log("TuneTransporter: Default settings applied.", defaults);
                }
            });
        }
    });
});


// Optional: Listener for browser startup
chrome.runtime.onStartup.addListener(() => {
    console.log("TuneTransporter: Browser startup detected.");
});