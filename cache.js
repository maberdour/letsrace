// Cache utility for storing JSON data in localStorage
class EventCache {
  constructor() {
    this.cachePrefix = 'letsrace_events_';
    this.cacheExpiry = 23 * 60 * 60 * 1000; // 23 hours in milliseconds
  }

  // Generate cache key for a specific category
  getCacheKey(category) {
    return this.cachePrefix + category;
  }

  // Store data in cache with timestamp
  setCache(category, data) {
    const cacheData = {
      data: data,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(this.getCacheKey(category), JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Failed to cache data:', e);
    }
  }

  // Get data from cache if it exists and is not expired
  getCache(category) {
    try {
      const cached = localStorage.getItem(this.getCacheKey(category));
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cacheData.timestamp > this.cacheExpiry) {
        this.clearCache(category);
        return null;
      }

      return cacheData.data;
    } catch (e) {
      console.warn('Failed to read cache:', e);
      return null;
    }
  }

  // Clear cache for a specific category
  clearCache(category) {
    try {
      localStorage.removeItem(this.getCacheKey(category));
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }
  }

  // Clear all event caches
  clearAllCaches() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.cachePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Failed to clear all caches:', e);
    }
  }

  // Check if cache exists and is valid
  hasValidCache(category) {
    return this.getCache(category) !== null;
  }

  // Get expired cache as fallback
  getExpiredCache(category) {
    try {
      const cached = localStorage.getItem(this.getCacheKey(category));
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      return cacheData.data; // Return data even if expired
    } catch (e) {
      console.warn('Failed to read expired cache:', e);
      return null;
    }
  }
}

// Global cache instance
const eventCache = new EventCache();

// Enhanced fetch function with caching and timeout
async function fetchWithCache(url, category) {
  // Try to get from cache first
  const cachedData = eventCache.getCache(category);
  if (cachedData) {
    console.log(`Using cached data for ${category}`);
    return cachedData;
  }

  // If not in cache, fetch from server with timeout
  console.log(`Fetching fresh data for ${category}`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Store in cache
    eventCache.setCache(category, data);
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    if (error.name === 'AbortError') {
      console.log('Request timed out, showing cached data if available');
      // Return cached data even if expired as fallback
      const expiredCache = eventCache.getExpiredCache(category);
      if (expiredCache) {
        return expiredCache;
      }
    }
    throw error;
  }
}

// Preload data for other categories in parallel
function preloadOtherCategories(currentCategory) {
  const categories = ['road', 'mtb', 'track', 'bmx', 'cyclo-cross', 'time-trial', 'hill-climb', 'speedway'];
  const baseUrl = 'https://script.google.com/macros/s/AKfycby1IBTyMP-KaiE26FYsxGe1TrmGdLDU-80nV2jZ9luZrkXaBVS3lVFttlLoDIWUX_HuSQ/exec?type=';
  
  // Create array of promises for parallel loading
  const preloadPromises = categories
    .filter(category => category !== currentCategory && !eventCache.hasValidCache(category))
    .map(category => 
      fetch(baseUrl + category)
        .then(res => res.json())
        .then(data => {
          eventCache.setCache(category, data);
          console.log(`Preloaded ${category} data`);
        })
        .catch(() => {
          console.log(`Failed to preload ${category} data`);
        })
    );
  
  // Execute all preloads in parallel
  Promise.all(preloadPromises)
    .then(() => console.log('All preloading completed'))
    .catch(() => console.log('Some preloading failed'));
} 