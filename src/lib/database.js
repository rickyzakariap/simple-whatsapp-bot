const cache = require('./cache');
const path = require('path');

/**
 * Optimized database layer with caching and batch operations
 * Replaces direct JSON file operations throughout the bot
 */
class Database {
  constructor() {
    this.basePath = path.join(__dirname, '../..');
    
    // Database file paths from config
    this.files = {
      alerts: 'alerts.json',
      schedules: 'schedules.json',
      birthdays: 'birthdays.json',
      points: 'points.json',
      autoresponder: 'autoresponder.json',
      welcome: 'welcome.json',
      polls: 'polls.json',
      portfolio: 'portfolio.json'
    };
  }

  /**
   * Get full file path
   */
  getFilePath(dbName) {
    if (!this.files[dbName]) {
      throw new Error(`Unknown database: ${dbName}`);
    }
    return path.join(this.basePath, this.files[dbName]);
  }

  /**
   * Load database with caching
   */
  async load(dbName, defaultValue = {}) {
    const filePath = this.getFilePath(dbName);
    return await cache.getJson(filePath, defaultValue);
  }

  /**
   * Save database with batch writing
   */
  save(dbName, data) {
    const filePath = this.getFilePath(dbName);
    cache.setJson(filePath, data);
  }

  /**
   * Get specific data from database
   */
  async get(dbName, key, defaultValue = null) {
    const data = await this.load(dbName);
    return data[key] !== undefined ? data[key] : defaultValue;
  }

  /**
   * Set specific data in database
   */
  async set(dbName, key, value) {
    const data = await this.load(dbName);
    data[key] = value;
    this.save(dbName, data);
  }

  /**
   * Delete specific data from database
   */
  async delete(dbName, key) {
    const data = await this.load(dbName);
    delete data[key];
    this.save(dbName, data);
  }

  /**
   * Check if key exists in database
   */
  async has(dbName, key) {
    const data = await this.load(dbName);
    return data.hasOwnProperty(key);
  }

  /**
   * Get all keys from database
   */
  async keys(dbName) {
    const data = await this.load(dbName);
    return Object.keys(data);
  }

  /**
   * Get all values from database
   */
  async values(dbName) {
    const data = await this.load(dbName);
    return Object.values(data);
  }

  /**
   * Get all entries from database
   */
  async entries(dbName) {
    const data = await this.load(dbName);
    return Object.entries(data);
  }

  /**
   * Update nested data efficiently
   */
  async updateNested(dbName, path, value) {
    const data = await this.load(dbName);
    const keys = path.split('.');
    let current = data;
    
    // Navigate to parent object
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Set the final value
    current[keys[keys.length - 1]] = value;
    this.save(dbName, data);
  }

  /**
   * Get nested data efficiently
   */
  async getNested(dbName, path, defaultValue = null) {
    const data = await this.load(dbName);
    const keys = path.split('.');
    let current = data;
    
    for (const key of keys) {
      if (!current || typeof current !== 'object' || !current.hasOwnProperty(key)) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current;
  }

  /**
   * Batch operations for better performance
   */
  async batchUpdate(dbName, updates) {
    const data = await this.load(dbName);
    
    for (const [key, value] of Object.entries(updates)) {
      if (key.includes('.')) {
        // Handle nested updates
        const keys = key.split('.');
        let current = data;
        
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (!current[k] || typeof current[k] !== 'object') {
            current[k] = {};
          }
          current = current[k];
        }
        
        current[keys[keys.length - 1]] = value;
      } else {
        data[key] = value;
      }
    }
    
    this.save(dbName, data);
  }

  /**
   * Search data with filters
   */
  async search(dbName, filter) {
    const data = await this.load(dbName);
    const results = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof filter === 'function') {
        if (filter(key, value)) {
          results.push({ key, value });
        }
      } else if (typeof filter === 'object') {
        let matches = true;
        for (const [filterKey, filterValue] of Object.entries(filter)) {
          if (value[filterKey] !== filterValue) {
            matches = false;
            break;
          }
        }
        if (matches) {
          results.push({ key, value });
        }
      }
    }
    
    return results;
  }

  /**
   * Get database statistics
   */
  async getStats(dbName) {
    const data = await this.load(dbName);
    const size = JSON.stringify(data).length;
    
    return {
      entries: Object.keys(data).length,
      sizeBytes: size,
      sizeKB: (size / 1024).toFixed(2)
    };
  }

  /**
   * Preload frequently used databases
   */
  async preload() {
    const frequentDbs = ['points', 'autoresponder', 'welcome'];
    const filePaths = frequentDbs.map(db => this.getFilePath(db));
    await cache.preload(filePaths);
  }

  /**
   * Force flush all pending writes
   */
  async flush() {
    await cache.forceFlush();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cache.getStats();
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;