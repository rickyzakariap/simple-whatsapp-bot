/**
 * Message Queue System
 * Handles high-traffic message processing with rate limiting and priority queuing
 */

class MessageQueue {
    constructor(options = {}) {
        this.queue = [];
        this.processing = false;
        this.options = {
            maxQueueSize: options.maxQueueSize || 100,
            processDelay: options.processDelay || 100, // ms between messages
            maxConcurrent: options.maxConcurrent || 3,
            timeout: options.timeout || 30000, // 30 second timeout
            ...options
        };

        this.stats = {
            enqueued: 0,
            processed: 0,
            dropped: 0,
            errors: 0,
            avgProcessTime: 0
        };

        this.activeProcesses = 0;
        this.processTimes = [];
    }

    /**
     * Add message to queue
     * @param {Object} task - Task object with handler and data
     * @param {number} priority - Priority level (higher = more important)
     * @returns {boolean} - Whether message was queued
     */
    enqueue(task, priority = 0) {
        // Drop if queue is full
        if (this.queue.length >= this.options.maxQueueSize) {
            this.stats.dropped++;
            console.warn('Message Queue: Queue full, dropping message');
            return false;
        }

        this.queue.push({
            task,
            priority,
            timestamp: Date.now()
        });

        this.stats.enqueued++;

        // Sort by priority (higher first)
        this.queue.sort((a, b) => b.priority - a.priority);

        // Start processing if not already
        this.processNext();

        return true;
    }

    /**
     * Process next item in queue
     */
    async processNext() {
        if (this.activeProcesses >= this.options.maxConcurrent) {
            return;
        }

        if (this.queue.length === 0) {
            return;
        }

        const item = this.queue.shift();
        if (!item) return;

        this.activeProcesses++;
        const startTime = Date.now();

        try {
            // Check if message is too old
            if (Date.now() - item.timestamp > this.options.timeout) {
                console.warn('Message Queue: Message timed out in queue');
                this.stats.dropped++;
                return;
            }

            // Execute the task
            await item.task.handler(item.task.data);

            this.stats.processed++;

            // Track process time
            const processTime = Date.now() - startTime;
            this.processTimes.push(processTime);
            if (this.processTimes.length > 100) {
                this.processTimes.shift();
            }
            this.stats.avgProcessTime = Math.round(
                this.processTimes.reduce((a, b) => a + b, 0) / this.processTimes.length
            );

        } catch (error) {
            this.stats.errors++;
            console.error('Message Queue: Error processing message:', error.message);
        } finally {
            this.activeProcesses--;

            // Process next with delay
            if (this.queue.length > 0) {
                setTimeout(() => this.processNext(), this.options.processDelay);
            }
        }
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            queueLength: this.queue.length,
            activeProcesses: this.activeProcesses,
            dropRate: this.stats.enqueued > 0
                ? ((this.stats.dropped / this.stats.enqueued) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Clear the queue
     */
    clear() {
        const dropped = this.queue.length;
        this.queue = [];
        this.stats.dropped += dropped;
        console.log(`Message Queue: Cleared ${dropped} messages`);
    }

    /**
     * Get queue length
     */
    get length() {
        return this.queue.length;
    }
}

// Create singleton instance
const messageQueue = new MessageQueue();

module.exports = messageQueue;
module.exports.MessageQueue = MessageQueue;
