// popup.js

document.addEventListener('DOMContentLoaded', function () {
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');

    // Load saved settings
    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled'], function (data) {
        // Spotify Toggle
        if (data.spotifyEnabled === undefined) {
            chrome.storage.local.set({ spotifyEnabled: true });
            spotifyToggle.checked = true;
        } else {
            spotifyToggle.checked = data.spotifyEnabled;
        }

        // YTM Toggle
        if (data.ytmEnabled === undefined) {
            chrome.storage.local.set({ ytmEnabled: true });
            ytmToggle.checked = true;
        } else {
            ytmToggle.checked = data.ytmEnabled;
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