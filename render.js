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
  
  document.body.insertAdjacentHTML("afterbegin", `
    <header style="background:#0077cc;color:white;padding:1rem;text-align:center;position:relative;">
      <h1 style="margin:0;font-size:2rem;font-weight:700;letter-spacing:0.5px;font-family:'Courier New',monospace;"><a href="index.html" style="color:white;text-decoration:none;">letsrace.cc</a></h1>
      <nav style="margin-top:1rem;">
        <a href="index.html" class="${currentPage === 'index.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Home</a>
        <a href="road.html" class="${currentPage === 'road.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Road</a>
        <a href="track.html" class="${currentPage === 'track.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Track</a>
        <a href="mtb.html" class="${currentPage === 'mtb.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">MTB</a>
        <a href="bmx.html" class="${currentPage === 'bmx.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">BMX</a>
        <a href="cyclo-cross.html" class="${currentPage === 'cyclo-cross.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Cyclo-Cross</a>
        <a href="time-trial.html" class="${currentPage === 'time-trial.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Time Trial</a>
        <a href="hill-climb.html" class="${currentPage === 'hill-climb.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Hill Climb</a>
        <a href="speedway.html" class="${currentPage === 'speedway.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Speedway</a>
        <a href="about.html" class="${currentPage === 'about.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">About</a>
      </nav>
    </header>
  `);
  createBurgerMenu();
  
  // Update navigation links with region parameter if present
  updateNavigationLinks();
}

function renderEvents(data, containerId, pageTitle) {
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

  // Get region filter from URL
  const selectedRegion = getRegionFromUrl();
  
  // Add region filter UI (always show when region parameter is present, even if empty)
  let regionFilterHtml = '';
  const regionDisplayName = selectedRegion ? getRegionDisplayName(selectedRegion) : '';
  
  if (selectedRegion) {
    regionFilterHtml = `
      <div class="region-filter">
        <span class="region-badge">Filtering by: ${regionDisplayName}</span>
        <a href="#" onclick="clearRegionFilter(); return false;" class="clear-filter">Show all regions</a>
      </div>
    `;
  } else if (window.location.search.includes('region=')) {
    // Show filter UI even when no region is selected (allows new selection)
    regionFilterHtml = `
      <div class="region-filter">
        <span class="region-badge">All Regions</span>
        <a href="#" onclick="showRegionSelector(); return false;" class="clear-filter">Select region</a>
      </div>
    `;
  }

  let contentHtml = `
    <div class="content-container">
      <h2 class="page-title">${pageTitle}</h2>
      <div class="update-time">Updated on ${updateDate}</div>
      ${regionFilterHtml}
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

  // Filter events by region if specified
  if (selectedRegion) {
    events = events.filter(event => {
      let eventRegion = '';
      if (Array.isArray(event)) {
        eventRegion = event[5] || ''; // region is at index 5 in old format
      } else {
        eventRegion = event.region || '';
      }
      return normalizeRegionName(eventRegion) === selectedRegion;
    });
  }

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

    // Check if added within last 7 days
    const added = new Date(imported || addedDate || '');
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const isNewlyAdded = added > sevenDaysAgo;

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

  container.innerHTML = contentHtml + eventsHtml + '</div></div>';
  
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
      <li><a href="index.html" class="${currentPage === 'index.html' ? 'current' : ''}">Home</a></li>
      <li><a href="road.html" class="${currentPage === 'road.html' ? 'current' : ''}">Road</a></li>
      <li><a href="track.html" class="${currentPage === 'track.html' ? 'current' : ''}">Track</a></li>
      <li><a href="mtb.html" class="${currentPage === 'mtb.html' ? 'current' : ''}">MTB</a></li>
      <li><a href="bmx.html" class="${currentPage === 'bmx.html' ? 'current' : ''}">BMX</a></li>
      <li><a href="cyclo-cross.html" class="${currentPage === 'cyclo-cross.html' ? 'current' : ''}">Cyclo-Cross</a></li>
      <li><a href="time-trial.html" class="${currentPage === 'time-trial.html' ? 'current' : ''}">Time Trial</a></li>
      <li><a href="hill-climb.html" class="${currentPage === 'hill-climb.html' ? 'current' : ''}">Hill Climb</a></li>
      <li><a href="speedway.html" class="${currentPage === 'speedway.html' ? 'current' : ''}">Speedway</a></li>
      <li><a href="about.html" class="${currentPage === 'about.html' ? 'current' : ''}">About</a></li>
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
