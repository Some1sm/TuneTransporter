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

// --- Listener for Tab Updates (Navigation) ---
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // console.log(`[Service Worker] tabs.onUpdated triggered for tab ${tabId}. ChangeInfo:`, changeInfo, "Tab URL:", tab?.url); // Removed debug log

    // Check if the tab finished loading and the URL is the YTM library page
    if (changeInfo.status === 'complete' && tab?.url?.startsWith("https://music.youtube.com/library/playlists")) { // Made URL check more specific
        // console.log(`[Service Worker] Tab ${tabId} updated to YTM library page: ${tab.url}`); // Removed debug log
        // console.log(`[Service Worker] Detected YTM library page load complete for tab ${tabId}.`); // Removed debug log
        // Check storage for the trigger flag and track data
        // console.log(`[Service Worker] Attempting to send message to tab ${tabId}...`); // Removed debug log
        try {
            // console.log("[Service Worker] Attempting to get data from storage..."); // Removed debug log
            const data = await chrome.storage.local.get(['triggerYtmPrompt', 'playlistTitleToCreate', 'spotifyTracks']);
            console.log("[Service Worker] Storage data retrieved:", data);

            // Ensure all necessary data is present
            if (data.triggerYtmPrompt && data.playlistTitleToCreate && data.spotifyTracks) {
                console.log(`[Service Worker] Found trigger flag and tracks for "${data.playlistTitleToCreate}". Removing flag and sending message to tab ${tabId}.`);

                // Remove the trigger data first to prevent multiple triggers
                // console.log("[Service Worker] Attempting to remove flags from storage..."); // Removed debug log
                await chrome.storage.local.remove(['triggerYtmPrompt', 'playlistTitleToCreate', 'spotifyTracks']);
                // console.log("[Service Worker] Flags removed from storage."); // Removed debug log

                // Send message to the content script on the YTM library page
                try {
                    await chrome.tabs.sendMessage(tabId, {
                        action: "showCreatePromptAndPrepareTracks", // New action name
                        playlistTitle: data.playlistTitleToCreate,
                        tracks: data.spotifyTracks // Send tracks
                    });
                    console.log(`[Service Worker] Message "showCreatePromptAndPrepareTracks" sent successfully to tab ${tabId}.`);
                } catch (error) {
                    // This error often happens if the content script isn't ready yet or wasn't injected.
                    console.error(`[Service Worker] Error sending message to tab ${tabId}:`, error); // Log the full error
                    console.warn(`[Service Worker] Ensure content scripts (utils.js, ytm-playlist-content.js, ytm-library-content.js) are registered for ${tab.url} and listening for 'showCreatePromptAndPrepareTracks'.`);
                }

            } else {
                console.log("[Service Worker] Trigger flag or track data missing from storage.");
            }
        } catch (error) {
            console.error("[Service Worker] Error accessing storage or sending message:", error);
        }
    }
});

// --- Listener for enabling/disabling rules ---
const IMAGE_BLOCKING_RULESET_ID = "ruleset_1";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "enableImageBlocking") {
        console.log("[Service Worker] Enabling image blocking ruleset.");
        chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: [IMAGE_BLOCKING_RULESET_ID]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("[Service Worker] Error enabling ruleset:", chrome.runtime.lastError);
            } else {
                console.log("[Service Worker] Image blocking ruleset enabled.");
            }
        });
        // Optional: Send response back if needed
        // sendResponse({ success: true });
        return true; // Indicate async potential if using sendResponse
    } else if (message.action === "disableImageBlocking") {
        console.log("[Service Worker] Disabling image blocking ruleset.");
        chrome.declarativeNetRequest.updateEnabledRulesets({
            disableRulesetIds: [IMAGE_BLOCKING_RULESET_ID]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("[Service Worker] Error disabling ruleset:", chrome.runtime.lastError);
            } else {
                console.log("[Service Worker] Image blocking ruleset disabled.");
            }
        });
        // Optional: Send response back if needed
        // sendResponse({ success: true });
        return true; // Indicate async potential if using sendResponse
    }
    // Return false if the message isn't handled by this listener
    return false;
});