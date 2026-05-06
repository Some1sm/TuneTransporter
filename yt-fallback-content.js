// TuneTransporter/yt-fallback-content.js
// Fallback extraction from www.youtube.com when YTM watch page extraction fails.
// Only activates when URL hash is #tunetransporter-fallback.

const YT_FALLBACK_MAX_RETRIES = 5;
const YT_FALLBACK_RETRY_DELAY_MS = 500;

if (window.location.hash === '#tunetransporter-fallback') {
    try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {
        console.warn('TuneTransporter Fallback: Could not remove hash from URL.', e);
    }

    chrome.storage.local.get('ytmEnabled', (result) => {
        if (result.ytmEnabled === false) return;

        let currentRetry = 0;
        let done = false;

        function attemptExtraction() {
            if (done) return;

            let videoTitle = null;
            let channelName = null;

            try {
                // Extract video title from document.title
                const raw = document.title;
                if (typeof raw === 'string' && raw.trim() && raw.trim().toLowerCase() !== 'youtube') {
                    videoTitle = raw.replace(/^\(\d+\)\s*/, '').replace(/\s*-\s*YouTube$/, '').trim() || null;
                }

                // Extract channel name from DOM
                const linkEl = document.querySelector('#channel-name yt-formatted-string#text a');
                const textEl = document.querySelector('#channel-name yt-formatted-string#text');
                if (linkEl?.textContent?.trim()) {
                    channelName = linkEl.textContent.trim();
                } else if (textEl?.title?.trim()) {
                    channelName = textEl.title.trim();
                }

                // Redirect if both found
                if (videoTitle && channelName) {
                    done = true;
                    const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(videoTitle + ' ' + channelName)}`;
                    window.location.href = searchUrl;
                    return;
                }

                // Retry or give up
                currentRetry++;
                if (currentRetry < YT_FALLBACK_MAX_RETRIES) {
                    setTimeout(attemptExtraction, YT_FALLBACK_RETRY_DELAY_MS);
                } else {
                    done = true;
                    console.warn(`TuneTransporter Fallback: Failed after ${YT_FALLBACK_MAX_RETRIES} attempts.`);
                }
            } catch (error) {
                done = true;
                console.error('TuneTransporter Fallback: Extraction error:', error);
            }
        }

        attemptExtraction();
    });
}