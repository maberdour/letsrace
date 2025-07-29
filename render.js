<!-- Shared header and menu injected via JavaScript -->
<script>
  function renderHeader(title) {
    document.body.insertAdjacentHTML("afterbegin", `
      <header style="background:#0077cc;color:white;padding:1rem;text-align:center;">
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
  }

  function renderEvents(data, containerId) {
    const container = document.getElementById(containerId);
    if (!data.length) {
      container.innerHTML = "<p>No upcoming events found.</p>";
      return;
    }

    const html = data.map(row => {
      const [eventDate, title, discipline, location, url] = row;
      const d = new Date(eventDate);
      const formatted = d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      });

      return `
        <div class="event">
          <h2><a href="${url}" target="_blank">${title}</a></h2>
          <p><strong>Date:</strong> ${formatted}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Discipline:</strong> ${discipline}</p>
        </div>
      `;
    }).join("");

    container.innerHTML = html;
  }
</script>
