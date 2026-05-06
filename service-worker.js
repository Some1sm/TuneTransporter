// TuneTransporter/service-worker.js

// --- Rule IDs for declarativeNetRequest ---
const RULE_ID_BLOCK_YTM = 1;
const RULE_ID_BLOCK_SPOTIFY = 2;

const BLOCKED_TYPES = ['image', 'media', 'font'];
const BLOCK_EXPIRE_MS = 30000;
const blockTimers = {};

/**
 * Enables blocking of heavy resources on a target domain.
 * Calls onDone when the rules are fully applied.
 */
function enableBlocking(target, onDone) {
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
                initiatorDomains: [domain]
            }
        }]
    }, () => {
        console.log(`TuneTransporter: Blocking ${BLOCKED_TYPES.join('/')} on ${domain}`);
        if (onDone) onDone();
    });

    if (blockTimers[target]) clearTimeout(blockTimers[target]);
    blockTimers[target] = setTimeout(() => disableBlocking(target), BLOCK_EXPIRE_MS);
}

function disableBlocking(target, onDone) {
    const ruleId = target === 'ytm' ? RULE_ID_BLOCK_YTM : RULE_ID_BLOCK_SPOTIFY;
    const domain = target === 'ytm' ? 'music.youtube.com' : 'open.spotify.com';

    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [ruleId]
    }, () => {
        console.log(`TuneTransporter: Unblocked resources on ${domain}`);
        if (onDone) onDone();
    });

    if (blockTimers[target]) {
        clearTimeout(blockTimers[target]);
        delete blockTimers[target];
    }
}

// --- Message listener ---
// Returns true to keep the message channel open for async sendResponse
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'enableBlocking') {
        enableBlocking(message.target, () => sendResponse({ success: true }));
        return true; // keep channel open for async callback
    }
    if (message.action === 'disableBlocking') {
        disableBlocking(message.target, () => sendResponse({ success: true }));
        return true;
    }
    return false;
});

// --- Setup defaults on install ---
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

    // Clean up stale blocking rules
    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [RULE_ID_BLOCK_YTM, RULE_ID_BLOCK_SPOTIFY]
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log('TuneTransporter: Browser startup.');
    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [RULE_ID_BLOCK_YTM, RULE_ID_BLOCK_SPOTIFY]
    });
});