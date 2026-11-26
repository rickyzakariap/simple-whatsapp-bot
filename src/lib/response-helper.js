/**
 * Response Helper Utility
 * Standardized response formatting for WhatsApp bot commands
 */

/**
 * Format error message for user display
 * @param {string} message - Error message
 * @param {string} [details] - Optional error details
 * @returns {string} Formatted error message
 */
function formatError(message, details = null) {
    let text = `❌ ${message}`;
    if (details) {
        text += `\n_${details}_`;
    }
    return text;
}

/**
 * Format success message for user display
 * @param {string} message - Success message
 * @returns {string} Formatted success message
 */
function formatSuccess(message) {
    return `✅ ${message}`;
}

/**
 * Format warning message for user display
 * @param {string} message - Warning message
 * @returns {string} Formatted warning message
 */
function formatWarning(message) {
    return `⚠️ ${message}`;
}

/**
 * Format info message for user display
 * @param {string} message - Info message
 * @returns {string} Formatted info message
 */
function formatInfo(message) {
    return `ℹ️ ${message}`;
}

/**
 * Format loading/processing message
 * @param {string} message - Loading message
 * @returns {string} Formatted loading message
 */
function formatLoading(message) {
    return `⏳ ${message}`;
}

/**
 * Validate required arguments
 * @param {Array} args - Command arguments
 * @param {number} minArgs - Minimum required arguments
 * @param {string} usage - Usage example
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateArgs(args, minArgs, usage) {
    if (args.length < minArgs) {
        return {
            valid: false,
            error: formatError('Missing arguments', `Usage: ${usage}`)
        };
    }
    return { valid: true };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid YouTube URL
 */
function isValidYouTubeUrl(url) {
    try {
        const link = new URL(url);
        if (link.protocol !== 'https:' || link.username || link.password || link.port) return false;
        if (link.hostname === 'youtu.be') return /^\/[\w-]{11}\/?$/.test(link.pathname);
        if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(link.hostname)) return false;
        if (link.pathname === '/watch') {
            const ids = link.searchParams.getAll('v');
            return ids.length === 1 && /^[\w-]{11}$/.test(ids[0]);
        }
        return /^\/(?:shorts|live)\/[\w-]{11}\/?$/.test(link.pathname);
    } catch {
        return false;
    }
}

/**
 * Sanitize user input (remove potential injections)
 * @param {string} input - User input
 * @param {number} [maxLength=1000] - Maximum allowed length
 * @returns {string} Sanitized input
 */
function sanitizeInput(input, maxLength = 1000) {
    if (!input || typeof input !== 'string') return '';
    return input.trim().slice(0, maxLength);
}

/**
 * Send error response to user
 * @param {Object} sock - WhatsApp socket
 * @param {string} jid - Chat JID
 * @param {string} message - Error message
 * @param {Object} [quotedMsg] - Message to quote
 */
async function sendError(sock, jid, message, quotedMsg = null) {
    const options = quotedMsg ? { quoted: quotedMsg } : {};
    await sock.sendMessage(jid, { text: formatError(message) }, options);
}

/**
 * Send success response to user
 * @param {Object} sock - WhatsApp socket
 * @param {string} jid - Chat JID
 * @param {string} message - Success message
 * @param {Object} [quotedMsg] - Message to quote
 */
async function sendSuccess(sock, jid, message, quotedMsg = null) {
    const options = quotedMsg ? { quoted: quotedMsg } : {};
    await sock.sendMessage(jid, { text: formatSuccess(message) }, options);
}

/**
 * Send loading response to user
 * @param {Object} sock - WhatsApp socket
 * @param {string} jid - Chat JID
 * @param {string} message - Loading message
 * @param {Object} [quotedMsg] - Message to quote
 */
async function sendLoading(sock, jid, message, quotedMsg = null) {
    const options = quotedMsg ? { quoted: quotedMsg } : {};
    await sock.sendMessage(jid, { text: formatLoading(message) }, options);
}

module.exports = {
    formatError,
    formatSuccess,
    formatWarning,
    formatInfo,
    formatLoading,
    validateArgs,
    isValidUrl,
    isValidYouTubeUrl,
    sanitizeInput,
    sendError,
    sendSuccess,
    sendLoading
};
