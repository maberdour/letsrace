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

// Create feedback link button (opens Google Form in new tab)
const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/1F8TZYINP21gOJlpZNeDP-8MnAO2dMaCJB6cv13sFaQM/viewform';

function createFeedbackLink(id, extraClass) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = id;
  btn.className = extraClass ? 'feedback-button ' + extraClass : 'feedback-button';
  btn.setAttribute('aria-label', 'Share your feedback (opens in new tab)');
  btn.innerHTML = '💬 Share Your Feedback';
  btn.addEventListener('click', () => {
    window.open(FEEDBACK_FORM_URL, '_blank', 'noopener,noreferrer');
  });
  return btn;
}

function createFeedbackButton() {
  if (document.querySelector('#feedback-button')) {
    return;
  }

  const button = createFeedbackLink('feedback-button');
  const filtersSection = document.querySelector('.filters');
  const eventList = document.querySelector('#event-list');
  const resultsSection = document.querySelector('.results');

  if (filtersSection) {
    const filterGroup = filtersSection.querySelector('.filter-group');
    if (filterGroup) {
      filterGroup.insertAdjacentElement('afterend', button);
    } else {
      filtersSection.appendChild(button);
    }
  } else {
    const generalContent = document.querySelector('.general-content');
    if (generalContent) {
      generalContent.appendChild(button);
    } else {
      const main = document.querySelector('main');
      if (main) {
        main.appendChild(button);
      } else {
        document.body.appendChild(button);
      }
    }
  }

  const mobileButton = createFeedbackLink('feedback-button-mobile', 'feedback-button-mobile');
  const isHomepage = document.body.classList.contains('homepage') || document.body.getAttribute('data-type') === 'homepage';

  if (isHomepage) {
    const newEventsSection = document.querySelector('.new-events');
    if (newEventsSection) {
      newEventsSection.insertAdjacentElement('afterend', mobileButton);
    } else {
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
    eventList.insertAdjacentElement('afterend', mobileButton);
  } else {
    const footer = document.querySelector('footer');
    if (footer) {
      footer.insertAdjacentElement('beforebegin', mobileButton);
    } else if (resultsSection) {
      resultsSection.appendChild(mobileButton);
    } else {
      const main = document.querySelector('main');
      if (main) {
        main.appendChild(mobileButton);
      }
    }
  }
}
