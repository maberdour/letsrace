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

// Enhanced fetch function with caching and timeout
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
    eventCache.setCache(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    if (error.name === 'AbortError') {
      console.log('Request timed out, showing cached data if available');
      // Return cached data even if expired as fallback
      const expiredCache = eventCache.getExpiredCache(cacheKey);
      if (expiredCache) {
        return expiredCache;
      }
    }
    throw error;
  }
}

// Preload data for all categories and regions in parallel
function preloadOtherCategories(currentCategory) {
  const categories = ['road', 'mtb', 'track', 'bmx', 'cyclo-cross', 'time-trial', 'hill-climb', 'speedway'];
  const regions = ['', 'south-east', 'south-west', 'london', 'east', 'midlands', 'north-west', 'north-east', 'yorkshire', 'wales', 'scotland', 'northern-ireland'];
  const baseUrl = 'https://script.google.com/macros/s/AKfycby1IBTyMP-KaiE26FYsxGe1TrmGdLDU-80nV2jZ9luZrkXaBVS3lVFttlLoDIWUX_HuSQ/exec?type=';
  
  // Create array of promises for parallel loading
  const preloadPromises = [];
  
  categories.forEach(category => {
    regions.forEach(region => {
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
  
  // Execute all preloads in parallel (but limit concurrent requests to avoid overwhelming the server)
  const batchSize = currentCategory === 'homepage' ? 3 : 5; // Smaller batches on homepage
  const processBatch = async (batch) => {
    await Promise.all(batch);
  };
  
  // Add a small delay on homepage to not block initial page load
  const startPreloading = () => {
    for (let i = 0; i < preloadPromises.length; i += batchSize) {
      const batch = preloadPromises.slice(i, i + batchSize);
      processBatch(batch).catch(() => console.log('Some preloading failed'));
    }
  };
  
  if (currentCategory === 'homepage') {
    // Delay preloading on homepage to prioritize page display
    setTimeout(startPreloading, 500);
  } else {
    startPreloading();
  }
  
  console.log(`Started preloading ${preloadPromises.length} data combinations`);
} 