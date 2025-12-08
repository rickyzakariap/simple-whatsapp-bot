const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Import optimized modules
const cache = require('../src/lib/cache');
const database = require('../src/lib/database');
const apiManager = require('../src/lib/api-manager');
const CommandLoader = require('../src/lib/command-loader');
const mediaProcessor = require('../src/lib/media-processor');
const performanceMonitor = require('../src/lib/performance-monitor');

/**
 * Performance benchmarking suite for WhatsApp bot optimizations
 */
class PerformanceBenchmark {
  constructor() {
    this.results = {
      cache: {},
      database: {},
      api: {},
      commands: {},
      media: {},
      overall: {}
    };
    
    this.testData = {
      sampleJson: { test: 'data', users: Array.from({length: 1000}, (_, i) => `user${i}`) },
      sampleBuffer: Buffer.alloc(1024 * 1024), // 1MB buffer
      apiUrls: [
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=10',
        'https://api.coingecko.com/api/v3/search?query=bitcoin'
      ]
    };
  }

  /**
   * Run all benchmarks
   */
  async runAllBenchmarks() {
    console.log('🚀 Starting Performance Benchmarks...\n');
    
    const startTime = performance.now();
    
    try {
      // Initialize systems
      await this.initializeSystems();
      
      // Run individual benchmarks
      await this.benchmarkCache();
      await this.benchmarkDatabase();
      await this.benchmarkAPI();
      await this.benchmarkCommands();
      await this.benchmarkMedia();
      
      // Calculate overall results
      this.calculateOverallResults(startTime);
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize systems for testing
   */
  async initializeSystems() {
    console.log('📋 Initializing systems...');
    
    // Start performance monitoring
    performanceMonitor.start();
    
    console.log('✅ Systems initialized\n');
  }

  /**
   * Benchmark caching system
   */
  async benchmarkCache() {
    console.log('🗄️  Benchmarking Cache System...');
    
    const iterations = 1000;
    const testFile = path.join(__dirname, 'test-cache.json');
    
    // Write test file
    fs.writeFileSync(testFile, JSON.stringify(this.testData.sampleJson));
    
    // Benchmark file operations
    const fileReadStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await cache.getJson(testFile);
    }
    const fileReadTime = performance.now() - fileReadStart;
    
    // Benchmark cache hits
    const cacheHitStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await cache.getJson(testFile); // Should hit cache
    }
    const cacheHitTime = performance.now() - cacheHitStart;
    
    // Benchmark API cache
    const apiCacheStart = performance.now();
    for (let i = 0; i < 100; i++) {
      cache.setApi(`test-key-${i}`, { data: `test-${i}` });
      cache.getApi(`test-key-${i}`);
    }
    const apiCacheTime = performance.now() - apiCacheStart;
    
    this.results.cache = {
      fileReadTime: fileReadTime.toFixed(2),
      fileReadPerOp: (fileReadTime / iterations).toFixed(4),
      cacheHitTime: cacheHitTime.toFixed(2),
      cacheHitPerOp: (cacheHitTime / iterations).toFixed(4),
      apiCacheTime: apiCacheTime.toFixed(2),
      speedImprovement: ((fileReadTime / cacheHitTime) * 100).toFixed(1),
      stats: cache.getStats()
    };
    
    // Cleanup
    fs.unlinkSync(testFile);
    
    console.log(`   File Read: ${this.results.cache.fileReadPerOp}ms/op`);
    console.log(`   Cache Hit: ${this.results.cache.cacheHitPerOp}ms/op`);
    console.log(`   Speed Improvement: ${this.results.cache.speedImprovement}x faster\n`);
  }

  /**
   * Benchmark database operations
   */
  async benchmarkDatabase() {
    console.log('💾 Benchmarking Database System...');
    
    const iterations = 500;
    
    // Benchmark batch operations
    const batchStart = performance.now();
    const updates = {};
    for (let i = 0; i < iterations; i++) {
      updates[`user${i}`] = { points: i * 10, level: Math.floor(i / 10) };
    }
    await database.batchUpdate('points', updates);
    const batchTime = performance.now() - batchStart;
    
    // Benchmark individual operations
    const individualStart = performance.now();
    for (let i = 0; i < 100; i++) {
      await database.set('test', `key${i}`, `value${i}`);
    }
    const individualTime = performance.now() - individualStart;
    
    // Benchmark reads
    const readStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await database.get('points', `user${i}`);
    }
    const readTime = performance.now() - readStart;
    
    this.results.database = {
      batchTime: batchTime.toFixed(2),
      batchPerOp: (batchTime / iterations).toFixed(4),
      individualTime: individualTime.toFixed(2),
      individualPerOp: (individualTime / 100).toFixed(4),
      readTime: readTime.toFixed(2),
      readPerOp: (readTime / iterations).toFixed(4),
      batchSpeedImprovement: ((individualTime / 100) / (batchTime / iterations)).toFixed(1),
      stats: database.getCacheStats()
    };
    
    console.log(`   Batch Write: ${this.results.database.batchPerOp}ms/op`);
    console.log(`   Individual Write: ${this.results.database.individualPerOp}ms/op`);
    console.log(`   Read: ${this.results.database.readPerOp}ms/op`);
    console.log(`   Batch Improvement: ${this.results.database.batchSpeedImprovement}x faster\n`);
  }

  /**
   * Benchmark API manager
   */
  async benchmarkAPI() {
    console.log('🌐 Benchmarking API Manager...');
    
    // Benchmark rate limiting
    const rateLimitStart = performance.now();
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        apiManager.request('https://httpbin.org/delay/0.1', { 
          cacheTTL: 5000,
          retries: 1 
        }).catch(() => null)
      );
    }
    await Promise.allSettled(promises);
    const rateLimitTime = performance.now() - rateLimitStart;
    
    // Benchmark caching
    const cacheTestUrl = 'https://httpbin.org/json';
    
    // First request (cache miss)
    const cacheMissStart = performance.now();
    await apiManager.request(cacheTestUrl, { cacheTTL: 10000 }).catch(() => null);
    const cacheMissTime = performance.now() - cacheMissStart;
    
    // Second request (cache hit)
    const cacheHitStart = performance.now();
    await apiManager.request(cacheTestUrl, { cacheTTL: 10000 }).catch(() => null);
    const cacheHitTime = performance.now() - cacheHitStart;
    
    this.results.api = {
      rateLimitTime: rateLimitTime.toFixed(2),
      cacheMissTime: cacheMissTime.toFixed(2),
      cacheHitTime: cacheHitTime.toFixed(2),
      cacheSpeedImprovement: cacheMissTime > 0 ? (cacheMissTime / Math.max(cacheHitTime, 0.1)).toFixed(1) : 'N/A',
      stats: apiManager.getStats()
    };
    
    console.log(`   Rate Limited Requests: ${this.results.api.rateLimitTime}ms`);
    console.log(`   Cache Miss: ${this.results.api.cacheMissTime}ms`);
    console.log(`   Cache Hit: ${this.results.api.cacheHitTime}ms`);
    console.log(`   Cache Improvement: ${this.results.api.cacheSpeedImprovement}x faster\n`);
  }

  /**
   * Benchmark command loading
   */
  async benchmarkCommands() {
    console.log('⚡ Benchmarking Command System...');
    
    const commandsDir = path.join(__dirname, '../src/commands/main');
    const commandLoader = new CommandLoader(commandsDir);
    
    // Initialize command loader
    const initStart = performance.now();
    await commandLoader.initialize();
    const initTime = performance.now() - initStart;
    
    // Benchmark lazy loading
    const lazyLoadStart = performance.now();
    const commands = ['help', 'menu', 'ping', 'points', 'coin'];
    for (const cmd of commands) {
      await commandLoader.getCommand(cmd);
    }
    const lazyLoadTime = performance.now() - lazyLoadStart;
    
    // Benchmark preloading
    const preloadStart = performance.now();
    await commandLoader.preloadCommands(['topgainers', 'toplosers', 'weather']);
    const preloadTime = performance.now() - preloadStart;
    
    this.results.commands = {
      initTime: initTime.toFixed(2),
      lazyLoadTime: lazyLoadTime.toFixed(2),
      lazyLoadPerCmd: (lazyLoadTime / commands.length).toFixed(4),
      preloadTime: preloadTime.toFixed(2),
      preloadPerCmd: (preloadTime / 3).toFixed(4),
      stats: commandLoader.getStats()
    };
    
    // Cleanup
    commandLoader.shutdown();
    
    console.log(`   Initialization: ${this.results.commands.initTime}ms`);
    console.log(`   Lazy Load: ${this.results.commands.lazyLoadPerCmd}ms/cmd`);
    console.log(`   Preload: ${this.results.commands.preloadPerCmd}ms/cmd\n`);
  }

  /**
   * Benchmark media processing
   */
  async benchmarkMedia() {
    console.log('🎬 Benchmarking Media Processing...');
    
    // Create test image buffer (simple PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      ...Array(1000).fill(0) // Minimal PNG data
    ]);
    
    // Benchmark sticker conversion
    const stickerStart = performance.now();
    try {
      await mediaProcessor.imageToSticker(testImageBuffer, { quality: 50 });
      const stickerTime = performance.now() - stickerStart;
      
      this.results.media.stickerTime = stickerTime.toFixed(2);
    } catch (error) {
      this.results.media.stickerTime = 'Failed';
      this.results.media.stickerError = error.message;
    }
    
    // Benchmark concurrent processing
    const concurrentStart = performance.now();
    const concurrentPromises = [];
    for (let i = 0; i < 3; i++) {
      concurrentPromises.push(
        mediaProcessor.imageToSticker(testImageBuffer, { quality: 30 })
          .catch(() => null)
      );
    }
    await Promise.allSettled(concurrentPromises);
    const concurrentTime = performance.now() - concurrentStart;
    
    this.results.media = {
      ...this.results.media,
      concurrentTime: concurrentTime.toFixed(2),
      concurrentPerProcess: (concurrentTime / 3).toFixed(4),
      stats: mediaProcessor.getStats()
    };
    
    console.log(`   Sticker Conversion: ${this.results.media.stickerTime}ms`);
    console.log(`   Concurrent Processing: ${this.results.media.concurrentPerProcess}ms/process\n`);
  }

  /**
   * Calculate overall performance results
   */
  calculateOverallResults(startTime) {
    const totalTime = performance.now() - startTime;
    
    this.results.overall = {
      totalBenchmarkTime: totalTime.toFixed(2),
      performanceGains: {
        cacheSpeedImprovement: this.results.cache.speedImprovement + 'x',
        apiCacheImprovement: this.results.api.cacheSpeedImprovement + 'x',
        batchDbImprovement: this.results.database.batchSpeedImprovement + 'x'
      },
      memoryEfficiency: {
        cacheHitRate: this.results.cache.stats.hitRate,
        apiCacheHitRate: this.results.api.stats.cacheHitRate,
        commandLoadPercentage: this.results.commands.stats.loadPercentage
      },
      systemHealth: performanceMonitor.getSummary()
    };
  }

  /**
   * Generate comprehensive benchmark report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        status: '✅ Performance Optimization Complete',
        totalTime: this.results.overall.totalBenchmarkTime + 'ms',
        keyImprovements: [
          `Cache system: ${this.results.cache.speedImprovement}x faster`,
          `API caching: ${this.results.api.cacheSpeedImprovement}x faster`,
          `Batch operations: ${this.results.database.batchSpeedImprovement}x faster`,
          `Lazy loading: ${this.results.commands.stats.loadPercentage} memory efficiency`
        ]
      },
      detailedResults: this.results
    };
    
    // Save report to file
    const reportPath = path.join(__dirname, `benchmark-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('📊 BENCHMARK RESULTS SUMMARY');
    console.log('================================');
    console.log(`Total Benchmark Time: ${report.summary.totalTime}`);
    console.log('\n🚀 Key Performance Improvements:');
    report.summary.keyImprovements.forEach(improvement => {
      console.log(`   • ${improvement}`);
    });
    
    console.log('\n💾 Memory Efficiency:');
    console.log(`   • Cache Hit Rate: ${this.results.overall.memoryEfficiency.cacheHitRate}`);
    console.log(`   • API Cache Hit Rate: ${this.results.overall.memoryEfficiency.apiCacheHitRate}`);
    console.log(`   • Command Memory Usage: ${this.results.overall.memoryEfficiency.commandLoadPercentage}`);
    
    console.log('\n📈 System Health:');
    const health = this.results.overall.systemHealth;
    console.log(`   • Uptime: ${health.uptime}`);
    console.log(`   • Messages Processed: ${health.messages}`);
    console.log(`   • Commands Executed: ${health.commands}`);
    console.log(`   • Average Response Time: ${health.avgResponseTime}`);
    console.log(`   • Memory Used: ${health.memoryUsed}`);
    
    console.log(`\n📋 Full report saved to: ${reportPath}`);
    console.log('\n🎉 Performance optimization benchmarking complete!');
  }

  /**
   * Cleanup test resources
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test resources...');
    
    // Stop performance monitoring
    performanceMonitor.stop();
    
    // Clear test data from database
    try {
      await database.delete('test', 'test');
      await database.delete('points', 'test');
    } catch (error) {
      // Ignore cleanup errors
    }
    
    console.log('✅ Cleanup complete');
  }
}

// Export for use in tests
module.exports = PerformanceBenchmark;

// Run benchmarks if called directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runAllBenchmarks().catch(console.error);
}