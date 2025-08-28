/**
 * Daily Build and Deploy Script
 * 
 * This script runs daily to convert Google Sheet data into static JSON files
 * and commit them to a GitHub repository for website deployment.
 * 
 * Features:
 * - Reads events from Google Sheet and normalizes data
 * - Filters to future events only (Europe/London timezone)
 * - Creates per-type JSON shards and facets index
 * - Commits files to GitHub via Contents API
 * - Manages daily triggers for automation
 * 
 * Setup Notes:
 * 1. Run setGitHubToken() to set your GitHub token in Script Properties
 * 2. Run createDailyTrigger() to set up the daily automation
 * 3. Test with dailyBuild() to verify everything works
 */

// Configuration constants
const CONFIG = {
  SPREADSHEET_ID: '1r3GiuG-VF-wo-rwC6e8a25DjmN2dSmNtjpbAIUOk9Js',
  SHEET_NAME: 'Events',
  GITHUB_OWNER: 'maberdour',
  GITHUB_REPO: 'letsrace',
  TARGET_BRANCH: 'main',
  SITE_TIMEZONE: 'Europe/London',
  TOKEN_PROPERTY_KEY: 'GITHUB_TOKEN'
};

// Canonical event types
const CANONICAL_TYPES = ["Road", "Track", "BMX", "MTB", "Cyclo Cross", "Speedway", "Time Trial", "Hill Climb"];

// Region canonicalization map
const REGION_MAPPINGS = {
  "london": "London & South East",
  "south east": "London & South East",
  "southeast": "London & South East",
  "south east england": "London & South East",
  "south west": "South West",
  "southwest": "South West",
  "south west england": "South West",
  "midlands": "Midlands",
  "west midlands": "Midlands",
  "east midlands": "Midlands",
  "north west": "North West",
  "northwest": "North West",
  "north west england": "North West",
  "north east": "North East",
  "northeast": "North East",
  "north east england": "North East",
  "yorkshire": "Yorkshire",
  "yorkshire & humber": "Yorkshire",
  "east": "East",
  "east of england": "East",
  "wales": "Wales",
  "scotland": "Scotland",
  "northern ireland": "Northern Ireland"
};

// Column indices (no header row)
const COLUMNS = {
  EVENT_DATE: 0,
  NAME: 1,
  TYPE: 2,
  LOCATION: 3,
  URL: 4,
  REGION: 5,
  DATE_ADDED: 6
};

/**
 * Main function to run the daily build process
 */
function dailyBuild() {
  try {
    Logger.log("🚀 Starting daily build process...");
    
    // Step 1: Read rows from Sheet
    const sheetData = readSheetData();
    Logger.log(`📊 Read ${sheetData.length} rows from sheet`);
    
    // Step 2: Normalize, validate, and filter data
    const processedData = processSheetData(sheetData);
    Logger.log(`✅ Processed ${processedData.events.length} valid events (skipped ${processedData.skipped} rows)`);
    
    // Step 3: Partition by type and sort
    const partitionedData = partitionByType(processedData.events);
    
    // Step 4: Build facets index
    const facets = buildFacetsIndex(processedData.events);
    
    // Step 5: Generate versioned filenames
    const today = new Date();
    const dateString = Utilities.formatDate(today, CONFIG.SITE_TIMEZONE, 'yyyyMMdd');
    
    // Step 6: Create new events file (events from last 7 days)
    const newEvents = createNewEventsFile(processedData.events);
    const newEventsFilename = `/data/new-events.v${dateString}.json`;
    
    // Step 7: Create temporary committedFiles structure for manifest
    const tempCommittedFiles = {
      type: {},
      index: {}
    };
    
    // Build the file paths that will be committed
    Object.keys(partitionedData).forEach(type => {
      tempCommittedFiles.type[type] = `/data/type/${type}.v${dateString}.json`;
    });
    tempCommittedFiles.index.facets = `/data/index/facets.v${dateString}.json`;
    
    // Step 8: Create manifest
    const manifest = createManifest(tempCommittedFiles, dateString, newEventsFilename);
    
    // Step 9: Commit all files to GitHub in a single batch (including manifest)
    const committedFiles = commitFilesToGitHub(partitionedData, facets, dateString, newEvents, newEventsFilename, manifest);
    
    // Step 10: Clean up old files (older than 7 days)
    cleanupOldFiles();

    // Step 11: Log summary
    logBuildSummary(sheetData.length, processedData.skipped, partitionedData, committedFiles, dateString);
    
    Logger.log("🎉 Daily build completed successfully!");
    
  } catch (error) {
    Logger.log(`❌ Daily build failed: ${error.message}`);
    throw error;
  }
}

/**
 * Read data from the Google Sheet
 */
function readSheetData() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet '${CONFIG.SHEET_NAME}' not found`);
  }
  
  return sheet.getDataRange().getValues();
}

/**
 * Process and normalize sheet data
 */
function processSheetData(sheetData) {
  const events = [];
  let skipped = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  sheetData.forEach((row, index) => {
    try {
      // Skip empty rows
      if (!row[COLUMNS.EVENT_DATE] || !row[COLUMNS.NAME]) {
        skipped++;
        return;
      }
      
      // Parse and validate date
      const eventDate = parseEventDate(row[COLUMNS.EVENT_DATE]);
      if (!eventDate) {
        Logger.log(`⚠️ Row ${index + 1}: Invalid date '${row[COLUMNS.EVENT_DATE]}'`);
        skipped++;
        return;
      }
      
      // Filter to future events only
      if (eventDate < today) {
        skipped++;
        return;
      }
      
      // Normalize type
      const normalizedType = normalizeType(row[COLUMNS.TYPE]);
      if (!normalizedType) {
        Logger.log(`⚠️ Row ${index + 1}: Unknown type '${row[COLUMNS.TYPE]}'`);
        skipped++;
        return;
      }
      
      // Normalize region
      const normalizedRegion = normalizeRegion(row[COLUMNS.REGION]);
      
      // Create event object
      const event = {
        id: hashId(`${row[COLUMNS.NAME]}|${eventDate}|${row[COLUMNS.LOCATION]}`),
        name: normalizeValue(row[COLUMNS.NAME]),
        type: normalizedType,
        region: normalizedRegion,
        venue: normalizeValue(row[COLUMNS.LOCATION]),
        postcode: extractPostcode(row[COLUMNS.LOCATION]),
        date: isoLocalDateUK(eventDate),
        start_time: extractStartTime(row[COLUMNS.EVENT_DATE]),
        url: normalizeValue(row[COLUMNS.URL]),
        source: "Google Sheet",
        last_updated: parseDateAdded(row[COLUMNS.DATE_ADDED]) || nowISO()
      };
      
             // Log if Column G parsing failed
       if (!parseDateAdded(row[COLUMNS.DATE_ADDED])) {
         Logger.log(`⚠️ Row ${index + 1}: Column G parsing failed for "${row[COLUMNS.NAME]}" - Column G value: "${row[COLUMNS.DATE_ADDED]}" (type: ${typeof row[COLUMNS.DATE_ADDED]})`);
       }
      
      events.push(event);
      
    } catch (error) {
      Logger.log(`⚠️ Row ${index + 1}: Error processing - ${error.message}`);
      skipped++;
    }
  });
  
  return { events, skipped };
}

/**
 * Partition events by type
 */
function partitionByType(events) {
  const partitioned = {};
  
  // Initialize empty arrays for each type
  CANONICAL_TYPES.forEach(type => {
    partitioned[toKebabCase(type)] = [];
  });
  
  // Group events by type
  events.forEach(event => {
    const kebabType = toKebabCase(event.type);
    if (partitioned[kebabType]) {
      partitioned[kebabType].push(event);
    }
  });
  
  // Sort each partition by date then name
  Object.keys(partitioned).forEach(type => {
    partitioned[type].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.name.localeCompare(b.name);
    });
  });
  
  return partitioned;
}

/**
 * Build facets index
 */
function buildFacetsIndex(events) {
  const regions = new Set();
  const counts = {};
  
  // Collect unique regions
  events.forEach(event => {
    regions.add(event.region);
  });
  
  // Count by type
  CANONICAL_TYPES.forEach(type => {
    counts[type] = events.filter(e => e.type === type).length;
  });
  
  // Count by region
  regions.forEach(region => {
    counts[region] = events.filter(e => e.region === region).length;
  });
  
  // Count by type|region combinations
  events.forEach(event => {
    const key = `${event.type}|${event.region}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  
  return {
    types: CANONICAL_TYPES,
    regions: Array.from(regions).sort(),
    counts: counts,
    last_build: nowISO()
  };
}

/**
 * Commit all files to GitHub in a single batch commit
 */
function commitFilesToGitHub(partitionedData, facets, dateString, newEvents, newEventsFilename, manifest) {
  const committedFiles = {
    type: {},
    index: {}
  };
  
  // Prepare all files for batch commit
  const filesToCommit = [];
  
  // Add per-type files
  Object.keys(partitionedData).forEach(type => {
    const events = partitionedData[type];
    const filename = `/data/type/${type}.v${dateString}.json`;
    const content = JSON.stringify(events, null, 2);
    
    filesToCommit.push({
      path: filename,
      content: content,
      message: `chore(data): daily build ${dateString}`
    });
    
    committedFiles.type[type] = filename;
    
    // Check shard size
    if (events.length > 5000) {
      Logger.log(`⚠️ Large shard warning: ${type} has ${events.length} events (consider monthly splits)`);
    }
  });
  
  // Add facets index
  const facetsFilename = `/data/index/facets.v${dateString}.json`;
  const facetsContent = JSON.stringify(facets, null, 2);
  
  filesToCommit.push({
    path: facetsFilename,
    content: facetsContent,
    message: `chore(data): daily build ${dateString}`
  });
  
  committedFiles.index.facets = facetsFilename;
  
  // Add new events file
  filesToCommit.push({
    path: newEventsFilename,
    content: JSON.stringify(newEvents, null, 2),
    message: `chore(data): daily build ${dateString}`
  });
  
  // Add manifest file if provided
  if (manifest) {
    filesToCommit.push({
      path: '/data/manifest.json',
      content: JSON.stringify(manifest, null, 2),
      message: `chore(data): daily build ${dateString}`
    });
  }
  
  // Commit all files in a single batch
  batchCommitToGitHub(filesToCommit, `chore(data): daily build ${dateString}`);
  
  return committedFiles;
}

/**
 * Batch commit multiple files to GitHub in a single commit
 */
function batchCommitToGitHub(files, commitMessage) {
  const token = getGitHubToken();
  
  // Get current commit SHA
  const commitUrl = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/commits/${CONFIG.TARGET_BRANCH}`;
  
  try {
    // Get current commit
    const commitResponse = UrlFetchApp.fetch(commitUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (commitResponse.getResponseCode() !== 200) {
      throw new Error(`Failed to get current commit: ${commitResponse.getResponseCode()}`);
    }
    
    const currentCommit = JSON.parse(commitResponse.getContentText());
    const baseTreeSha = currentCommit.commit.tree.sha;
    
    // Create tree with all files
    const treeItems = files.map(file => ({
      path: file.path.substring(1), // Remove leading slash
      mode: '100644',
      type: 'blob',
      content: file.content
    }));
    
    // Create tree
    const treeResponse = UrlFetchApp.fetch(`https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems
      })
    });
    
    if (treeResponse.getResponseCode() !== 201) {
      throw new Error(`Failed to create tree: ${treeResponse.getResponseCode()} - ${treeResponse.getContentText()}`);
    }
    
    const tree = JSON.parse(treeResponse.getContentText());
    
    // Create commit
    const commitResponse2 = UrlFetchApp.fetch(`https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        message: commitMessage,
        tree: tree.sha,
        parents: [currentCommit.sha]
      })
    });
    
    if (commitResponse2.getResponseCode() !== 201) {
      throw new Error(`Failed to create commit: ${commitResponse2.getResponseCode()} - ${commitResponse2.getContentText()}`);
    }
    
    const commit = JSON.parse(commitResponse2.getContentText());
    
    // Update branch reference
    const refResponse = UrlFetchApp.fetch(`https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/git/refs/heads/${CONFIG.TARGET_BRANCH}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        sha: commit.sha
      })
    });
    
    if (refResponse.getResponseCode() !== 200) {
      throw new Error(`Failed to update branch: ${refResponse.getResponseCode()} - ${refResponse.getContentText()}`);
    }
    
    Logger.log(`✅ Batch committed ${files.length} files in single commit`);
    
  } catch (error) {
    Logger.log(`❌ Batch commit failed: ${error.message}`);
    throw error;
  }
}

/**
 * Create new events file (events from last 7 days)
 */
function createNewEventsFile(events) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  Logger.log(`🔍 Filtering events from last 7 days (since ${isoLocalDateUK(sevenDaysAgo)})`);
  
  const newEvents = events.filter(event => {
    const lastUpdated = new Date(event.last_updated);
    return lastUpdated > sevenDaysAgo;
  });
  
  Logger.log(`📅 New events file: ${newEvents.length} events from last 7 days`);
  
  return {
    events: newEvents,
    last_build: nowISO(),
    total_new_events: newEvents.length,
    cutoff_date: isoLocalDateUK(sevenDaysAgo)
  };
}

/**
 * Create manifest pointing to today's files
 */
function createManifest(committedFiles, dateString, newEventsFilename) {
  return {
    type: committedFiles.type,
    index: committedFiles.index,
    new_events: newEventsFilename
  };
}

/**
 * Log build summary
 */
function logBuildSummary(totalRows, skippedRows, partitionedData, committedFiles, dateString) {
  Logger.log("📋 Build Summary:");
  Logger.log(`   Total rows read: ${totalRows}`);
  Logger.log(`   Rows skipped: ${skippedRows}`);
  Logger.log(`   Valid events: ${totalRows - skippedRows}`);
  
  Logger.log("   Events by type:");
  Object.keys(partitionedData).forEach(type => {
    Logger.log(`     ${type}: ${partitionedData[type].length}`);
  });
  
  Logger.log("   Files committed:");
  Object.keys(committedFiles.type).forEach(type => {
    Logger.log(`     ${committedFiles.type[type]}`);
  });
  Logger.log(`     ${committedFiles.index.facets}`);
  Logger.log(`     /data/new-events.v${dateString}.json`);
  Logger.log(`     /data/manifest.json`);
}

/**
 * Clean up old files (older than 7 days)
 */
function cleanupOldFiles() {
  const token = getGitHubToken();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  const cutoffDateString = Utilities.formatDate(cutoffDate, CONFIG.SITE_TIMEZONE, 'yyyyMMdd');
  
  Logger.log(`🧹 Cleaning up files older than ${cutoffDateString}...`);
  
  // Get all files in the repository
  const filesResponse = UrlFetchApp.fetch(
    `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/git/trees/${CONFIG.TARGET_BRANCH}?recursive=1`,
    {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );
  
  if (filesResponse.getResponseCode() !== 200) {
    Logger.log(`❌ Failed to get repository files: ${filesResponse.getResponseCode()}`);
    return;
  }
  
  const tree = JSON.parse(filesResponse.getContentText());
  const filesToDelete = [];
  
  // Find old versioned files
  tree.tree.forEach(item => {
    if (item.type === 'blob' && item.path.startsWith('data/')) {
      const match = item.path.match(/\.v(\d{8})\.json$/);
      if (match && match[1] < cutoffDateString) {
        filesToDelete.push({
          path: item.path,
          sha: item.sha
        });
      }
    }
  });
  
  if (filesToDelete.length === 0) {
    Logger.log("✅ No old files to delete");
    return;
  }
  
  Logger.log(`🗑️ Deleting ${filesToDelete.length} old files...`);
  
  // Delete files in batches (GitHub API limit)
  const batchSize = 10;
  for (let i = 0; i < filesToDelete.length; i += batchSize) {
    const batch = filesToDelete.slice(i, i + batchSize);
    
    for (const fileInfo of batch) {
      try {
        const deleteResponse = UrlFetchApp.fetch(
          `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${fileInfo.path}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            payload: JSON.stringify({
              message: `chore: remove old file ${fileInfo.path}`,
              sha: fileInfo.sha
            })
          }
        );
        
        if (deleteResponse.getResponseCode() === 200) {
          Logger.log(`✅ Deleted: ${fileInfo.path}`);
        } else {
          Logger.log(`❌ Failed to delete ${fileInfo.path}: ${deleteResponse.getResponseCode()}`);
        }
      } catch (error) {
        Logger.log(`❌ Error deleting ${fileInfo.path}: ${error.message}`);
      }
    }
    
    // Rate limiting - wait between batches
    if (i + batchSize < filesToDelete.length) {
      Utilities.sleep(1000);
    }
  }
  
  Logger.log(`✅ Cleanup completed. Deleted ${filesToDelete.length} files.`);
}

/**
 * Create daily trigger at 03:30 Europe/London
 */
function createDailyTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'dailyBuild') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('dailyBuild')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .nearMinute(30)
    .inTimezone(CONFIG.SITE_TIMEZONE)
    .create();
  
  Logger.log("✅ Daily trigger created for 03:30 Europe/London");
}

/**
 * Set GitHub token in Script Properties
 */
function setGitHubToken() {
  const token = PropertiesService.getScriptProperties().getProperty(CONFIG.TOKEN_PROPERTY_KEY);
  if (token) {
    Logger.log("ℹ️ GitHub token already exists in Script Properties");
    return;
  }
  
  Logger.log("⚠️ Please set your GitHub token manually:");
  Logger.log("1. Go to Apps Script Project Settings");
  Logger.log("2. Click on 'Script Properties' tab");
  Logger.log("3. Add property: Key = 'GITHUB_TOKEN', Value = your GitHub token");
  
  throw new Error("GitHub token not found. Please set it manually in Script Properties.");
}

/**
 * Get GitHub token from Script Properties
 */
function getGitHubToken() {
  const token = PropertiesService.getScriptProperties().getProperty(CONFIG.TOKEN_PROPERTY_KEY);
  if (!token) {
    throw new Error('GitHub token not found in Script Properties. Run setGitHubToken() first.');
  }
  return token;
}

/**
 * Convert date to ISO local date string in Europe/London timezone
 */
function isoLocalDateUK(date) {
  return Utilities.formatDate(date, CONFIG.SITE_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Get current time in ISO format (UTC)
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Convert canonical type to kebab case
 */
function toKebabCase(type) {
  return type.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Generate deterministic hash ID
 */
function hashId(input) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, input)
    .map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2))
    .join('')
    .substring(0, 8);
}

/**
 * Parse event date from various formats
 */
function parseEventDate(dateValue) {
  if (!dateValue) return null;
  
  try {
    // Handle Date objects
    if (dateValue instanceof Date) {
      return new Date(dateValue);
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      // Try parsing various formats
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
      
      // Try UK date format (dd/mm/yyyy)
      const ukMatch = dateValue.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ukMatch) {
        return new Date(ukMatch[3], ukMatch[2] - 1, ukMatch[1]);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Normalize event type to canonical list
 */
function normalizeType(typeValue) {
  if (!typeValue) return null;
  
  const normalized = normalizeValue(typeValue);
  
  // Direct matches
  if (CANONICAL_TYPES.includes(normalized)) {
    return normalized;
  }
  
  // Common variants
  const variants = {
    'cyclo-cross': 'Cyclo Cross',
    'cyclocross': 'Cyclo Cross',
    'tt': 'Time Trial',
    'time trial': 'Time Trial',
    'hill climb': 'Hill Climb',
    'hill-climb': 'Hill Climb',
    'hillclimb': 'Hill Climb',
    'mtb': 'MTB',
    'mtb xc': 'MTB',
    'mtb dh': 'MTB',
    'mtb 4x': 'MTB',
    'mtb enduro': 'MTB',
    'bmx': 'BMX',
    'bmx freestyle': 'BMX',
    'track': 'Track',
    'track league': 'Track',
    'road': 'Road',
    'closed circuit': 'Road',
    'town centre crit': 'Road',
    'go-ride': 'Road',
    'speedway': 'Speedway'
  };
  
  return variants[normalized.toLowerCase()] || null;
}

/**
 * Normalize region using mapping
 */
function normalizeRegion(regionValue) {
  if (!regionValue) return 'Unknown';
  
  const normalized = normalizeValue(regionValue).toLowerCase();
  return REGION_MAPPINGS[normalized] || regionValue;
}

/**
 * Normalize string value (trim whitespace)
 */
function normalizeValue(value) {
  if (!value) return '';
  return value.toString().trim().replace(/\s+/g, ' ');
}

/**
 * Extract postcode from location string
 */
function extractPostcode(location) {
  if (!location) return null;
  
  // UK postcode pattern
  const postcodeMatch = location.match(/[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i);
  return postcodeMatch ? postcodeMatch[0].toUpperCase() : null;
}

/**
 * Parse date added from Column G
 */
function parseDateAdded(dateValue) {
  if (!dateValue) {
    return null;
  }
  
  try {
    // Handle Date objects
    if (dateValue instanceof Date) {
      return dateValue.toISOString();
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      // Try parsing the datetime format from ImportCSV.gs: "2025-08-19 03:15:26"
      const datetimeMatch = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
      if (datetimeMatch) {
        const [ , year, month, day, hour, minute, second ] = datetimeMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Try parsing just the date part: "2025-08-19"
      const dateMatch = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (dateMatch) {
        const [ , year, month, day ] = dateMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Try UK date format (dd/mm/yyyy)
      const ukMatch = dateValue.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (ukMatch) {
        const date = new Date(ukMatch[3], ukMatch[2] - 1, ukMatch[1]);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Try other common formats
      const formats = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // yyyy-mm-dd
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // mm-dd-yyyy or dd-mm-yyyy
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // dd.mm.yyyy
        /(\d{1,2})\-(\d{1,2})\-(\d{4})/  // dd-mm-yyyy
      ];
      
      for (let i = 0; i < formats.length; i++) {
        const match = dateValue.match(formats[i]);
        if (match) {
          let date;
          if (i === 0) {
            // yyyy-mm-dd
            date = new Date(match[1], match[2] - 1, match[3]);
          } else if (i === 1) {
            // Try both mm-dd-yyyy and dd-mm-yyyy
            const mmdd = new Date(match[3], match[1] - 1, match[2]);
            const ddmm = new Date(match[3], match[2] - 1, match[1]);
            // Use the one that makes more sense (month <= 12)
            date = match[1] <= 12 ? mmdd : ddmm;
          } else {
            // dd.mm.yyyy or dd-mm-yyyy
            date = new Date(match[3], match[2] - 1, match[1]);
          }
          
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      }
      
      Logger.log(`❌ Could not parse date: "${dateValue}"`);
      return null;
    }
    
    Logger.log(`❌ Unknown date type: ${typeof dateValue} - "${dateValue}"`);
    return null;
  } catch (error) {
    Logger.log(`❌ Error parsing date "${dateValue}": ${error.message}`);
    return null;
  }
}

/**
 * Extract start time from date/time string
 */
function extractStartTime(dateTimeValue) {
  if (!dateTimeValue) return null;
  
  const timeMatch = dateTimeValue.toString().match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }
  
  return null;
}


