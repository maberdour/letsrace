/**
 * Import CSV Events Script
 * 
 * This script imports cycling events from a CSV file in Google Drive into a Google Sheet.
 * It detects duplicates based on British Cycling event ID and overwrites existing events with new data.
 * 
 * Features:
 * - Duplicate detection using BC event ID only
 * - Overwrites existing events with updated data instead of skipping
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

    // Build map of existing event IDs to row numbers for duplicate detection
    const existingEventIds = new Map(); // eventId -> rowNumber
    sheetData.forEach((row, index) => {
      const url = row[4] || '';
      const eventId = extractBCEventId(url);
      if (eventId) {
        existingEventIds.set(eventId, index + 1); // +1 because sheet rows are 1-based
      }
    });

    const now = formatDateTime(new Date());
    const newRows = [];
    const rowsToUpdate = []; // Array of {rowNumber, data} for existing events

    // Process each CSV row
    csvData.forEach(row => {
      const displayDate = normalizeDate(row[0]);
      const name = normalizeEventName(row[1]); // Preserve case for display
      const rawUrl = row[4] ? row[4].toString().trim() : '';
      const eventId = extractBCEventId(rawUrl);

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

      // Override region to "London & South East" if Event Name or Location contains "London"
      const eventName = row[1] || ''; // Column B (Event Name)
      const location = row[3] || ''; // Column D (Location)
      if (eventName.toString().toLowerCase().includes('london') || location.toString().toLowerCase().includes('london')) {
        row[5] = 'London & South East'; // Column F (Region)
      }

      // Add timestamps for new events
      row.push(now); // Date Created
      row.push('');  // Date Updated (will be set for updates)

      // Check if this event ID already exists
      if (eventId && existingEventIds.has(eventId)) {
        const existingRowNumber = existingEventIds.get(eventId);
        const existingRowData = sheetData[existingRowNumber - 1]; // Convert to 0-based index
        
        // Preserve the existing Event Type field (Column C) from the sheet
        const existingEventType = existingRowData[2] || ''; // Column C (index 2)
        row[2] = existingEventType; // Keep the existing event type, don't overwrite
        
        // Apply London region logic if Event Name or Location contains "London"
        const eventName = row[1] || ''; // Column B (Event Name) from CSV
        const location = row[3] || ''; // Column D (Location) from CSV
        if (eventName.toString().toLowerCase().includes('london') || location.toString().toLowerCase().includes('london')) {
          row[5] = 'London & South East'; // Column F (Region) - override with London region
        } else {
          // Preserve the existing Region field (Column F) from the sheet if not London
          const existingRegion = existingRowData[5] || ''; // Column F (index 5)
          row[5] = existingRegion; // Keep the existing region, don't overwrite
        }
        
        // Preserve the existing Date Created field (Column G) from the sheet
        const existingDateCreated = existingRowData[6] || ''; // Column G (index 6)
        row[6] = existingDateCreated; // Keep the existing date created, don't overwrite
        
        // Set Date Updated for existing events
        row[7] = now; // Column H: Date Updated
        
        // Compare data to see if anything has changed (only debug first few)
        const shouldDebug = rowsToUpdate.length < 3; // Only debug first 3 comparisons
        if (shouldDebug) {
          Logger.log(`🔍 Checking event ID ${eventId} in row ${existingRowNumber}`);
        }
        
        if (hasDataChanged(existingRowData, row, shouldDebug)) {
          Logger.log(`🔄 Updating existing BC event ID ${eventId} in row ${existingRowNumber} (data changed)`);
          rowsToUpdate.push({ rowNumber: existingRowNumber, data: row });
        } else {
          Logger.log(`ℹ️ BC event ID ${eventId} in row ${existingRowNumber} unchanged, skipping update`);
        }
      } else {
        // New event - add to new rows
        newRows.push(row);
      }
    });

    // Update existing rows
    if (rowsToUpdate.length > 0) {
      rowsToUpdate.forEach(({ rowNumber, data }) => {
        const range = sheet.getRange(rowNumber, 1, 1, data.length);
        range.setValues([data]);
      });
      Logger.log(`🔄 Updated ${rowsToUpdate.length} existing BC events.`);
    }

    // Add new rows to sheet
    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      Logger.log(`✅ Added ${newRows.length} new events.`);
    } else {
      Logger.log("ℹ️ No new events to add.");
    }

    // Summary
    if (rowsToUpdate.length === 0 && newRows.length === 0) {
      Logger.log("ℹ️ No BC events to process.");
    } else {
      Logger.log(`📊 Import summary: ${newRows.length} new, ${rowsToUpdate.length} updated`);
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
 * Normalizes event names for display (preserves case)
 * @param {string} value - The event name to normalize
 * @return {string} Normalized event name with preserved case
 */
function normalizeEventName(value) {
  return (value || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '');
}

/**
 * Normalizes event names for consistent comparison (lowercase)
 * @param {string} value - The event name to normalize
 * @return {string} Normalized event name in lowercase
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
 * Compares existing row data with new data to determine if an update is needed
 * @param {Array} existingRow - The existing row data from the sheet
 * @param {Array} newRow - The new row data from CSV
 * @return {boolean} True if data has changed and needs updating
 */
function hasDataChanged(existingRow, newRow, debug = false) {
  if (!existingRow || !newRow) {
    if (debug) Logger.log(`⚠️ Missing row data - existing: ${!!existingRow}, new: ${!!newRow}`);
    return true;
  }
  
  // Debug: Log row lengths
  if (debug) Logger.log(`🔍 Comparing rows - existing length: ${existingRow.length}, new length: ${newRow.length}`);
  
  // Compare relevant columns (skip Date Created and Date Updated columns)
  // BC sheet structure: Date, Name, Event Type, Location, URL, Region, Date Created, Date Updated
  // We want to compare columns 0-5 (Date through Region), skip columns 6-7 (Date Created, Date Updated)
  const columnsToCompare = Math.min(existingRow.length - 2, newRow.length - 2, 6); // Compare first 6 columns only
  
  for (let i = 0; i < columnsToCompare; i++) {
    const existingValue = existingRow[i] || '';
    const newValue = newRow[i] || '';
    
    // Special handling for date column (column 0) and name column (column 1)
    let normalizedExisting, normalizedNew;
    if (i === 0) {
      // For dates, normalize both to the same format for comparison
      normalizedExisting = normalizeDate(existingValue);
      normalizedNew = normalizeDate(newValue);
    } else if (i === 1) {
      // For names, normalize both to lowercase for comparison (preserve case in display)
      normalizedExisting = normalizeValue(existingValue);
      normalizedNew = normalizeValue(newValue);
    } else {
      // For other columns, use string comparison
      normalizedExisting = String(existingValue).trim();
      normalizedNew = String(newValue).trim();
    }
    
    if (normalizedExisting !== normalizedNew) {
      if (debug) Logger.log(`📝 Column ${i} changed: "${normalizedExisting}" → "${normalizedNew}"`);
      return true; // Data has changed
    }
  }
  
  if (debug) Logger.log(`✅ No changes detected in ${columnsToCompare} columns`);
  return false; // No changes detected
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