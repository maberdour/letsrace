// ============================================================================
// CONFIGURATION - Easy to edit settings for website maintainers
// ============================================================================

// Number of days after which an event is no longer considered "NEW"
const NEW_EVENT_DAYS = 7;

// Version: 11 - Fixed navigation paths with absolute URLs

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
  const currentDate = new Date().toLocaleDateString('en-GB', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  document.body.insertAdjacentHTML("beforeend", `
    <footer>
      <small>
        LetsRace.cc | Supporting youth cycling across the UK | Last updated: ${currentDate}
        <span id="build-stamp" style="display: none;"></span>
      </small>
    </footer>
  `);
}

function renderHeader(title) {
  // Determine if we're in a subdirectory (pages/)
  const isInSubdirectory = window.location.pathname.includes('/pages/');
  
  // Get current page for navigation highlighting
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Build navigation links with correct paths
  const navLinks = [
    { href: isInSubdirectory ? '/index.html' : 'index.html', text: 'Home', current: currentPage === 'index.html' },
    { href: isInSubdirectory ? '/pages/road/' : 'pages/road/', text: 'Road', current: currentPage === 'road' },
    { href: isInSubdirectory ? '/pages/track/' : 'pages/track/', text: 'Track', current: currentPage === 'track' },
    { href: isInSubdirectory ? '/pages/mtb/' : 'pages/mtb/', text: 'MTB', current: currentPage === 'mtb' },
    { href: isInSubdirectory ? '/pages/bmx/' : 'pages/bmx/', text: 'BMX', current: currentPage === 'bmx' },
    { href: isInSubdirectory ? '/pages/cyclo-cross/' : 'pages/cyclo-cross/', text: 'Cyclo-Cross', current: currentPage === 'cyclo-cross' },
    { href: isInSubdirectory ? '/pages/time-trial/' : 'pages/time-trial/', text: 'Time Trial', current: currentPage === 'time-trial' },
    { href: isInSubdirectory ? '/pages/hill-climb/' : 'pages/hill-climb/', text: 'Hill Climb', current: currentPage === 'hill-climb' },
    { href: isInSubdirectory ? '/pages/speedway/' : 'pages/speedway/', text: 'Speedway', current: currentPage === 'speedway' },
    { href: isInSubdirectory ? '/pages/about.html' : 'pages/about.html', text: 'About', current: currentPage === 'about.html' }
  ];
  
  // Build navigation HTML
  const navHTML = navLinks.map(link => 
    `<a href="${link.href}" class="${link.current ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">${link.text}</a>`
  ).join('');
  
  document.body.insertAdjacentHTML("afterbegin", `
    <header style="background:#0077cc;color:white;padding:1rem;text-align:center;position:relative;">
      <h1 style="margin:0;font-size:2rem;font-weight:700;letter-spacing:0.5px;font-family:'Courier New',monospace;"><a href="${isInSubdirectory ? '../index.html' : 'index.html'}" style="color:white;text-decoration:none;">letsrace.cc</a></h1>
      <nav style="margin-top:1rem;">
        ${navHTML}
      </nav>
    </header>
  `);
  
  createBurgerMenu();
}

// Cache management for fetchWithCache
const cache = new Map();
const cacheExpiry = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache(url, cacheKey) {
  const now = Date.now();
  
  // Check if we have a valid cached response
  if (cache.has(cacheKey) && cacheExpiry.has(cacheKey) && now < cacheExpiry.get(cacheKey)) {
    console.log(`Using cached data for ${cacheKey}`);
    return cache.get(cacheKey);
  }
  
  try {
    console.log(`Fetching fresh data for ${cacheKey}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    cache.set(cacheKey, data);
    cacheExpiry.set(cacheKey, now + CACHE_DURATION);
    
    return data;
  } catch (error) {
    console.error(`Error fetching data for ${cacheKey}:`, error);
    
    // Return cached data if available, even if expired
    if (cache.has(cacheKey)) {
      console.log(`Using expired cached data for ${cacheKey}`);
      return cache.get(cacheKey);
    }
    
    throw error;
  }
}

// Burger menu functionality for mobile
function createBurgerMenu() {
  // Create burger icon
  const burger = document.createElement('div');
  burger.id = 'burger-menu';
  burger.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  // Get current page for burger menu links
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isInSubdirectory = window.location.pathname.includes('/pages/');
  
  // Build navigation links with correct paths (same logic as header)
  const navLinks = [
    { href: isInSubdirectory ? '/index.html' : 'index.html', text: 'Home', current: currentPage === 'index.html' },
    { href: isInSubdirectory ? '/pages/road/' : 'pages/road/', text: 'Road', current: currentPage === 'road' },
    { href: isInSubdirectory ? '/pages/track/' : 'pages/track/', text: 'Track', current: currentPage === 'track' },
    { href: isInSubdirectory ? '/pages/mtb/' : 'pages/mtb/', text: 'MTB', current: currentPage === 'mtb' },
    { href: isInSubdirectory ? '/pages/bmx/' : 'pages/bmx/', text: 'BMX', current: currentPage === 'bmx' },
    { href: isInSubdirectory ? '/pages/cyclo-cross/' : 'pages/cyclo-cross/', text: 'Cyclo-Cross', current: currentPage === 'cyclo-cross' },
    { href: isInSubdirectory ? '/pages/time-trial/' : 'pages/time-trial/', text: 'Time Trial', current: currentPage === 'time-trial' },
    { href: isInSubdirectory ? '/pages/hill-climb/' : 'pages/hill-climb/', text: 'Hill Climb', current: currentPage === 'hill-climb' },
    { href: isInSubdirectory ? '/pages/speedway/' : 'pages/speedway/', text: 'Speedway', current: currentPage === 'speedway' },
    { href: isInSubdirectory ? '/pages/about.html' : 'pages/about.html', text: 'About', current: currentPage === 'about.html' }
  ];
  
  // Build navigation HTML
  const navHTML = navLinks.map(link => 
    `<li><a href="${link.href}" class="${link.current ? 'current' : ''}">${link.text}</a></li>`
  ).join('');

  // Create nav menu (same links as header)
  const nav = document.createElement('nav');
  nav.id = 'mobile-nav';
  nav.innerHTML = `
    <div id="close-menu"></div>
    <ul>
      ${navHTML}
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
