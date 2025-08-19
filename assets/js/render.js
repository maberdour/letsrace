// ============================================================================
// CONFIGURATION - Easy to edit settings for website maintainers
// ============================================================================

// Number of days after which an event is no longer considered "NEW"
const NEW_EVENT_DAYS = 7;

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
  
  // Get current page for navigation highlighting
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  document.body.insertAdjacentHTML("afterbegin", `
    <header style="background:#0077cc;color:white;padding:1rem;text-align:center;position:relative;">
      <h1 style="margin:0;font-size:2rem;font-weight:700;letter-spacing:0.5px;font-family:'Courier New',monospace;"><a href="${basePath}index.html" style="color:white;text-decoration:none;">letsrace.cc</a></h1>
      <nav style="margin-top:1rem;">
        <a href="${basePath}index.html" class="${currentPage === 'index.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Home</a>
        <a href="${basePath}pages/road/" class="${currentPage === 'road' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Road</a>
        <a href="${basePath}pages/track/" class="${currentPage === 'track' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Track</a>
        <a href="${basePath}pages/mtb/" class="${currentPage === 'mtb' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">MTB</a>
        <a href="${basePath}pages/bmx/" class="${currentPage === 'bmx' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">BMX</a>
        <a href="${basePath}pages/cyclo-cross/" class="${currentPage === 'cyclo-cross' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Cyclo-Cross</a>
        <a href="${basePath}pages/time-trial/" class="${currentPage === 'time-trial' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Time Trial</a>
        <a href="${basePath}pages/hill-climb/" class="${currentPage === 'hill-climb' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Hill Climb</a>
        <a href="${basePath}pages/speedway/" class="${currentPage === 'speedway' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">Speedway</a>
        <a href="${basePath}pages/about.html" class="${currentPage === 'about.html' ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">About</a>
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
  const basePath = isInSubdirectory ? '../' : '';

  // Create nav menu (same links as header)
  const nav = document.createElement('nav');
  nav.id = 'mobile-nav';
  nav.innerHTML = `
    <div id="close-menu"></div>
    <ul>
      <li><a href="${basePath}index.html" class="${currentPage === 'index.html' ? 'current' : ''}">Home</a></li>
      <li><a href="${basePath}pages/road/" class="${currentPage === 'road' ? 'current' : ''}">Road</a></li>
      <li><a href="${basePath}pages/track/" class="${currentPage === 'track' ? 'current' : ''}">Track</a></li>
      <li><a href="${basePath}pages/mtb/" class="${currentPage === 'mtb' ? 'current' : ''}">MTB</a></li>
      <li><a href="${basePath}pages/bmx/" class="${currentPage === 'bmx' ? 'current' : ''}">BMX</a></li>
      <li><a href="${basePath}pages/cyclo-cross/" class="${currentPage === 'cyclo-cross' ? 'current' : ''}">Cyclo-Cross</a></li>
      <li><a href="${basePath}pages/time-trial/" class="${currentPage === 'time-trial' ? 'current' : ''}">Time Trial</a></li>
      <li><a href="${basePath}pages/hill-climb/" class="${currentPage === 'hill-climb' ? 'current' : ''}">Hill Climb</a></li>
      <li><a href="${basePath}pages/speedway/" class="${currentPage === 'speedway' ? 'current' : ''}">Speedway</a></li>
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
