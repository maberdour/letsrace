// Render functions for header and footer
function renderFooter() {
  document.body.insertAdjacentHTML("beforeend", `
    <footer>
      <small>
        LetsRace.cc | Supporting youth cycling across the UK | Last updated: 8 September 2025
        <span id="build-stamp" style="display: none;">Last updated: Mon, 8 Sept 2025</span>
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
  
  // Generate navigation HTML
  const navHTML = navLinks.map(link => 
    `<a href="${link.href}" class="${link.current ? 'current' : ''}" style="color:white;margin:0 0.5rem;text-decoration:none;">${link.text}</a>`
  ).join('');
  
  document.body.insertAdjacentHTML("afterbegin", `
    <header style="background:#0077cc;color:white;padding:1rem;text-align:center;position:relative;">
      <h1 style="margin:0;font-size:2rem;font-weight:700;letter-spacing:0.5px;font-family:'Courier New',monospace;"><a href="/index.html" style="color:white;text-decoration:none;">letsrace.cc</a></h1>
      <nav style="margin-top:1rem;">
        ${navHTML}
      </nav>
    </header>
  `);
}

// Mobile navigation toggle
function toggleMobileNav() {
  const nav = document.querySelector('header nav');
  if (nav) {
    nav.style.display = nav.style.display === 'none' ? 'block' : 'none';
  }
}

// Add mobile menu button for small screens
function addMobileMenuButton() {
  const header = document.querySelector('header');
  if (header && window.innerWidth <= 768) {
    const existingButton = header.querySelector('.mobile-menu-btn');
    if (!existingButton) {
      const button = document.createElement('button');
      button.className = 'mobile-menu-btn';
      button.innerHTML = '☰';
      button.style.cssText = `
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        display: block;
      `;
      button.onclick = toggleMobileNav;
      header.appendChild(button);
      
      // Hide nav on mobile by default
      const nav = header.querySelector('nav');
      if (nav) {
        nav.style.display = 'none';
      }
    }
  }
}

// Initialize mobile menu on page load
document.addEventListener('DOMContentLoaded', () => {
  addMobileMenuButton();
  
  // Re-check on window resize
  window.addEventListener('resize', () => {
    const nav = document.querySelector('header nav');
    const button = document.querySelector('.mobile-menu-btn');
    
    if (window.innerWidth > 768) {
      if (nav) nav.style.display = 'block';
      if (button) button.style.display = 'none';
    } else {
      if (button) button.style.display = 'block';
    }
  });
});

// Enhanced event rendering with better error handling
function renderEvent(event, container) {
  try {
    const eventElement = document.createElement('div');
    eventElement.className = 'event';
    eventElement.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid #0077cc;
    `;
    
    // Format date
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Build event HTML
    eventElement.innerHTML = `
      <div class="event-header" style="margin-bottom: 1rem;">
        <h3 style="margin: 0 0 0.5rem 0; color: #0077cc; font-size: 1.3rem;">
          <a href="${event.url || '#'}" style="color: inherit; text-decoration: none;" target="_blank" rel="noopener">
            ${event.name || 'Event Name Not Available'}
          </a>
        </h3>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.9rem; color: #666;">
          <span>📅 ${formattedDate}</span>
          ${event.location ? `<span>📍 ${event.location}</span>` : ''}
          ${event.region ? `<span>🏴󠁧󠁢󠁥󠁮󠁧󠁿 ${event.region}</span>` : ''}
        </div>
      </div>
      
      <div class="event-details" style="margin-bottom: 1rem;">
        ${event.description ? `<p style="margin: 0 0 0.5rem 0; line-height: 1.5;">${event.description}</p>` : ''}
        ${event.distance ? `<p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #333;">Distance: ${event.distance}</p>` : ''}
        ${event.entry_fee ? `<p style="margin: 0 0 0.5rem 0; color: #28a745; font-weight: 600;">Entry Fee: ${event.entry_fee}</p>` : ''}
      </div>
      
      <div class="event-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${event.categories ? event.categories.map(cat => 
            `<span style="background: #e9ecef; color: #495057; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem;">${cat}</span>`
          ).join('') : ''}
        </div>
        ${event.url ? `
          <a href="${event.url}" target="_blank" rel="noopener" style="
            background: #0077cc; 
            color: white; 
            padding: 0.5rem 1rem; 
            border-radius: 4px; 
            text-decoration: none; 
            font-weight: 600;
            transition: background-color 0.2s;
          " onmouseover="this.style.backgroundColor='#005fa3'" onmouseout="this.style.backgroundColor='#0077cc'">
            View Details →
          </a>
        ` : ''}
      </div>
    `;
    
    container.appendChild(eventElement);
  } catch (error) {
    console.error('Error rendering event:', error);
    // Fallback: create a simple event element
    const fallbackElement = document.createElement('div');
    fallbackElement.className = 'event';
    fallbackElement.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid #dc3545;
    `;
    fallbackElement.innerHTML = `
      <h3 style="margin: 0 0 0.5rem 0; color: #dc3545;">Event Data Error</h3>
      <p style="margin: 0; color: #666;">Unable to display this event due to data formatting issues.</p>
    `;
    container.appendChild(fallbackElement);
  }
}

// Enhanced loading state
function showLoadingState(container, message = 'Loading events...') {
  container.innerHTML = `
    <div style="text-align: center; padding: 3rem 2rem; color: #666;">
      <div style="
        border: 3px solid #f3f3f3;
        border-top: 3px solid #0077cc;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      "></div>
      <p style="margin: 0; font-size: 1.1rem;">${message}</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}

// Enhanced error state
function showErrorState(container, message = 'Failed to load events', retryCallback = null) {
  container.innerHTML = `
    <div style="text-align: center; padding: 3rem 2rem; color: #dc3545;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
      <h3 style="margin: 0 0 1rem 0; color: #dc3545;">${message}</h3>
      <p style="margin: 0 0 1.5rem 0; color: #666;">Please check your internet connection and try again.</p>
      ${retryCallback ? `
        <button onclick="${retryCallback}" style="
          background: #0077cc;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
        ">Retry</button>
      ` : ''}
    </div>
  `;
}

// Enhanced empty state
function showEmptyState(container, message = 'No events found') {
  container.innerHTML = `
    <div style="text-align: center; padding: 3rem 2rem; color: #666;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
      <h3 style="margin: 0 0 1rem 0; color: #333;">${message}</h3>
      <p style="margin: 0; font-style: italic;">Try adjusting your filters or check back later for new events.</p>
    </div>
  `;
}

// Utility function to format event count
function formatEventCount(count) {
  if (count === 0) return 'No events';
  if (count === 1) return '1 event';
  return `${count} events`;
}

// Enhanced filter rendering
function renderRegionFilters(regions, container, onFilterChange) {
  try {
    if (!regions || regions.length === 0) {
      container.innerHTML = '<p style="color: #666; font-style: italic;">No regions available</p>';
      return;
    }
    
    container.innerHTML = regions.map(region => `
      <label style="display: flex; align-items: center; margin-bottom: 0.5rem; cursor: pointer; padding: 0.25rem 0;">
        <input type="checkbox" value="${region}" style="margin-right: 0.5rem;" onchange="${onFilterChange}">
        <span style="font-size: 0.9rem;">${region}</span>
      </label>
    `).join('');
  } catch (error) {
    console.error('Error rendering region filters:', error);
    container.innerHTML = '<p style="color: #dc3545;">Error loading filters</p>';
  }
}

// Enhanced navigation rendering for mobile
function renderMobileNavigation() {
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
  
  return navLinks.map(link => 
    `<a href="${link.href}" class="${link.current ? 'current' : ''}" style="
      display: block;
      color: white;
      padding: 0.75rem 1rem;
      text-decoration: none;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      ${link.current ? 'background: rgba(255,255,255,0.1);' : ''}
    ">${link.text}</a>`
  ).join('');
}