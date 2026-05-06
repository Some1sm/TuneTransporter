// popup.js

// --- Main Popup Logic ---
document.addEventListener('DOMContentLoaded', function () {
    const spotifyToggle = document.getElementById('spotifyToggle');
    const ytmToggle = document.getElementById('ytmToggle');
    const autoclickToggle = document.getElementById('autoclickToggle');

    // Load toggle settings
    chrome.storage.local.get(['spotifyEnabled', 'ytmEnabled', 'autoclickEnabled'], function (data) {
        spotifyToggle.checked = data.spotifyEnabled !== false;
        ytmToggle.checked = data.ytmEnabled !== false;
        autoclickToggle.checked = data.autoclickEnabled !== false;
    });

    // Add toggle SAVE listeners
    spotifyToggle.addEventListener('change', function () {
        chrome.storage.local.set({ spotifyEnabled: spotifyToggle.checked });
    });
    ytmToggle.addEventListener('change', function () {
        chrome.storage.local.set({ ytmEnabled: ytmToggle.checked });
    });
    autoclickToggle.addEventListener('change', function () {
        chrome.storage.local.set({ autoclickEnabled: autoclickToggle.checked });
    });
}); // End DOMContentLoaded