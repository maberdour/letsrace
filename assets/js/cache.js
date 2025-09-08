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

  // Clear caches for a specific region
  clearRegionCaches(region) {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.cachePrefix) && key.includes(`_${region}`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Failed to clear region caches:', e);
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
window.eventCache = eventCache; // Make it globally accessible

// Enhanced fetch function with caching, timeout, and better error handling
async function fetchWithCache(url, category) {
  // Extract region parameter from URL for cache key
  const urlObj = new URL(url);
  const region = urlObj.searchParams.get('region') || '';
  const cacheKey = region ? `${category}_${region}` : category;
  
  // Try to get from cache first
  const cachedData = eventCache.getCache(cacheKey);
  if (cachedData) {
    console.log(`Using cached data for ${cacheKey}`);
    return cachedData;
  }

  // If not in cache, fetch from server with optimized timeout
  console.log(`Fetching fresh data for ${category}`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`Request timeout for ${category}`);
      controller.abort();
    }, 5000); // Reduced to 5s for faster failure recovery
    
    const response = await fetch(url, {
      signal: controller.signal,
      priority: 'high',
      // Add headers to prevent caching issues
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate data before caching
    if (Array.isArray(data) || (typeof data === 'object' && data !== null)) {
    eventCache.setCache(cacheKey, data);
    } else {
      console.warn(`Invalid data format for ${category}:`, typeof data);
    }
    
    return data;
  } catch (error) {
    console.error(`Fetch error for ${category}:`, error.name, error.message);
    
    // Always try to return expired cache as fallback
    const expiredCache = eventCache.getExpiredCache(cacheKey);
    if (expiredCache) {
      console.log(`Using expired cache for ${cacheKey} as fallback`);
      return expiredCache;
    }
    
    // If no cache at all, return empty array instead of throwing
    console.log(`No cache available for ${cacheKey}, returning empty array`);
    return [];
  }
}

// Smart preloading - only preload what's likely to be needed
function preloadOtherCategories(currentCategory) {
  // Skip preloading on homepage for instant loading
  if (currentCategory === 'homepage') {
    console.log('Skipping preloading on homepage for instant loading');
    return;
  }
  
  // Only preload the most popular categories and regions
  const priorityCategories = ['road', 'mtb', 'track', 'bmx'];
  const priorityRegions = ['', 'south-east', 'south-west', 'central']; // Most popular regions
  
  const baseUrl = 'https://script.google.com/macros/s/AKfycby1IBTyMP-KaiE26FYsxGe1TrmGdLDU-80nV2jZ9luZrkXaBVS3lVFttlLoDIWUX_HuSQ/exec?type=';
  
  // Create array of promises for priority preloading
  const preloadPromises = [];
  
  priorityCategories.forEach(category => {
    // Skip current category since it's already loading
    if (category === currentCategory) return;
    
    priorityRegions.forEach(region => {
      const cacheKey = region ? `${category}_${region}` : category;
      
      // Skip if we already have valid cache for this combination
      if (eventCache.hasValidCache(cacheKey)) {
        return;
      }
      
      const url = baseUrl + category + (region ? `&region=${region}` : '');
      const promise = fetch(url)
        .then(res => res.json())
        .then(data => {
          eventCache.setCache(cacheKey, data);
          console.log(`Preloaded ${cacheKey} data`);
        })
        .catch(() => {
          console.log(`Failed to preload ${cacheKey} data`);
        });
      
      preloadPromises.push(promise);
    });
  });
  
  // Defer preloading to avoid blocking the main page load
  setTimeout(() => {
    if (preloadPromises.length > 0) {
      console.log(`Starting deferred preloading of ${preloadPromises.length} priority combinations`);
      
      // Execute preloads with very limited concurrency
      const batchSize = 2; // Reduced from 5 to 2
      const processBatch = async (batch) => {
        await Promise.all(batch);
      };
      
      for (let i = 0; i < preloadPromises.length; i += batchSize) {
        const batch = preloadPromises.slice(i, i + batchSize);
        processBatch(batch).catch(() => console.log('Some preloading failed'));
      }
    }
  }, 2000); // Wait 2 seconds before starting preloading
} 