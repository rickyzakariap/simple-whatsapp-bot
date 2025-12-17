/**
 * Fallback Download APIs for Facebook and Instagram
 * Uses alternative API endpoints when abot-scraper fails
 */

const axios = require('axios');

class FallbackDownloader {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    /**
     * Facebook Video Downloader using alternative API
     * @param {string} url - Facebook video URL
     * @returns {Promise<Object>} - Download result
     */
    async facebookDownload(url) {
        try {
            // Try API 1: snapsave.app style
            const response = await axios.post('https://v3.snapsave.io/api/ajaxSearch',
                `q=${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': this.userAgent,
                        'Origin': 'https://snapsave.io',
                        'Referer': 'https://snapsave.io/'
                    },
                    timeout: 30000
                }
            );

            if (response.data && response.data.data) {
                // Parse the HTML response to get video URLs
                const html = response.data.data;
                const hdMatch = html.match(/href="(https?:\/\/[^"]+)" class[^>]*>HD/);
                const sdMatch = html.match(/href="(https?:\/\/[^"]+)" class[^>]*>SD/);

                const videoUrl = hdMatch ? hdMatch[1] : (sdMatch ? sdMatch[1] : null);

                if (videoUrl) {
                    return {
                        status: 200,
                        result: {
                            videoUrl: videoUrl,
                            hd: hdMatch ? hdMatch[1] : null,
                            sd: sdMatch ? sdMatch[1] : null
                        }
                    };
                }
            }

            return { status: false, msg: 'Could not extract video URL' };
        } catch (error) {
            console.error('Fallback FB download error:', error.message);
            return { status: false, msg: error.message };
        }
    }

    /**
     * Instagram Post/Reel Downloader using alternative API
     * @param {string} url - Instagram post URL
     * @returns {Promise<Object>} - Download result
     */
    async instagramDownload(url) {
        try {
            // Try API: snapinsta style
            const response = await axios.post('https://v3.saveig.app/api/ajaxSearch',
                `q=${encodeURIComponent(url)}&t=media&lang=en`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': this.userAgent,
                        'Origin': 'https://saveig.app',
                        'Referer': 'https://saveig.app/en'
                    },
                    timeout: 30000
                }
            );

            if (response.data && response.data.data) {
                const html = response.data.data;
                const mediaUrls = [];

                // Extract download links
                const downloadMatches = html.matchAll(/href="(https?:\/\/[^"]+\.(mp4|jpg|jpeg|png)[^"]*)"/g);
                for (const match of downloadMatches) {
                    const isVideo = match[2] === 'mp4';
                    mediaUrls.push({
                        url: match[1],
                        type: isVideo ? 'video' : 'image'
                    });
                }

                if (mediaUrls.length > 0) {
                    return {
                        status: 200,
                        result: mediaUrls
                    };
                }
            }

            return { status: false, msg: 'Could not extract media URLs' };
        } catch (error) {
            console.error('Fallback IG download error:', error.message);
            return { status: false, msg: error.message };
        }
    }
}

// Export singleton instance
const fallbackDownloader = new FallbackDownloader();

module.exports = fallbackDownloader;
module.exports.FallbackDownloader = FallbackDownloader;
