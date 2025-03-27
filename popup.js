// popup.js

document.addEventListener('DOMContentLoaded', function () {
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');
    const ytmFallbackToggle = document.getElementById('ytmFallbackToggle'); // Get the new toggle

    // Load saved settings
    // Add 'ytmFallbackEnabled' to the keys we retrieve
    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled', 'ytmFallbackEnabled'], function (data) {
        // Spotify Toggle
        spotifyToggle.checked = data.spotifyEnabled !== false; // Default true
        if (data.spotifyEnabled === undefined) {
            chrome.storage.local.set({ spotifyEnabled: true });
        }

        // YTM Toggle
        ytmToggle.checked = data.ytmEnabled !== false; // Default true
        if (data.ytmEnabled === undefined) {
            chrome.storage.local.set({ ytmEnabled: true });
        }

        // YTM Fallback Toggle
        // Default to FALSE if undefined
        ytmFallbackToggle.checked = data.ytmFallbackEnabled === true;
        // Ensure storage reflects the default (false) if it was undefined
        if (data.ytmFallbackEnabled === undefined) {
            chrome.storage.local.set({ ytmFallbackEnabled: false });
        }
    });

    // Save settings on change
    spotifyToggle.addEventListener('change', function () {
        chrome.storage.local.set({ spotifyEnabled: spotifyToggle.checked });
    });

    ytmToggle.addEventListener('change', function () {
        chrome.storage.local.set({ ytmEnabled: ytmToggle.checked });
    });

    // Add listener for the new fallback toggle
    ytmFallbackToggle.addEventListener('change', function () {
        chrome.storage.local.set({ ytmFallbackEnabled: ytmFallbackToggle.checked });
    });
});