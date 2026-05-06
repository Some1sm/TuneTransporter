// TuneTransporter/service-worker.js

// --- Rule IDs for declarativeNetRequest ---
const RULE_ID_BLOCK_YTM = 1;
const RULE_ID_BLOCK_SPOTIFY = 2;
const RULE_ID_BLOCK_SPOTIFY_CDN = 3;

const BLOCKED_TYPES = ['image', 'media', 'font'];
const BLOCK_EXPIRE_MS = 30000;
const blockTimers = {};

// Known Spotify image CDN domains
const SPOTIFY_CDN_DOMAINS = [
    'i.scdn.co',
    'mosaic.scdn.co',
    'dailymix-images.scdn.co',
    'lineup-img.scdn.co',
    'seed-mix-image.spotifycdn.com',
    'blend-playlist-covers.spotifycdn.com',
    'image-cdn-fa.spotifycdn.com',
    'image-cdn-ak.spotifycdn.com',
    'wrapped-images.spotifycdn.com',
    'thisis-images.spotifycdn.com'
];

/**
 * Enables blocking of heavy resources for a target platform.
 * Calls onDone when rules are fully applied.
 */
function enableBlocking(target, onDone) {
    let addRules = [];
    let removeIds = [];

    if (target === 'ytm') {
        removeIds = [RULE_ID_BLOCK_YTM];
        addRules = [{
            id: RULE_ID_BLOCK_YTM,
            priority: 1,
            action: { type: 'block' },
            condition: {
                resourceTypes: BLOCKED_TYPES,
                initiatorDomains: ['music.youtube.com']
            }
        }];
    } else if (target === 'spotify') {
        removeIds = [RULE_ID_BLOCK_SPOTIFY, RULE_ID_BLOCK_SPOTIFY_CDN];
        addRules = [
            // Block by initiator domain (catches any CDN requests from the page)
            {
                id: RULE_ID_BLOCK_SPOTIFY,
                priority: 1,
                action: { type: 'block' },
                condition: {
                    resourceTypes: BLOCKED_TYPES,
                    initiatorDomains: ['open.spotify.com']
                }
            },
            // Also block known Spotify CDN domains directly (fallback)
            {
                id: RULE_ID_BLOCK_SPOTIFY_CDN,
                priority: 1,
                action: { type: 'block' },
                condition: {
                    resourceTypes: BLOCKED_TYPES,
                    requestDomains: SPOTIFY_CDN_DOMAINS
                }
            }
        ];
    }

    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: removeIds,
        addRules: addRules
    }, () => {
        const domain = target === 'ytm' ? 'music.youtube.com' : 'open.spotify.com';
        console.log(`TuneTransporter: Blocking resources for ${domain}`);
        if (onDone) onDone();
    });

    if (blockTimers[target]) clearTimeout(blockTimers[target]);
    blockTimers[target] = setTimeout(() => disableBlocking(target), BLOCK_EXPIRE_MS);
}

function disableBlocking(target, onDone) {
    let removeIds;
    if (target === 'ytm') {
        removeIds = [RULE_ID_BLOCK_YTM];
    } else {
        removeIds = [RULE_ID_BLOCK_SPOTIFY, RULE_ID_BLOCK_SPOTIFY_CDN];
    }

    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: removeIds
    }, () => {
        const domain = target === 'ytm' ? 'music.youtube.com' : 'open.spotify.com';
        console.log(`TuneTransporter: Unblocked resources for ${domain}`);
        if (onDone) onDone();
    });

    if (blockTimers[target]) {
        clearTimeout(blockTimers[target]);
        delete blockTimers[target];
    }
}

// --- Message listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'enableBlocking') {
        enableBlocking(message.target, () => sendResponse({ success: true }));
        return true;
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

    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [RULE_ID_BLOCK_YTM, RULE_ID_BLOCK_SPOTIFY, RULE_ID_BLOCK_SPOTIFY_CDN]
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log('TuneTransporter: Browser startup.');
    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [RULE_ID_BLOCK_YTM, RULE_ID_BLOCK_SPOTIFY, RULE_ID_BLOCK_SPOTIFY_CDN]
    });
});