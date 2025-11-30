/**
 * Digest generation logic
 */

const { 
  CONFIG, 
  getTodayInLondon, 
  formatDate, 
  parseISODate, 
  escapeHtml, 
  getFriendlyName,
  fetchJSON,
  generateUnsubscribeToken
} = require('./utils');

/**
 * Load events from manifest and type files
 */
async function loadEvents(dateOverride = null) {
  const today = dateOverride || getTodayInLondon();
  const baseUrl = CONFIG.EVENTS_BASE_URL;
  
  try {
    // Fetch manifest
    const manifest = await fetchJSON(`${baseUrl}/data/manifest.json`);
    
    if (!manifest || !manifest.type) {
      throw new Error('Invalid manifest structure');
    }
    
    // Load all event type files
    const eventFiles = Object.values(manifest.type);
    const allEvents = [];
    
    for (const filePath of eventFiles) {
      try {
        const events = await fetchJSON(`${baseUrl}${filePath}`);
        if (Array.isArray(events)) {
          allEvents.push(...events);
        } else if (events && Array.isArray(events.events)) {
          allEvents.push(...events.events);
        }
      } catch (e) {
        console.warn(`Failed to load ${filePath}: ${e.message}`);
      }
    }
    
    return allEvents;
  } catch (error) {
    console.error('Failed to load events:', error);
    throw error;
  }
}

/**
 * Normalize event data to digest format
 */
function normalizeEvent(event) {
  if (!event) return null;
  
  return {
    id: event.id || '',
    name: event.name || 'Untitled event',
    discipline: event.type || event.discipline || 'Road',
    region: event.region || '',
    venue: event.venue || '',
    start_date: event.date || event.start_date,
    added_at: event.last_updated || event.added_at || event.date
  };
}

/**
 * Filter events for subscriber
 */
function filterEventsForSubscriber(events, subscriber, today) {
  const normalizedEvents = events
    .map(normalizeEvent)
    .filter(ev => ev && ev.id && ev.name && ev.start_date);
  
  // Filter by region and disciplines
  const matchingEvents = normalizedEvents.filter(ev => {
    const regionMatch = ev.region === subscriber.region;
    const disciplineMatch = subscriber.disciplines.includes(ev.discipline);
    return regionMatch && disciplineMatch;
  });
  
  // Calculate time windows
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const sixWeeksLater = new Date(today);
  sixWeeksLater.setDate(sixWeeksLater.getDate() + (6 * 7));
  
  // Categorize events
  const newThisWeek = [];
  const upcoming = [];
  
  matchingEvents.forEach(ev => {
    const startDate = parseISODate(ev.start_date);
    const addedDate = parseISODate(ev.added_at);
    
    if (!startDate) return;
    
    // Normalize dates to date-only (remove time component) for comparison
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const addedDateOnly = addedDate ? new Date(addedDate.getFullYear(), addedDate.getMonth(), addedDate.getDate()) : null;
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const sevenDaysAgoOnly = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate());
    const sixWeeksLaterOnly = new Date(sixWeeksLater.getFullYear(), sixWeeksLater.getMonth(), sixWeeksLater.getDate());
    
    // New this week: added_at between (today - 7 days) and today (inclusive)
    if (addedDateOnly && addedDateOnly >= sevenDaysAgoOnly && addedDateOnly <= todayOnly) {
      newThisWeek.push(ev);
    }
    
    // Upcoming: start_date between today and (today + 6 weeks) (inclusive)
    if (startDateOnly >= todayOnly && startDateOnly <= sixWeeksLaterOnly) {
      upcoming.push(ev);
    }
  });
  
  // Remove duplicates (events can appear in both categories)
  const allEventsMap = new Map();
  newThisWeek.forEach(ev => allEventsMap.set(ev.id, ev));
  upcoming.forEach(ev => allEventsMap.set(ev.id, ev));
  
  // Sort by date
  const sortByDate = (a, b) => {
    const dateA = parseISODate(a.start_date);
    const dateB = parseISODate(b.start_date);
    if (!dateA || !dateB) return 0;
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB;
    }
    return a.name.localeCompare(b.name);
  };
  
  return {
    newThisWeek: [...new Set(newThisWeek.map(e => e.id))].map(id => newThisWeek.find(e => e.id === id)).sort(sortByDate),
    upcoming: [...new Set(upcoming.map(e => e.id))].map(id => upcoming.find(e => e.id === id)).sort(sortByDate)
  };
}

/**
 * Format date for display
 */
function formatEventDate(dateString) {
  const date = parseISODate(dateString);
  if (!date) return dateString;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const weekday = weekdays[date.getDay()];
  
  return `${weekday} ${day} ${month} ${year}`;
}

/**
 * Generate HTML email body
 */
function generateDigestHTML(subscriber, events, today) {
  const { newThisWeek, upcoming } = events;
  const friendlyName = getFriendlyName(subscriber.email);
  const regionLabel = escapeHtml(subscriber.region);
  const disciplinesLabel = subscriber.disciplines.join(', ');
  
  const todayFormatted = formatEventDate(formatDate(today));
  
  // Build event list HTML
  function renderEventList(eventList, emptyMessage) {
    if (!eventList || eventList.length === 0) {
      return `<p style="color: #666; margin: 1em 0;">${escapeHtml(emptyMessage)}</p>`;
    }
    
    return eventList.map(ev => {
      const dateStr = formatEventDate(ev.start_date);
      const name = escapeHtml(ev.name);
      const venue = ev.venue ? escapeHtml(ev.venue) : '';
      const venueText = venue ? ` — ${venue}` : '';
      const url = ev.url || '';
      const nameLink = url 
        ? `<a href="${escapeHtml(url)}" style="color: #0066cc; text-decoration: none;">${name}</a>`
        : name;
      
      return `<li style="margin: 0.5em 0;">
        <strong>${escapeHtml(dateStr)}</strong> — ${nameLink}${venueText}
      </li>`;
    }).join('\n');
  }
  
  const unsubscribeToken = generateUnsubscribeToken(subscriber.id, subscriber.email);
  const unsubscribeUrl = `${CONFIG.BASE_WEBSITE_URL}/pages/email-unsubscribed.html?token=${encodeURIComponent(unsubscribeToken)}`;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LetsRace.cc Weekly Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px;">
    <h1 style="margin: 0; color: #0066cc; font-size: 24px;">LetsRace.cc</h1>
  </div>
  
  <p>Hi ${escapeHtml(friendlyName)},</p>
  
  <p>Here's your weekly digest for ${regionLabel} ${disciplinesLabel} races.</p>
  
  <h2 style="color: #0066cc; font-size: 18px; margin-top: 30px; margin-bottom: 15px;">New this week in ${regionLabel}</h2>
  ${newThisWeek.length > 0 
    ? `<ul style="list-style: none; padding: 0;">${renderEventList(newThisWeek, '')}</ul>`
    : `<p style="color: #666; margin: 1em 0;">No newly added events this week for your filters.</p>`}
  
  <h2 style="color: #0066cc; font-size: 18px; margin-top: 30px; margin-bottom: 15px;">Coming up in the next 6 weeks</h2>
  ${upcoming.length > 0 
    ? `<ul style="list-style: none; padding: 0;">${renderEventList(upcoming, '')}</ul>`
    : `<p style="color: #666; margin: 1em 0;">No upcoming events in the next 6 weeks for your filters.</p>`}
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
    <p style="margin: 0.5em 0;">
      <a href="${CONFIG.BASE_WEBSITE_URL}" style="color: #0066cc; text-decoration: none;">Explore all upcoming events → letsrace.cc</a>
    </p>
    <p style="margin: 0.5em 0;">
      You're receiving this because you subscribed to the LetsRace.cc weekly digest.
    </p>
    <p style="margin: 0.5em 0;">
      <a href="${unsubscribeUrl}" style="color: #0066cc; text-decoration: underline;">Unsubscribe instantly</a>
    </p>
    <p style="margin: 0.5em 0;">
      <a href="${CONFIG.BASE_WEBSITE_URL}/pages/privacy.html" style="color: #666; text-decoration: underline;">Privacy info</a>
    </p>
  </div>
</body>
</html>`;
  
  return html;
}

/**
 * Generate subject line
 */
function generateSubject(subscriber) {
  const disciplinesLabel = subscriber.disciplines.slice(0, 2).join(' & ');
  return `LetsRace.cc: ${subscriber.region} ${disciplinesLabel} races – new & upcoming`;
}

/**
 * Generate digest for subscriber
 */
async function generateDigest(subscriber, dateOverride = null) {
  const today = dateOverride || getTodayInLondon();
  
  // Load events
  const allEvents = await loadEvents(dateOverride);
  
  // Filter events
  const filteredEvents = filterEventsForSubscriber(allEvents, subscriber, today);
  
  // Generate email content
  const html = generateDigestHTML(subscriber, filteredEvents, today);
  const subject = generateSubject(subscriber);
  
  return {
    html,
    subject,
    hasContent: filteredEvents.newThisWeek.length > 0 || filteredEvents.upcoming.length > 0
  };
}

module.exports = {
  loadEvents,
  generateDigest,
  filterEventsForSubscriber,
  normalizeEvent
};

