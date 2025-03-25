// popup.js

document.addEventListener('DOMContentLoaded', function () {
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');

    // Load saved settings
    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled'], function (data) {
        // Spotify Toggle
        // Default to true if undefined
        spotifyToggle.checked = data.spotifyEnabled !== false;
        // Ensure storage reflects the default if it was undefined
        if (data.spotifyEnabled === undefined) {
            chrome.storage.local.set({ spotifyEnabled: true });
        }


        // YTM Toggle
        // Default to true if undefined
        ytmToggle.checked = data.ytmEnabled !== false;
        // Ensure storage reflects the default if it was undefined
        if (data.ytmEnabled === undefined) {
            chrome.storage.local.set({ ytmEnabled: true });
        }
    });

    // Save settings on change
    spotifyToggle.addEventListener('change', function () {
        chrome.storage.local.set({ spotifyEnabled: spotifyToggle.checked });
    });

    ytmToggle.addEventListener('change', function () {
        chrome.storage.local.set({ ytmEnabled: ytmToggle.checked });
    });
});