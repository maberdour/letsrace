// ============================================================================
// CONFIGURATION - Easy to edit settings for website maintainers
// ============================================================================

// Number of days after which an event is no longer considered "NEW"
const NEW_EVENT_DAYS = 2;

// ============================================================================
// END CONFIGURATION
// ============================================================================

// Register service worker for caching (only in production)
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

function renderFooter() {
  const currentYear = new Date().getFullYear();
  document.body.insertAdjacentHTML("beforeend", `
    <footer>
      <p>&copy; ${currentYear} LetsRace.cc | <a href="about.html">About</a> | <a href="mailto:hello@letsrace.cc">Contact</a></p>
    </footer>
  `);
}

function renderHeader(title) {
  // Determine if we're in a subdirectory (pages/)
  const isInSubdirectory = window.location.pathname.includes('/pages/');
  const basePath = isInSubdirectory ? '../' : '';
  
  document.body.insertAdjacentHTML("afterbegin", `
    <header style="background:#0077cc;color:white;padding:1rem;text-align:center;position:relative;">
      <h1 style="margin:0;font-size:2rem;font-weight:700;letter-spacing:0.5px;font-family:'Courier New',monospace;"><a href="${basePath}index.html" style="color:white;text-decoration:none;">letsrace.cc</a></h1>
      <nav style="margin-top:1rem;">
        <a href="${basePath}index.html" class="${currentPage === 'index.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Home</a>
        <a href="${basePath}pages/road.html" class="${currentPage === 'road.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Road</a>
        <a href="${basePath}pages/track.html" class="${currentPage === 'track.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Track</a>
        <a href="${basePath}pages/mtb.html" class="${currentPage === 'mtb.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">MTB</a>
        <a href="${basePath}pages/bmx.html" class="${currentPage === 'bmx.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">BMX</a>
        <a href="${basePath}pages/cyclo-cross.html" class="${currentPage === 'cyclo-cross.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Cyclo-Cross</a>
        <a href="${basePath}pages/time-trial.html" class="${currentPage === 'time-trial.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Time Trial</a>
        <a href="${basePath}pages/hill-climb.html" class="${currentPage === 'hill-climb.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Hill Climb</a>
        <a href="${basePath}pages/speedway.html" class="${currentPage === 'speedway.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Speedway</a>
        <a href="${basePath}pages/about.html" class="${currentPage === 'about.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">About</a>
      </nav>
    </header>
  `);
  createBurgerMenu();
  
  // Update navigation links with region parameter if present
  updateNavigationLinks();
}

function renderEvents(data, containerId, pageTitle) {
  console.log('renderEvents called with data:', data);
  console.log('Data type:', typeof data);
  console.log('Data structure:', JSON.stringify(data, null, 2));
  
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error('Container element not found:', containerId);
    return;
  }
  
  const updateDate = new Date().toLocaleDateString('en-GB', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  });

  // Get region filter from localStorage or URL
  let selectedRegion = getRegionFromUrl();
  console.log('Initial selectedRegion from URL:', selectedRegion);
  
  // If no region in URL, check localStorage
  if (!selectedRegion) {
    const storedRegions = localStorage.getItem('selectedRegions');
    console.log('Stored regions from localStorage:', storedRegions);
    if (storedRegions) {
      try {
        const regions = JSON.parse(storedRegions);
        console.log('Parsed regions:', regions);
        if (regions.length > 0) {
          selectedRegion = regions.join(',');
          console.log('Final selectedRegion from localStorage:', selectedRegion);
        }
      } catch (e) {
        console.error('Error parsing stored regions:', e);
      }
    }
  }
  
  // Create the main container with sidebar and content
  let contentHtml = `
    <div class="main-container">
      <!-- Desktop Region Sidebar -->
      <aside class="region-sidebar">
        <div class="region-sidebar-content">
          <h3>Filter by Region</h3>
                     <div class="region-checkboxes">
             <label class="region-checkbox">
               <input type="checkbox" value="central">
               <span class="checkmark"></span>
               Central
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="east-midlands">
               <span class="checkmark"></span>
               East Midlands
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="eastern">
               <span class="checkmark"></span>
               Eastern
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="north-east">
               <span class="checkmark"></span>
               North East
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="north-west">
               <span class="checkmark"></span>
               North West
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="scotland">
               <span class="checkmark"></span>
               Scotland
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="south">
               <span class="checkmark"></span>
               South
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="south-east">
               <span class="checkmark"></span>
               South East
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="south-west">
               <span class="checkmark"></span>
               South West
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="wales">
               <span class="checkmark"></span>
               Wales
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="west-midlands">
               <span class="checkmark"></span>
               West Midlands
             </label>
             <label class="region-checkbox">
               <input type="checkbox" value="yorkshire">
               <span class="checkmark"></span>
               Yorkshire
             </label>
           </div>
          <div class="region-sidebar-buttons">
            <button class="apply-filter-btn">Apply Filter</button>
            <button class="clear-regions-btn">Reset</button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <div class="content-container">
          <h2 class="page-title">${pageTitle}</h2>
          <div class="update-time">Updated on ${updateDate}</div>
          
          <!-- Mobile Region Filter -->
          <div class="mobile-region-filter">
            <button class="mobile-filter-btn" onclick="toggleEventMobileFilter()">
              <span class="filter-icon">📍</span>
              Filter by Region
            </button>
            <div class="mobile-filter-panel" id="event-mobile-filter-panel">
              <div class="mobile-region-checkboxes">
                <label class="region-checkbox">
                  <input type="checkbox" value="central">
                  <span class="checkmark"></span>
                  Central
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="east-midlands">
                  <span class="checkmark"></span>
                  East Midlands
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="eastern">
                  <span class="checkmark"></span>
                  Eastern
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="north-east">
                  <span class="checkmark"></span>
                  North East
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="north-west">
                  <span class="checkmark"></span>
                  North West
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="scotland">
                  <span class="checkmark"></span>
                  Scotland
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="south">
                  <span class="checkmark"></span>
                  South
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="south-east">
                  <span class="checkmark"></span>
                  South East
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="south-west">
                  <span class="checkmark"></span>
                  South West
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="wales">
                  <span class="checkmark"></span>
                  Wales
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="west-midlands">
                  <span class="checkmark"></span>
                  West Midlands
                </label>
                <label class="region-checkbox">
                  <input type="checkbox" value="yorkshire">
                  <span class="checkmark"></span>
                  Yorkshire
                </label>
              </div>
              <div class="region-sidebar-buttons">
                <button class="apply-filter-btn">Apply Filter</button>
                <button class="clear-regions-btn">Reset</button>
              </div>
            </div>
          </div>
          
          <div class="events-list">
  `;

  // Handle both old array format and new structured format
  let events = [];
  
  if (Array.isArray(data)) {
    // Old format: array of arrays
    events = data;
  } else if (data && data.events && Array.isArray(data.events)) {
    // New format: structured object with events array
    events = data.events;
  } else {
    // Fallback: empty array
    events = [];
  }



  // Don't filter events by region here - let applyEventRegionFilter handle it dynamically
  // This allows the filter to work correctly when modifying it on subsequent pages

  // Sort events by date (regardless of region)
  events.sort((a, b) => {
    let dateA, dateB;
    
    if (Array.isArray(a)) {
      dateA = new Date(a[0]); // date is at index 0 in old format
    } else {
      dateA = new Date(a.date);
    }
    
    if (Array.isArray(b)) {
      dateB = new Date(b[0]); // date is at index 0 in old format
    } else {
      dateB = new Date(b.date);
    }
    
    return dateA - dateB; // Sort in ascending order (earliest dates first)
  });

  // Check for no events after filtering
  if (!events.length) {
    contentHtml += `
      <div class="no-events">
        <h3>No upcoming events found</h3>
        <p>Check back soon for new events, or browse other cycling disciplines using the navigation above.</p>
      </div>
    `;
    container.innerHTML = contentHtml + '</div></div>';
    return;
  }

  console.log('Total events to render:', events.length);
  const eventsHtml = events.map(event => {
    // Handle both old array format and new object format
    let eventDate, title, discipline, location, url, region, imported;
    
    if (Array.isArray(event)) {
      // Old format: [date, name, discipline, location, url, region?, imported?]
      [eventDate, title, discipline, location, url, region, imported] = event;
    } else {
      // New format: {date, name, discipline, location, url, region, imported}
      eventDate = event.date;
      title = event.name;
      discipline = event.discipline;
      location = event.location;
      url = event.url;
      region = event.region;
      imported = event.imported;
    }
    
    const d = new Date(eventDate);
    
    // Format date components for the new design
    const dayName = d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();

    // Check if added within the configured number of days
    const added = new Date(imported || '');
    const now = new Date();
    const daysAgo = new Date(now.getTime() - (NEW_EVENT_DAYS * 24 * 60 * 60 * 1000));
    
    // Debug logging to understand what's happening
    console.log('Event:', title);
    console.log('Imported value:', imported);
    console.log('Added date:', added);
    console.log('Is valid date:', !isNaN(added.getTime()));
    console.log('Days ago threshold:', daysAgo);
    console.log('Is newer than threshold:', added > daysAgo);
    
    // More robust date comparison - normalize to midnight for both dates
    let isNewlyAdded = false;
    if (!isNaN(added.getTime())) {
      const addedMidnight = new Date(added.getFullYear(), added.getMonth(), added.getDate());
      const daysAgoMidnight = new Date(daysAgo.getFullYear(), daysAgo.getMonth(), daysAgo.getDate());
      isNewlyAdded = addedMidnight > daysAgoMidnight;
      console.log('Normalized comparison - Added midnight:', addedMidnight, 'Days ago midnight:', daysAgoMidnight, 'Is newer:', isNewlyAdded);
    } else {
      console.log('No valid imported date found - treating as NOT new');
    }

    return `
      <a href="${url}" target="_blank" class="event ${isNewlyAdded ? 'newly-added' : ''}">
        <div class="date-square">
          <div class="day-name">${dayName}</div>
          <div class="day-number">${day}</div>
          <div class="month">${month}</div>
        </div>
        <div class="event-content">
          ${isNewlyAdded ? '<span class="new-badge">NEW</span>' : ''}
          <h2>${title}</h2>
          <p class="event-location">${location}${region ? ` • ${region}` : ''}</p>
        </div>
      </a>
    `;
  }).join("");

  container.innerHTML = contentHtml + eventsHtml + '</div></div></main></div>';
  
  // Debug: Check how many events are actually in the DOM
  setTimeout(() => {
    const allEventsInDOM = document.querySelectorAll('.event');
    console.log('Events actually rendered in DOM:', allEventsInDOM.length);
    
      // Apply initial filter if there are selected regions
  if (selectedRegion) {
    console.log('Applying initial filter for:', selectedRegion);
    // Use a longer timeout to ensure DOM is fully ready
    setTimeout(() => {
      window.applyEventRegionFilter();
    }, 200);
  }
  }, 100);
  
    // Set initial checkbox states based on URL parameters (for desktop sidebar)
  // Use a timeout to ensure DOM is fully ready
  setTimeout(() => {
    setInitialEventCheckboxStates();
    
              // Add event listeners to checkboxes for immediate filtering
     const checkboxes = document.querySelectorAll('.region-checkbox input');
     checkboxes.forEach((checkbox, index) => {
       // Store a reference to the change handler function so we can remove it later
       const changeHandler = function(e) {
         console.log(`Checkbox ${index} changed:`, checkbox.value, checkbox.checked);
         
         // Get all currently checked checkboxes (including this one that just changed)
         const checkedBoxes = document.querySelectorAll('.region-checkbox input:checked');
         const selectedRegions = Array.from(checkedBoxes).map(cb => cb.value);
         
         console.log('Selected regions after checkbox change:', selectedRegions);
         
         // Update localStorage
         if (selectedRegions.length > 0) {
           localStorage.setItem('selectedRegions', JSON.stringify(selectedRegions));
         } else {
           localStorage.removeItem('selectedRegions');
         }
         
         // Update URL
         const url = new URL(window.location);
         if (selectedRegions.length > 0) {
           url.searchParams.set('region', selectedRegions.join(','));
         } else {
           url.searchParams.delete('region');
         }
         window.history.replaceState({}, '', url);
         
         // Don't reload immediately - let the user use the Apply Filter button
         console.log('Checkbox state updated. Use Apply Filter button to apply changes.');
       };
       
       // Add the event listener to the checkbox
       checkbox.addEventListener('change', changeHandler);
     });
    
          // Add debugging for button clicks
      const applyButtons = document.querySelectorAll('.apply-filter-btn');
      const clearButtons = document.querySelectorAll('.clear-regions-btn');
      console.log('Found apply buttons:', applyButtons.length);
      console.log('Found clear buttons:', clearButtons.length);
      
      // Add event listeners to Apply Filter buttons
      applyButtons.forEach((button, index) => {
       console.log(`Apply Button ${index}:`, button);
       
       // Test if the button is actually clickable
       console.log(`Apply Button ${index} clickable test:`, button.offsetWidth > 0 && button.offsetHeight > 0);
       console.log(`Apply Button ${index} onclick attribute:`, button.getAttribute('onclick'));
       
       console.log(`Adding click listener to Apply Filter Button ${index}`);
       button.addEventListener('click', function(e) {
         console.log(`=== Apply Filter Button ${index} clicked ===`);
         console.log(`Apply Filter Button ${index} clicked via event listener!`);
         console.log('Event:', e);
         console.log('Window applyEventRegionFilter exists:', typeof window.applyEventRegionFilter);
         console.log('Current page URL:', window.location.href);
         
         // Prevent default and stop propagation to ensure our handler runs
         e.preventDefault();
         e.stopPropagation();
         
         // Try to call the function directly
         if (typeof window.applyEventRegionFilter === 'function') {
           console.log('Calling applyEventRegionFilter directly...');
           window.applyEventRegionFilter();
         } else {
           console.log('applyEventRegionFilter is not a function!');
         }
       });
       console.log(`Click listener added to Apply Filter Button ${index}`);
       
       // Also add a mousedown listener as backup
       button.addEventListener('mousedown', function(e) {
         console.log(`Apply Button ${index} mousedown detected!`);
       });
       
       // Test if we can actually interact with the button
       if (index === 0) { // Only for the first (desktop) button
         console.log('Testing Apply button interaction...');
       }
      
      // Also test onclick attribute directly
      const onclickAttr = button.getAttribute('onclick');
      if (onclickAttr) {
        console.log(`Apply Button ${index} onclick attribute found:`, onclickAttr);
      } else {
        console.log(`Apply Button ${index} no onclick attribute found`);
      }
    });
    
    // Add event listeners to Clear Filter buttons
    clearButtons.forEach((button, index) => {
     console.log(`Clear Button ${index}:`, button);
     
     // Test if the button is actually clickable
     console.log(`Clear Button ${index} clickable test:`, button.offsetWidth > 0 && button.offsetHeight > 0);
     console.log(`Clear Button ${index} onclick attribute:`, button.getAttribute('onclick'));
     
     console.log(`Adding click listener to Clear Filter Button ${index}`);
     button.addEventListener('click', function(e) {
       console.log(`Clear Filter Button ${index} clicked via event listener!`);
       console.log('Event:', e);
       console.log('Window clearEventRegionFilter exists:', typeof window.clearEventRegionFilter);
       
       // Prevent default and stop propagation to ensure our handler runs
       e.preventDefault();
       e.stopPropagation();
       
       // Try to call the function directly
       if (typeof window.clearEventRegionFilter === 'function') {
         console.log('Calling clearEventRegionFilter directly...');
         window.clearEventRegionFilter();
       } else {
         console.log('clearEventRegionFilter is not a function!');
       }
     });
     console.log(`Click listener added to Clear Filter Button ${index}`);
     
     // Also add a mousedown listener as backup
     button.addEventListener('mousedown', function(e) {
       console.log(`Clear Button ${index} mousedown detected!`);
     });
     
     // Test if we can actually interact with the button
     if (index === 0) { // Only for the first (desktop) button
       console.log('Testing Clear button interaction...');
     }
    
    // Also test onclick attribute directly
    const onclickAttr = button.getAttribute('onclick');
    if (onclickAttr) {
      console.log(`Clear Button ${index} onclick attribute found:`, onclickAttr);
    } else {
      console.log(`Clear Button ${index} no onclick attribute found`);
    }
  });
  }, 10);
  
  // Add click tracking to event cards
  const eventCards = container.querySelectorAll('.event');
  eventCards.forEach((card, index) => {
    card.addEventListener('click', function(e) {
      const event = events[index];
      
      // Extract event data based on format
      let eventDate, title, discipline, location, region;
      if (Array.isArray(event)) {
        [eventDate, title, discipline, location, , region] = event;
      } else {
        eventDate = event.date;
        title = event.name;
        discipline = event.discipline;
        location = event.location;
        region = event.region;
      }
      
      // Track the click with GoatCounter
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({
          path: 'event-click',
          title: title,
          event: true,
          custom: {
            discipline: discipline,
            location: location,
            region: region || '',
            event_date: eventDate
          }
        });
      }
    });
  });
}

// Region selection and URL management
function updateRegionLinks() {
  const regionSelect = document.getElementById('region-select');
  if (!regionSelect) return;
  
  const selectedRegion = regionSelect.value;
  const categoryLinks = document.querySelectorAll('.category-link');
  
  categoryLinks.forEach(link => {
    const baseUrl = link.getAttribute('href');
    if (selectedRegion) {
      link.href = `${baseUrl}?region=${selectedRegion}`;
    } else {
      link.href = baseUrl;
    }
  });
}

// Update navigation links with region parameter
function updateNavigationLinks() {
  const selectedRegion = getRegionFromUrl();
  if (!selectedRegion) return;
  
  // Update header navigation links
  const navLinks = document.querySelectorAll('header nav a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('about.html') && !href.includes('index.html')) {
      link.href = `${href}?region=${selectedRegion}`;
    }
  });
  
  // Update mobile navigation links
  const mobileNavLinks = document.querySelectorAll('#mobile-nav a');
  mobileNavLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('about.html') && !href.includes('index.html')) {
      link.href = `${href}?region=${selectedRegion}`;
    }
  });
}

// Get region from URL parameter
function getRegionFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('region') || '';
}

// Set region in URL parameter
function setRegionInUrl(region) {
  const url = new URL(window.location);
  if (region) {
    url.searchParams.set('region', region);
  } else {
    url.searchParams.delete('region');
  }
  window.history.replaceState({}, '', url);
}

// Normalize region names for comparison
function normalizeRegionName(regionName) {
  if (!regionName) return '';
  return regionName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Get display name for region code
function getRegionDisplayName(regionCode) {
  const regionMap = {
    'central': 'Central',
    'east-midlands': 'East Midlands',
    'eastern': 'Eastern',
    'north-east': 'North East',
    'north-west': 'North West',
    'scotland': 'Scotland',
    'south': 'South',
    'south-east': 'South East',
    'south-west': 'South West',
    'wales': 'Wales',
    'west-midlands': 'West Midlands',
    'yorkshire': 'Yorkshire'
  };
  return regionMap[regionCode] || regionCode;
}

// Clear region filter and reload events
function clearRegionFilter() {
  // Set region parameter to empty (keeps the filter UI visible)
  const url = new URL(window.location);
  url.searchParams.set('region', '');
  window.history.replaceState({}, '', url);
  
  // Clear any region-specific caches to ensure fresh data
  if (window.eventCache) {
    const oldRegion = getRegionFromUrl();
    if (oldRegion) {
      window.eventCache.clearRegionCaches(oldRegion);
    }
  }
  
  // Reload the page to show all events
  window.location.reload();
}

// Show region selector on the current page
function showRegionSelector() {
  // Create region selector modal/overlay
  const selectorHtml = `
    <div id="region-selector-overlay" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    ">
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
        text-align: center;
      ">
        <h3 style="margin-top: 0;">Select your region</h3>
        <select id="page-region-select" style="
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #0077cc;
          border-radius: 6px;
          font-size: 1rem;
          margin-bottom: 1rem;
        ">
          <option value="">All Regions</option>
          <option value="central">Central</option>
          <option value="east-midlands">East Midlands</option>
          <option value="eastern">Eastern</option>
          <option value="north-east">North East</option>
          <option value="north-west">North West</option>
          <option value="scotland">Scotland</option>
          <option value="south">South</option>
          <option value="south-east">South East</option>
          <option value="south-west">South West</option>
          <option value="wales">Wales</option>
          <option value="west-midlands">West Midlands</option>
          <option value="yorkshire">Yorkshire</option>
        </select>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button onclick="applyRegionFilter()" style="
            background: #0077cc;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
          ">Apply</button>
          <button onclick="closeRegionSelector()" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
          ">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', selectorHtml);
}

// Apply the selected region filter
function applyRegionFilter() {
  const regionSelect = document.getElementById('page-region-select');
  const selectedRegion = regionSelect.value;
  
  // Clear old region caches if changing regions
  if (window.eventCache) {
    const oldRegion = getRegionFromUrl();
    if (oldRegion && oldRegion !== selectedRegion) {
      window.eventCache.clearRegionCaches(oldRegion);
    }
  }
  
  // Update URL with selected region
  const url = new URL(window.location);
  if (selectedRegion) {
    url.searchParams.set('region', selectedRegion);
  } else {
    url.searchParams.set('region', '');
  }
  window.history.replaceState({}, '', url);
  
  // Close selector and reload page
  closeRegionSelector();
  window.location.reload();
}

// Close region selector
function closeRegionSelector() {
  const overlay = document.getElementById('region-selector-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// Burger menu and mobile nav rendering
function createBurgerMenu() {
  // Determine if we're in a subdirectory (pages/)
  const isInSubdirectory = window.location.pathname.includes('/pages/');
  const basePath = isInSubdirectory ? '../' : '';
  
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
      <li><a href="${basePath}index.html" class="${currentPage === 'index.html' ? 'current' : ''}">Home</a></li>
      <li><a href="${basePath}pages/road.html" class="${currentPage === 'road.html' ? 'current' : ''}">Road</a></li>
      <li><a href="${basePath}pages/track.html" class="${currentPage === 'track.html' ? 'current' : ''}">Track</a></li>
      <li><a href="${basePath}pages/mtb.html" class="${currentPage === 'mtb.html' ? 'current' : ''}">MTB</a></li>
      <li><a href="${basePath}pages/bmx.html" class="${currentPage === 'bmx.html' ? 'current' : ''}">BMX</a></li>
      <li><a href="${basePath}pages/cyclo-cross.html" class="${currentPage === 'cyclo-cross.html' ? 'current' : ''}">Cyclo-Cross</a></li>
      <li><a href="${basePath}pages/time-trial.html" class="${currentPage === 'time-trial.html' ? 'current' : ''}">Time Trial</a></li>
      <li><a href="${basePath}pages/hill-climb.html" class="${currentPage === 'hill-climb.html' ? 'current' : ''}">Hill Climb</a></li>
      <li><a href="${basePath}pages/speedway.html" class="${currentPage === 'speedway.html' ? 'current' : ''}">Speedway</a></li>
      <li><a href="${basePath}pages/about.html" class="${currentPage === 'about.html' ? 'current' : ''}">About</a></li>
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

// Event page region filter functions

// Make function globally available
console.log('Defining applyEventRegionFilter function globally');
window.applyEventRegionFilter = function() {
  console.log('=== applyEventRegionFilter START ===');
  console.log('applyEventRegionFilter - function called');
  console.log('Current page URL:', window.location.href);
  console.log('Current page pathname:', window.location.pathname);
  console.log('Timestamp:', new Date().toISOString());
  
  const selectedRegions = getSelectedRegions();
  console.log('applyEventRegionFilter - selectedRegions:', selectedRegions);
  
  // Store selected regions in localStorage for persistence
  if (selectedRegions.length > 0) {
    localStorage.setItem('selectedRegions', JSON.stringify(selectedRegions));
    console.log('Stored regions in localStorage:', selectedRegions);
  } else {
    localStorage.removeItem('selectedRegions');
    console.log('Removed regions from localStorage');
  }
  
  // Update URL with selected regions
  const url = new URL(window.location);
  if (selectedRegions.length > 0) {
    url.searchParams.set('region', selectedRegions.join(','));
  } else {
    url.searchParams.delete('region');
  }
  window.history.replaceState({}, '', url);
  console.log('Updated URL:', url.toString());
  
  // Filter events immediately without page reload
  console.log('Filtering events immediately...');
  console.log('Selected regions to filter by:', selectedRegions);
  
  // Get all events from the current page
  const eventElements = document.querySelectorAll('.event');
  console.log('Found event elements:', eventElements.length);
  
  let visibleCount = 0;
  let hiddenCount = 0;
  
  eventElements.forEach((eventElement, index) => {
    const locationElement = eventElement.querySelector('.event-location');
    if (locationElement) {
      const locationText = locationElement.textContent.trim();
      console.log(`Event ${index} location text: "${locationText}"`);
      
      // Extract region from location text (format: "Location • Region")
      const regionMatch = locationText.match(/•\s*(.+)$/);
      const eventRegion = regionMatch ? regionMatch[1].trim() : '';
      console.log(`Event ${index} extracted region: "${eventRegion}"`);
      
      if (selectedRegions.length === 0) {
        // No filters selected, show all events
        eventElement.style.display = 'flex';
        visibleCount++;
        console.log(`Event ${index}: ${eventRegion} - SHOW (no filters)`);
      } else {
        // Check if event region matches any selected region
        const normalizedEventRegion = normalizeRegionName(eventRegion);
        console.log(`Event ${index} normalized region: "${normalizedEventRegion}"`);
        
        const shouldShow = selectedRegions.some(region => {
          const normalizedRegion = normalizeRegionName(region);
          const matches = normalizedEventRegion === normalizedRegion;
          console.log(`Comparing: "${normalizedEventRegion}" with "${normalizedRegion}" = ${matches}`);
          return matches;
        });
        
        eventElement.style.display = shouldShow ? 'flex' : 'none';
        if (shouldShow) {
          visibleCount++;
          console.log(`Event ${index}: ${eventRegion} (${normalizedEventRegion}) - SHOW`);
        } else {
          hiddenCount++;
          console.log(`Event ${index}: ${eventRegion} (${normalizedEventRegion}) - HIDE`);
        }
      }
    } else {
      // If no location element found, hide the event
      eventElement.style.display = 'none';
      hiddenCount++;
      console.log(`Event ${index}: No location element - HIDE`);
    }
  });
  
  console.log(`Filtering complete: ${visibleCount} visible, ${hiddenCount} hidden`);
  
  // Update the results count
  const visibleEvents = document.querySelectorAll('.event[style*="display: flex"], .event:not([style*="display: none"])');
  console.log('Visible events after filtering:', visibleEvents.length);
  
  // Update any results count display
  const resultsCountElement = document.querySelector('.results-count');
  if (resultsCountElement) {
    resultsCountElement.textContent = `${visibleEvents.length} events found`;
  }
}

window.clearEventRegionFilter = function() {
  const checkboxes = document.querySelectorAll('.region-checkbox input');
  checkboxes.forEach(cb => cb.checked = false);
  
  // Clear localStorage
  localStorage.removeItem('selectedRegions');
  
  // Update URL to remove region parameter
  const url = new URL(window.location);
  url.searchParams.delete('region');
  window.history.replaceState({}, '', url);
  
  // Reload the page to show all events
  window.location.reload();
}

window.toggleEventMobileFilter = function() {
  const panel = document.getElementById('event-mobile-filter-panel');
  const isOpening = !panel.classList.contains('active');
  panel.classList.toggle('active');
  
  // If panel is opening, set checkbox states to match current URL
  if (isOpening) {
    // Use a longer timeout to ensure DOM is fully ready
    setTimeout(() => {
      setInitialEventCheckboxStates();
    }, 50);
  }
}

function getSelectedRegions() {
  // Get ALL checkboxes first to see their states
  const allCheckboxes = document.querySelectorAll('.region-checkbox input');
  console.log('getSelectedRegions - all checkboxes found:', allCheckboxes.length);
  
  // Log the state of each checkbox with more detail
  allCheckboxes.forEach((cb, index) => {
    console.log(`Checkbox ${index}: value="${cb.value}", checked=${cb.checked}, visible=${cb.offsetParent !== null}`);
  });
  
  // Now get only the checked ones
  const checkboxes = document.querySelectorAll('.region-checkbox input:checked');
  console.log('getSelectedRegions - checked checkboxes:', checkboxes.length);
  const regions = Array.from(checkboxes).map(cb => cb.value);
  console.log('getSelectedRegions - raw regions:', regions);
  
  // Remove duplicates while preserving order
  const uniqueRegions = [...new Set(regions)];
  console.log('getSelectedRegions - unique regions:', uniqueRegions);
  
  // Also log what's in localStorage for comparison
  const storedRegions = localStorage.getItem('selectedRegions');
  console.log('getSelectedRegions - storedRegions from localStorage:', storedRegions);
  
  return uniqueRegions;
}

function setInitialEventCheckboxStates() {
  // Check localStorage first, then URL parameters
  let regions = [];
  
  // Try to get from localStorage
  const storedRegions = localStorage.getItem('selectedRegions');
  console.log('setInitialEventCheckboxStates - storedRegions:', storedRegions);
  if (storedRegions) {
    try {
      regions = JSON.parse(storedRegions);
      console.log('setInitialEventCheckboxStates - parsed regions:', regions);
    } catch (e) {
      console.error('Error parsing stored regions:', e);
    }
  }
  
  // If no stored regions, check URL parameters
  if (regions.length === 0) {
    const urlParams = new URLSearchParams(window.location.search);
    const regionParam = urlParams.get('region');
    console.log('setInitialEventCheckboxStates - regionParam from URL:', regionParam);
    if (regionParam) {
      regions = regionParam.split(',');
    }
  }
  
  // Always set checkbox states from stored regions on page load
  // This ensures consistent state restoration
  
  // Set all checkbox states (both desktop and mobile)
  const allCheckboxes = document.querySelectorAll('.region-checkbox input');
  allCheckboxes.forEach(cb => cb.checked = false);
  
  // Only check boxes if there are regions to check
  if (regions.length > 0) {
    regions.forEach(region => {
      const checkboxes = document.querySelectorAll(`.region-checkbox input[value="${region}"]`);
      checkboxes.forEach(checkbox => {
        checkbox.checked = true;
      });
    });
  }
  
  // Log for debugging
  console.log('Set initial checkbox states. Regions:', regions, 'Checkboxes found:', allCheckboxes.length);
}
