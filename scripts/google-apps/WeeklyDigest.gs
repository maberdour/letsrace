/**
 * Weekly email automation for LetsRace.cc
 *
 * Handles:
 *  - Signup + double opt-in confirmation
 *  - Weekly digest sending with region/discipline filtering
 *  - Unsubscribe workflow and data retention
 *  - Manual bounce log support
 */

var WEEKLY_DIGEST = WEEKLY_DIGEST || {
  SHEET_ID: '13d2cjHHjpHhV4QvY6OA6NkeK_Rm2Zf3x4YH_UpBSO3c',
  SHEET_NAME: 'Subscribers',
  TIMEZONE: 'Europe/London',
  SITE_BASE_URL: 'https://letsrace.cc',
  FROM_NAME: 'LetsRace.cc Weekly',
  FROM_EMAIL: 'hello@letsrace.cc',
  REPLY_TO: 'hello@letsrace.cc',
  CONFIRM_PAGE: '/pages/email-confirmed.html',
  UNSUBSCRIBE_PAGE: '/pages/email-unsubscribed.html',
  ERROR_PAGE: '/pages/email-error.html',
  PREFERENCES_PAGE: '/pages/email-preferences-saved.html',
  TOKEN_TTL_HOURS: 48,
  MANAGE_TOKEN_TTL_DAYS: 365,
  RETENTION_MONTHS: 12,
  NEW_EVENT_WINDOW_DAYS: 7,
  LAST_CHANCE_WINDOW_DAYS: 28,
  PRIMARY_WINDOW_MIN_DAYS: 28,
  PRIMARY_WINDOW_MAX_DAYS: 42,
  MAIL_BATCH_SIZE: 450,
  REQUIRED_CONSENT_VERSION: '2025-11-10',
  ADVERTS_PATH: '/content/Adverts.md'
};

const SUBSCRIBER_COLUMNS = [
  'email',
  'regions',
  'disciplines',
  'weekday',
  'status',
  'confirmation_token',
  'token_expires_at',
  'subscribed_at',
  'confirmed_at',
  'last_sent_at',
  'unsubscribe_at',
  'bounce_status',
  'bounce_notes',
  'manage_token',
  'manage_token_expires_at',
  'consent_version',
  'site_referrer',
  'user_agent'
];

const VALID_WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DISCIPLINE_NORMALISER = {
  'cyclo cross': 'Cyclo Cross',
  'cyclo-cross': 'Cyclo Cross',
  'cycle speedway': 'Speedway',
  'track league': 'Track',
  'go-ride': 'Go-Ride'
};

/**
 * Public POST endpoint (signup)
 */
function doPost(e) {
  try {
    const payload = parseRequestBody_(e);
    const redirectUrl = Array.isArray(payload.redirect_url) ? payload.redirect_url[0] : payload.redirect_url;
    const wantsRedirect = Boolean(redirectUrl);
    payload.regions = Array.isArray(payload.regions) ? payload.regions : (payload.regions ? [payload.regions] : []);
    payload.disciplines = Array.isArray(payload.disciplines) ? payload.disciplines : (payload.disciplines ? [payload.disciplines] : []);
    payload.regions = payload.regions.map(item => String(item || '').trim()).filter(Boolean);
    payload.disciplines = payload.disciplines.map(item => String(item || '').trim()).filter(Boolean);
    payload.weekday = String(payload.weekday || '').toLowerCase();
    payload.email = Array.isArray(payload.email) ? String(payload.email[0] || '').trim() : String(payload.email || '').trim();
    payload.site_referrer = Array.isArray(payload.site_referrer) ? payload.site_referrer[0] : payload.site_referrer;
    payload.user_agent = Array.isArray(payload.user_agent) ? payload.user_agent[0] : payload.user_agent;
    if (Array.isArray(payload.consent)) {
      payload.consent = payload.consent.some(value => String(value).toLowerCase() === 'on' || String(value).toLowerCase() === 'true');
    } else {
      payload.consent = payload.consent === true || String(payload.consent || '').toLowerCase() === 'on' || String(payload.consent || '').toLowerCase() === 'true';
    }
    const validationError = validateSignupPayload_(payload);
    if (validationError) {
      if (wantsRedirect) {
        const retryUrl = payload.site_referrer || WEEKLY_DIGEST.SITE_BASE_URL + '/pages/weekly-email.html';
        return renderErrorPage_(validationError, retryUrl);
      }
      return jsonResponse_({
        success: false,
        message: validationError
      });
    }

    const sheet = getSubscriberSheet_();
    const nowIso = nowIso_();
    const token = Utilities.getUuid();
    const tokenExpires = futureIsoHours_(WEEKLY_DIGEST.TOKEN_TTL_HOURS);
    const cleanEmail = payload.email.toLowerCase();
    const siteReferrer = payload.site_referrer || (e && e.headers && (e.headers.referer || e.headers.Referer)) || '';
    const userAgent = payload.user_agent || (e && e.headers && (e.headers['User-Agent'] || e.headers['user-agent'])) || '';

    const record = {
      email: cleanEmail,
      regions: payload.regions.join(','),
      disciplines: payload.disciplines.join(','),
      weekday: payload.weekday,
      status: 'pending',
      confirmation_token: token,
      token_expires_at: tokenExpires,
      subscribed_at: nowIso,
      consent_version: WEEKLY_DIGEST.REQUIRED_CONSENT_VERSION,
      site_referrer: siteReferrer,
      user_agent: userAgent,
      manage_token: Utilities.getUuid(),
      manage_token_expires_at: futureIsoDays_(WEEKLY_DIGEST.MANAGE_TOKEN_TTL_DAYS),
      bounce_status: 'ok'
    };

    upsertSubscriber_(sheet, record);
    sendConfirmationEmail_(cleanEmail, record);

    if (wantsRedirect) {
      return renderRedirectPage_(redirectUrl || (WEEKLY_DIGEST.SITE_BASE_URL + '/pages/email-check.html'));
    }

    return jsonResponse_({
      success: true,
      message: 'Thanks! Please check your inbox to confirm your email.'
    });
  } catch (error) {
    Logger.log(`Signup error: ${error.message}\n${error.stack}`);
    const fallbackUrl = (e && e.parameter && e.parameter.site_referrer) || WEEKLY_DIGEST.SITE_BASE_URL + '/pages/weekly-email.html';
    if (e && e.parameter && e.parameter.redirect_url) {
      return renderErrorPage_('We could not process that request. Please try again in a few minutes.', fallbackUrl);
    }
    return jsonResponse_({
      success: false,
      message: 'We could not process that request. Please try again in a few minutes.'
    });
  }
}

/**
 * Public GET endpoint (confirm/unsubscribe/manage)
 */
function doGet(e) {
  const action = (e.parameter.action || '').toLowerCase();
  const token = e.parameter.token || '';

  if (!action) {
    return HtmlService.createHtmlOutput('LetsRace.cc weekly email endpoint');
  }

  try {
    switch (action) {
      case 'confirm':
        return handleConfirmation_(token);
      case 'unsubscribe':
        return handleUnsubscribe_(token);
      case 'manage':
        return handleManagePrompt_(token);
      default:
        return redirectTo_(WEEKLY_DIGEST.ERROR_PAGE);
    }
  } catch (error) {
    Logger.log(`doGet error: ${error.message}`);
    return redirectTo_(WEEKLY_DIGEST.ERROR_PAGE);
  }
}

/**
 * Cron entry-point – send scheduled emails
 */
function sendWeeklyDigests() {
  if (isPaused_()) {
    Logger.log('Weekly digest paused via script property.');
    return;
  }

  const remainingQuota = MailApp.getRemainingDailyQuota();
  if (remainingQuota < 10) {
    Logger.log(`Aborting weekly digest – remaining quota only ${remainingQuota}`);
    return;
  }

  const sheet = getSubscriberSheet_();
  if (isSheetPaused_(sheet)) {
    Logger.log('Weekly digest paused via sheet toggle.');
    return;
  }

  const today = Utilities.formatDate(new Date(), WEEKLY_DIGEST.TIMEZONE, 'EEEE').toLowerCase();
  const data = sheet.getDataRange().getValues();
  const header = data.shift();
  const headerMap = buildHeaderMap_(header);

  const subscribers = data
    .map(row => rowToObject_(row, headerMap))
    .filter(isValidSubscriber_)
    .filter(sub => sub.status === 'active' && sub.weekday === today)
    .filter(sub => !sub.bounce_status || sub.bounce_status === 'ok')
    .filter(sub => shouldSendThisWeek_(sub));

  Logger.log(`Weekly digest: ${subscribers.length} recipients queued for ${today}.`);

  if (!subscribers.length) {
    return;
  }

  const manifest = fetchJson_(WEEKLY_DIGEST.SITE_BASE_URL + '/data/manifest.json');
  const newEventsUrl = manifest.new_events;
  if (!newEventsUrl) {
    Logger.log('Manifest missing new_events path.');
    return;
  }

  const newEventsData = fetchJson_(WEEKLY_DIGEST.SITE_BASE_URL + newEventsUrl);
  const allEvents = (newEventsData && newEventsData.events) ? newEventsData.events : [];

  const adverts = loadAdverts_();

  let sentCount = 0;
  let quota = remainingQuota;

  subscribers.slice(0, WEEKLY_DIGEST.MAIL_BATCH_SIZE).forEach(subscriber => {
    if (quota <= 0) {
      Logger.log('Mail quota exhausted during send.');
      return;
    }

    try {
      const digestData = buildDigestForSubscriber_(subscriber, allEvents, adverts);
      if (!digestData.hasContent) {
        Logger.log(`Skipping ${subscriber.email} – no matching events this week.`);
        return;
      }

      MailApp.sendEmail({
        to: subscriber.email,
        subject: digestData.subject,
        body: digestData.body,
        name: WEEKLY_DIGEST.FROM_NAME,
        replyTo: WEEKLY_DIGEST.REPLY_TO
      });

      updateLastSent_(sheet, subscriber.email);
      sentCount += 1;
      quota -= 1;
    } catch (error) {
      Logger.log(`Failed to send to ${subscriber.email}: ${error.message}`);
    }
  });

  Logger.log(`Weekly digest complete – sent ${sentCount} emails.`);
}

/**
 * Monthly cleanup task – delete old unsubscribed/pending records
 */
function cleanupWeeklyDigestData() {
  const sheet = getSubscriberSheet_();
  const data = sheet.getDataRange().getValues();
  const header = data.shift();
  const headerMap = buildHeaderMap_(header);

  const cutoff = monthsAgoIso_(WEEKLY_DIGEST.RETENTION_MONTHS);
  const rowsToDelete = [];

  data.forEach((row, index) => {
    const record = rowToObject_(row, headerMap);
    if (!isValidSubscriber_(record)) {
      return;
    }
    const deleteRow = shouldDeleteRecord_(record, cutoff);
    if (deleteRow) {
      rowsToDelete.push(index + 2); // +2 because header + 1-indexed
    }
  });

  removeSheetRows_(sheet, rowsToDelete);
  Logger.log(`Cleanup removed ${rowsToDelete.length} subscriber rows.`);
}

/**
 * Handle CORS preflight requests
 */
function doOptions(e) {
  Logger.log('doOptions hit at ' + new Date());
  return withCorsHeaders_(
    ContentService.createTextOutput('')
      .setMimeType(ContentService.MimeType.TEXT)
  );
}

/* -------------------------------------------------------------------------- */
/* Signup Helpers                                                             */
/* -------------------------------------------------------------------------- */

function parseRequestBody_(e) {
  if (e && e.postData && e.postData.contents) {
    const type = (e.postData.type || '').toLowerCase();
    if (type === 'application/json') {
      return JSON.parse(e.postData.contents);
    }
    if (type === 'text/plain') {
      return JSON.parse(e.postData.contents);
    }
    if (type === 'application/x-www-form-urlencoded') {
      return parseFormParameters_(e);
    }
  }
  if (e && e.parameter) {
    return parseFormParameters_(e);
  }
  return {};
}

function parseFormParameters_(e) {
  const params = {};
  const rawParams = e.parameters || {};
  Object.keys(rawParams).forEach(key => {
    const values = rawParams[key];
    const baseKey = key.endsWith('[]') ? key.slice(0, -2) : key;
    if (Array.isArray(values)) {
      if (key.endsWith('[]') || values.length > 1) {
        params[baseKey] = values.map(v => String(v || '').trim()).filter(Boolean);
      } else {
        params[baseKey] = String(values[0] || '').trim();
      }
    } else if (values !== null && values !== undefined) {
      params[baseKey] = String(values).trim();
    }
  });
  return params;
}

function validateSignupPayload_(payload) {
  if (!payload.email) {
    return 'Please add your email address.';
  }

  const email = payload.email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'That email address does not look right.';
  }

  if (!Array.isArray(payload.regions) || payload.regions.length === 0) {
    return 'Please choose at least one region.';
  }

  if (!Array.isArray(payload.disciplines) || payload.disciplines.length === 0) {
    return 'Please choose at least one discipline.';
  }

  if (!payload.weekday || VALID_WEEKDAYS.indexOf(payload.weekday.toLowerCase()) === -1) {
    return 'Please pick a weekday for your digest.';
  }

  if (!payload.consent) {
    return 'We need your consent before sending the digest.';
  }

  return '';
}

function sendConfirmationEmail_(email, record) {
  const confirmLink = buildWebAppUrl_({
    action: 'confirm',
    token: record.confirmation_token
  });

  const regions = record.regions.split(',').filter(Boolean).join(', ');
  const disciplines = record.disciplines.split(',').filter(Boolean).join(', ');
  const weekday = capitalize_(record.weekday);

  const body = [
    'Hi there,',
    '',
    'You asked to receive the LetsRace.cc weekly email for youth cycling events.',
    '',
    'Please confirm by visiting the link below — it only takes a moment:',
    confirmLink,
    '',
    'We’ll send one plain-text email on ' + weekday + ' with events for:',
    '• Regions: ' + regions,
    '• Disciplines: ' + disciplines,
    '',
    'If you didn’t make this request, you can ignore this email and nothing else will happen.',
    '',
    'Thanks for supporting youth cycling,',
    'The LetsRace.cc team'
  ].join('\n');

  MailApp.sendEmail({
    to: email,
    subject: 'Confirm your LetsRace.cc weekly digest',
    body,
    name: WEEKLY_DIGEST.FROM_NAME,
    replyTo: WEEKLY_DIGEST.REPLY_TO
  });
}

/* -------------------------------------------------------------------------- */
/* GET Handlers                                                               */
/* -------------------------------------------------------------------------- */

function handleConfirmation_(token) {
  if (!token) {
    return redirectTo_(WEEKLY_DIGEST.ERROR_PAGE);
  }

  const sheet = getSubscriberSheet_();
  const { rowIndex, record } = findByToken_(sheet, 'confirmation_token', token);
  if (!rowIndex || !record) {
    return redirectTo_(WEEKLY_DIGEST.ERROR_PAGE);
  }

  if (record.token_expires_at && new Date(record.token_expires_at) < new Date()) {
    return redirectTo_(WEEKLY_DIGEST.ERROR_PAGE);
  }

  const updates = {
    status: 'active',
    confirmation_token: '',
    token_expires_at: '',
    confirmed_at: nowIso_(),
    unsubscribe_at: '',
    bounce_status: 'ok'
  };

  if (!record.manage_token || !record.manage_token_expires_at) {
    updates.manage_token = Utilities.getUuid();
    updates.manage_token_expires_at = futureIsoDays_(WEEKLY_DIGEST.MANAGE_TOKEN_TTL_DAYS);
  }

  writeRowValues_(sheet, rowIndex, updates);
  return redirectTo_(WEEKLY_DIGEST.CONFIRM_PAGE);
}

function handleUnsubscribe_(token) {
  if (!token) {
    return redirectTo_(WEEKLY_DIGEST.ERROR_PAGE);
  }

  const sheet = getSubscriberSheet_();
  const { rowIndex } = findByToken_(sheet, 'manage_token', token);
  if (!rowIndex) {
    return redirectTo_(WEEKLY_DIGEST.ERROR_PAGE);
  }

  const updates = {
    status: 'unsubscribed',
    unsubscribe_at: nowIso_(),
    confirmation_token: '',
    token_expires_at: ''
  };

  writeRowValues_(sheet, rowIndex, updates);
  return redirectTo_(WEEKLY_DIGEST.UNSUBSCRIBE_PAGE);
}

function handleManagePrompt_(token) {
  if (!token) {
    return redirectTo_(WEEKLY_DIGEST.ERROR_PAGE);
  }

  const url = WEEKLY_DIGEST.SITE_BASE_URL + '/pages/weekly-email.html';
  const html = HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Update your weekly digest</title>' +
    '<meta http-equiv="refresh" content="0; url=' + url + '?manage=1">' +
    '</head><body>Redirecting… If nothing happens, <a href="' + url + '?manage=1">click here</a>.</body></html>'
  );
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

/* -------------------------------------------------------------------------- */
/* Digest builder                                                             */
/* -------------------------------------------------------------------------- */

function buildDigestForSubscriber_(subscriber, allEvents, adverts) {
  const selectedRegions = (subscriber.regions || '').split(',').map(trimLower_).filter(Boolean);
  const selectedDisciplines = (subscriber.disciplines || '').split(',').map(trimLower_).filter(Boolean);

  if (!selectedRegions.length || !selectedDisciplines.length) {
    return { hasContent: false };
  }

  const now = new Date();
  const today = convertToTimezone_(now, WEEKLY_DIGEST.TIMEZONE);

  const primaryRangeStart = addDays_(today, WEEKLY_DIGEST.PRIMARY_WINDOW_MIN_DAYS);
  const primaryRangeEnd = addDays_(today, WEEKLY_DIGEST.PRIMARY_WINDOW_MAX_DAYS);
  const lastChanceEnd = addDays_(today, WEEKLY_DIGEST.LAST_CHANCE_WINDOW_DAYS);
  const newCutoff = addDays_(today, -WEEKLY_DIGEST.NEW_EVENT_WINDOW_DAYS);

  const matchingEvents = allEvents
    .map(normaliseEvent_)
    .filter(ev => ev && selectedRegions.indexOf(ev.region.toLowerCase()) !== -1)
    .filter(ev => selectedDisciplines.indexOf(ev.discipline.toLowerCase()) !== -1)
    .filter(ev => ev.date && ev.date >= today);

  if (!matchingEvents.length) {
    return { hasContent: false };
  }

  matchingEvents.forEach(ev => {
    ev.daysUntil = daysBetween_(today, ev.date);
    ev.isNew = ev.lastUpdated && ev.lastUpdated >= newCutoff;
    ev.isLastChance = ev.daysUntil >= 0 && ev.daysUntil < WEEKLY_DIGEST.LAST_CHANCE_WINDOW_DAYS;
    ev.isPrimaryWindow = ev.daysUntil >= WEEKLY_DIGEST.PRIMARY_WINDOW_MIN_DAYS && ev.daysUntil <= WEEKLY_DIGEST.PRIMARY_WINDOW_MAX_DAYS;
  });

  const primaryEvents = matchingEvents
    .filter(ev => ev.isPrimaryWindow)
    .sort(eventSort_);

  const lastChance = matchingEvents
    .filter(ev => ev.isLastChance)
    .sort(eventSort_);

  const newEvents = matchingEvents
    .filter(ev => ev.isNew && ev.daysUntil <= WEEKLY_DIGEST.PRIMARY_WINDOW_MAX_DAYS)
    .sort(eventSort_);

  const advert = pickAdvert_(adverts, selectedRegions, selectedDisciplines);
  const advertSection = formatAdvertSection_(advert);

  const regionLabel = formatList_(selectedRegions.map(titleCaseWords_));
  const disciplineLabel = formatList_(selectedDisciplines.map(titleCaseWords_));

  const eventGroups = groupEventsByDiscipline_(primaryEvents);
  const eventText = renderEventGroups_(eventGroups);
  const lastChanceText = renderSimpleList_(lastChance, 'No events close to race day for your filters this week.');
  const newEventsText = renderSimpleList_(newEvents, 'No newly added events for your filters this week.');

  const manageLink = buildWebAppUrl_({
    action: 'manage',
    token: subscriber.manage_token || ''
  });

  const unsubscribeLink = buildWebAppUrl_({
    action: 'unsubscribe',
    token: subscriber.manage_token || ''
  });

  const subject = `LetsRace.cc weekly digest – ${Utilities.formatDate(today, WEEKLY_DIGEST.TIMEZONE, 'd MMM yyyy')}`;
  const greeting = `Hi ${friendlyName_(subscriber.email)},`;

  const bodyLines = [
    greeting,
    '',
    `Here’s what’s coming up in the next 4–6 weeks for ${regionLabel} ${disciplineLabel} riders.`,
    '',
    'Plan ahead — most events close entries about a week before race day, so enter early if you can.',
    '',
    advertSection,
    '',
    eventText || 'No events 4–6 weeks ahead for your filters this week. Check LetsRace.cc for the latest updates.',
    '',
    'Last chance to enter (happening within 4 weeks):',
    lastChanceText,
    '',
    'Newly added this week:',
    newEventsText,
    '',
    'See the full calendar any time at https://letsrace.cc',
    '',
    'Need to tweak your preferences or pause emails? Manage everything here:',
    manageLink ? manageLink : WEEKLY_DIGEST.SITE_BASE_URL + '/pages/weekly-email.html',
    '',
    `You’re receiving this because you asked for the LetsRace.cc weekly digest.`,
    `Unsubscribe instantly: ${unsubscribeLink}`,
    'Privacy info: https://letsrace.cc/pages/privacy.html',
    '',
    'Thanks for supporting youth cycling,',
    'LetsRace.cc'
  ];

  return {
    hasContent: true,
    subject,
    body: bodyLines.join('\n')
  };
}

function normaliseEvent_(event) {
  if (!event || !event.date) return null;

  const date = parseIsoDate_(event.date);
  if (!date) return null;

  const discipline = normaliseDiscipline_(event.type || '');
  const region = event.region || '';

  const lastUpdated = event.last_updated ? new Date(event.last_updated) : null;

  return {
    name: event.name || 'Untitled event',
    region: region,
    discipline: discipline,
    date,
    venue: event.venue || '',
    url: event.url || '',
    lastUpdated,
    raw: event
  };
}

function normaliseDiscipline_(value) {
  if (!value) return 'Road';
  const lower = value.toLowerCase();
  if (DISCIPLINE_NORMALISER[lower]) {
    return DISCIPLINE_NORMALISER[lower];
  }
  const title = lower.split(' ').map(capitalize_).join(' ');
  return title === 'Cyclo Cross' ? 'Cyclo Cross' : title;
}

function eventSort_(a, b) {
  if (a.date.getTime() !== b.date.getTime()) {
    return a.date - b.date;
  }
  if (a.name !== b.name) {
    return a.name.localeCompare(b.name);
  }
  return a.region.localeCompare(b.region);
}

function groupEventsByDiscipline_(events) {
  return events.reduce((acc, event) => {
    const key = event.discipline;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});
}

function renderEventGroups_(groups) {
  const keys = Object.keys(groups);
  if (!keys.length) {
    return '';
  }

  keys.sort();

  const sections = keys.map(key => {
    const lines = groups[key].map(event => formatEventLine_(event));
    return ['== ' + key + ' ==', ...lines].join('\n');
  });

  return sections.join('\n\n');
}

function formatEventLine_(event) {
  const dateText = Utilities.formatDate(event.date, WEEKLY_DIGEST.TIMEZONE, 'EEE d MMM yyyy');
  const newFlag = event.isNew ? ' [New this week]' : '';
  const closingFlag = event.isLastChance ? ' [Last chance]' : '';
  return `• ${dateText} — ${event.name} (${event.region})${newFlag}${closingFlag}`;
}

function renderSimpleList_(events, emptyMessage) {
  if (!events.length) {
    return emptyMessage;
  }
  return events.map(event => {
    const dateText = Utilities.formatDate(event.date, WEEKLY_DIGEST.TIMEZONE, 'EEE d MMM');
    return `• ${dateText} — ${event.name} (${event.discipline}, ${event.region})`;
  }).join('\n');
}

function formatAdvertSection_(advert) {
  if (!advert) {
    return 'Support from local partners keeps youth racing rolling. This week: know a club or shop that should be featured? Put them in touch with LetsRace.cc.';
  }

  let section = 'Support from local partners keeps youth racing rolling. This week:';
  section += '\n' + advert.text;
  if (advert.logoUrl) {
    section += '\nLogo: ' + advert.logoUrl;
  }
  return section;
}

function friendlyName_(email) {
  const localPart = email.split('@')[0];
  if (!localPart) return 'friend';
  const cleaned = localPart.replace(/[\.\_\-]/g, ' ');
  return capitalize_(cleaned.split(' ')[0]);
}

/* -------------------------------------------------------------------------- */
/* Adverts                                                                    */
/* -------------------------------------------------------------------------- */

function loadAdverts_() {
  try {
    const url = WEEKLY_DIGEST.SITE_BASE_URL + WEEKLY_DIGEST.ADVERTS_PATH;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      Logger.log(`Adverts fetch failed: ${response.getResponseCode()}`);
      return [];
    }
    const text = response.getContentText();
    return parseAdvertsMarkdown_(text);
  } catch (error) {
    Logger.log(`Adverts load error: ${error.message}`);
    return [];
  }
}

function parseAdvertsMarkdown_(text) {
  if (!text) return [];
  const sections = text.split('\n## ').slice(1); // drop intro
  return sections.map(section => {
    const lines = section.trim().split('\n');
    const title = lines.shift().trim();
    const advert = { title: title };

    lines.forEach(line => {
      const match = line.match(/^\-\s+\*\*(.+?)\*\*:\s*(.+)$/);
      if (!match) return;
      const key = match[1].toLowerCase();
      const value = match[2].trim();

      switch (key) {
        case 'text':
          advert.text = value;
          break;
        case 'logo url':
          advert.logoUrl = value;
          break;
        case 'alt text':
          advert.altText = value;
          break;
        case 'regions':
          advert.regions = value.split(',').map(trimLower_);
          break;
        case 'disciplines':
          advert.disciplines = value.split(',').map(trimLower_);
          break;
        case 'priority':
          advert.priority = value.toLowerCase();
          break;
      }
    });

    advert.regions = advert.regions || ['all'];
    advert.disciplines = advert.disciplines || ['all'];
    advert.priority = advert.priority || 'normal';

    return advert;
  });
}

function pickAdvert_(adverts, subscriberRegions, subscriberDisciplines) {
  if (!adverts || !adverts.length) return null;

  const priorityScore = { high: 2, normal: 1, low: 0 };
  const matches = adverts.filter(ad => {
    const regionMatch = ad.regions.indexOf('all') !== -1 || overlap_(ad.regions, subscriberRegions);
    const disciplineMatch = ad.disciplines.indexOf('all') !== -1 || overlap_(ad.disciplines, subscriberDisciplines);
    return regionMatch && disciplineMatch;
  });

  const pool = matches.length ? matches : adverts;

  pool.sort((a, b) => (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0));
  return pool[0];
}

/* -------------------------------------------------------------------------- */
/* Sheet utilities                                                            */
/* -------------------------------------------------------------------------- */

function getSubscriberSheet_() {
  const ss = SpreadsheetApp.openById(WEEKLY_DIGEST.SHEET_ID);
  let sheet = ss.getSheetByName(WEEKLY_DIGEST.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(WEEKLY_DIGEST.SHEET_NAME);
  }
  ensureHeaderRow_(sheet);
  return sheet;
}

function ensureHeaderRow_(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, SUBSCRIBER_COLUMNS.length).getValues()[0];
  const missing = SUBSCRIBER_COLUMNS.some((col, index) => firstRow[index] !== col);
  if (missing) {
    sheet.getRange(1, 1, 1, SUBSCRIBER_COLUMNS.length).setValues([SUBSCRIBER_COLUMNS]);
  }
}

function upsertSubscriber_(sheet, record) {
  const data = sheet.getDataRange().getValues();
  const header = data.shift();
  const headerMap = buildHeaderMap_(header);

  let targetRow = null;
  data.forEach((row, index) => {
    const email = String(row[headerMap.email] || '').toLowerCase();
    if (email === record.email) {
      targetRow = index + 2; // account for header
    }
  });

  if (!targetRow) {
    const values = SUBSCRIBER_COLUMNS.map(key => record[key] || '');
    sheet.appendRow(values);
  } else {
    writeRowValues_(sheet, targetRow, record);
  }
}

function writeRowValues_(sheet, rowIndex, updates) {
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = buildHeaderMap_(header);
  const rowValues = sheet.getRange(rowIndex, 1, 1, header.length).getValues()[0];

  Object.keys(updates).forEach(key => {
    if (headerMap[key] !== undefined) {
      rowValues[headerMap[key]] = updates[key];
    }
  });

  sheet.getRange(rowIndex, 1, 1, header.length).setValues([rowValues]);
}

function findByToken_(sheet, columnName, token) {
  const data = sheet.getDataRange().getValues();
  const header = data.shift();
  const headerMap = buildHeaderMap_(header);
  const columnIndex = headerMap[columnName];
  if (columnIndex === undefined) {
    throw new Error(`Column ${columnName} not found.`);
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (String(row[columnIndex] || '') === token) {
      return {
        rowIndex: i + 2,
        record: rowToObject_(row, headerMap)
      };
    }
  }
  return { rowIndex: null, record: null };
}

function updateLastSent_(sheet, email) {
  const data = sheet.getDataRange().getValues();
  const header = data.shift();
  const headerMap = buildHeaderMap_(header);
  const emailIndex = headerMap.email;
  const lastSentIndex = headerMap.last_sent_at;

  data.forEach((row, index) => {
    if (String(row[emailIndex] || '').toLowerCase() === email.toLowerCase()) {
      sheet.getRange(index + 2, lastSentIndex + 1).setValue(nowIso_());
    }
  });
}

function rowToObject_(row, headerMap) {
  const obj = {};
  Object.keys(headerMap).forEach(key => {
    obj[key] = row[headerMap[key]];
  });
  return obj;
}

function buildHeaderMap_(header) {
  const map = {};
  header.forEach((key, index) => {
    if (key) {
      map[String(key).trim()] = index;
    }
  });
  return map;
}

function removeSheetRows_(sheet, rows) {
  if (!rows.length) return;
  rows.sort((a, b) => b - a);
  rows.forEach(row => {
    sheet.deleteRow(row);
  });
}

function shouldDeleteRecord_(record, cutoffIso) {
  const cutoffDate = new Date(cutoffIso);
  const unsubscribeDate = record.unsubscribe_at ? new Date(record.unsubscribe_at) : null;
  const subscribedDate = record.subscribed_at ? new Date(record.subscribed_at) : null;

  if (record.status === 'unsubscribed' && unsubscribeDate && unsubscribeDate < cutoffDate) {
    return true;
  }

  if ((record.status === 'pending' || record.status === 'bounced') && subscribedDate && subscribedDate < cutoffDate) {
    return true;
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function jsonResponse_(payload) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  return withCorsHeaders_(output);
}

function redirectTo_(path) {
  const url = WEEKLY_DIGEST.SITE_BASE_URL + path;
  const html = HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Redirecting…</title>' +
    '<meta http-equiv="refresh" content="0; url=' + url + '">' +
    '</head><body>Redirecting… If nothing happens, <a href="' + url + '">click here</a>.</body></html>'
  );
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

function renderRedirectPage_(targetUrl) {
  const safeUrl = sanitizeUrl_(targetUrl, WEEKLY_DIGEST.SITE_BASE_URL + '/pages/email-confirmed.html');
  const html = HtmlService.createHtmlOutput(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Thanks!</title><meta http-equiv="refresh" content="0; url=${safeUrl}"></head>` +
    `<body><p>Thanks! Please check your inbox to confirm your email. If you are not redirected automatically, <a href="${safeUrl}">click here</a>.</p></body></html>`
  );
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

function renderErrorPage_(message, retryUrl) {
  const safeMessage = escapeHtml_(message || 'Something went wrong while submitting your form.');
  const safeRetry = sanitizeUrl_(retryUrl, WEEKLY_DIGEST.SITE_BASE_URL + '/pages/weekly-email.html');
  const html = HtmlService.createHtmlOutput(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Problem submitting</title></head>` +
    `<body><h1>We couldn’t process that</h1><p>${safeMessage}</p><p><a href="${safeRetry}">Go back and try again</a></p></body></html>`
  );
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

function nowIso_() {
  return new Date().toISOString();
}

function futureIsoHours_(hours) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function futureIsoDays_(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function monthsAgoIso_(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}

function capitalize_(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleCaseWords_(value) {
  return (value || '')
    .split(' ')
    .map(segment => capitalize_(segment))
    .join(' ')
    .trim();
}

function trimLower_(value) {
  return String(value || '').trim().toLowerCase();
}

function formatList_(items) {
  const clean = items.filter(Boolean);
  if (!clean.length) return 'your chosen';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  const tail = clean.pop();
  return `${clean.join(', ')}, and ${tail}`;
}

function overlap_(first, second) {
  return first.some(item => second.indexOf(item) !== -1);
}

function parseIsoDate_(value) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }
  return convertToTimezone_(date, WEEKLY_DIGEST.TIMEZONE);
}

function convertToTimezone_(date, timezone) {
  const formatted = Utilities.formatDate(date, timezone, 'yyyy-MM-dd HH:mm:ss');
  const parts = formatted.split(/[- :]/);
  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
    Number(parts[3]),
    Number(parts[4]),
    Number(parts[5])
  );
}

function addDays_(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetween_(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86400000);
}

function fetchJson_(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('Failed to fetch ' + url);
  }
  return JSON.parse(response.getContentText());
}

function buildWebAppUrl_(params) {
  const base = PropertiesService.getScriptProperties().getProperty('WEB_APP_BASE_URL') ||
    'https://script.google.com/macros/s/REPLACE_WITH_WEB_APP_ID/exec';
  const query = Object.keys(params)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
    .join('&');
  return `${base}?${query}`;
}

function shouldSendThisWeek_(subscriber) {
  if (!subscriber.last_sent_at) return true;
  const lastSent = new Date(subscriber.last_sent_at);
  if (isNaN(lastSent.getTime())) return true;
  const diff = (new Date().getTime() - lastSent.getTime()) / 86400000;
  return diff >= 6; // ensure at least 6 days since last send
}

function isPaused_() {
  const value = PropertiesService.getScriptProperties().getProperty('PAUSE_WEEKLY_DIGEST');
  return value === 'true';
}

function withCorsHeaders_(textOutput) {
  return textOutput
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sanitizeUrl_(url, fallback) {
  if (!url) {
    return fallback;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    return WEEKLY_DIGEST.SITE_BASE_URL.replace(/\/$/, '') + url;
  }
  return fallback;
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSheetPaused_(sheet) {
  try {
    if (!sheet) return false;
    const label = String(sheet.getRange(2, 1).getValue() || '').trim().toLowerCase();
    if (label !== 'paused') {
      return false;
    }
    const rawValue = sheet.getRange(2, 2).getValue();
    if (rawValue === true) return true;
    if (rawValue === false || rawValue === '') return false;
    const normalised = String(rawValue).trim().toLowerCase();
    return ['true', 'yes', '1', 'on'].indexOf(normalised) !== -1;
  } catch (error) {
    Logger.log(`Sheet pause check failed: ${error.message}`);
    return false;
  }
}

function isValidSubscriber_(record) {
  const email = String(record.email || '').trim();
  if (!email || email.toLowerCase() === 'paused') {
    return false;
  }
  return email.indexOf('@') !== -1;
}

