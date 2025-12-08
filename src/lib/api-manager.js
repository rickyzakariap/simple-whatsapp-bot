const axios = require('axios');
const cache = require('./cache');

/**
 * Optimized API manager with rate limiting, caching, and connection pooling
 */
class ApiManager {
  constructor() {
    // Rate limiting configuration
    this.rateLimits = new Map();
    this.requestQueues = new Map();
    
    // Connection pooling
    this.axiosInstances = new Map();
    
    // Default rate limits (requests per minute)
    this.defaultLimits = {
      'api.coingecko.com': 50,
      'www.googleapis.com': 100,
      'api.openweathermap.org': 60,
      'default': 30
    };
    
    // Request statistics
    this.stats = {
      totalRequests: 0,
      cachedResponses: 0,
      rateLimitedRequests: 0,
      failedRequests: 0
    };
    
    this.setupAxiosInstances();
  }

  /**
   * Setup optimized axios instances with connection pooling
   */
  setupAxiosInstances() {
    const commonConfig = {
      timeout: 30000,
      maxRedirects: 3,
      // Connection pooling settings
      httpAgent: new (require('http').Agent)({
        keepAlive: true,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 60000,
        freeSocketTimeout: 30000
      }),
      httpsAgent: new (require('https').Agent)({
        keepAlive: true,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 60000,
        freeSocketTimeout: 30000
      })
    };

    // CoinGecko API
    this.axiosInstances.set('coingecko', axios.create({
      ...commonConfig,
      baseURL: 'https://api.coingecko.com/api/v3',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OngBak-Bot/1.0'
      }
    }));

    // Default instance for other APIs
    this.axiosInstances.set('default', axios.create(commonConfig));
  }

  /**
   * Get appropriate axios instance for domain
   */
  getAxiosInstance(url) {
    try {
      const domain = new URL(url).hostname;
      
      if (domain.includes('coingecko.com')) {
        return this.axiosInstances.get('coingecko');
      }
      
      return this.axiosInstances.get('default');
    } catch (error) {
      return this.axiosInstances.get('default');
    }
  }

  /**
   * Check rate limit for domain
   */
  checkRateLimit(domain) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    if (!this.rateLimits.has(domain)) {
      this.rateLimits.set(domain, []);
    }
    
    const requests = this.rateLimits.get(domain);
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => time > windowStart);
    this.rateLimits.set(domain, recentRequests);
    
    // Check if we're within limits
    const limit = this.defaultLimits[domain] || this.defaultLimits.default;
    return recentRequests.length < limit;
  }

  /**
   * Add request to rate limit tracking
   */
  trackRequest(domain) {
    if (!this.rateLimits.has(domain)) {
      this.rateLimits.set(domain, []);
    }
    
    this.rateLimits.get(domain).push(Date.now());
  }

  /**
   * Generate cache key for request
   */
  generateCacheKey(url, options = {}) {
    const { method = 'GET', params = {}, data = null } = options;
    const key = `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
    return Buffer.from(key).toString('base64').substring(0, 100);
  }

  /**
   * Make cached API request with rate limiting
   */
  async request(url, options = {}) {
    const {
      method = 'GET',
      cacheTTL = 10 * 60 * 1000, // 10 minutes default
      skipCache = false,
      retries = 3,
      ...axiosOptions
    } = options;

    this.stats.totalRequests++;

    try {
      const domain = new URL(url).hostname;
      
      // Check cache first (unless skipped)
      if (!skipCache && method === 'GET') {
        const cacheKey = this.generateCacheKey(url, axiosOptions);
        const cached = cache.getApi(cacheKey, cacheTTL);
        
        if (cached) {
          this.stats.cachedResponses++;
          return cached;
        }
      }

      // Check rate limit
      if (!this.checkRateLimit(domain)) {
        this.stats.rateLimitedRequests++;
        
        // Wait for rate limit to reset
        await this.waitForRateLimit(domain);
      }

      // Track this request
      this.trackRequest(domain);

      // Make the request with retries
      const response = await this.makeRequestWithRetry(url, {
        method,
        ...axiosOptions
      }, retries);

      // Cache successful GET responses
      if (!skipCache && method === 'GET' && response.status === 200) {
        const cacheKey = this.generateCacheKey(url, axiosOptions);
        cache.setApi(cacheKey, response.data, cacheTTL);
      }

      return response.data;

    } catch (error) {
      this.stats.failedRequests++;
      console.error(`API Request failed for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Make request with retry logic
   */
  async makeRequestWithRetry(url, options, retries) {
    const axiosInstance = this.getAxiosInstance(url);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await axiosInstance.request({
          url,
          ...options
        });
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`API Request retry ${attempt}/${retries} for ${url} after ${delay}ms`);
      }
    }
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForRateLimit(domain) {
    const requests = this.rateLimits.get(domain) || [];
    if (requests.length === 0) return;
    
    const oldestRequest = Math.min(...requests);
    const waitTime = Math.max(0, 60000 - (Date.now() - oldestRequest));
    
    if (waitTime > 0) {
      console.log(`Rate limit hit for ${domain}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Specialized methods for common APIs
   */
  
  // CoinGecko API methods
  async getCoinPrice(symbol, vsCurrency = 'usd') {
    return this.request('/coins/markets', {
      params: {
        vs_currency: vsCurrency,
        symbols: symbol,
        per_page: 1
      },
      cacheTTL: 2 * 60 * 1000 // 2 minutes for price data
    });
  }

  async getCoinList() {
    return this.request('/coins/list', {
      cacheTTL: 60 * 60 * 1000 // 1 hour for coin list
    });
  }

  async getTopGainers(limit = 10) {
    return this.request('/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'price_change_percentage_24h_desc',
        per_page: limit,
        page: 1
      },
      cacheTTL: 5 * 60 * 1000 // 5 minutes
    });
  }

  async getTopLosers(limit = 10) {
    return this.request('/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'price_change_percentage_24h_asc',
        per_page: limit,
        page: 1
      },
      cacheTTL: 5 * 60 * 1000 // 5 minutes
    });
  }

  // Media download with caching
  async downloadMedia(url, options = {}) {
    const {
      maxSize = 50 * 1024 * 1024, // 50MB default
      timeout = 30000,
      ...otherOptions
    } = options;

    return this.request(url, {
      method: 'GET',
      responseType: 'arraybuffer',
      timeout,
      skipCache: true, // Don't cache large media files
      maxContentLength: maxSize,
      ...otherOptions
    });
  }

  /**
   * Batch requests with concurrency control
   */
  async batchRequest(requests, concurrency = 5) {
    const results = [];
    const executing = [];

    for (const requestConfig of requests) {
      const promise = this.request(requestConfig.url, requestConfig.options)
        .then(data => ({ success: true, data, config: requestConfig }))
        .catch(error => ({ success: false, error, config: requestConfig }));

      results.push(promise);

      if (results.length >= concurrency) {
        executing.push(promise);
      }

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    return Promise.all(results);
  }

  /**
   * Get API statistics
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0
      ? ((this.stats.cachedResponses / this.stats.totalRequests) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      cacheHitRate: `${hitRate}%`,
      activeRateLimits: this.rateLimits.size,
      axiosInstances: this.axiosInstances.size
    };
  }

  /**
   * Clear rate limits (for testing)
   */
  clearRateLimits() {
    this.rateLimits.clear();
  }

  /**
   * Shutdown and cleanup
   */
  shutdown() {
    // Clear rate limits
    this.rateLimits.clear();
    this.requestQueues.clear();
    
    console.log('API Manager: Shutdown complete');
  }
}

// Create singleton instance
const apiManager = new ApiManager();

module.exports = apiManager;