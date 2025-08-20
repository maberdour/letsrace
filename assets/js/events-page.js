/**
 * Events Page Module
 * 
 * Shared ES module for event type pages that handles:
 * - Data fetching from manifest and shards
 * - Client-side filtering by region only
 * - URL state management
 * - Accessible rendering
 * - Analytics tracking
 */

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
  return {
    regions: params.get('regions') ? params.get('regions').split(',') : []
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

// Render events list
function renderEvents(events, container, countElement, emptyElement, filters) {
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
    emptyElement.textContent = hasFilters ? 'No events match your filters.' : 'No Upcoming Events Found';
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
  
  // Create burger menu for mobile
  function createBurgerMenu() {
    // Create burger icon
    const burger = document.createElement('div');
    burger.id = 'burger-menu';
    burger.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;

    // Create nav menu (same links as header)
    const nav = document.createElement('nav');
    nav.id = 'mobile-nav';
    
    // Determine current page for highlighting
    const currentPage = pageType;
    
    nav.innerHTML = `
      <div id="close-menu"></div>
      <ul>
        <li><a href="/index.html" class="${currentPage === 'home' ? 'current' : ''}">Home</a></li>
        <li><a href="/pages/road/" class="${currentPage === 'road' ? 'current' : ''}">Road</a></li>
        <li><a href="/pages/track/" class="${currentPage === 'track' ? 'current' : ''}">Track</a></li>
        <li><a href="/pages/mtb/" class="${currentPage === 'mtb' ? 'current' : ''}">MTB</a></li>
        <li><a href="/pages/bmx/" class="${currentPage === 'bmx' ? 'current' : ''}">BMX</a></li>
        <li><a href="/pages/cyclo-cross/" class="${currentPage === 'cyclo-cross' ? 'current' : ''}">Cyclo-Cross</a></li>
        <li><a href="/pages/time-trial/" class="${currentPage === 'time-trial' ? 'current' : ''}">Time Trial</a></li>
        <li><a href="/pages/hill-climb/" class="${currentPage === 'hill-climb' ? 'current' : ''}">Hill Climb</a></li>
        <li><a href="/pages/speedway/" class="${currentPage === 'speedway' ? 'current' : ''}">Speedway</a></li>
        <li><a href="/pages/about.html" class="${currentPage === 'about' ? 'current' : ''}">About</a></li>
      </ul>
    `;

    // Append burger to header, nav to body
    const header = document.querySelector('header');
    if (header) header.appendChild(burger);
    document.body.appendChild(nav);

    burger.addEventListener('click', () => {
      nav.classList.toggle('open');
      burger.classList.toggle('open');
    });

    // Close menu when a link is clicked
    nav.addEventListener('click', function(e) {
      if (e.target.tagName === 'A' || e.target.id === 'close-menu') {
        nav.classList.remove('open');
        burger.classList.remove('open');
      }
    });
  }
  
  // Initialize burger menu
  createBurgerMenu();
  
  // Get DOM elements
  const regionCheckboxes = document.getElementById('region-checkboxes');
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
      console.log('🔄 Starting data fetch...');
      
      // Fetch manifest
      console.log('📄 Fetching manifest...');
      const manifestResponse = await fetch('/data/manifest.json');
      if (!manifestResponse.ok) {
        console.error('❌ Manifest fetch failed:', manifestResponse.status, manifestResponse.statusText);
        throw new Error(`Failed to fetch manifest: ${manifestResponse.status}`);
      }
      const manifest = await manifestResponse.json();
      console.log('✅ Manifest loaded:', manifest);
      
      // Get URLs for this page type
      const typeShardUrl = manifest.type[pageType];
      const facetsUrl = manifest.index.facets;
      
      if (!typeShardUrl || !facetsUrl) {
        console.error('❌ Invalid manifest structure:', { typeShardUrl, facetsUrl });
        throw new Error('Invalid manifest structure');
      }
      
      console.log('🔗 Fetching data files:', { typeShardUrl, facetsUrl });
      
      // Fetch facets and type shard in parallel
      const [facetsResponse, eventsResponse] = await Promise.all([
        fetch(facetsUrl),
        fetch(typeShardUrl)
      ]);
      
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
      console.log('✅ Data loaded:', { facetsCount: facets.regions?.length, eventsCount: allEvents.length });
      
      // Populate region checkboxes
      regionCheckboxes.innerHTML = facets.regions.map(region => `
        <label class="region-checkbox">
          <input type="checkbox" value="${region}"${initialParams.regions.includes(region) ? ' checked' : ''}>
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
      
    } catch (error) {
      console.error('Failed to initialize events page:', error);
      eventList.innerHTML = `
        <li>
          <p>Sorry, we couldn't load the events data. Please try refreshing the page.</p>
        </li>
      `;
      resultCount.textContent = 'Error loading events';
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
    renderEvents(filteredEvents, eventList, resultCount, emptyState, filters);
    
    // Update URL
    updateUrl(filters);
    
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
