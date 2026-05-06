// TuneTransporter/service-worker.js

// --- Rule IDs for declarativeNetRequest ---
const RULE_ID_BLOCK_YTM = 1;
const RULE_ID_BLOCK_SPOTIFY = 2;

// Blocked resource types during redirect transit
const BLOCKED_TYPES = ['image', 'media', 'font'];

// Auto-expire timeout for blocking rules (safety net)
const BLOCK_EXPIRE_MS = 30000;

// Track auto-expire timers
const blockTimers = {};

// --- Resource blocking management ---

/**
 * Enables blocking of heavy resources on a target domain.
 * Used during redirect transit to speed up page loads.
 */
function enableBlocking(target) {
    const ruleId = target === 'ytm' ? RULE_ID_BLOCK_YTM : RULE_ID_BLOCK_SPOTIFY;
    const domain = target === 'ytm' ? 'music.youtube.com' : 'open.spotify.com';

    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [ruleId],
        addRules: [{
            id: ruleId,
            priority: 1,
            action: { type: 'block' },
            condition: {
                resourceTypes: BLOCKED_TYPES,
                requestDomains: [domain]
            }
        }]
    }, () => {
        console.log(`TuneTransporter: Blocking ${BLOCKED_TYPES.join('/')} on ${domain}`);
    });

    // Safety: auto-expire after 30s in case unblock message never arrives
    if (blockTimers[target]) clearTimeout(blockTimers[target]);
    blockTimers[target] = setTimeout(() => disableBlocking(target), BLOCK_EXPIRE_MS);
}

/**
 * Disables resource blocking on a target domain.
 * Called when the redirect chain is complete.
 */
function disableBlocking(target) {
    const ruleId = target === 'ytm' ? RULE_ID_BLOCK_YTM : RULE_ID_BLOCK_SPOTIFY;
    const domain = target === 'ytm' ? 'music.youtube.com' : 'open.spotify.com';

    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [ruleId]
    }, () => {
        console.log(`TuneTransporter: Unblocked resources on ${domain}`);
    });

    if (blockTimers[target]) {
        clearTimeout(blockTimers[target]);
        delete blockTimers[target];
    }
}

// --- Message listener for content scripts ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'enableBlocking') {
        enableBlocking(message.target);
        sendResponse({ success: true });
    } else if (message.action === 'disableBlocking') {
        disableBlocking(message.target);
        sendResponse({ success: true });
    }
    return false;
});

// --- Setup defaults on install/update ---
chrome.runtime.onInstalled.addListener((details) => {
    console.log('TuneTransporter: onInstalled -', details.reason);

    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled'], (result) => {
        const defaults = {};
        if (result.spotifyEnabled === undefined) defaults.spotifyEnabled = true;
        if (result.ytmEnabled === undefined) defaults.ytmEnabled = true;

        if (Object.keys(defaults).length > 0) {
            chrome.storage.local.set(defaults, () => {
                console.log('TuneTransporter: Defaults applied:', defaults);
            });
        }
    });

    // Clean up any stale blocking rules from previous sessions
    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [RULE_ID_BLOCK_YTM, RULE_ID_BLOCK_SPOTIFY]
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log('TuneTransporter: Browser startup.');
    // Clean up any stale blocking rules
    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [RULE_ID_BLOCK_YTM, RULE_ID_BLOCK_SPOTIFY]
    });
});