/**
 * Import CSV Cycling Time Trials Events Script
 * 
 * This script imports CTT events from a CSV file in Google Drive into a Google Sheet.
 * It detects duplicates based on CTT event ID and overwrites existing events with new data.
 * 
 * Features:
 * - Duplicate detection using CTT event ID only
 * - Overwrites existing events with updated data instead of skipping
 * - Date normalization to "DAY dd/mm/yy" format
 * - URL normalization for CTT links
 * - County to UK region mapping
 * - Parsing of concatenated course information
 * - Timestamp tracking for imported events
 */

function appendNewCTTEvents_ByDateAndName_WithDateFix() {
  try {
    const folderId = '1KQaUXfUNbIQSABXI-SdfNhrk6AmoP30_';
    const filename = 'ctt_event_data.csv';

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
      const eventId = extractCTTEventId(url);
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
      const eventType = row[2] || '';
      const courseInfo = row[3] || '';
      const rawUrl = row[4] ? row[4].toString().trim() : '';
      const eventId = extractCTTEventId(rawUrl);

      // Debug logging
      Logger.log(`Original date: "${row[0]}", Display date: "${displayDate}", Date type: ${typeof row[0]}`);

      // Parse course information to extract region (but keep full course info as location)
      const { region } = parseCourseInfo(courseInfo);

      // Normalize the date in Column A to display format
      row[0] = displayDate;

      // Normalize URL for CTT links
      if (rawUrl && !rawUrl.startsWith('http')) {
        // Remove leading slash from rawUrl if present to avoid double slashes
        const cleanUrl = rawUrl.startsWith('/') ? rawUrl.substring(1) : rawUrl;
        row[4] = 'https://www.cyclingtimetrials.org.uk/' + cleanUrl;
      }

      // Create the row for the sheet: Date, Name, Event Type, Location (Full Course Info), URL, Region, Date Created, Date Updated
      const sheetRow = [
        displayDate,           // Column A: Event Date
        name,                  // Column B: Event Name  
        eventType,             // Column C: Event Type
        courseInfo,            // Column D: Location (Full course info as-is)
        row[4],                // Column E: URL
        region,                // Column F: Region
        now,                   // Column G: Date Created (for new events)
        ''                     // Column H: Date Updated (will be set for updates)
      ];

      // Check if this event ID already exists
      if (eventId && existingEventIds.has(eventId)) {
        const existingRowNumber = existingEventIds.get(eventId);
        const existingRowData = sheetData[existingRowNumber - 1]; // Convert to 0-based index
        
        // Preserve the existing Event Type field (Column C) from the sheet
        const existingEventType = existingRowData[2] || ''; // Column C (index 2)
        sheetRow[2] = existingEventType; // Keep the existing event type, don't overwrite
        
        // Preserve the existing Region field (Column F) from the sheet
        const existingRegion = existingRowData[5] || ''; // Column F (index 5)
        sheetRow[5] = existingRegion; // Keep the existing region, don't overwrite
        
        // Preserve the existing Date Created field (Column G) from the sheet
        const existingDateCreated = existingRowData[6] || ''; // Column G (index 6)
        sheetRow[6] = existingDateCreated; // Keep the existing date created, don't overwrite
        
        // Set Date Updated for existing events
        sheetRow[7] = now; // Column H: Date Updated
        
        // Compare data to see if anything has changed
        if (hasDataChanged(existingRowData, sheetRow)) {
          Logger.log(`🔄 Updating existing CTT event ID ${eventId} in row ${existingRowNumber} (data changed)`);
          rowsToUpdate.push({ rowNumber: existingRowNumber, data: sheetRow });
        } else {
          Logger.log(`ℹ️ CTT event ID ${eventId} in row ${existingRowNumber} unchanged, skipping update`);
        }
      } else {
        // New event - add to new rows
        newRows.push(sheetRow);
      }
    });

    // Update existing rows
    if (rowsToUpdate.length > 0) {
      rowsToUpdate.forEach(({ rowNumber, data }) => {
        const range = sheet.getRange(rowNumber, 1, 1, data.length);
        range.setValues([data]);
      });
      Logger.log(`🔄 Updated ${rowsToUpdate.length} existing CTT events.`);
    }

    // Add new rows to sheet
    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      Logger.log(`✅ Added ${newRows.length} new CTT events.`);
    } else {
      Logger.log("ℹ️ No new CTT events to add.");
    }

    // Summary
    if (rowsToUpdate.length === 0 && newRows.length === 0) {
      Logger.log("ℹ️ No CTT events to process.");
    } else {
      Logger.log(`📊 Import summary: ${newRows.length} new, ${rowsToUpdate.length} updated`);
    }
  } catch (error) {
    Logger.log("❌ Error importing CTT events: " + error.message);
    throw error;
  }
}

/**
 * Parses the concatenated course information field to extract region
 * Format: "County | Distance | Course Code | Course Name"
 * @param {string} courseInfo - The concatenated course information
 * @return {object} Object containing region
 */
function parseCourseInfo(courseInfo) {
  if (!courseInfo) {
    return { region: '' };
  }

  // Split by pipe character and trim whitespace
  const parts = courseInfo.split('|').map(part => part.trim());
  
  // Extract county (first element) for region lookup
  const county = parts[0] || '';
  
  // Get region from county using lookup
  const region = getRegionFromCounty(county);
  
  return { region };
}

/**
 * Maps UK counties to regions (matching site filter regions exactly)
 * Only returns regions that exist in the website filter list
 * @param {string} county - The county name
 * @return {string} The corresponding UK region
 */
function getRegionFromCounty(county) {
  if (!county) return '';

  // Valid regions that match the website filter list exactly
  const validRegions = [
    'Central',
    'Eastern', 
    'London & South East',
    'East Midlands',
    'West Midlands',
    'North East',
    'North West',
    'Scotland',
    'South',
    'South West',
    'Wales',
    'Yorkshire & Humber'
  ];

  const countyToRegion = {
    // North West 
    'Cheshire': 'North West',
    'Cheshire East': 'North West',    
    'Cumbria': 'North West', 
    'Greater Manchester': 'North West',
    'Lancashire': 'North West',
    'Merseyside': 'North West',
    'Westmorland and Furness': 'North West', 

    // North East 
    'County Durham': 'North East',
    'Northumberland': 'North East',
    'Tyne and Wear': 'North East',
    'Cleveland': 'North East', 
    'North Yorkshire': 'North East', 

    // Yorkshire & Humber 
    'East Riding of Yorkshire': 'Yorkshire & Humber',
    'South Yorkshire': 'Yorkshire & Humber',
    'West Yorkshire': 'Yorkshire & Humber',

    // East Midlands 
    'Leicestershire': 'East Midlands', 
    'Lincolnshire': 'East Midlands', 
    'Nottinghamshire': 'East Midlands', 
    'Derbyshire': 'East Midlands', 
    'Rutland': 'East Midlands', 
  
    // West Midlands 
    'Shropshire': 'West Midlands', 
    'Staffordshire': 'West Midlands', 
    'Herefordshire': 'West Midlands',
    'Worcestershire': 'West Midlands',
    'Warwickshire': 'West Midlands',
    'West Midlands': 'West Midlands',

    // Central
    'Central': 'Central',
    'Northamptonshire': 'Central', 
    'Bedfordshire': 'Central', 
    'Buckinghamshire': 'Central', 
    'Berkshire': 'Central', 
    'Oxfordshire': 'Central', 

    // Eastern 
    'Cambridgeshire': 'Eastern', 
    'Norfolk': 'Eastern',
    'Suffolk': 'Eastern',
    'Essex': 'Eastern', 
    'Hertfordshire': 'Eastern', 
    'Middlesex': 'Eastern', 

    // London & South East 
    'Greater London': 'London & South East',
    'London': 'London & South East',
    'Kent': 'London & South East', 
    'Surrey': 'London & South East', 
    'East Sussex': 'London & South East', 
    'West Sussex': 'London & South East', 

    // South West (South West region)
    'Bath and North East Somerset': 'South West',
    'Cornwall': 'South West',
    'Devon': 'South West',
    'North Somerset': 'South West',
    'Plymouth': 'South West',
    'Somerset': 'South West', 
    'Torbay': 'South West', // Devon

    // South 
    'Bristol': 'South', // Avon
    'Bournemouth': 'South',
    'Brighton and Hove': 'South',
    'Portsmouth': 'South',
    'Southampton': 'South',
    'Isle of Wight': 'South',
    'Hampshire': 'South', 
    'Gloucestershire': 'South', 
    'South Gloucestershire': 'South',
    'Dorset': 'South', 
    'Swindon': 'South', // Wiltshire
    'Wiltshire': 'South', 

    // Scotland (Scotland region)
    'Aberdeenshire': 'Scotland',
    'Angus': 'Scotland',
    'Argyll and Bute': 'Scotland',
    'Clackmannanshire': 'Scotland',
    'Dumfries and Galloway': 'Scotland',
    'Dundee': 'Scotland',
    'East Ayrshire': 'Scotland',
    'East Dunbartonshire': 'Scotland',
    'East Lothian': 'Scotland',
    'East Lothian Council': 'Scotland',    
    'East Renfrewshire': 'Scotland',
    'Edinburgh': 'Scotland',
    'Falkirk': 'Scotland',
    'Fife': 'Scotland',
    'Glasgow': 'Scotland',
    'Highland': 'Scotland',
    'Inverclyde': 'Scotland',
    'Midlothian': 'Scotland',
    'Moray': 'Scotland',
    'North Ayrshire': 'Scotland',
    'North Lanarkshire': 'Scotland',
    'Orkney': 'Scotland',
    'Perth and Kinross': 'Scotland',
    'Renfrewshire': 'Scotland',
    'Scottish Borders': 'Scotland',
    'Shetland': 'Scotland',
    'South Ayrshire': 'Scotland',
    'South Lanarkshire': 'Scotland',
    'Stirling': 'Scotland',
    'West Dunbartonshire': 'Scotland',
    'West Lothian': 'Scotland',

    // Wales (South Wales region)
    'Anglesey': 'Wales',
    'Blaenau Gwent': 'Wales',
    'Bridgend': 'Wales',
    'Caerphilly': 'Wales',
    'Cardiff': 'Wales',
    'Carmarthenshire': 'Wales',
    'Ceredigion': 'Wales',
    'Clwyd': 'Wales',
    'Conwy': 'Wales',
    'Conwy Principal Area': 'Wales',    
    'Denbighshire': 'Wales',
    'Flintshire': 'Wales',
    'Gwynedd': 'Wales',
    'Merthyr Tydfil': 'Wales',
    'Merthyr Tydfil County Borough': 'Wales',
    'Monmouthshire': 'Wales',
    'Neath Port Talbot': 'Wales',
    'Newport': 'Wales',
    'Pembrokeshire': 'Wales',
    'Powys': 'Wales',
    'Rhondda Cynon Taf': 'Wales',
    'Swansea': 'Wales',
    'Torfaen': 'Wales',
    'Torfaen Principal Area': 'Wales',
    'Vale of Glamorgan': 'Wales',
    'Wrexham': 'Wales'
  };

  const region = countyToRegion[county] || '';
  
  // Validate that the region is in the approved list
  return validRegions.includes(region) ? region : '';
}

/**
 * Extracts CTT event ID from URL
 * @param {string} url - The event URL
 * @return {string} CTT event ID or empty string if not found
 */
function extractCTTEventId(url) {
  if (!url) return '';
  
  // Match patterns like:
  // https://www.cyclingtimetrials.org.uk/events/30497-north-road-hill-climb
  // /events/30497-north-road-hill-climb
  const cttMatch = url.match(/\/events\/(\d+)(?:-|$|\/)/);
  return cttMatch ? cttMatch[1] : '';
}

/**
 * Compares existing row data with new data to determine if an update is needed
 * @param {Array} existingRow - The existing row data from the sheet
 * @param {Array} newRow - The new row data from CSV
 * @return {boolean} True if data has changed and needs updating
 */
function hasDataChanged(existingRow, newRow) {
  if (!existingRow || !newRow) return true;
  
  // Compare relevant columns (skip Date Created and Date Updated columns)
  // CTT sheet structure: Date, Name, Event Type, Location, URL, Region, Date Created, Date Updated
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
      return true; // Data has changed
    }
  }
  
  return false; // No changes detected
}

/**
 * Generates a unique key for CTT duplicate detection
 * Prioritizes CTT event ID when available, falls back to date + name
 * @param {string} dateKey - Normalized date key
 * @param {string} name - Event name
 * @param {string} url - Event URL
 * @return {string} Unique key for duplicate detection
 */
function generateCTTDuplicateKey(dateKey, name, url) {
  const cttEventId = extractCTTEventId(url);
  
  // If it's a CTT event with an ID, use that as the primary key
  if (cttEventId) {
    return `ctt:${cttEventId}`;
  }
  
  // Fall back to date + name for non-CTT events
  return `date:${dateKey}|${name}`;
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
      
      // Handle CTT format: dd/mm (current year assumed)
      const cttDateMatch = value.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (cttDateMatch) {
        const [ , d, m ] = cttDateMatch;
        const day = d.padStart(2, '0');
        const month = m.padStart(2, '0');
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${month}-${day}`;
      }
      
      // Handle CTT format: dd Mon (current year assumed)
      const cttMonthMatch = value.match(/^(\d{1,2})\s+([A-Za-z]{3})$/);
      if (cttMonthMatch) {
        const [ , d, monthName ] = cttMonthMatch;
        const day = d.padStart(2, '0');
        const currentYear = new Date().getFullYear();
        
        // Convert month name to number
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex !== -1) {
          const month = String(monthIndex + 1).padStart(2, '0');
          return `${currentYear}-${month}-${day}`;
        }
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
      const str = value.toString().trim();
      
      // Convert ISO format to display format
      const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        const [ , year, month, day ] = isoMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[date.getDay()];
        return `${dayName} ${day}/${month}/${year.slice(-2)}`;
      }
      
      // Handle multi-date ranges - extract first date
      const firstDateMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
      if (firstDateMatch) {
        const [ , d, m, y ] = firstDateMatch;
        const day = d.padStart(2, '0');
        const month = m.padStart(2, '0');
        const year = '20' + y;
        
        // Use provided day name or calculate it
        const dayMatch = str.match(/^(\w{3})\s/);
        if (dayMatch) {
          return `${dayMatch[1]} ${day}/${month}/${y}`;
        } else {
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = dayNames[date.getDay()];
          return `${dayName} ${day}/${month}/${y}`;
        }
      }
      
      // Handle CTT format: dd/mm (current year assumed)
      const cttDateMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (cttDateMatch) {
        Logger.log(`Found CTT date format: "${str}"`);
        const [ , d, m ] = cttDateMatch;
        const day = d.padStart(2, '0');
        const month = m.padStart(2, '0');
        const currentYear = new Date().getFullYear();
        const year = String(currentYear).slice(-2);
        
        // Calculate day name
        const date = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[date.getDay()];
        const result = `${dayName} ${day}/${month}/${year}`;
        Logger.log(`Converted CTT date: "${str}" -> "${result}"`);
        return result;
      }
      
      // Handle CTT format: dd Mon (current year assumed)
      const cttMonthMatch = str.match(/^(\d{1,2})\s+([A-Za-z]{3})$/);
      if (cttMonthMatch) {
        Logger.log(`Found CTT month format: "${str}"`);
        const [ , d, monthName ] = cttMonthMatch;
        const day = d.padStart(2, '0');
        const currentYear = new Date().getFullYear();
        const year = String(currentYear).slice(-2);
        
        // Convert month name to number
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex === -1) {
          Logger.log(`Unknown month: "${monthName}"`);
          return str;
        }
        
        // Calculate day name
        const date = new Date(currentYear, monthIndex, parseInt(day));
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[date.getDay()];
        const month = String(monthIndex + 1).padStart(2, '0');
        const result = `${dayName} ${day}/${month}/${year}`;
        Logger.log(`Converted CTT month date: "${str}" -> "${result}"`);
        return result;
      }
      
      // Try to parse as a general date string
      const parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime())) {
        Logger.log(`Parsed as general date: "${str}" -> ${parsedDate}`);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const day = dayNames[parsedDate.getDay()];
        const d = String(parsedDate.getDate()).padStart(2, '0');
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const y = String(parsedDate.getFullYear()).slice(-2);
        const result = `${day} ${d}/${m}/${y}`;
        Logger.log(`General date result: "${str}" -> "${result}"`);
        return result;
      }
      
      // If all else fails, return the original value
      Logger.log(`Could not parse date: "${str}"`);
      return str;
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