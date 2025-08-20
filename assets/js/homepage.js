/**
 * Homepage Module
 * 
 * ES module for homepage that handles:
 * - Data fetching from manifest and new events
 * - Client-side filtering by region
 * - Mobile filter panel functionality
 * - Burger menu functionality
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
  // Create burger menu
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
    nav.innerHTML = `
      <div id="close-menu"></div>
      <ul>
        <li><a href="index.html" class="current">Home</a></li>
        <li><a href="pages/road/">Road</a></li>
        <li><a href="pages/track/">Track</a></li>
        <li><a href="pages/mtb/">MTB</a></li>
        <li><a href="pages/bmx/">BMX</a></li>
        <li><a href="pages/cyclo-cross/">Cyclo-Cross</a></li>
        <li><a href="pages/time-trial/">Time Trial</a></li>
        <li><a href="pages/hill-climb/">Hill Climb</a></li>
        <li><a href="pages/speedway/">Speedway</a></li>
        <li><a href="pages/about.html">About</a></li>
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
  
  // Fetch data and initialize page
  async function initializePage() {
    try {
      console.log('🔄 Starting homepage data fetch...');
      
      // Fetch manifest
      console.log('📄 Fetching manifest...');
      const manifestResponse = await fetch('/data/manifest.json');
      if (!manifestResponse.ok) {
        console.error('❌ Manifest fetch failed:', manifestResponse.status, manifestResponse.statusText);
        throw new Error(`Failed to fetch manifest: ${manifestResponse.status}`);
      }
      const manifest = await manifestResponse.json();
      console.log('✅ Manifest loaded:', manifest);
      
      // Get URLs for facets and new events
      const facetsUrl = manifest.index.facets;
      const newEventsUrl = manifest.new_events;
      
      if (!facetsUrl || !newEventsUrl) {
        console.error('❌ Invalid manifest structure:', { facetsUrl, newEventsUrl });
        throw new Error('Invalid manifest structure');
      }
      
      console.log('🔗 Fetching data files:', { facetsUrl, newEventsUrl });
      
      // Fetch facets and new events in parallel
      const [facetsResponse, newEventsResponse] = await Promise.all([
        fetch(facetsUrl),
        fetch(newEventsUrl)
      ]);
      
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
      const regionHtml = facets.regions.map(region => `
        <label class="region-checkbox">
          <input type="checkbox" value="${region}">
          <span class="checkmark"></span>
          ${region}
        </label>
      `).join('');
      
      regionCheckboxes.innerHTML = regionHtml;
      
      // Populate mobile region checkboxes
      if (mobileRegionCheckboxes) {
        mobileRegionCheckboxes.innerHTML = regionHtml;
      }
      
      // Update build stamp
      updateBuildStamp(document.getElementById('build-stamp'), facets);
      
      // Update the date
      updateDate();
      
      // Apply initial filters
      applyFilters();
      
    } catch (error) {
      console.error('Failed to initialize homepage:', error);
      newEventsContainer.innerHTML = `
        <div class="no-events">
          <p>Sorry, we couldn't load the new events. Please try refreshing the page.</p>
        </div>
      `;
    }
  }
  
  // Apply current filters and render
  function applyFilters() {
    const filters = {
      regions: getSelectedRegions()
    };
    
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
    
    // Apply region filtering
    const filteredEvents = filters.regions.length > 0 
      ? newEvents.filter(event => filters.regions.includes(event.region))
      : newEvents;
    
    // Sort and render
    const sortedEvents = sortEvents(filteredEvents);
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
