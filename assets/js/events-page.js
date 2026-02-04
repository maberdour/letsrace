/**
 * Events Page Module
 * 
 * Shared ES module for event type pages that handles:
 * - Data fetching from manifest and shards
 * - Client-side filtering by region only
 * - URL state management
 * - Accessible rendering
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

// Parse URL parameters
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  // Handle both 'regions' (plural) and 'region' (singular) parameters
  let regions = [];
  if (params.get('regions')) {
    regions = params.get('regions').split(',');
  } else if (params.get('region')) {
    regions = [params.get('region')];
  }
  return {
    regions: regions
  };
}

// Update URL without page reload
function updateUrl(params) {
  const url = new URL(window.location);
  const searchParams = url.searchParams;
  
  // Clear existing params
  searchParams.delete('regions');
  
  // Add non-default params
  if (params.regions.length > 0) searchParams.set('regions', params.regions.join(','));
  
  history.replaceState({}, '', url);
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
    
    // Region filtering - if no regions selected, show no events
    if (filters.regions.length === 0) return false;
    if (!filters.regions.includes(event.region)) return false;
    
    return true;
  });
}

// Sort events by date then name
function sortEvents(events) {
  return events.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.name.localeCompare(b.name);
  });
}

// Render event card
function renderEventCard(event) {
  const d = new Date(event.date);
  const dayName = d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  
  const postcodeDisplay = event.postcode ? ` • ${event.postcode}` : '';
  
  // Check if event is newly added
  const imported = event.last_updated || '';
  const added = new Date(imported);
  const now = new Date();
  const daysAgo = new Date(now.getTime() - (NEW_EVENT_DAYS * 24 * 60 * 60 * 1000));
  
  let isNewlyAdded = false;
  if (!isNaN(added.getTime())) {
    const addedMidnight = new Date(added.getFullYear(), added.getMonth(), added.getDate());
    const daysAgoMidnight = new Date(daysAgo.getFullYear(), daysAgo.getMonth(), daysAgo.getDate());
    isNewlyAdded = addedMidnight > daysAgoMidnight;
  }
  
  return `
    <li class="${isNewlyAdded ? 'newly-added' : ''}">
      <div class="date-square">
        <div class="day-name">${dayName}</div>
        <div class="day-number">${day}</div>
        <div class="month">${month}</div>
      </div>
      <article>
        ${isNewlyAdded ? '<span class="new-badge">NEW</span>' : ''}
        <h3><a href="${event.url}" target="_blank" rel="noopener">${event.name}</a></h3>
        <p class="event-location">${event.venue}${postcodeDisplay}${event.region ? ` • ${event.region}` : ''}</p>
      </article>
    </li>
  `;
}

// Convert kebab-case page type to discipline name
function getDisciplineName(pageType) {
  const disciplineMap = {
    'road': 'Road',
    'track': 'Track',
    'bmx': 'BMX',
    'mtb': 'MTB',
    'cyclo-cross': 'Cyclo-Cross',
    'speedway': 'Speedway',
    'time-trial': 'Time Trial',
    'hill-climb': 'Hill Climb'
  };
  return disciplineMap[pageType] || 'events';
}

// Render events list
function renderEvents(events, container, countElement, emptyElement, filters, disciplineName) {
  // Update count
  const count = events.length;
  
  // Show/hide count and empty state
  if (count > 0) {
    countElement.textContent = `${count} upcoming events`;
    countElement.hidden = false;
    emptyElement.hidden = true;
    const eventCards = events.map(renderEventCard).join('');
    container.innerHTML = eventCards;
  } else {
    countElement.hidden = true;
    emptyElement.hidden = false;
    container.innerHTML = '';
    
    // Check if this is due to filters or no events at all
    const hasFilters = filters.regions.length > 0;
    if (hasFilters) {
      emptyElement.innerHTML = `There are no upcoming ${disciplineName} events currently listed in the regions you selected.<br><br>Try adjusting the filter by selecting adjacent regions, as there may be other events not too far away.`;
    } else {
      emptyElement.textContent = 'No Upcoming Events Found';
    }
  }
}

// Update build stamp
function updateBuildStamp(buildStampElement, facets) {
  const today = getTodayDate();
  const buildDate = new Date(facets.last_build).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  
  buildStampElement.textContent = `Data updated: ${buildDate} • Today: ${today}`;
}

// Update the "Updated on" date
function updateDate() {
  const updateTimeElement = document.querySelector('.update-time');
  if (updateTimeElement) {
    const today = new Date().toLocaleDateString('en-GB', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    }).replace(',', '');
    updateTimeElement.textContent = `Updated on ${today}`;
  }
}

// Track analytics events
function trackAnalytics(event, data) {
  if (window.plausible) {
    window.plausible(event, { props: data });
  }
}

// Initialize the events page
export function initEventsPage() {
  // Get page type from body data attribute
  const pageType = document.body.getAttribute('data-type');
  if (!pageType) {
    console.error('Missing data-type attribute on body element');
    return;
  }
  
  // Get discipline name from page type
  const disciplineName = getDisciplineName(pageType);
  
  // Burger menu is now handled by render.js
  
  // Get DOM elements
  const regionCheckboxes = document.getElementById('region-checkboxes');
  const selectAllRegionsButton = document.getElementById('select-all-regions');
  const clearRegionsButton = document.getElementById('clear-regions');
  const resultCount = document.getElementById('result-count');
  const emptyState = document.getElementById('empty-state');
  const eventList = document.getElementById('event-list');
  const buildStamp = document.getElementById('build-stamp');
  const filterToggle = document.getElementById('filter-toggle');
  const filterContent = document.getElementById('filter-content');
  
  // Validate required elements
  if (!regionCheckboxes || !clearRegionsButton || 
      !resultCount || !emptyState || !eventList || !buildStamp) {
    console.error('Missing required DOM elements for events page');
    return;
  }
  
  let allEvents = [];
  let facets = null;
  
  // Parse initial URL params
  const initialParams = parseUrlParams();
  
  // Fetch data and initialize page
  async function initializePage() {
    try {
      recordMilestone('initialization_start');
      console.log('🔄 Starting data fetch...');
      
      // Load manifest to get latest file versions
      const manifestResponse = await fetch('/data/manifest.json');
      const manifest = await manifestResponse.json();
      const typeShardUrl = manifest.type[pageType];
      const facetsUrl = manifest.index.facets;
      
      console.log('🔗 Fetching data files directly:', { typeShardUrl, facetsUrl });
      recordMilestone('data_fetch_start');
      
      // Fetch facets and type shard in parallel with timeout and error handling
      const facetsController = new AbortController();
      const eventsController = new AbortController();
      const facetsTimeout = setTimeout(() => facetsController.abort(), 10000);
      const eventsTimeout = setTimeout(() => eventsController.abort(), 10000);
      
      const [facetsResponse, eventsResponse] = await Promise.all([
        fetch(facetsUrl, {
          signal: facetsController.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }),
        fetch(typeShardUrl, {
          signal: eventsController.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        })
      ]);
      
      clearTimeout(facetsTimeout);
      clearTimeout(eventsTimeout);
      
      if (!facetsResponse.ok) {
        console.error('❌ Facets fetch failed:', facetsResponse.status, facetsResponse.statusText);
        throw new Error(`Failed to fetch facets: ${facetsResponse.status}`);
      }
      if (!eventsResponse.ok) {
        console.error('❌ Events fetch failed:', eventsResponse.status, eventsResponse.statusText);
        throw new Error(`Failed to fetch events: ${eventsResponse.status}`);
      }
      
      facets = await facetsResponse.json();
      allEvents = await eventsResponse.json();
      
      // Validate data structure
      if (!facets || !Array.isArray(facets.regions)) {
        throw new Error('Invalid facets data structure received');
      }
      if (!Array.isArray(allEvents)) {
        throw new Error('Invalid events data structure received');
      }
      
      console.log('✅ Data loaded:', { facetsCount: facets.regions?.length, eventsCount: allEvents.length });
      recordMilestone('data_loaded');
      
      // Populate region checkboxes
      const savedRegions = loadSavedRegions();
      const urlParams = parseUrlParams();
      // Use URL params if present, else saved regions, else all regions (same default as homepage)
      const initialRegions = urlParams.regions.length > 0 ? urlParams.regions : (savedRegions.length > 0 ? savedRegions : facets.regions);
      
      regionCheckboxes.innerHTML = facets.regions.map(region => `
        <label class="region-checkbox">
          <input type="checkbox" value="${region}"${initialRegions.includes(region) ? ' checked' : ''}>
          <span class="checkmark"></span>
          ${region}
        </label>
      `).join('');
      
      // Update build stamp
      updateBuildStamp(buildStamp, facets);
      
      // Update the date
      updateDate();
      
      // Apply initial filters
      applyFilters();
      recordMilestone('page_fully_loaded');
      logPerformanceSummary();
      
    } catch (error) {
      console.error('Failed to initialize events page:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Sorry, we couldn\'t load the events data.';
      let userAction = 'Please try refreshing the page.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'The request timed out.';
        userAction = 'Please check your internet connection and try again.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error occurred.';
        userAction = 'Please check your internet connection and try again.';
      } else if (error.message.includes('HTTP 404')) {
        errorMessage = 'Event data not found.';
        userAction = 'The page may need to be updated. Please try refreshing.';
      } else if (error.message.includes('HTTP 500')) {
        errorMessage = 'Server error occurred.';
        userAction = 'Please try again in a few minutes.';
      } else if (error.message.includes('Invalid')) {
        errorMessage = 'Data format error.';
        userAction = 'Please try refreshing the page.';
      }
      
      eventList.innerHTML = `
        <li>
          <div class="error-message">
            <p><strong>${errorMessage}</strong></p>
            <p>${userAction}</p>
            <button onclick="window.location.reload()" class="retry-button">Retry</button>
          </div>
        </li>
      `;
      resultCount.textContent = 'Error loading events';
      
      // Hide loading states
      const loadingMessages = document.querySelectorAll('.loading-message');
      loadingMessages.forEach(msg => msg.style.display = 'none');
    }
  }
  
  // Apply current filters and render
  function applyFilters() {
    const filters = {
      regions: getSelectedRegions()
    };
    
    // Filter and sort events
    const filteredEvents = sortEvents(filterEvents(allEvents, filters));
    
    // Render results
    renderEvents(filteredEvents, eventList, resultCount, emptyState, filters, disciplineName);
    
    // Update URL
    updateUrl(filters);
    
    // Store selected regions in localStorage for persistence
    if (filters.regions.length > 0) {
      localStorage.setItem('selectedRegions', JSON.stringify(filters.regions));
    } else {
      localStorage.removeItem('selectedRegions');
    }
    
    // Track analytics
    trackAnalytics('filter_change', {
      type: pageType,
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
  
  // Apply filter button removed - filtering is now instant
  
  // Select all regions button
  if (selectAllRegionsButton) {
    selectAllRegionsButton.addEventListener('click', () => {
      const checkboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = true);
      applyFilters();
    });
  }
  
  // Clear regions button
  clearRegionsButton.addEventListener('click', () => {
    const checkboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    applyFilters();
  });
  
  // Filter toggle functionality
  if (filterToggle && filterContent) {
    filterToggle.addEventListener('click', () => {
      filterToggle.classList.toggle('expanded');
      filterContent.classList.toggle('expanded');
    });
  }
  
  // Event link tracking
  eventList.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.href) {
      const eventId = e.target.closest('li')?.querySelector('a')?.href;
      if (eventId) {
        trackAnalytics('card_click', {
          type: pageType,
          regions: getSelectedRegions().join(','),
          event_id: eventId
        });
      }
    }
  });
  
  // Initialize the page
  initializePage();
}

// Auto-initialize if module is loaded directly
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventsPage);
} else {
  initEventsPage();
}
