// Get current page filename
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

function renderHeader(title) {
  
  document.body.insertAdjacentHTML("afterbegin", `
    <header style="background:#0077cc;color:white;padding:1rem;text-align:center;position:relative;">
      <h1 style="margin:0;font-size:2rem;font-weight:700;letter-spacing:0.5px;font-family:'Courier New',monospace;">letsrace.cc</h1>
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
}

function renderEvents(data, containerId, pageTitle) {
  const container = document.getElementById(containerId);
  const updateDate = new Date().toLocaleDateString('en-GB', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  });

  let contentHtml = `
    <div class="content-container">
      <h2 class="page-title">${pageTitle}</h2>
      <div class="update-time">Updated on ${updateDate}</div>
      <div class="events-list">
  `;

  if (!data.length) {
    contentHtml += `
      <div class="no-events">
        <h3>No upcoming events found</h3>
        <p>Check back soon for new events, or browse other cycling disciplines using the navigation above.</p>
      </div>
    `;
    container.innerHTML = contentHtml + '</div></div>';
    return;
  }

  const eventsHtml = data.map(row => {
    const [eventDate, title, discipline, location, url, addedDate] = row;
    const d = new Date(eventDate);
    const formatted = d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    // Check if added within last 7 days
    const added = new Date(addedDate);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const isNewlyAdded = added > sevenDaysAgo;

    return `
      <div class="event ${isNewlyAdded ? 'newly-added' : ''}">
        <h2><a href="${url}" target="_blank">${title}</a></h2>
        <p><strong>Date:</strong> ${formatted}</p>
        <p><strong>Location:</strong> ${location}</p>
        ${isNewlyAdded ? '<p class="new-label"><strong>Added in the past 7 days</strong></p>' : ''}
      </div>
    `;
  }).join("");

  container.innerHTML = contentHtml + eventsHtml + '</div></div>';
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
