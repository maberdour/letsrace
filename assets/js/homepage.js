/**
 * Homepage Module
 * 
 * ES module for homepage that handles:
 * - Data fetching from manifest and new events
 * - Client-side filtering by region
 * - Mobile filter panel functionality
 * - Burger menu functionality
 * - Analytics tracking
 * - Performance monitoring
 */

// Performance monitoring
const performanceMetrics = {
  startTime: performance.now(),
  milestones: {}
};

function recordMilestone(name) {
  performanceMetrics.milestones[name] = performance.now() - performanceMetrics.startTime;
  console.log(`⏱️ ${name}: ${performanceMetrics.milestones[name].toFixed(2)}ms`);
}

function logPerformanceSummary() {
  const totalTime = performance.now() - performanceMetrics.startTime;
  console.log('📊 Performance Summary:', {
    totalLoadTime: `${totalTime.toFixed(2)}ms`,
    milestones: performanceMetrics.milestones
  });
  
  // Log to analytics if available
  if (window.gtag) {
    window.gtag('event', 'page_performance', {
      load_time: Math.round(totalTime),
      milestones: performanceMetrics.milestones
    });
  }
}

// Number of days after which an event is no longer considered "NEW"
const NEW_EVENT_DAYS = 7;

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Get today's date in Europe/London timezone as YYYY-MM-DD
function getTodayDate() {
  const now = new Date();
  const ukDate = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));
  return ukDate.toISOString().split('T')[0];
}

// Normalize region names for comparison
function normalizeRegionName(region) {
  if (!region) return '';
  return region.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Get selected regions from checkboxes
function getSelectedRegions() {
  const checkboxes = document.querySelectorAll('#region-checkboxes input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// Load saved regions from localStorage
function loadSavedRegions() {
  try {
    const saved = localStorage.getItem('selectedRegions');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading saved regions:', error);
    return [];
  }
}

// Filter events based on criteria
function filterEvents(events, filters) {
  const today = getTodayDate();
  
  return events.filter(event => {
    // Only show events from today onwards
    if (event.date < today) return false;
    
    // Region filtering
    if (filters.regions.length > 0 && !filters.regions.includes(event.region)) return false;
    
    return true;
  });
}

// Sort events by date then name, limit to 50
function sortEvents(events) {
  return events.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.name.localeCompare(b.name);
  }).slice(0, 50); // Limit to 50 events
}

// Render homepage event card
function renderHomepageEventCard(event) {
  const d = new Date(event.date);
  const dayName = d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  
  return `
    <a href="${event.url}" target="_blank" class="event newly-added">
      <div class="date-square">
        <div class="day-name">${dayName}</div>
        <div class="day-number">${day}</div>
        <div class="month">${month}</div>
      </div>
      <div class="event-content">
        <span class="new-badge">NEW</span>
        <h2>${event.name}</h2>
        <p class="event-location">${event.venue}${event.region ? ` • ${event.region}` : ''}</p>
      </div>
    </a>
  `;
}

// Render events for homepage
function renderHomepageEvents(events, container, titleElement) {
  if (events.length === 0) {
    container.innerHTML = '<div class="no-events"><p>No new events found for the selected regions.</p></div>';
    if (titleElement) {
      titleElement.textContent = 'New Events';
    }
    return;
  }
  
  const eventsHtml = events.map(renderHomepageEventCard).join('');
  container.innerHTML = `<div class="events-list">${eventsHtml}</div>`;
  
  if (titleElement) {
    titleElement.textContent = 'New Events';
  }
}

// Track analytics
function trackAnalytics(action, data = {}) {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      event_category: 'homepage',
      ...data
    });
  }
}

// Update build stamp
function updateBuildStamp(buildStamp, facets) {
  if (buildStamp && facets?.last_build) {
    const buildDate = new Date(facets.last_build);
    buildStamp.textContent = `Last updated: ${buildDate.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })}`;
  }
}

// Update the date
function updateDate() {
  const dateElement = document.querySelector('.update-time');
  if (dateElement) {
    const now = new Date();
    dateElement.textContent = `Updated on ${now.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })}`;
  }
}



// Main initialization function
function initHomepage() {
  console.log('🚀 Homepage module initializing...');
  // Burger menu is now handled by render.js
  
  // Get DOM elements
  const regionCheckboxes = document.getElementById('region-checkboxes');
  const mobileRegionCheckboxes = document.getElementById('mobile-region-checkboxes');
  const clearRegionsButton = document.getElementById('clear-regions');
  const mobileClearRegionsButton = document.getElementById('mobile-clear-regions');
  const newEventsContainer = document.getElementById('new-events');
  const newEventsTitle = document.getElementById('new-events-title');
  const mobileFilterBtn = document.getElementById('mobile-filter-btn');
  const mobileFilterPanel = document.getElementById('mobile-filter-panel');
  const filterToggle = document.getElementById('filter-toggle');
  const filterContent = document.getElementById('filter-content');
  
  // Validate required elements
  console.log('🔍 Validating DOM elements:', {
    regionCheckboxes: !!regionCheckboxes,
    clearRegionsButton: !!clearRegionsButton,
    newEventsContainer: !!newEventsContainer,
    newEventsTitle: !!newEventsTitle,
    mobileFilterBtn: !!mobileFilterBtn,
    mobileFilterPanel: !!mobileFilterPanel,
    filterToggle: !!filterToggle,
    filterContent: !!filterContent
  });
  
  if (!regionCheckboxes || !clearRegionsButton || !newEventsContainer || !newEventsTitle) {
    console.error('Missing required DOM elements for homepage');
    return;
  }
  
  let allEvents = [];
  let facets = null;
  
  // Ensure filter state is properly restored
  function restoreFilterState() {
    const savedRegions = loadSavedRegions();
    console.log('🔄 Restoring filter state:', savedRegions);
    
    // Update desktop checkboxes
    const desktopCheckboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');
    desktopCheckboxes.forEach(cb => {
      cb.checked = savedRegions.includes(cb.value);
    });
    
    // Update mobile checkboxes
    if (mobileRegionCheckboxes) {
      const mobileCheckboxes = mobileRegionCheckboxes.querySelectorAll('input[type="checkbox"]');
      mobileCheckboxes.forEach(cb => {
        cb.checked = savedRegions.includes(cb.value);
      });
    }
    
    console.log('✅ Filter state restored');
  }
  
  // Fetch data and initialize page with enhanced error handling
  async function initializePage() {
    try {
      recordMilestone('initialization_start');
      console.log('🔄 Starting homepage data fetch...');
      
      // Direct URLs for facets and new events (no manifest needed)
      const facetsUrl = '/data/index/facets.v20250908.json';
      const newEventsUrl = '/data/new-events.v20250908.json';
      
      console.log('🔗 Fetching data files directly:', { facetsUrl, newEventsUrl });
      recordMilestone('data_fetch_start');
      
      // Fetch facets and new events in parallel with individual timeouts
      console.log('🔗 Fetching facets from:', facetsUrl);
      console.log('🔗 Fetching new events from:', newEventsUrl);
      
      const facetsController = new AbortController();
      const newEventsController = new AbortController();
      
      const facetsTimeout = setTimeout(() => {
        console.warn('Facets fetch timeout');
        facetsController.abort();
      }, 5000);
      
      const newEventsTimeout = setTimeout(() => {
        console.warn('New events fetch timeout');
        newEventsController.abort();
      }, 5000);
      
      const [facetsResponse, newEventsResponse] = await Promise.all([
        fetch(facetsUrl, {
          signal: facetsController.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch(newEventsUrl, {
          signal: newEventsController.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
      ]);
      
      clearTimeout(facetsTimeout);
      clearTimeout(newEventsTimeout);
      
      console.log('📄 Facets response status:', facetsResponse.status, facetsResponse.statusText);
      console.log('📄 New events response status:', newEventsResponse.status, newEventsResponse.statusText);
      
      if (!facetsResponse.ok) {
        console.error('❌ Facets fetch failed:', facetsResponse.status, facetsResponse.statusText);
        throw new Error(`Failed to fetch facets: ${facetsResponse.status}`);
      }
      if (!newEventsResponse.ok) {
        console.error('❌ New events fetch failed:', newEventsResponse.status, newEventsResponse.statusText);
        throw new Error(`Failed to fetch new events: ${newEventsResponse.status}`);
      }
      
      facets = await facetsResponse.json();
      const newEventsData = await newEventsResponse.json();
      
      if (!newEventsData.events || !Array.isArray(newEventsData.events)) {
        throw new Error('Invalid new events data format');
      }
      
      allEvents = newEventsData.events;
      console.log('✅ Data loaded:', { facetsCount: facets.regions?.length, eventsCount: allEvents.length });
      
      // Populate region checkboxes
      const savedRegions = loadSavedRegions();
      console.log('🔍 Loading saved regions:', savedRegions); // Debug log

      const regionHtml = facets.regions.map(region => `
        <label class="region-checkbox">
          <input type="checkbox" value="${region}"${savedRegions.includes(region) ? ' checked' : ''}>
          <span class="checkmark"></span>
          ${region}
        </label>
      `).join('');
      
      regionCheckboxes.innerHTML = regionHtml;
      
      // Populate mobile region checkboxes with same saved state
      if (mobileRegionCheckboxes) {
        mobileRegionCheckboxes.innerHTML = facets.regions.map(region => `
          <label class="region-checkbox">
            <input type="checkbox" value="${region}"${savedRegions.includes(region) ? ' checked' : ''}>
            <span class="checkmark"></span>
            ${region}
          </label>
        `).join('');
      }

      // Debug: Verify checkboxes are properly set
      console.log('🔍 After populating checkboxes:');
      const desktopCheckboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
      const mobileCheckboxes = mobileRegionCheckboxes ? mobileRegionCheckboxes.querySelectorAll('input[type="checkbox"]:checked') : [];
      console.log('Desktop checked:', Array.from(desktopCheckboxes).map(cb => cb.value));
      console.log('Mobile checked:', Array.from(mobileCheckboxes).map(cb => cb.value));
      
      // Update build stamp
      updateBuildStamp(document.getElementById('build-stamp'), facets);
      
      // Update the date
      updateDate();
      
      // Restore filter state FIRST (before applying filters)
      restoreFilterState();
      
      // Then apply filters with the restored state
      applyFilters();
      recordMilestone('page_fully_loaded');
      logPerformanceSummary();
      
    } catch (error) {
      console.error('❌ Failed to initialize homepage:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Show user-friendly error message with retry option
      newEventsContainer.innerHTML = `
        <div class="error-message">
          <p><strong>Unable to load events</strong></p>
          <p>We're having trouble loading the latest events. This might be due to:</p>
          <ul style="text-align: left; display: inline-block; margin: 1rem 0;">
            <li>Network connectivity issues</li>
            <li>Server maintenance</li>
            <li>Browser cache problems</li>
          </ul>
          <button class="retry-button" onclick="window.location.reload()">
            🔄 Try Again
          </button>
          <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
            If the problem persists, please check your internet connection or try again later.
          </p>
        </div>
      `;
      
      // Track error for analytics
      if (window.gtag) {
        window.gtag('event', 'page_error', {
          error_type: 'initialization_failed',
          error_message: error.message,
          error_name: error.name
        });
      }
    }
  }
  
  // Apply current filters and render
  function applyFilters() {
    const filters = {
      regions: getSelectedRegions()
    };
    
    console.log('🔍 applyFilters called with regions:', filters.regions);
    console.log('🔍 Total events loaded:', allEvents.length);
    
    // Filter for new events only (events updated within last 7 days)
    const newEvents = allEvents.filter(event => {
      const lastUpdated = event.last_updated || '';
      const updated = new Date(lastUpdated);
      const now = new Date();
      const daysAgo = new Date(now.getTime() - (NEW_EVENT_DAYS * 24 * 60 * 60 * 1000));
      
      if (!isNaN(updated.getTime())) {
        const updatedMidnight = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate());
        const daysAgoMidnight = new Date(daysAgo.getFullYear(), daysAgo.getMonth(), daysAgo.getDate());
        return updatedMidnight > daysAgoMidnight;
      }
      return false;
    });
    
    console.log('🔍 Events after "new" filter:', newEvents.length);
    
    // Apply region filtering
    const filteredEvents = filters.regions.length > 0 
      ? newEvents.filter(event => filters.regions.includes(event.region))
      : newEvents;
    
    console.log('🔍 Events after region filter:', filteredEvents.length);
    
    // Sort and render
    const sortedEvents = sortEvents(filteredEvents);
    console.log('🔍 Final sorted events:', sortedEvents.length);
    
    renderHomepageEvents(sortedEvents, newEventsContainer, newEventsTitle);
    
    // Update result count
    const resultCount = document.getElementById('result-count');
    if (resultCount) {
      if (sortedEvents.length === 0) {
        resultCount.textContent = 'No upcoming events';
      } else {
        resultCount.textContent = `${sortedEvents.length} upcoming events`;
      }
    }
    
    // Store selected regions in localStorage for persistence
    if (filters.regions.length > 0) {
      localStorage.setItem('selectedRegions', JSON.stringify(filters.regions));
    } else {
      localStorage.removeItem('selectedRegions');
    }
    
    // Track analytics
    trackAnalytics('filter_change', {
      regions: filters.regions.join(',')
    });
  }
  
  // Debounced filter application
  const debouncedApplyFilters = debounce(applyFilters, 200);
  
  // Event listeners
  regionCheckboxes.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      debouncedApplyFilters();
    }
  });
  
  // Mobile region checkboxes event listener
  if (mobileRegionCheckboxes) {
    mobileRegionCheckboxes.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        // Sync desktop checkboxes
        const desktopCheckbox = regionCheckboxes.querySelector(`input[value="${e.target.value}"]`);
        if (desktopCheckbox) {
          desktopCheckbox.checked = e.target.checked;
        }
        debouncedApplyFilters();
      }
    });
  }
  
  // Clear regions button
  clearRegionsButton.addEventListener('click', () => {
    const checkboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Clear mobile checkboxes too
    if (mobileRegionCheckboxes) {
      const mobileCheckboxes = mobileRegionCheckboxes.querySelectorAll('input[type="checkbox"]');
      mobileCheckboxes.forEach(cb => cb.checked = false);
    }
    
    applyFilters();
  });
  
  // Mobile clear regions button
  if (mobileClearRegionsButton) {
    mobileClearRegionsButton.addEventListener('click', () => {
      const checkboxes = mobileRegionCheckboxes.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
      
      // Clear desktop checkboxes too
      const desktopCheckboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');
      desktopCheckboxes.forEach(cb => cb.checked = false);
      
      applyFilters();
    });
  }
  
  // Filter toggle functionality
  if (filterToggle && filterContent) {
    filterToggle.addEventListener('click', () => {
      filterToggle.classList.toggle('expanded');
      filterContent.classList.toggle('expanded');
    });
  }
  
  // Mobile filter panel toggle
  if (mobileFilterBtn && mobileFilterPanel) {
    mobileFilterBtn.addEventListener('click', () => {
      mobileFilterPanel.classList.toggle('active');
    });
  }
  
  // Event link tracking
  newEventsContainer.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.href) {
      trackAnalytics('card_click', {
        regions: getSelectedRegions().join(',')
      });
    }
  });
  
  // Initialize the page
  console.log('✅ Homepage module setup complete, initializing page...');
  initializePage();
}

// Auto-initialize if module is loaded directly
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHomepage);
} else {
  initHomepage();
}
