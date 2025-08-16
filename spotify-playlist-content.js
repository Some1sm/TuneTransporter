// TuneTransporter/spotify-playlist-content.js
// This script handles the automated creation, renaming, and population of Spotify playlists.

// --- CONFIGURATION ---

const SETTINGS = {
    timeouts: {
        default: 10000,
        short: 3000,
        long: 15000,
    },
    delays: {
        short: 500,
        medium: 1000,
        long: 3000,
    }
};

const SELECTORS = {
    // Buttons
    createButton: 'button[aria-label="Create"]',
    createPlaylistMenuItem: '#listrow-title-global-create-playlist',
    moreOptionsButton: 'button[data-testid="more-button"]',
    saveButton: 'button[data-testid="playlist-edit-details-save-button"]',
    
    // Inputs
    playlistNameInput: 'input[data-testid="playlist-edit-details-name-input"]',
    playlistDescriptionInput: 'textarea[data-testid="playlist-edit-details-description-input"]',
    playlistSearchInput: 'input[placeholder="Find a playlist"]',

    // Links & Containers
    firstTrackLink: 'div[data-testid="track-list"] a[data-testid="internal-track-link"]',

    // Dynamic selectors (require formatting)
    editDetailsButton: (playlistName) => `button[aria-label="${playlistName} – Edit details"]`,
};

// --- UTILITY FUNCTIONS ---

/**
 * Standardized logging for the script.
 * @param {...any} args - Arguments to log.
 */
const log = (...args) => console.log("TuneTransporter (Spotify):", ...args);

/**
 * Standardized warning for the script.
 * @param {...any} args - Arguments to log as warnings.
 */
const warn = (...args) => console.warn("TuneTransporter (Spotify):", ...args);

/**
 * Standardized error for the script.
 * @param {...any} args - Arguments to log as errors.
 */
const error = (...args) => console.error("TuneTransporter (Spotify):", ...args);


/**
 * Pauses execution for a specified duration.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Checks if an element is currently visible in the viewport and not hidden by styles.
 * @param {Element} el - The element to check.
 * @returns {boolean} True if the element is visible.
 */
function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
    );
}

/**
 * A robust utility to wait for a DOM element based on various conditions.
 * @param {Object} options - The options for finding the element.
 * @param {string} [options.selector] - The CSS selector to find.
 * @param {string} [options.text] - Text content to find within an element.
 * @param {boolean} [options.disappear=false] - If true, waits for the element to disappear.
 * @param {number} [options.timeout=SETTINGS.timeouts.default] - The maximum time to wait.
 * @returns {Promise<Element|null|boolean>} The found element, null if timed out, or boolean for disappear.
 */
function waitForElement({ selector, text, disappear = false, timeout = SETTINGS.timeouts.default }) {
    return new Promise(resolve => {
        let timeoutId = null;

        const checkCondition = () => {
            let element = selector ? document.querySelector(selector) : null;
            if (text) {
                const lowerCaseText = text.toLowerCase();
                // Expanded the list of tags to search within for better compatibility.
                element = Array.from(document.querySelectorAll('span, div, p, h1, h2, button, mark, li, a'))
                               .find(el => el.textContent.trim().toLowerCase().includes(lowerCaseText) && isElementVisible(el));
            }

            if (disappear) {
                if (!element || !isElementVisible(element)) {
                    cleanup();
                    resolve(true);
                }
            } else {
                if (element && isElementVisible(element)) {
                    cleanup();
                    resolve(element);
                }
            }
        };

        const observer = new MutationObserver(checkCondition);

        const cleanup = () => {
            observer.disconnect();
            clearTimeout(timeoutId);
        };

        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        timeoutId = setTimeout(() => {
            cleanup();
            const message = `Timed out waiting for element (${selector || `text: "${text}"`}) ${disappear ? 'to disappear' : 'to appear'}.`;
            warn(message);
            resolve(disappear ? false : null);
        }, timeout);

        checkCondition(); // Initial check
    });
}

/**
 * Simulates a user input event on a field.
 * @param {HTMLInputElement|HTMLTextAreaElement} element - The input element.
 * @param {string} value - The value to set.
 */
function simulateUserInput(element, value) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
}


// --- CHROME STORAGE HELPERS ---

/**
 * Retrieves the current state from chrome.storage.local.
 * @returns {Promise<object>} A promise that resolves with the stored data.
 */
const getStorageState = () => new Promise(resolve => {
    chrome.storage.local.get(['isTuneTransporterAction', 'spotifyPlaylistToCreate', 'spotifyAction', 'currentTrackIndex'], resolve);
});

/**
 * Clears all script-related data from chrome.storage.local.
 */
const clearStorageState = () => {
    log("Clearing script state from storage.");
    chrome.storage.local.remove(['isTuneTransporterAction', 'spotifyPlaylistToCreate', 'spotifyAction', 'currentTrackIndex']);
};

// --- CORE LOGIC ---

/**
 * Clicks the "Create Playlist" button sequence.
 */
async function createNewPlaylist() {
    log("Attempting to create a new playlist...");
    const createButton = await waitForElement({ selector: SELECTORS.createButton });
    if (!createButton) return error("Main 'Create' button not found.");
    
    createButton.click();
    log("Clicked main 'Create' button.");
    await sleep(SETTINGS.delays.short);

    const menuItem = await waitForElement({ selector: SELECTORS.createPlaylistMenuItem });
    const parentButton = menuItem?.closest('button');
    if (!parentButton) return error("'Create a new playlist' menu item not found.");

    parentButton.click();
    log("Clicked 'Create a new playlist' menu item.");
    return true;
}

/**
 * Renames a newly created Spotify playlist.
 * @param {string} newTitle - The desired new title.
 */
async function renamePlaylist(newTitle) {
    log(`Attempting to rename playlist to "${newTitle}"...`);

    // Wait for the page title to reflect the new (default) playlist
    await waitForElement({ text: "My Playlist #" });

    const pageTitle = document.title;
    const defaultName = pageTitle.split(' - playlist by ')[0].trim();
    log(`Detected default playlist name: "${defaultName}"`);

    const moreOptionsButton = await waitForElement({ selector: SELECTORS.moreOptionsButton });
    if (!moreOptionsButton) return error("'More options' button not found for renaming.");
    
    moreOptionsButton.click();
    log("Clicked 'More options' button.");

    const editDetailsMenuItem = await waitForElement({ text: "Edit details" });
    const parentButton = editDetailsMenuItem?.closest('button');
    if (!parentButton) return error("'Edit details' menu item not found.");
    
    parentButton.click();
    log("Clicked 'Edit details' menu item.");
    
    const nameInput = await waitForElement({ selector: SELECTORS.playlistNameInput });
    if (!nameInput) return error("Playlist name input field not found in popup.");
    
    simulateUserInput(nameInput, newTitle);
    log(`Entered new playlist name: "${newTitle}"`);

    const descriptionInput = await waitForElement({ selector: SELECTORS.playlistDescriptionInput, timeout: SETTINGS.timeouts.short });
    if (descriptionInput) {
        simulateUserInput(descriptionInput, `Playlist created by TuneTransporter. Original title: ${newTitle}`);
        log("Entered playlist description.");
    }
    
    const saveButton = await waitForElement({ selector: SELECTORS.saveButton });
    if (!saveButton) return error("Save button not found in popup.");
    
    saveButton.click();
    log("Playlist renamed successfully.");
    return true;
}

/**
 * Adds the current track on the page to a specified playlist.
 * @param {string} playlistName - The name of the playlist to add the track to.
 */
async function addTrackToPlaylist(playlistName) {
    log(`Adding track to playlist "${playlistName}"...`);

    const moreOptionsButton = await waitForElement({ selector: SELECTORS.moreOptionsButton });
    if (!moreOptionsButton) return error("'More options' button for the track not found.");
    
    moreOptionsButton.click();
    log("Clicked track 'More options'.");
    // Removed redundant sleep; waitForElement will handle waiting for the menu item to appear.

    const addToPlaylistButton = (await waitForElement({ text: 'Add to playlist' }))?.closest('button');
    if (!addToPlaylistButton) return error("'Add to playlist' menu item not found.");
    
    addToPlaylistButton.click();
    log("Clicked 'Add to playlist'.");

    const searchInput = await waitForElement({ selector: SELECTORS.playlistSearchInput });
    if (!searchInput) return error("'Find a playlist' search input not found.");
    
    simulateUserInput(searchInput, playlistName);
    log(`Searched for playlist "${playlistName}".`);
    await sleep(SETTINGS.delays.medium); // Wait for search results

    const playlistButton = (await waitForElement({ text: playlistName, selector: 'mark' }))?.closest('button');
    if (!playlistButton) return error(`Playlist "${playlistName}" not found in search results.`);
    
    playlistButton.click();
    log(`Successfully added track to "${playlistName}".`);
    return true;
}

/**
 * On a search results page, finds the first track and clicks it.
 */
async function handleSearchPageAndNavigate() {
    log("Handling search results page.");
    const firstTrackLink = await waitForElement({ selector: SELECTORS.firstTrackLink });
    
    if (firstTrackLink) {
        log("Found first track link, navigating...");
        // The click will trigger a navigation. The orchestrator will handle the state change on the new page.
        firstTrackLink.click();
        return true;
    } else {
        error("Could not find the first track on the search page. Skipping.");
        return false;
    }
}

/**
 * Processes the next track in the list stored in chrome.storage.
 */
async function processNextTrack() {
    const state = await getStorageState();
    const { spotifyPlaylistToCreate, currentTrackIndex } = state;

    if (!spotifyPlaylistToCreate?.tracks) {
        log("No tracks left to process. Finishing task.");
        clearStorageState();
        return;
    }

    const { tracks } = spotifyPlaylistToCreate;
    const index = currentTrackIndex || 0;

    if (index >= tracks.length) {
        log("All tracks processed. Task complete.");
        alert("TuneTransporter: Finished adding all songs to the playlist!");
        clearStorageState();
        return;
    }

    const track = tracks[index];
    log(`Processing track ${index + 1}/${tracks.length}: ${track.title} - ${track.artist}`);

    const searchQuery = `${track.title} ${track.artist}`;
    const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(searchQuery)}/tracks`;

    await chrome.storage.local.set({
        'currentTrackIndex': index + 1,
        'spotifyAction': 'findTrack'
    });
    
    window.location.href = searchUrl;
}

// --- MAIN ORCHESTRATOR ---

/**
 * Main router function that decides what action to take based on the page and stored data.
 */
async function mainOrchestrator() {
    const state = await getStorageState();
    const { isTuneTransporterAction, spotifyPlaylistToCreate, spotifyAction } = state;
    const url = window.location.href;

    if (!isTuneTransporterAction || !url.startsWith("https://open.spotify.com/")) {
        return log("No pending action for this page.");
    }

    try {
        switch (spotifyAction) {
            case undefined: // Initial action: create the playlist
                log(`Starting action to create playlist: "${spotifyPlaylistToCreate.title}"`);
                if (await createNewPlaylist()) {
                    await sleep(SETTINGS.delays.long); // Wait for playlist page to load
                    await renamePlaylist(spotifyPlaylistToCreate.title);
                    await processNextTrack();
                } else {
                    throw new Error("Playlist creation failed.");
                }
                break;

            case 'findTrack':
                // If we're on a search page, our goal is to find and click the track link.
                if (url.includes("/search/")) {
                    if (!await handleSearchPageAndNavigate()) {
                        // If we failed to find the track, skip it and process the next one.
                        warn("Could not navigate to track. Skipping.");
                        await processNextTrack();
                    }
                    // If successful, the click triggers navigation. The script on this page is done.
                }
                // If we're on a track page, it means the navigation from the search page was successful.
                else if (url.includes("/track/")) {
                    log("Successfully navigated to track page. Now adding to playlist.");
                    // Now we perform the 'addTrack' logic.
                    if (await addTrackToPlaylist(spotifyPlaylistToCreate.title)) {
                        log("Waiting for confirmation toast...");
                        await waitForElement({ text: "Added to", timeout: SETTINGS.timeouts.long });
                        log("Confirmation received. Waiting for UI to settle before proceeding.");
                        await waitForElement({ selector: SELECTORS.playlistSearchInput, disappear: true });
                        await sleep(SETTINGS.delays.medium);
                    } else {
                        warn("Failed to add track. It will be skipped.");
                    }
                    // After the add attempt, move to the next track.
                    await processNextTrack();
                } else {
                    warn(`In 'findTrack' action on an unexpected URL: ${url}. Skipping.`);
                    await processNextTrack();
                }
                break;

            case 'addTrack':
                // This state is now mostly a fallback. The main logic flows through 'findTrack'.
                if (url.includes("/track/")) {
                    log("Executing 'addTrack' action as a fallback.");
                     if (await addTrackToPlaylist(spotifyPlaylistToCreate.title)) {
                        await waitForElement({ text: "Added to", timeout: SETTINGS.timeouts.long });
                        await waitForElement({ selector: SELECTORS.playlistSearchInput, disappear: true });
                    }
                    await processNextTrack();
                } else {
                    warn(`In 'addTrack' action on an unexpected URL: ${url}. Skipping.`);
                    await processNextTrack();
                }
                break;

            default:
                warn(`Inconsistent state or unexpected action: "${spotifyAction}". Attempting to recover.`);
                await processNextTrack();
                break;
        }
    } catch (err) {
        error("A critical error occurred in the orchestrator:", err.message);
        error("Aborting the process to prevent further issues.");
        clearStorageState();
        alert("TuneTransporter: An unexpected error occurred and the process had to be stopped. Please try again.");
    }
}

// --- SCRIPT EXECUTION ---
mainOrchestrator();
