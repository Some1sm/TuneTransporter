// popup.js

document.addEventListener('DOMContentLoaded', function () {
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');
    // const ytmFallbackToggle = document.getElementById('ytmFallbackToggle'); // REMOVE

    // Load saved settings
    // Remove 'ytmFallbackEnabled'
    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled'], function (data) {
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

        // Remove Fallback Toggle logic
        // // YTM Fallback Toggle
        // ytmFallbackToggle.checked = data.ytmFallbackEnabled === true;
        // if (data.ytmFallbackEnabled === undefined) {
        //     chrome.storage.local.set({ ytmFallbackEnabled: false });
        // }
    });

    // Save settings on change
    spotifyToggle.addEventListener('change', function () {
        chrome.storage.local.set({ spotifyEnabled: spotifyToggle.checked });
    });

    ytmToggle.addEventListener('change', function () {
        chrome.storage.local.set({ ytmEnabled: ytmToggle.checked });
    });

    // Remove Fallback Toggle listener
    // ytmFallbackToggle.addEventListener('change', function () {
    //     chrome.storage.local.set({ ytmFallbackEnabled: ytmFallbackToggle.checked });
    // });
});