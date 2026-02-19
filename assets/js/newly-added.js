/**
 * Newly Added Events Page Module
 * 
 * Handles:
 * - Data fetching from manifest and new events
 * - Client-side filtering by region
 * - Mobile filter panel functionality
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

// Default number of days after which an event is no longer considered "NEW"
const DEFAULT_NEW_EVENT_DAYS = 7;
const NATIONAL_TITLE_REGEX = /\bnational\b/i;
const EVENT_SCOPE_STORAGE_KEY = 'eventScope';

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

function loadSavedEventScope() {
  try {
    return localStorage.getItem(EVENT_SCOPE_STORAGE_KEY) || 'regional';
  } catch (error) {
    console.error('Error loading event scope:', error);
    return 'regional';
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

// Sort events by date then name
function sortEvents(events) {
  return events.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.name.localeCompare(b.name);
  });
}

// Render newly added event card
function renderNewlyAddedEventCard(event) {
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

// Render events for newly added page
function renderNewlyAddedEvents(events, container, titleElement, days, nationalOnly) {
  if (events.length === 0) {
    const rangeText = days === 1 ? 'the last 24 hours' : `the last ${days} days`;
    if (nationalOnly) {
      container.innerHTML = `<div class="no-events"><p>No recently added national events found in ${rangeText}.</p></div>`;
    } else {
      container.innerHTML = `<div class="no-events"><p>No recently added events found in ${rangeText} for the selected regions.</p></div>`;
    }
    if (titleElement) {
      titleElement.textContent = 'Newly Added Events';
    }
    return;
  }
  
  const eventsHtml = events.map(renderNewlyAddedEventCard).join('');
  container.innerHTML = `<div class="events-list">${eventsHtml}</div>`;
  
  if (titleElement) {
    titleElement.textContent = 'Newly Added Events';
  }
}

// Track analytics
function trackAnalytics(action, data = {}) {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      event_category: 'newly_added_page',
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
function initNewlyAddedPage() {
  console.log('🚀 Newly Added page module initializing...');
  
  // Get DOM elements
  const regionCheckboxes = document.getElementById('region-checkboxes');
  const selectAllRegionsButton = document.getElementById('select-all-regions');
  const clearRegionsButton = document.getElementById('clear-regions');
  const newEventsContainer = document.getElementById('new-events');
  const newEventsTitle = document.getElementById('new-events-title');
  const filterToggle = document.getElementById('filter-toggle');
  const filterContent = document.getElementById('filter-content');
  const eventScopeRadios = document.querySelectorAll('input[name="event-scope"]');
  const nationalOnlyToggle = document.getElementById('national-only');
  const regionFilter = document.querySelector('.region-filter');
  const newEventsToggle = document.getElementById('new-events-toggle');
  const introText = document.querySelector('.intro-text');
  
  // Validate required elements
  console.log('🔍 Validating DOM elements:', {
    regionCheckboxes: !!regionCheckboxes,
    clearRegionsButton: !!clearRegionsButton,
    newEventsContainer: !!newEventsContainer,
    newEventsTitle: !!newEventsTitle,
    filterToggle: !!filterToggle,
    filterContent: !!filterContent,
    newEventsToggle: !!newEventsToggle
  });
  
  if (!regionCheckboxes || !clearRegionsButton || !newEventsContainer || !newEventsTitle) {
    console.error('Missing required DOM elements for newly added page');
    return;
  }
  
  let allEvents = [];
  let facets = null;
  let selectedDays = DEFAULT_NEW_EVENT_DAYS;
  let savedRegionSelection = [];
  let currentScope = 'regional';

  /**
   * Update intro copy based on the selected day range.
   * @param {number} days
   */
  function updateIntroText(days) {
    if (!introText) return;
    const rangeText = days === 1 ? 'last day' : `last ${days} days`;
    introText.textContent = `These events were added to LetsRace.cc in the ${rangeText}.`;
  }
  
  // Ensure filter state is properly restored
  function restoreFilterState() {
    const savedRegions = loadSavedRegions();
    console.log('🔄 Restoring filter state:', savedRegions);
    
    // Update checkboxes
    const checkboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = savedRegions.includes(cb.value);
    });
    
    console.log('✅ Filter state restored');
  }
  
  // Fetch data and initialize page with enhanced error handling
  async function initializePage() {
    try {
      recordMilestone('initialization_start');
      console.log('🔄 Starting newly added page data fetch...');
      
      // Load manifest to get latest file versions
      const manifestResponse = await fetch('/data/manifest.json');
      const manifest = await manifestResponse.json();
      const facetsUrl = manifest.index.facets;
      const newEventsUrl = manifest.new_events;
      
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
      // Default to all regions when nothing saved (same as homepage and discipline pages)
      const initialRegions = savedRegions.length > 0 ? savedRegions : facets.regions;
      console.log('🔍 Loading saved regions:', savedRegions);

      const regionHtml = facets.regions.map(region => `
        <label class="region-checkbox">
          <input type="checkbox" value="${region}"${initialRegions.includes(region) ? ' checked' : ''}>
          <span class="checkmark"></span>
          ${region}
        </label>
      `).join('');
      
      regionCheckboxes.innerHTML = regionHtml;
      setRegionControlsEnabled(true);
      
      const savedScope = loadSavedEventScope();
      applyEventScope(savedScope, { applyFilters: false });
      
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
      console.error('❌ Failed to initialize newly added page:', error);
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
      regions: getSelectedRegions(),
      scope: currentScope
    };
    
    console.log('🔍 applyFilters called with regions:', filters.regions);
    console.log('🔍 Total events loaded:', allEvents.length);
    
    // Filter for new events only (events updated within selected days)
    const now = new Date();
    const daysAgo = new Date(now.getTime() - (selectedDays * 24 * 60 * 60 * 1000));
    console.log('📅 Current date:', now.toISOString());
    console.log(`📅 Cutoff date (${selectedDays} days ago):`, daysAgo.toISOString());
    console.log('📅 Selected days:', selectedDays);
    
    const newEvents = allEvents.filter(event => {
      const lastUpdated = event.last_updated || '';
      const updated = new Date(lastUpdated);
      
      if (!isNaN(updated.getTime())) {
        const updatedMidnight = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate());
        const daysAgoMidnight = new Date(daysAgo.getFullYear(), daysAgo.getMonth(), daysAgo.getDate());
        const isNew = updatedMidnight > daysAgoMidnight;
        
        if (isNew) {
          console.log('✅ New event found:', {
            name: event.name,
            last_updated: lastUpdated,
            updatedMidnight: updatedMidnight.toISOString(),
            daysAgoMidnight: daysAgoMidnight.toISOString()
          });
        }
        
        return isNew;
      }
      return false;
    });
    
    console.log('🔍 Events after "new" filter:', newEvents.length);
    
    const nationalFilteredEvents = filters.scope === 'national'
      ? newEvents.filter(event => NATIONAL_TITLE_REGEX.test(event.name || ''))
      : newEvents.filter(event => !NATIONAL_TITLE_REGEX.test(event.name || ''));
    
    console.log('🔍 Events after national filter:', nationalFilteredEvents.length);
    
    // Apply region filtering - if no regions selected, show no events
    const filteredEvents = filters.scope === 'national'
      ? nationalFilteredEvents
      : (filters.regions.length > 0 
        ? nationalFilteredEvents.filter(event => filters.regions.includes(event.region))
        : []);
    
    console.log('🔍 Events after region filter:', filteredEvents.length);
    
    // Sort and render
    const sortedEvents = sortEvents(filteredEvents);
    console.log('🔍 Final sorted events:', sortedEvents.length);
    
    renderNewlyAddedEvents(sortedEvents, newEventsContainer, newEventsTitle, selectedDays, filters.scope === 'national');
    
    // Hide result count
    const resultCount = document.getElementById('result-count');
    if (resultCount) {
      resultCount.style.display = 'none';
    }
    
    // Store selected regions in localStorage for persistence
    if (filters.scope === 'regional') {
      if (filters.regions.length > 0) {
        localStorage.setItem('selectedRegions', JSON.stringify(filters.regions));
      } else {
        localStorage.removeItem('selectedRegions');
      }
    }
    localStorage.setItem(EVENT_SCOPE_STORAGE_KEY, filters.scope);
    
    // Track analytics
    trackAnalytics('filter_change', {
      regions: filters.regions.join(','),
      event_scope: filters.scope
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

  function setRegionControlsEnabled(enabled) {
    if (regionFilter) {
      regionFilter.classList.toggle('is-disabled', !enabled);
    }
    const checkboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.disabled = !enabled;
    });
    if (selectAllRegionsButton) selectAllRegionsButton.disabled = !enabled;
    if (clearRegionsButton) clearRegionsButton.disabled = !enabled;
  }

  function applyEventScope(scope, options = { applyFilters: true }) {
    currentScope = scope === 'national' ? 'national' : 'regional';
    const checkboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');

    if (currentScope === 'national') {
      savedRegionSelection = getSelectedRegions();
      checkboxes.forEach(cb => cb.checked = true);
      setRegionControlsEnabled(false);
    } else {
      const regionsToRestore = savedRegionSelection.length > 0 ? savedRegionSelection : loadSavedRegions();
      checkboxes.forEach(cb => {
        cb.checked = regionsToRestore.includes(cb.value);
      });
      setRegionControlsEnabled(true);
    }

    if (eventScopeRadios.length > 0) {
      eventScopeRadios.forEach(radio => {
        radio.checked = radio.value === currentScope;
      });
    }
    if (nationalOnlyToggle) {
      nationalOnlyToggle.checked = currentScope === 'national';
    }

    if (options.applyFilters) {
      applyFilters();
    }
  }

  if (eventScopeRadios.length > 0) {
    eventScopeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        applyEventScope(radio.value);
      });
    });
  }
  
  if (nationalOnlyToggle) {
    nationalOnlyToggle.addEventListener('change', () => {
      applyEventScope(nationalOnlyToggle.checked ? 'national' : 'regional');
    });
  }
  
  // Filter toggle functionality
  if (filterToggle && filterContent) {
    filterToggle.addEventListener('click', () => {
      filterToggle.classList.toggle('expanded');
      filterContent.classList.toggle('expanded');
    });
  }

  // Recently added toggle
  if (newEventsToggle) {
    const toggleButtons = newEventsToggle.querySelectorAll('button[data-days]');
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const days = Number(button.getAttribute('data-days'));
        if (Number.isNaN(days) || days === selectedDays) return;

        selectedDays = days;
        toggleButtons.forEach(btn => {
          const isActive = btn === button;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        updateIntroText(selectedDays);
        applyFilters();
        trackAnalytics('days_toggle', { days: selectedDays });
      });
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
  console.log('✅ Newly Added page module setup complete, initializing page...');
  updateIntroText(selectedDays);
  initializePage();
}

// Auto-initialize if module is loaded directly
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNewlyAddedPage);
} else {
  initNewlyAddedPage();
}
