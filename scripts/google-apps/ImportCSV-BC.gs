/**
 * Import CSV Events Script
 * 
 * This script imports cycling events from a CSV file in Google Drive into a Google Sheet.
 * It prevents duplicates based on British Cycling event ID (when available) or date + event name.
 * 
 * Features:
 * - Duplicate detection using BC event ID (primary) or date + event name (fallback)
 * - Date normalization to "DAY dd/mm/yy" format
 * - URL normalization for British Cycling links
 * - Timestamp tracking for imported events
 */

function appendNewEvents_ByDateAndName_WithDateFix() {
  try {
    const folderId = '1KQaUXfUNbIQSABXI-SdfNhrk6AmoP30_';
    const filename = 'event_data.csv';

    // Get CSV file from Google Drive
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFilesByName(filename);
    if (!files.hasNext()) {
      Logger.log("❌ File not found: " + filename);
      return;
    }

    const file = files.next();
    const csv = file.getBlob().getDataAsString();
    const csvData = Utilities.parseCsv(csv);
    if (csvData.length === 0) {
      Logger.log("❌ CSV is empty.");
      return;
    }

    // Get current sheet data
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const sheetData = sheet.getDataRange().getValues();

    // Build set of existing event keys for duplicate detection
    const existingKeys = new Set();
    sheetData.forEach(row => {
      const dateKey = getDateKeyForDuplicateDetection(row[0]);
      const name = normalizeValue(row[1]);
      const url = row[4] || '';
      const key = generateDuplicateKey(dateKey, name, url);
      if (key) {
        existingKeys.add(key);
      }
    });

    const now = formatDateTime(new Date());
    const newRows = [];

    // Process each CSV row
    csvData.forEach(row => {
      const dateKey = getDateKeyForDuplicateDetection(row[0]);
      const displayDate = normalizeDate(row[0]);
      const name = normalizeValue(row[1]);
      const rawUrl = row[4] ? row[4].toString().trim() : '';
      const key = generateDuplicateKey(dateKey, name, rawUrl);

      // Skip if event already exists
      if (existingKeys.has(key)) return;

      // Normalize the date in Column A to display format
      row[0] = displayDate;

      // Normalize URL for British Cycling links
      if (rawUrl.startsWith('/events')) {
        row[4] = 'https://www.britishcycling.org.uk' + rawUrl;
      }

      // Map region to correct name (Column F = Region)
      if (row[5]) {
        row[5] = mapBCRegion(row[5]);
      }

      // Add timestamp and add to new rows
      row.push(now);
      newRows.push(row);
    });

    // Add new rows to sheet
    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      Logger.log(`✅ Added ${newRows.length} new events.`);
    } else {
      Logger.log("ℹ️ No new events to add.");
    }
  } catch (error) {
    Logger.log("❌ Error importing events: " + error.message);
    throw error;
  }
}

/**
 * Converts date values to ISO format (YYYY-MM-DD) for consistent duplicate detection
 * @param {string|Date} value - The date value to convert
 * @return {string} ISO formatted date string or empty string if invalid
 */
function getDateKeyForDuplicateDetection(value) {
  if (!value) return '';
  
  try {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else if (typeof value === 'string') {
      // Check if already in ISO format
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        return value;
      }
      
      // Extract first date from multi-date ranges
      const firstDateMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
      if (firstDateMatch) {
        const [ , d, m, y ] = firstDateMatch;
        const day = d.padStart(2, '0');
        const month = m.padStart(2, '0');
        const fullYear = Number(y) < 50 ? '20' + y : '19' + y;
        return `${fullYear}-${month}-${day}`;
      }
    }
  } catch (error) {
    Logger.log("Date parsing error: " + error.message);
  }
  return '';
}

/**
 * Converts date values to display format "DAY dd/mm/yy"
 * @param {string|Date} value - The date value to convert
 * @return {string} Formatted date string or empty string if invalid
 */
function normalizeDate(value) {
  if (!value) return '';
  
  try {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const day = dayNames[value.getDay()];
      const d = String(value.getDate()).padStart(2, '0');
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const y = String(value.getFullYear()).slice(-2);
      return `${day} ${d}/${m}/${y}`;
    } else if (typeof value === 'string') {
      // Convert ISO format to display format
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        const [ , year, month, day ] = isoMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[date.getDay()];
        return `${dayName} ${day}/${month}/${year.slice(-2)}`;
      }
      
      // Handle multi-date ranges - extract first date
      const firstDateMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
      if (firstDateMatch) {
        const [ , d, m, y ] = firstDateMatch;
        const day = d.padStart(2, '0');
        const month = m.padStart(2, '0');
        const year = '20' + y;
        
        // Use provided day name or calculate it
        const dayMatch = value.match(/^(\w{3})\s/);
        if (dayMatch) {
          return `${dayMatch[1]} ${day}/${month}/${y}`;
        } else {
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = dayNames[date.getDay()];
          return `${dayName} ${day}/${month}/${y}`;
        }
      }
    }
  } catch (error) {
    Logger.log("Date normalization error: " + error.message);
  }
  return '';
}

/**
 * Normalizes event names for consistent comparison
 * @param {string} value - The event name to normalize
 * @return {string} Normalized event name
 */
function normalizeValue(value) {
  return (value || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .toLowerCase();
}

/**
 * Formats a Date object to a timestamp string
 * @param {Date} date - The date to format
 * @return {string} Formatted timestamp string
 */
function formatDateTime(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Extracts British Cycling event ID from URL
 * @param {string} url - The event URL
 * @return {string} BC event ID or empty string if not found
 */
function extractBCEventId(url) {
  if (!url) return '';
  
  // Match patterns like:
  // https://www.britishcycling.org.uk/events/details/322407/
  // /events/details/322407/
  const bcMatch = url.match(/\/events\/details\/(\d+)\/?/);
  return bcMatch ? bcMatch[1] : '';
}

/**
 * Maps British Cycling region names to standardized region names
 * @param {string} bcRegion - The region name from British Cycling
 * @return {string} Standardized region name
 */
function mapBCRegion(bcRegion) {
  if (!bcRegion) return '';
  
  const regionMappings = {
    'South East': 'London & South East',
    'South West': 'South West',
    'Midlands': 'East Midlands', // Default Midlands to East Midlands
    'West Midlands': 'West Midlands',
    'East Midlands': 'East Midlands',
    'North West': 'North West',
    'North East': 'North East',
    'Yorkshire': 'Yorkshire & Humber',
    'Yorkshire & Humber': 'Yorkshire & Humber',
    'East': 'Eastern',
    'Eastern': 'Eastern',
    'Wales': 'Wales',
    'Scotland': 'Scotland',
    'Central': 'Central',
    'South': 'South'
  };
  
  return regionMappings[bcRegion] || bcRegion;
}

/**
 * Generates a unique key for duplicate detection
 * Prioritizes BC event ID when available, falls back to date + name
 * @param {string} dateKey - Normalized date key
 * @param {string} name - Event name
 * @param {string} url - Event URL
 * @return {string} Unique key for duplicate detection
 */
function generateDuplicateKey(dateKey, name, url) {
  const bcEventId = extractBCEventId(url);
  
  // If it's a BC event with an ID, use that as the primary key
  if (bcEventId) {
    return `bc:${bcEventId}`;
  }
  
  // Fall back to date + name for non-BC events
  return `date:${dateKey}|${name}`;
}