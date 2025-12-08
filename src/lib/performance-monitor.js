const os = require('os');
const process = require('process');
const cache = require('./cache');
const database = require('./database');
const apiManager = require('./api-manager');

/**
 * Performance monitoring and metrics collection system
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      messageCount: 0,
      commandCount: 0,
      errorCount: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      lastReset: Date.now()
    };
    
    this.intervals = [];
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Performance Monitor: Started');
    
    // Memory and CPU monitoring every 30 seconds
    const systemInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
    
    // Cleanup old metrics every 5 minutes
    const cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 5 * 60 * 1000);
    
    this.intervals.push(systemInterval, cleanupInterval);
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    
    console.log('Performance Monitor: Stopped');
  }

  /**
   * Record message processing
   */
  recordMessage() {
    this.metrics.messageCount++;
  }

  /**
   * Record command execution
   */
  recordCommand(commandName, startTime) {
    this.metrics.commandCount++;
    
    const responseTime = Date.now() - startTime;
    this.metrics.responseTime.push({
      command: commandName,
      time: responseTime,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
  }

  /**
   * Record error occurrence
   */
  recordError(error, context = '') {
    this.metrics.errorCount++;
    console.error(`Performance Monitor: Error in ${context}:`, error.message);
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    });
    
    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });
    
    // Keep only last 100 system metrics
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
    if (this.metrics.cpuUsage.length > 100) {
      this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
    }
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Clean response times older than 1 hour
    this.metrics.responseTime = this.metrics.responseTime.filter(
      metric => metric.timestamp > oneHourAgo
    );
  }

  /**
   * Get comprehensive performance report
   */
  getReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
    
    // Calculate average response time
    const recentResponseTimes = this.metrics.responseTime.slice(-100);
    const avgResponseTime = recentResponseTimes.length > 0
      ? (recentResponseTimes.reduce((sum, r) => sum + r.time, 0) / recentResponseTimes.length).toFixed(2)
      : 0;
    
    // Get latest system metrics
    const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    const latestCpu = this.metrics.cpuUsage[this.metrics.cpuUsage.length - 1];
    
    // System information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      freeMemory: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg()
    };
    
    // Bot performance metrics
    const botMetrics = {
      uptime: `${uptimeHours} hours`,
      messagesProcessed: this.metrics.messageCount,
      commandsExecuted: this.metrics.commandCount,
      errorsOccurred: this.metrics.errorCount,
      avgResponseTime: `${avgResponseTime}ms`,
      messagesPerHour: Math.round(this.metrics.messageCount / (uptime / (1000 * 60 * 60))),
      commandsPerHour: Math.round(this.metrics.commandCount / (uptime / (1000 * 60 * 60)))
    };
    
    // Memory usage
    const memoryMetrics = latestMemory ? {
      rss: `${(latestMemory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(latestMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(latestMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(latestMemory.external / 1024 / 1024).toFixed(2)} MB`
    } : {};
    
    // Get subsystem stats
    const cacheStats = cache.getStats();
    const dbStats = database.getCacheStats();
    const apiStats = apiManager.getStats();
    
    return {
      timestamp: new Date().toISOString(),
      system: systemInfo,
      bot: botMetrics,
      memory: memoryMetrics,
      cache: cacheStats,
      database: dbStats,
      api: apiStats
    };
  }

  /**
   * Get performance summary for quick overview
   */
  getSummary() {
    const report = this.getReport();
    
    return {
      uptime: report.bot.uptime,
      messages: report.bot.messagesProcessed,
      commands: report.bot.commandsExecuted,
      errors: report.bot.errorsOccurred,
      avgResponseTime: report.bot.avgResponseTime,
      memoryUsed: report.memory.rss,
      cacheHitRate: report.cache.hitRate,
      apiCacheHitRate: report.api.cacheHitRate
    };
  }

  /**
   * Generate performance alert if thresholds exceeded
   */
  checkAlerts() {
    const alerts = [];
    const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    
    if (latestMemory) {
      // Memory usage alert (>500MB)
      const memoryMB = latestMemory.rss / 1024 / 1024;
      if (memoryMB > 500) {
        alerts.push({
          type: 'memory',
          level: 'warning',
          message: `High memory usage: ${memoryMB.toFixed(2)}MB`
        });
      }
      
      // Heap usage alert (>80% of total)
      const heapUsagePercent = (latestMemory.heapUsed / latestMemory.heapTotal) * 100;
      if (heapUsagePercent > 80) {
        alerts.push({
          type: 'heap',
          level: 'warning',
          message: `High heap usage: ${heapUsagePercent.toFixed(2)}%`
        });
      }
    }
    
    // Error rate alert (>10 errors per hour)
    const uptime = Date.now() - this.metrics.startTime;
    const errorsPerHour = this.metrics.errorCount / (uptime / (1000 * 60 * 60));
    if (errorsPerHour > 10) {
      alerts.push({
        type: 'errors',
        level: 'critical',
        message: `High error rate: ${errorsPerHour.toFixed(2)} errors/hour`
      });
    }
    
    // Response time alert (>5000ms average)
    const recentResponseTimes = this.metrics.responseTime.slice(-50);
    if (recentResponseTimes.length > 0) {
      const avgResponseTime = recentResponseTimes.reduce((sum, r) => sum + r.time, 0) / recentResponseTimes.length;
      if (avgResponseTime > 5000) {
        alerts.push({
          type: 'response_time',
          level: 'warning',
          message: `Slow response time: ${avgResponseTime.toFixed(2)}ms`
        });
      }
    }
    
    return alerts;
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  reset() {
    this.metrics = {
      startTime: Date.now(),
      messageCount: 0,
      commandCount: 0,
      errorCount: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      lastReset: Date.now()
    };
    
    console.log('Performance Monitor: Metrics reset');
  }

  /**
   * Export metrics to JSON file
   */
  async exportMetrics(filePath) {
    const report = this.getReport();
    const fs = require('fs').promises;
    
    try {
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      console.log(`Performance Monitor: Metrics exported to ${filePath}`);
    } catch (error) {
      console.error('Performance Monitor: Failed to export metrics:', error.message);
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;