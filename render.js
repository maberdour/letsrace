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
