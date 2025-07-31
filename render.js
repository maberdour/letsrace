function renderHeader(title) {
  document.body.insertAdjacentHTML("afterbegin", `
    <header style="background:#0077cc;color:white;padding:1rem;text-align:center;position:relative;">
      <h1 style="margin:0;font-size:1.5rem;">Youth Cycling Events</h1>
      <nav style="margin-top:0.5rem;">
        <a href="index.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Home</a>
        <a href="road.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Road</a>
        <a href="track.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Track</a>
        <a href="mtb.html" style="color:white;margin:0 0.5rem;text-decoration:none;">MTB</a>
        <a href="bmx.html" style="color:white;margin:0 0.5rem;text-decoration:none;">BMX</a>
        <a href="cyclo-cross.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Cyclo-Cross</a>
        <a href="time-trial.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Time Trial</a>
        <a href="hill-climb.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Hill Climb</a>
        <a href="speedway.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Speedway</a>
      </nav>
    </header>
  `);
  createBurgerMenu();
}

function renderEvents(data, containerId) {
  const container = document.getElementById(containerId);
  if (!data.length) {
    container.innerHTML = `
      <div class="no-events">
        <h3>No upcoming events found</h3>
        <p>Check back soon for new events, or browse other cycling disciplines using the navigation above.</p>
      </div>
    `;
    return;
  }

  const html = data.map(row => {
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

  container.innerHTML = html;
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
    <ul>
      <li><a href="index.html">Home</a></li>
      <li><a href="road.html">Road</a></li>
      <li><a href="track.html">Track</a></li>
      <li><a href="mtb.html">MTB</a></li>
      <li><a href="bmx.html">BMX</a></li>
      <li><a href="cyclo-cross.html">Cyclo-Cross</a></li>
      <li><a href="time-trial.html">Time Trial</a></li>
      <li><a href="hill-climb.html">Hill Climb</a></li>
      <li><a href="speedway.html">Speedway</a></li>
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
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      burger.classList.remove('open');
    }
  });
}
