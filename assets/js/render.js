// Render functions for header and footer
function renderFooter() {
  document.body.insertAdjacentHTML("beforeend", `
    <footer>
      <small>
        LetsRace.cc | Supporting youth cycling across the UK
        <span id="build-stamp" style="display: none;">Last updated: Mon, 8 Sept 2025</span>
      </small>
    </footer>
  `);
}

function renderHeader(title) {
  // Determine if we're in a subdirectory (pages/)
  const isInSubdirectory = window.location.pathname.includes('/pages/');
  
  // Get current page for navigation highlighting
  let currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Handle category pages that end with '/' - get the category name from the path
  if (currentPage === '' && isInSubdirectory) {
    const pathParts = window.location.pathname.split('/').filter(part => part !== '');
    currentPage = pathParts[pathParts.length - 1]; // Get the last non-empty part
  }
  
  // Handle the case where currentPage is still empty or 'index.html' but we're in a subdirectory
  if ((currentPage === '' || currentPage === 'index.html') && isInSubdirectory) {
    const pathParts = window.location.pathname.split('/').filter(part => part !== '');
    if (pathParts.length >= 2) { // Should have ['pages', 'category']
      currentPage = pathParts[pathParts.length - 1]; // Get the category name
    }
  }
  
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
    { href: isInSubdirectory ? '/pages/about.html' : 'pages/about.html', text: 'About', current: currentPage === 'about.html' },
    { href: isInSubdirectory ? '/pages/faq.html' : 'pages/faq.html', text: 'FAQ', current: currentPage === 'faq.html' }
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

// Create unified burger menu for all pages
function createBurgerMenu() {
  // Check if burger menu already exists
  if (document.querySelector('#burger-menu')) {
    return;
  }

  // Create burger icon
  const burger = document.createElement('div');
  burger.id = 'burger-menu';
  burger.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  // Create nav menu with proper current page detection
  const nav = document.createElement('nav');
  nav.id = 'mobile-nav';
  
  // Get current page for highlighting (using the same logic as renderHeader)
  let currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isInSubdirectory = window.location.pathname.includes('/pages/');
  
  // Handle category pages that end with '/' - get the category name from the path
  if (currentPage === '' && isInSubdirectory) {
    const pathParts = window.location.pathname.split('/').filter(part => part !== '');
    currentPage = pathParts[pathParts.length - 1];
  }
  
  // Handle the case where currentPage is still empty or 'index.html' but we're in a subdirectory
  if ((currentPage === '' || currentPage === 'index.html') && isInSubdirectory) {
    const pathParts = window.location.pathname.split('/').filter(part => part !== '');
    if (pathParts.length >= 2) {
      currentPage = pathParts[pathParts.length - 1];
    }
  }
  
  // Map current page to the expected format
  const pageMap = {
    'index.html': 'home',
    'road': 'road',
    'track': 'track',
    'mtb': 'mtb',
    'bmx': 'bmx',
    'cyclo-cross': 'cyclo-cross',
    'time-trial': 'time-trial',
    'hill-climb': 'hill-climb',
    'speedway': 'speedway',
    'weekly-email.html': 'weekly-email',
    'about.html': 'about',
    'faq.html': 'faq'
  };
  
  const currentPageKey = pageMap[currentPage] || 'home';
  
  nav.innerHTML = `
    <div id="close-menu"></div>
    <ul>
      <li><a href="/index.html" class="${currentPageKey === 'home' ? 'current' : ''}">Home</a></li>
      <li><a href="/pages/road/" class="${currentPageKey === 'road' ? 'current' : ''}">Road</a></li>
      <li><a href="/pages/track/" class="${currentPageKey === 'track' ? 'current' : ''}">Track</a></li>
      <li><a href="/pages/mtb/" class="${currentPageKey === 'mtb' ? 'current' : ''}">MTB</a></li>
      <li><a href="/pages/bmx/" class="${currentPageKey === 'bmx' ? 'current' : ''}">BMX</a></li>
      <li><a href="/pages/cyclo-cross/" class="${currentPageKey === 'cyclo-cross' ? 'current' : ''}">Cyclo-Cross</a></li>
      <li><a href="/pages/time-trial/" class="${currentPageKey === 'time-trial' ? 'current' : ''}">Time Trial</a></li>
      <li><a href="/pages/hill-climb/" class="${currentPageKey === 'hill-climb' ? 'current' : ''}">Hill Climb</a></li>
      <li><a href="/pages/speedway/" class="${currentPageKey === 'speedway' ? 'current' : ''}">Speedway</a></li>
      <li><a href="/pages/about.html" class="${currentPageKey === 'about' ? 'current' : ''}">About</a></li>
      <li><a href="/pages/faq.html" class="${currentPageKey === 'faq' ? 'current' : ''}">FAQ</a></li>
    </ul>
  `;

  // Append burger to header, nav to body
  const header = document.querySelector('header');
  if (header) header.appendChild(burger);
  document.body.appendChild(nav);

  // Add event listeners
  burger.addEventListener('click', () => {
    nav.classList.toggle('open');
    burger.classList.toggle('open');
    
    // Ensure burger menu is hidden when mobile nav is open
    if (nav.classList.contains('open')) {
      burger.style.display = 'none';
    } else {
      burger.style.display = 'flex';
    }
  });

  // Close menu when clicking close button
  const closeMenu = document.getElementById('close-menu');
  if (closeMenu) {
    closeMenu.addEventListener('click', () => {
      nav.classList.remove('open');
      burger.classList.remove('open');
      burger.style.display = 'flex'; // Show burger menu again
    });
  }
}

// Initialize mobile menu on page load
document.addEventListener('DOMContentLoaded', () => {
  createBurgerMenu();
  createFeedbackButton();
});

// Create feedback button and modal
function createFeedbackButton() {
  // Check if feedback button already exists
  if (document.querySelector('#feedback-button')) {
    return;
  }

  // Create feedback button
  const button = document.createElement('button');
  button.id = 'feedback-button';
  button.className = 'feedback-button';
  button.setAttribute('aria-label', 'Share your feedback');
  button.innerHTML = '💬 Share Your Feedback';
  
  // Create modal overlay
  const modal = document.createElement('div');
  modal.id = 'feedback-modal';
  modal.className = 'feedback-modal';
  modal.innerHTML = `
    <div class="feedback-modal-content">
      <button class="feedback-modal-close" aria-label="Close feedback form">&times;</button>
      <div class="feedback-modal-header">
        <h2>Share Your Feedback</h2>
        <p>We want LetsRace.cc to be useful for young riders, parents and clubs. If you spot a bug, have a suggestion, or just want to say hi — we'd love to hear from you!</p>
      </div>
      <div class="feedback-modal-body">
        <iframe 
          src="https://docs.google.com/forms/d/e/1FAIpQLSe11TMJvnqfgqAH0vT_EBWqMxkNW-Z_xSOvoyBnaGB4jYW44Q/viewform?embedded=true" 
          width="100%" 
          height="1622" 
          frameborder="0" 
          marginheight="0" 
          marginwidth="0"
          style="min-height: 600px;"
          title="Feedback form">
          Loading…
        </iframe>
      </div>
    </div>
  `;

  // Add modal to body
  document.body.appendChild(modal);

  // Find where to insert the button
  const filtersSection = document.querySelector('.filters');
  const eventList = document.querySelector('#event-list');
  const resultsSection = document.querySelector('.results');

  // Desktop button: Add to filters section if it exists
  if (filtersSection) {
    const filterGroup = filtersSection.querySelector('.filter-group');
    if (filterGroup) {
      // Insert after the filter-group
      filterGroup.insertAdjacentElement('afterend', button);
    } else {
      // Fallback: append to filters section
      filtersSection.appendChild(button);
    }
  } else {
    // For pages without filters, try to add inside .general-content first
    const generalContent = document.querySelector('.general-content');
    if (generalContent) {
      // Add to end of general-content (for about/FAQ pages)
      generalContent.appendChild(button);
    } else {
      // Fallback: add to main
      const main = document.querySelector('main');
      if (main) {
        main.appendChild(button);
      } else {
        document.body.appendChild(button);
      }
    }
  }

  // Mobile button: Add after event list, newly added events button, or before footer
  const mobileButton = button.cloneNode(true);
  mobileButton.id = 'feedback-button-mobile';
  mobileButton.className = 'feedback-button feedback-button-mobile';
  
  // Check if we're on the homepage
  const isHomepage = document.body.classList.contains('homepage') || document.body.getAttribute('data-type') === 'homepage';
  
  if (isHomepage) {
    // Homepage: Add after "Newly Added Events" button
    const newEventsSection = document.querySelector('.new-events');
    if (newEventsSection) {
      newEventsSection.insertAdjacentElement('afterend', mobileButton);
    } else {
      // Fallback: Add before footer
      const footer = document.querySelector('footer');
      if (footer) {
        footer.insertAdjacentElement('beforebegin', mobileButton);
      } else {
        const main = document.querySelector('main');
        if (main) {
          main.appendChild(mobileButton);
        }
      }
    }
  } else if (eventList) {
    // Event pages: Add after event list
    eventList.insertAdjacentElement('afterend', mobileButton);
  } else {
    // Other pages: Add before footer
    const footer = document.querySelector('footer');
    if (footer) {
      footer.insertAdjacentElement('beforebegin', mobileButton);
    } else {
      // Fallback: Add to end of main or results
      if (resultsSection) {
        resultsSection.appendChild(mobileButton);
      } else {
        const main = document.querySelector('main');
        if (main) {
          main.appendChild(mobileButton);
        }
      }
    }
  }

  // Event listeners for both buttons
  [button, mobileButton].forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });
  });

  const closeButton = modal.querySelector('.feedback-modal-close');
  closeButton.addEventListener('click', () => {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
    }
  });
}

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
  let currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isInSubdirectory = window.location.pathname.includes('/pages/');
  
  // Handle category pages that end with '/' - get the category name from the path
  if (currentPage === '' && isInSubdirectory) {
    const pathParts = window.location.pathname.split('/').filter(part => part !== '');
    currentPage = pathParts[pathParts.length - 1]; // Get the last non-empty part
  }
  
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
    { href: isInSubdirectory ? '/pages/about.html' : 'pages/about.html', text: 'About', current: currentPage === 'about.html' },
    { href: isInSubdirectory ? '/pages/faq.html' : 'pages/faq.html', text: 'FAQ', current: currentPage === 'faq.html' }
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