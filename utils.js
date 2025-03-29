// TuneTransporter/utils.js

// Shared utility functions for TuneTransporter content scripts

let feedbackTimeoutId = null; // Keep track of the timeout for the feedback message

/**
 * Displays a temporary feedback message overlay on the page.
 * Removes any existing feedback message first.
 * @param {string} message The text content of the feedback message.
 * @param {number} [duration=5000] The duration in milliseconds before the message fades out.
 */
function showFeedback(message, duration = 5000) {
    // Remove any existing feedback message instantly
    const existingFeedback = document.getElementById('tunetransporter-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
        if (feedbackTimeoutId) {
            clearTimeout(feedbackTimeoutId);
            feedbackTimeoutId = null;
        }
    }

    // Create the feedback element
    const feedbackDiv = document.createElement('div');
    feedbackDiv.id = 'tunetransporter-feedback';
    feedbackDiv.textContent = message;

    // Basic styling - feel free to customize
    Object.assign(feedbackDiv.style, {
        position: 'fixed',
        top: '15px',
        right: '15px',
        backgroundColor: 'rgba(255, 221, 221, 0.95)', // Light red background
        color: '#8B0000', // Dark red text
        padding: '10px 15px',
        borderRadius: '5px',
        zIndex: '99999', // Ensure it's on top
        fontSize: '14px',
        fontFamily: 'sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        opacity: '0', // Start hidden for fade-in
        transition: 'opacity 0.3s ease-in-out'
    });

    // Add to page
    document.body.appendChild(feedbackDiv);

    // Trigger fade-in after append (allows transition to work)
    setTimeout(() => {
        feedbackDiv.style.opacity = '1';
    }, 10);


    // Set timeout to fade out and remove
    feedbackTimeoutId = setTimeout(() => {
        feedbackDiv.style.opacity = '0';
        // Remove from DOM after fade-out completes
        setTimeout(() => {
            // Check if element still exists in DOM before trying removal
            if (document.getElementById('tunetransporter-feedback') === feedbackDiv) {
                document.body.removeChild(feedbackDiv);
            }
            feedbackTimeoutId = null;
        }, 300); // Matches the transition duration
    }, duration);

    // Optional: Allow clicking the message to dismiss it early
    feedbackDiv.addEventListener('click', () => {
        if (feedbackTimeoutId) {
            clearTimeout(feedbackTimeoutId);
            feedbackTimeoutId = null;
        }
        feedbackDiv.style.opacity = '0';
        setTimeout(() => {
            // Check if element still exists in DOM before trying removal
            if (document.getElementById('tunetransporter-feedback') === feedbackDiv) {
                document.body.removeChild(feedbackDiv);
            }
        }, 300);
    }, { once: true }); // Remove listener after first click
}