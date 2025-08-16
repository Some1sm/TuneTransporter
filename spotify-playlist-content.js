// TuneTransporter/spotify-playlist-content.js
// This script will handle the automated creation and renaming of Spotify playlists.

console.log("TuneTransporter (Spotify): Playlist content script loaded.");

// --- UTILITY FUNCTIONS ---

/**
 * Waits for a specific element to appear in the DOM.
 * @param {string} selector - The CSS selector of the element.
 * @param {number} timeout - The maximum time to wait in milliseconds.
 * @returns {Promise<Element|null>} A promise that resolves with the element or null if not found.
 */
function waitForElement(selector, timeout = 10000) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }
        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}

/**
 * Finds an element containing specific text.
 * @param {string} tag - The tag of the element to search for (e.g., 'button', 'span').
 * @param {string} text - The text content to match.
 * @returns {Element|null} The found element or null.
 */
function getElementByText(tag, text) {
    return Array.from(document.querySelectorAll(tag)).find(el => el.textContent.trim() === text);
}

// --- CORE LOGIC ---

/**
 * Clicks the "Create Playlist" button on Spotify.
 */
async function createNewPlaylist() {
    // 1. Click the main 'Create' button first to reveal the playlist option
    const createButton = await waitForElement('button[aria-label="Create"]');
    if (!createButton) {
        console.error("TuneTransporter: Main 'Create' button not found.");
        return false;
    }
    createButton.click();
    console.log("TuneTransporter: Clicked main 'Create' button.");

    // Brief delay to allow the next menu item to appear
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Find the "Playlist" menu item by its specific ID and then find the parent button
    const playlistTitleElement = await waitForElement('#listrow-title-global-create-playlist');
    if (playlistTitleElement) {
        const createPlaylistMenuItem = playlistTitleElement.closest('button');
        if (createPlaylistMenuItem) {
            createPlaylistMenuItem.click();
            console.log("TuneTransporter: Clicked 'Create a new playlist' menu item.");
            return true;
        }
    }

    console.error("TuneTransporter: 'Create a new playlist' menu item not found.");
    return false;
}

/**
 * Renames a newly created Spotify playlist.
 * @param {string} newTitle - The desired new title for the playlist.
 */
async function renamePlaylist(newTitle) {
    // 1. Get the default playlist name from the page title
    await waitForElement('h1'); // Wait for the page to likely be loaded
    const pageTitle = document.title;
    const titleParts = pageTitle.split(' - playlist by ');
    if (titleParts.length < 1) {
        console.error("TuneTransporter: Could not parse playlist name from page title:", pageTitle);
        return;
    }
    const defaultName = titleParts[0].trim();
    console.log(`TuneTransporter: Detected default playlist name from page title: "${defaultName}"`);

    // 2. Try to click the edit button directly (Primary Method)
    let editButton = await waitForElement(`button[aria-label="${defaultName} – Edit details"]`, 2000); // Shorter timeout

    if (editButton) {
        console.log("TuneTransporter: Found edit button via primary method.");
        editButton.click();
    } else {
        // Fallback Method: Use the 'More options' menu
        console.log("TuneTransporter: Primary edit button not found. Trying fallback method...");
        const moreOptionsButton = await waitForElement(`button[data-testid="more-button"]`);
        if (!moreOptionsButton) {
            console.error("TuneTransporter: 'More options' button not found for fallback.");
            return;
        }
        moreOptionsButton.click();
        console.log("TuneTransporter: Clicked 'More options' button.");

        // Wait for the "Edit details" menu item to appear
        const editDetailsMenuItem = await waitForElement('button span:contains("Edit details")', 3000);
        if (editDetailsMenuItem) {
             const parentButton = editDetailsMenuItem.closest('button');
             if(parentButton) {
                parentButton.click();
                console.log("TuneTransporter: Clicked 'Edit details' from context menu.");
             } else {
                console.error("TuneTransporter: Could not find parent button for 'Edit details' menu item.");
                return;
             }
        } else {
            console.error("TuneTransporter: 'Edit details' menu item not found in context menu.");
            return;
        }
    }
    
    console.log("TuneTransporter: Proceeding to edit playlist name.");

    // 3. Wait for the edit details popup and get the input field
    const nameInput = await waitForElement('input[data-testid="playlist-edit-details-name-input"]');
    if (!nameInput) {
        console.error("TuneTransporter: Playlist name input field not found in popup.");
        return;
    }
    console.log("TuneTransporter: Found name input field.");

    // 4. Enter the new playlist title and description
    nameInput.value = newTitle;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log(`TuneTransporter: Entered new playlist name: "${newTitle}"`);

    const descriptionInput = await waitForElement('textarea[data-testid="playlist-edit-details-description-input"]');
    if (descriptionInput) {
        descriptionInput.value = newTitle;
        descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`TuneTransporter: Entered new playlist description: "${newTitle}"`);
    } else {
        console.log("TuneTransporter: Description input field not found (optional).");
    }

    await new Promise(resolve => setTimeout(resolve, 200)); // Short delay for UI update

    // 5. Click the Save button
    const saveButton = await waitForElement('button[data-testid="playlist-edit-details-save-button"]');
    if (!saveButton) {
        console.error("TuneTransporter: Save button not found in popup.");
        return;
    }
    saveButton.click();
    console.log("TuneTransporter: Clicked save button.");
}

/**
 * Main function to orchestrate the playlist creation and renaming process.
 */
async function orchestratePlaylistCreation() {
    chrome.storage.local.get(['isTuneTransporterAction', 'spotifyPlaylistToCreate'], async (data) => {
        if (chrome.runtime.lastError) {
            console.error("TuneTransporter: Error getting data from storage:", chrome.runtime.lastError);
            return;
        }

        if (data.isTuneTransporterAction && data.spotifyPlaylistToCreate?.title) {
            console.log(`TuneTransporter: Detected action to create playlist: "${data.spotifyPlaylistToCreate.title}"`);
            
            // Clean up storage immediately to prevent re-running
            chrome.storage.local.remove(['isTuneTransporterAction', 'spotifyPlaylistToCreate'], () => {
                console.log("TuneTransporter: Cleared action flags from storage.");
            });

            // Proceed with automation
            const creationSuccess = await createNewPlaylist();
            if (creationSuccess) {
                // Wait for navigation and elements to appear on the new playlist page
                await new Promise(resolve => setTimeout(resolve, 3000));
                await renamePlaylist(data.spotifyPlaylistToCreate.title);
            } else {
                console.error("TuneTransporter: Failed to initiate playlist creation.");
            }
        } else {
            console.log("TuneTransporter: No pending action found in storage.");
        }
    });
}

// --- SCRIPT EXECUTION ---
// Run the orchestration function when the script is loaded
orchestratePlaylistCreation();
