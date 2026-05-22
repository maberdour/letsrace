/**
 * Digest generation logic
 */

const { 
  CONFIG,
  VALID_DISCIPLINES,
  getTodayInLondon, 
  formatDate, 
  parseISODate, 
  escapeHtml, 
  getFriendlyName,
  fetchJSON,
  generateUnsubscribeToken
} = require('./utils');

const DISCIPLINE_PAGE_SLUG = {
  'Road': 'road',
  'Track': 'track',
  'BMX': 'bmx',
  'MTB': 'mtb',
  'Cyclo Cross': 'cyclo-cross',
  'Speedway': 'speedway',
  'Time Trial': 'time-trial',
  'Hill Climb': 'hill-climb'
};

const SITE_HEADER_STYLE = 'margin: 0; color: #0066cc; font-size: 26px; text-decoration: none;';
const SECTION_H1_STYLE = 'color: #0066cc; font-size: 24px; text-decoration: none; margin: 0; padding: 0 0 8px 0; line-height: 1.3;';
const SECTION_HEADING_WRAP_STYLE = 'border-bottom: 2px solid #0066cc; margin: 30px 0 16px 0; padding: 0;';
const H2_STYLE = 'color: #0066cc; font-size: 20px; margin-top: 20px; margin-bottom: 10px;';
const LINK_STYLE = 'color: #0066cc; text-decoration: none;';

/** Full-width decorative rule via wrapper border (email-safe; avoid <hr>). */
function renderSectionHeading(title) {
  return `<div style="${SECTION_HEADING_WRAP_STYLE}">
    <h1 style="${SECTION_H1_STYLE}">${escapeHtml(title)}</h1>
  </div>`;
}

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
    url: event.url || '',
    start_date: event.date || event.start_date,
    added_at: event.last_updated || event.added_at || event.date
  };
}

/**
 * Subscriber disciplines in canonical form order (matches signup form).
 */
function getOrderedDisciplines(subscriber) {
  const selected = new Set(subscriber.disciplines || []);
  return VALID_DISCIPLINES.filter(d => selected.has(d));
}

function groupEventsByDiscipline(events, orderedDisciplines) {
  const groups = Object.fromEntries(orderedDisciplines.map(d => [d, []]));
  events.forEach(ev => {
    if (groups[ev.discipline]) {
      groups[ev.discipline].push(ev);
    }
  });
  return groups;
}

function buildRegionsQuery(regions) {
  const params = new URLSearchParams();
  if (regions.length > 0) {
    params.set('regions', regions.join(','));
  }
  return params.toString();
}

function buildNewEventsUrl(regions) {
  const query = buildRegionsQuery(regions);
  return `${CONFIG.BASE_WEBSITE_URL}/pages/newly-added.html${query ? `?${query}` : ''}`;
}

function buildDisciplineEventsUrl(discipline, regions) {
  const slug = DISCIPLINE_PAGE_SLUG[discipline];
  if (!slug) {
    return CONFIG.BASE_WEBSITE_URL;
  }
  const query = buildRegionsQuery(regions);
  return `${CONFIG.BASE_WEBSITE_URL}/pages/${slug}/${query ? `?${query}` : ''}`;
}

/**
 * Filter events for subscriber
 */
function filterEventsForSubscriber(events, subscriber, today) {
  const normalizedEvents = events
    .map(normalizeEvent)
    .filter(ev => ev && ev.id && ev.name && ev.start_date);
  
  // Filter by regions and disciplines
  // Support both old single region format and new regions array format
  const subscriberRegions = subscriber.regions || (subscriber.region ? [subscriber.region] : []);
  const matchingEvents = normalizedEvents.filter(ev => {
    const regionMatch = subscriberRegions.includes(ev.region);
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

function renderEventList(eventList) {
  return eventList.map(ev => {
    const dateStr = formatEventDate(ev.start_date);
    const name = escapeHtml(ev.name);
    const venue = ev.venue ? escapeHtml(ev.venue) : '';
    const venueText = venue ? ` — ${venue}` : '';

    return `<li style="margin: 0.5em 0;">
      <strong>${escapeHtml(dateStr)}</strong> — ${name}${venueText}
    </li>`;
  }).join('\n');
}

function renderViewAllLink(href, label) {
  return `<p style="margin: 0.75em 0 1.25em;">
    <a href="${escapeHtml(href)}" style="${LINK_STYLE}">${escapeHtml(label)}</a>
  </p>`;
}

function renderDisciplineBlocks(groups, emptyMessage) {
  const blocks = [];

  Object.entries(groups).forEach(([discipline, eventList]) => {
    blocks.push(`<h2 style="${H2_STYLE}">${escapeHtml(discipline)}</h2>`);
    if (eventList.length > 0) {
      blocks.push(`<ul style="list-style: none; padding: 0; margin: 0;">${renderEventList(eventList)}</ul>`);
    } else {
      blocks.push(`<p style="color: #666; margin: 0.5em 0;">${escapeHtml(emptyMessage)}</p>`);
    }
  });

  return blocks.join('\n');
}

/**
 * Generate HTML email body
 */
function generateDigestHTML(subscriber, events, today) {
  const { newThisWeek, upcoming } = events;
  const friendlyName = getFriendlyName(subscriber.email);
  const subscriberRegions = subscriber.regions || (subscriber.region ? [subscriber.region] : []);
  const regionsLabel = subscriberRegions.length === 1
    ? escapeHtml(subscriberRegions[0])
    : subscriberRegions.length === 2
    ? escapeHtml(subscriberRegions.join(' and '))
    : escapeHtml(subscriberRegions.slice(0, -1).join(', ') + ', and ' + subscriberRegions[subscriberRegions.length - 1]);
  const disciplinesLabel = subscriber.disciplines.join(', ');
  const orderedDisciplines = getOrderedDisciplines(subscriber);
  const newByDiscipline = groupEventsByDiscipline(newThisWeek, orderedDisciplines);
  const upcomingByDiscipline = groupEventsByDiscipline(upcoming, orderedDisciplines);

  const newSectionHtml = renderDisciplineBlocks(
    newByDiscipline,
    'No newly added events this week for this discipline.'
  );
  const newViewAllUrl = buildNewEventsUrl(subscriberRegions);
  const upcomingBlocks = orderedDisciplines.map(discipline => {
    const eventList = upcomingByDiscipline[discipline] || [];
    const parts = [`<h2 style="${H2_STYLE}">${escapeHtml(discipline)}</h2>`];
    if (eventList.length > 0) {
      parts.push(`<ul style="list-style: none; padding: 0; margin: 0;">${renderEventList(eventList)}</ul>`);
    } else {
      parts.push(`<p style="color: #666; margin: 0.5em 0;">No upcoming events in the next 6 weeks for this discipline.</p>`);
    }
    parts.push(renderViewAllLink(
      buildDisciplineEventsUrl(discipline, subscriberRegions),
      `View all upcoming ${discipline} events in your region`
    ));
    return parts.join('\n');
  }).join('\n');

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
  <div style="margin-bottom: 20px;">
    <h1 style="${SITE_HEADER_STYLE}">LetsRace.cc</h1>
  </div>
  
  <p>Hi ${escapeHtml(friendlyName)},</p>
  
  <p>Here's your weekly digest for ${regionsLabel} ${escapeHtml(disciplinesLabel)} races.</p>
  
  ${renderSectionHeading('New this week')}
  ${newSectionHtml}
  ${renderViewAllLink(newViewAllUrl, 'View all new events in your region this week')}
  
  ${renderSectionHeading('Coming up in the next 6 weeks')}
  ${upcomingBlocks}
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666;">
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
  // Support both old single region format and new regions array format
  const subscriberRegions = subscriber.regions || (subscriber.region ? [subscriber.region] : []);
  const regionsLabel = subscriberRegions.length === 1 
    ? subscriberRegions[0]
    : subscriberRegions.length === 2
    ? subscriberRegions.join(' & ')
    : subscriberRegions.slice(0, 2).join(', ') + ' & more';
  return `LetsRace.cc: ${regionsLabel} ${disciplinesLabel} races – new & upcoming`;
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
  generateDigestHTML,
  filterEventsForSubscriber,
  normalizeEvent,
  getOrderedDisciplines,
  groupEventsByDiscipline,
  buildNewEventsUrl,
  buildDisciplineEventsUrl
};

