// TuneTransporter/utils.js
// Shared utility functions for content scripts.
// Include guard prevents re-declaration when injected multiple times.

if (typeof window.showFeedback === 'undefined') {

    let feedbackTimeoutId = null;

    /**
     * Displays a temporary feedback toast on the page.
     * @param {string} message - The text to display.
     * @param {number} [duration=5000] - How long the toast stays visible (ms).
     */
    function showFeedback(message, duration = 5000) {
        const existing = document.getElementById('tunetransporter-feedback');
        if (existing) {
            existing.remove();
            if (feedbackTimeoutId) {
                clearTimeout(feedbackTimeoutId);
                feedbackTimeoutId = null;
            }
        }

        const el = document.createElement('div');
        el.id = 'tunetransporter-feedback';
        el.textContent = message;

        Object.assign(el.style, {
            position: 'fixed',
            top: '15px',
            right: '15px',
            backgroundColor: 'rgba(255, 221, 221, 0.95)',
            color: '#8B0000',
            padding: '10px 15px',
            borderRadius: '5px',
            zIndex: '99999',
            fontSize: '14px',
            fontFamily: 'sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            opacity: '0',
            transition: 'opacity 0.3s ease-in-out'
        });

        document.body.appendChild(el);
        setTimeout(() => { el.style.opacity = '1'; }, 10);

        feedbackTimeoutId = setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => {
                if (document.getElementById('tunetransporter-feedback') === el) {
                    document.body.removeChild(el);
                }
                feedbackTimeoutId = null;
            }, 300);
        }, duration);

        el.addEventListener('click', () => {
            if (feedbackTimeoutId) {
                clearTimeout(feedbackTimeoutId);
                feedbackTimeoutId = null;
            }
            el.style.opacity = '0';
            setTimeout(() => {
                if (document.getElementById('tunetransporter-feedback') === el) {
                    document.body.removeChild(el);
                }
            }, 300);
        }, { once: true });
    }

    /**
     * Extracts the primary artist name from a raw string.
     * Strips YTM bullet-point metadata and splits on common separators
     * (comma, ampersand, feat., ft., with, vs.).
     * @param {string|null|undefined} artistString - Raw artist text.
     * @returns {string|null} Cleaned artist name(s) joined by space, or null.
     */
    function processArtistString(artistString) {
        if (!artistString || typeof artistString !== 'string') return null;

        let primary = artistString.trim();

        // Strip YTM metadata after bullet points (e.g. "Artist • Album • 2024")
        if (primary.includes('•')) primary = primary.split('•')[0].trim();
        if (primary.includes('�')) primary = primary.split('�')[0].trim();

        // Split on collaboration separators
        const artists = primary.split(/,\s*|\s*&\s*|\s+(?:feat|ft|with|vs)\.?\s+/i);
        const cleaned = artists.map(a => a.trim()).filter(Boolean);

        return cleaned.length > 0 ? cleaned.join(' ') : null;
    }

    window.tuneTransporterUtilsLoaded = true;
    console.log('TuneTransporter: utils.js loaded.');

} else {
    console.log('TuneTransporter: utils.js already loaded, skipping.');
}