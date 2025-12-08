const fs = require('fs');
const path = require('path');

/**
 * High-performance caching system for WhatsApp bot
 * Provides in-memory caching with TTL, file watching, and batch operations
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.fileWatchers = new Map();
    this.apiCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      fileReads: 0,
      fileWrites: 0
    };
    
    // Default TTL values (in milliseconds)
    this.defaultTTL = {
      json: 5 * 60 * 1000,      // 5 minutes for JSON files
      api: 10 * 60 * 1000,      // 10 minutes for API responses
      media: 30 * 60 * 1000     // 30 minutes for media URLs
    };
    
    // Batch write queue
    this.writeQueue = new Map();
    this.batchWriteInterval = null;
    this.startBatchWriter();
  }

  /**
   * Get cached data with automatic file loading and watching
   */
  async getJson(filePath, defaultValue = {}) {
    const absolutePath = path.resolve(filePath);
    const cacheKey = `json:${absolutePath}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      this.stats.hits++;
      return cached.data;
    }
    
    this.stats.misses++;
    
    try {
      // Load from file
      let data = defaultValue;
      if (fs.existsSync(absolutePath)) {
        const fileContent = fs.readFileSync(absolutePath, 'utf8');
        data = JSON.parse(fileContent);
        this.stats.fileReads++;
      }
      
      // Cache the data
      this.cache.set(cacheKey, {
        data: data,
        expires: Date.now() + this.defaultTTL.json,
        filePath: absolutePath
      });
      
      // Set up file watcher if not already watching
      this.watchFile(absolutePath, cacheKey);
      
      return data;
    } catch (error) {
      console.error(`Cache: Error loading JSON file ${filePath}:`, error.message);
      return defaultValue;
    }
  }

  /**
   * Queue JSON data for batch writing
   */
  setJson(filePath, data) {
    const absolutePath = path.resolve(filePath);
    const cacheKey = `json:${absolutePath}`;
    
    // Update cache immediately
    this.cache.set(cacheKey, {
      data: data,
      expires: Date.now() + this.defaultTTL.json,
      filePath: absolutePath
    });
    
    // Queue for batch write
    this.writeQueue.set(absolutePath, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * Get API response from cache
   */
  getApi(key, ttl = this.defaultTTL.api) {
    const cacheKey = `api:${key}`;
    const cached = this.apiCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      this.stats.hits++;
      return cached.data;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Set API response in cache
   */
  setApi(key, data, ttl = this.defaultTTL.api) {
    const cacheKey = `api:${key}`;
    this.apiCache.set(cacheKey, {
      data: data,
      expires: Date.now() + ttl
    });
  }

  /**
   * Watch file for changes and invalidate cache
   */
  watchFile(filePath, cacheKey) {
    if (this.fileWatchers.has(filePath)) {
      return; // Already watching
    }
    
    try {
      const watcher = fs.watchFile(filePath, { interval: 1000 }, () => {
        console.log(`Cache: File changed, invalidating cache for ${filePath}`);
        this.cache.delete(cacheKey);
      });
      
      this.fileWatchers.set(filePath, watcher);
    } catch (error) {
      console.error(`Cache: Error watching file ${filePath}:`, error.message);
    }
  }

  /**
   * Start batch writer for efficient file operations
   */
  startBatchWriter() {
    this.batchWriteInterval = setInterval(() => {
      this.flushWrites();
    }, 2000); // Write every 2 seconds
  }

  /**
   * Flush all pending writes to disk
   */
  flushWrites() {
    if (this.writeQueue.size === 0) return;
    
    const writes = Array.from(this.writeQueue.entries());
    this.writeQueue.clear();
    
    // Group writes by directory for better I/O performance
    const writesByDir = new Map();
    writes.forEach(([filePath, writeData]) => {
      const dir = path.dirname(filePath);
      if (!writesByDir.has(dir)) {
        writesByDir.set(dir, []);
      }
      writesByDir.get(dir).push([filePath, writeData]);
    });
    
    // Execute writes directory by directory
    writesByDir.forEach((dirWrites) => {
      dirWrites.forEach(([filePath, writeData]) => {
        try {
          // Ensure directory exists
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(filePath, JSON.stringify(writeData.data, null, 2));
          this.stats.fileWrites++;
        } catch (error) {
          console.error(`Cache: Error writing file ${filePath}:`, error.message);
        }
      });
    });
    
    if (writes.length > 0) {
      console.log(`Cache: Batch wrote ${writes.length} files`);
    }
  }

  /**
   * Clean expired entries from cache
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    // Clean JSON cache
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    // Clean API cache
    for (const [key, value] of this.apiCache.entries()) {
      if (value.expires <= now) {
        this.apiCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache: Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
      
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      apiCacheSize: this.apiCache.size,
      pendingWrites: this.writeQueue.size,
      watchedFiles: this.fileWatchers.size
    };
  }

  /**
   * Force immediate write of all pending data
   */
  async forceFlush() {
    this.flushWrites();
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Shutdown cache manager and cleanup resources
   */
  async shutdown() {
    console.log('Cache: Shutting down...');
    
    // Stop batch writer
    if (this.batchWriteInterval) {
      clearInterval(this.batchWriteInterval);
    }
    
    // Flush any pending writes
    await this.forceFlush();
    
    // Stop file watchers
    this.fileWatchers.forEach((watcher, filePath) => {
      fs.unwatchFile(filePath);
    });
    this.fileWatchers.clear();
    
    // Clear caches
    this.cache.clear();
    this.apiCache.clear();
    
    console.log('Cache: Shutdown complete');
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key) {
    const jsonKey = `json:${path.resolve(key)}`;
    const apiKey = `api:${key}`;
    
    this.cache.delete(jsonKey);
    this.apiCache.delete(apiKey);
  }

  /**
   * Preload frequently accessed files
   */
  async preload(filePaths) {
    console.log(`Cache: Preloading ${filePaths.length} files...`);
    
    const promises = filePaths.map(async (filePath) => {
      try {
        await this.getJson(filePath);
      } catch (error) {
        console.error(`Cache: Error preloading ${filePath}:`, error.message);
      }
    });
    
    await Promise.all(promises);
    console.log('Cache: Preload complete');
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Cleanup every 5 minutes
setInterval(() => {
  cacheManager.cleanup();
}, 5 * 60 * 1000);

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await cacheManager.shutdown();
});

process.on('SIGTERM', async () => {
  await cacheManager.shutdown();
});

module.exports = cacheManager;