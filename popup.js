// popup.js

// --- Main Popup Logic ---
document.addEventListener('DOMContentLoaded', function () {
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');

    // Load toggle settings
    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled'], function (data) {
        spotifyToggle.checked = data.spotifyEnabled !== false;
        ytmToggle.checked = data.ytmEnabled !== false;
    });

    // Add toggle SAVE listeners
    spotifyToggle.addEventListener('change', function () {
        chrome.storage.local.set({ spotifyEnabled: spotifyToggle.checked });
    });
    ytmToggle.addEventListener('change', function () {
        chrome.storage.local.set({ ytmEnabled: ytmToggle.checked });
    });
}); // End DOMContentLoaded