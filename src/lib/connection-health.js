/**
 * Connection Health Monitor
 * Monitors WhatsApp connection health and provides auto-recovery mechanisms
 */

class ConnectionHealthMonitor {
    constructor() {
        this.state = {
            isConnected: false,
            lastConnectedAt: null,
            lastDisconnectedAt: null,
            reconnectAttempts: 0,
            totalReconnects: 0,
            lastMessageSentAt: null,
            lastMessageReceivedAt: null,
            healthCheckInterval: null
        };

        this.options = {
            healthCheckIntervalMs: 30000, // 30 seconds
            maxReconnectAttempts: 10,
            reconnectBackoffMs: 5000,
            messageTimeoutMs: 60000 // 1 minute without messages = warning
        };

        this.callbacks = {
            onHealthy: null,
            onUnhealthy: null,
            onReconnect: null
        };
    }

    /**
     * Mark connection as open
     */
    connectionOpened() {
        this.state.isConnected = true;
        this.state.lastConnectedAt = Date.now();
        this.state.reconnectAttempts = 0;

        console.log('Connection Health: Connection opened');

        if (this.callbacks.onHealthy) {
            this.callbacks.onHealthy();
        }
    }

    /**
     * Mark connection as closed
     * @param {string} reason - Disconnect reason
     */
    connectionClosed(reason = 'unknown') {
        this.state.isConnected = false;
        this.state.lastDisconnectedAt = Date.now();
        this.state.reconnectAttempts++;
        this.state.totalReconnects++;

        console.log(`Connection Health: Connection closed - ${reason}`);

        if (this.callbacks.onUnhealthy) {
            this.callbacks.onUnhealthy(reason);
        }
    }

    /**
     * Record message sent
     */
    messageSent() {
        this.state.lastMessageSentAt = Date.now();
    }

    /**
     * Record message received
     */
    messageReceived() {
        this.state.lastMessageReceivedAt = Date.now();
    }

    /**
     * Start health monitoring
     * @param {Object} sock - WhatsApp socket
     */
    startMonitoring(sock) {
        if (this.state.healthCheckInterval) {
            clearInterval(this.state.healthCheckInterval);
        }

        this.state.healthCheckInterval = setInterval(() => {
            this.performHealthCheck(sock);
        }, this.options.healthCheckIntervalMs);

        console.log('Connection Health: Monitoring started');
    }

    /**
     * Stop health monitoring
     */
    stopMonitoring() {
        if (this.state.healthCheckInterval) {
            clearInterval(this.state.healthCheckInterval);
            this.state.healthCheckInterval = null;
        }

        console.log('Connection Health: Monitoring stopped');
    }

    /**
     * Perform health check
     * @param {Object} sock - WhatsApp socket
     */
    async performHealthCheck(sock) {
        const now = Date.now();
        const health = this.getHealth();

        // Check for message timeout
        if (health.status === 'warning' || health.status === 'critical') {
            console.warn(`Connection Health: Status is ${health.status} - ${health.message}`);
        }

        // Check if socket is still connected
        if (sock && sock.ws && sock.ws.readyState !== 1) { // 1 = WebSocket.OPEN
            console.warn('Connection Health: WebSocket not in OPEN state');
        }
    }

    /**
     * Get connection health status
     * @returns {Object} Health status
     */
    getHealth() {
        const now = Date.now();

        if (!this.state.isConnected) {
            return {
                status: 'critical',
                message: 'Not connected',
                uptime: 0,
                reconnectAttempts: this.state.reconnectAttempts
            };
        }

        const uptime = now - this.state.lastConnectedAt;
        const timeSinceLastMessage = this.state.lastMessageReceivedAt
            ? now - this.state.lastMessageReceivedAt
            : null;

        let status = 'healthy';
        let message = 'Connection is stable';

        if (timeSinceLastMessage && timeSinceLastMessage > this.options.messageTimeoutMs * 2) {
            status = 'critical';
            message = 'No messages received in over 2 minutes';
        } else if (timeSinceLastMessage && timeSinceLastMessage > this.options.messageTimeoutMs) {
            status = 'warning';
            message = 'No messages received in over 1 minute';
        }

        return {
            status,
            message,
            uptime: Math.round(uptime / 1000), // seconds
            uptimeFormatted: this.formatUptime(uptime),
            timeSinceLastMessage: timeSinceLastMessage ? Math.round(timeSinceLastMessage / 1000) : null,
            reconnectAttempts: this.state.reconnectAttempts,
            totalReconnects: this.state.totalReconnects
        };
    }

    /**
     * Format uptime to human readable
     * @param {number} ms - Uptime in milliseconds
     * @returns {string} Formatted uptime
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Should attempt reconnect?
     * @returns {boolean}
     */
    shouldReconnect() {
        return this.state.reconnectAttempts < this.options.maxReconnectAttempts;
    }

    /**
     * Get reconnect delay with exponential backoff
     * @returns {number} Delay in milliseconds
     */
    getReconnectDelay() {
        const delay = this.options.reconnectBackoffMs * Math.pow(2, this.state.reconnectAttempts - 1);
        return Math.min(delay, 60000); // Max 60 seconds
    }

    /**
     * Reset reconnect counter
     */
    resetReconnectCounter() {
        this.state.reconnectAttempts = 0;
    }

    /**
     * Set callback handlers
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Get summary for display
     */
    getSummary() {
        const health = this.getHealth();
        return {
            status: health.status,
            uptime: health.uptimeFormatted,
            totalReconnects: this.state.totalReconnects,
            isConnected: this.state.isConnected
        };
    }
}

// Create singleton instance
const connectionHealthMonitor = new ConnectionHealthMonitor();

module.exports = connectionHealthMonitor;
