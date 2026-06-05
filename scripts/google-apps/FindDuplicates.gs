/**
 * Find Duplicate URLs and Event IDs Script
 * 
 * This script locates rows with duplicate URLs and duplicate event IDs in a Google Sheet.
 * It can work with any sheet and identifies duplicates based on URL content and event IDs.
 * 
 * Features:
 * - Finds duplicate URLs across all rows in the active sheet
 * - Finds duplicate event IDs from CTT and British Cycling URLs
 * - Normalizes URLs for consistent comparison (removes trailing slashes, converts to lowercase)
 * - Extracts event IDs from CTT (/events/ID) and BC (/details/ID) URLs
 * - Provides detailed logging of duplicate findings
 * - Highlights duplicate rows in the sheet
 * - Supports different URL column positions
 * 
 * Usage:
 * 1. Open your Google Sheet with event data
 * 2. Run the findDuplicateURLs() function
 * 3. Check the execution log for results
 * 4. Duplicate rows will be automatically highlighted
 *
 * The Events sheet has no header row (see DailyBuildAndDeploy.gs). Use skipHeaderRow: true
 * only when analyzing sheets that include a header row.
 */

/**
 * Empty duplicate-analysis result (no duplicates).
 * @return {Object}
 */
function emptyDuplicateResults() {
  return {
    hasDuplicates: false,
    urlDuplicateGroups: 0,
    eventIdDuplicateGroups: 0,
    rowsWithDuplicates: 0,
    uniqueUrlCount: 0,
    uniqueEventIdCount: 0,
    urlDuplicates: [],
    eventIdDuplicates: []
  };
}

/**
 * Analyzes sheet rows for duplicate URLs and BC/CTT event IDs.
 * @param {Array<Array>} sheetData - All rows from getDataRange().getValues()
 * @param {number} urlColumn - 0-based URL column index
 * @param {Object} [options]
 * @param {boolean} [options.skipHeaderRow=false] - If true, skip the first row
 * @return {Object} Summary and duplicate group lists for reporting
 */
function analyzeDuplicates(sheetData, urlColumn = 4, options) {
  const opts = options || {};
  const skipHeaderRow = opts.skipHeaderRow === true;

  if (!sheetData || sheetData.length === 0) {
    return emptyDuplicateResults();
  }

  const dataRows = skipHeaderRow ? sheetData.slice(1) : sheetData;
  const firstRowNumber = skipHeaderRow ? 2 : 1;

  if (dataRows.length === 0) {
    return emptyDuplicateResults();
  }

  const urlMap = new Map();
  const eventIdMap = new Map();
  const urlDuplicates = new Map();
  const eventIdDuplicates = new Map();

  dataRows.forEach((row, index) => {
    const rowNumber = firstRowNumber + index;
    const url = row[urlColumn];

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return;
    }

    if (!urlMap.has(normalizedUrl)) {
      urlMap.set(normalizedUrl, []);
    }
    urlMap.get(normalizedUrl).push(rowNumber);

    const eventId = extractEventId(url);
    if (eventId) {
      if (!eventIdMap.has(eventId)) {
        eventIdMap.set(eventId, []);
      }
      eventIdMap.get(eventId).push(rowNumber);
    }
  });

  urlMap.forEach((rowNumbers, url) => {
    if (rowNumbers.length > 1) {
      urlDuplicates.set(url, rowNumbers);
    }
  });

  eventIdMap.forEach((rowNumbers, eventId) => {
    if (rowNumbers.length > 1) {
      eventIdDuplicates.set(eventId, rowNumbers);
    }
  });

  const duplicateRows = new Set();
  urlDuplicates.forEach(rowNumbers => rowNumbers.forEach(r => duplicateRows.add(r)));
  eventIdDuplicates.forEach(rowNumbers => rowNumbers.forEach(r => duplicateRows.add(r)));

  const urlDuplicateList = [];
  urlDuplicates.forEach((rows, key) => urlDuplicateList.push({ key: key, rows: rows }));

  const eventIdDuplicateList = [];
  eventIdDuplicates.forEach((rows, key) => eventIdDuplicateList.push({ key: key, rows: rows }));

  return {
    hasDuplicates: urlDuplicates.size > 0 || eventIdDuplicates.size > 0,
    urlDuplicateGroups: urlDuplicates.size,
    eventIdDuplicateGroups: eventIdDuplicates.size,
    rowsWithDuplicates: duplicateRows.size,
    uniqueUrlCount: urlMap.size,
    uniqueEventIdCount: eventIdMap.size,
    urlDuplicates: urlDuplicateList,
    eventIdDuplicates: eventIdDuplicateList,
    _urlDuplicatesMap: urlDuplicates,
    _eventIdDuplicatesMap: eventIdDuplicates
  };
}

/**
 * Logs duplicate analysis results to the execution log.
 * @param {Array<Array>} sheetData
 * @param {number} urlColumn
 * @param {Object} results - From analyzeDuplicates()
 */
function logDuplicateResults(sheetData, urlColumn, results) {
  Logger.log(`\n📈 ANALYSIS RESULTS:`);
  Logger.log(`   Total unique URLs: ${results.uniqueUrlCount}`);
  Logger.log(`   Duplicate URL groups: ${results.urlDuplicateGroups}`);
  Logger.log(`   Total unique Event IDs: ${results.uniqueEventIdCount}`);
  Logger.log(`   Duplicate Event ID groups: ${results.eventIdDuplicateGroups}`);
  Logger.log(`   Rows with duplicates: ${results.rowsWithDuplicates}`);

  if (!results.hasDuplicates) {
    Logger.log('✅ No duplicate URLs or Event IDs found!');
    return;
  }

  if (results.urlDuplicates.length > 0) {
    Logger.log(`\n🔍 DUPLICATE URL DETAILS:`);
    results.urlDuplicates.forEach(group => {
      Logger.log(`\n📋 URL: ${group.key}`);
      Logger.log(`   Found in rows: ${group.rows.join(', ')}`);
      group.rows.forEach(rowNum => {
        const rowData = sheetData[rowNum - 1];
        const eventName = rowData[1] || 'Unknown';
        const eventDate = rowData[0] || 'Unknown';
        Logger.log(`     Row ${rowNum}: "${eventName}" on ${eventDate}`);
      });
    });
  }

  if (results.eventIdDuplicates.length > 0) {
    Logger.log(`\n🔍 DUPLICATE EVENT ID DETAILS:`);
    results.eventIdDuplicates.forEach(group => {
      Logger.log(`\n📋 Event ID: ${group.key}`);
      Logger.log(`   Found in rows: ${group.rows.join(', ')}`);
      group.rows.forEach(rowNum => {
        const rowData = sheetData[rowNum - 1];
        const eventName = rowData[1] || 'Unknown';
        const eventDate = rowData[0] || 'Unknown';
        const url = rowData[urlColumn] || 'Unknown';
        Logger.log(`     Row ${rowNum}: "${eventName}" on ${eventDate}`);
        Logger.log(`       URL: ${url}`);
      });
    });
  }
}

/**
 * Main function to find and report duplicate URLs and Event IDs
 * @param {number} urlColumn - Column index for URLs (0-based, default: 4 for column E)
 * @param {boolean} highlightDuplicates - Whether to highlight duplicate rows (default: true)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} [sheet] - Sheet to analyze (default: active sheet)
 * @param {boolean} [skipHeaderRow=false] - If true, skip the first row
 * @return {Object} Duplicate analysis summary
 */
function findDuplicateURLs(urlColumn = 4, highlightDuplicates = true, sheet = null, skipHeaderRow = false) {
  try {
    const targetSheet = sheet || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const sheetName = targetSheet.getName();
    Logger.log(`🔍 Starting duplicate URL analysis for sheet: "${sheetName}"`);
    Logger.log(`📍 URL column: ${String.fromCharCode(65 + urlColumn)} (index ${urlColumn})`);

    const data = targetSheet.getDataRange().getValues();
    Logger.log(`📊 Processing ${skipHeaderRow ? Math.max(0, data.length - 1) : data.length} data row(s)...`);

    const results = analyzeDuplicates(data, urlColumn, { skipHeaderRow: skipHeaderRow });
    logDuplicateResults(data, urlColumn, results);

    if (highlightDuplicates && results.hasDuplicates) {
      Logger.log(`\n🎨 Highlighting duplicate rows...`);
      highlightDuplicateRows(
        targetSheet,
        urlColumn,
        results._urlDuplicatesMap,
        results._eventIdDuplicatesMap
      );
    }

    Logger.log(`\n✅ Duplicate URL analysis complete!`);
    return results;
  } catch (error) {
    Logger.log(`❌ Error finding duplicate URLs: ${error.message}`);
    throw error;
  }
}

/**
 * Extracts event ID from CTT or British Cycling URLs
 * @param {string} url - The URL to extract event ID from
 * @return {string} Event ID or empty string if not found
 */
function extractEventId(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  try {
    // CTT format: https://www.cyclingtimetrials.org.uk/events/30497-north-road-hill-climb
    const cttMatch = url.match(/\/events\/(\d+)(?:-|$|\/)/);
    if (cttMatch) {
      return `ctt:${cttMatch[1]}`;
    }
    
    // British Cycling format: https://www.britishcycling.org.uk/events/details/325629/CCXL-4-Bicester-Millennium-CC
    const bcMatch = url.match(/\/details\/(\d+)(?:\/|$)/);
    if (bcMatch) {
      return `bc:${bcMatch[1]}`;
    }
    
    return '';
  } catch (error) {
    Logger.log(`Event ID extraction error for "${url}": ${error.message}`);
    return '';
  }
}

/**
 * Highlights rows containing duplicate URLs and Event IDs
 * @param {GoogleAppsScript.Spreadsheet.Sheet} [sheet] - Sheet to highlight (default: active sheet)
 * @param {number} urlColumn - Column index for URLs (0-based, default: 4 for column E)
 * @param {Map} [urlDuplicates] - Map of duplicate URLs to row numbers
 * @param {Map} [eventIdDuplicates] - Map of duplicate Event IDs to row numbers
 * @param {boolean} [skipHeaderRow=false] - If true, skip the first row when finding duplicates
 */
function highlightDuplicateRows(sheet, urlColumn, urlDuplicates, eventIdDuplicates, skipHeaderRow) {
  try {
    let targetSheet = null;
    let col = 4;
    let urlDup = null;
    let eventIdDup = null;
    let skipHeader = false;

    if (sheet && typeof sheet.getDataRange === 'function') {
      targetSheet = sheet;
      col = typeof urlColumn === 'number' ? urlColumn : 4;
      urlDup = urlDuplicates;
      eventIdDup = eventIdDuplicates;
      skipHeader = skipHeaderRow === true;
    } else {
      col = typeof sheet === 'number' ? sheet : 4;
      urlDup = typeof urlColumn === 'number' ? null : urlColumn;
      eventIdDup = urlDuplicates;
      skipHeader = eventIdDuplicates === true;
    }

    targetSheet = targetSheet || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    Logger.log(`🎨 Highlighting duplicate rows...`);

    const dataRange = targetSheet.getDataRange();
    const data = dataRange.getValues();
    const numRows = data.length;
    const numCols = data[0] ? data[0].length : targetSheet.getLastColumn();

    if (numRows === 0) {
      Logger.log('ℹ️ No data found.');
      return;
    }

    targetSheet.getRange(1, 1, numRows, numCols).setBackground(null);

    const duplicateRows = new Set();

    if (!urlDup && !eventIdDup) {
      Logger.log('🔍 Finding duplicates for highlighting...');
      const results = analyzeDuplicates(data, col, { skipHeaderRow: skipHeader });
      results._urlDuplicatesMap.forEach(rowNumbers => {
        rowNumbers.forEach(rowNum => duplicateRows.add(rowNum));
      });
      results._eventIdDuplicatesMap.forEach(rowNumbers => {
        rowNumbers.forEach(rowNum => duplicateRows.add(rowNum));
      });
    } else {
      if (urlDup) {
        urlDup.forEach(rowNumbers => rowNumbers.forEach(rowNum => duplicateRows.add(rowNum)));
      }
      if (eventIdDup) {
        eventIdDup.forEach(rowNumbers => rowNumbers.forEach(rowNum => duplicateRows.add(rowNum)));
      }
    }
    
    // Highlight duplicate rows
    if (duplicateRows.size > 0) {
      Logger.log(`🎨 Found ${duplicateRows.size} rows to highlight: ${Array.from(duplicateRows).join(', ')}`);
      
      // Convert Set to Array and sort for better processing
      const rowsToHighlight = Array.from(duplicateRows).sort((a, b) => a - b);
      
      // Highlight each row individually with more explicit range selection
      rowsToHighlight.forEach(rowNum => {
        try {
          // Get the actual number of columns in the sheet
          const lastColumn = targetSheet.getLastColumn();
          Logger.log(`🎨 Highlighting row ${rowNum} (columns 1-${lastColumn})`);
          
          // Create range for the entire row
          const rowRange = targetSheet.getRange(rowNum, 1, 1, lastColumn);
          
          // Set background color
          rowRange.setBackground('#ffcccc');
          
          // Verify the formatting was applied
          const appliedColor = rowRange.getBackground();
          Logger.log(`✅ Row ${rowNum} background set to: ${appliedColor}`);
          
        } catch (rowError) {
          Logger.log(`❌ Error highlighting row ${rowNum}: ${rowError.message}`);
        }
      });
      
      Logger.log(`🎨 Successfully highlighted ${rowsToHighlight.length} rows containing duplicates`);
    } else {
      Logger.log("ℹ️ No duplicate rows found to highlight");
    }
    
  } catch (error) {
    Logger.log(`❌ Error highlighting duplicate rows: ${error.message}`);
    throw error;
  }
}

/**
 * Removes highlighting from all rows
 */
function clearHighlighting() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const dataRange = sheet.getDataRange();
    const range = sheet.getRange(1, 1, dataRange.getNumRows(), dataRange.getNumColumns());
    range.setBackground(null);
    Logger.log("🧹 Cleared all row highlighting");
  } catch (error) {
    Logger.log(`❌ Error clearing highlighting: ${error.message}`);
    throw error;
  }
}

/**
 * Normalizes URLs for consistent comparison
 * @param {string} url - The URL to normalize
 * @return {string} Normalized URL or empty string if invalid
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  try {
    let normalized = url.trim();
    
    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');
    
    // Convert to lowercase for case-insensitive comparison
    normalized = normalized.toLowerCase();
    
    // Remove common URL parameters that might cause false duplicates
    // (uncomment if you want to ignore certain parameters)
    // normalized = normalized.replace(/[?&]utm_[^&]*/g, '');
    // normalized = normalized.replace(/[?&]fbclid=[^&]*/g, '');
    
    // Basic URL validation
    if (normalized.length === 0) {
      return '';
    }
    
    // Check if it looks like a URL
    if (!normalized.match(/^https?:\/\//) && !normalized.match(/^\/\//) && !normalized.startsWith('/')) {
      return '';
    }
    
    return normalized;
  } catch (error) {
    Logger.log(`URL normalization error for "${url}": ${error.message}`);
    return '';
  }
}

/**
 * Gets a summary of URL statistics for the current sheet
 * @param {number} urlColumn - Column index for URLs (0-based, default: 4 for column E)
 */
function getUrlStatistics(urlColumn = 4, skipHeaderRow = false) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const sheetName = sheet.getName();
    Logger.log(`📊 URL Statistics for sheet: "${sheetName}"`);
    
    // Get all data from the sheet
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    if (data.length === 0) {
      Logger.log('ℹ️ No data found.');
      return;
    }
    
    const dataRows = skipHeaderRow ? data.slice(1) : data;
    const urlMap = new Map();
    const domainMap = new Map();
    let emptyUrls = 0;
    let invalidUrls = 0;
    
    // Process each row
    dataRows.forEach((row, index) => {
      const url = row[urlColumn];
      
      if (!url || typeof url !== 'string' || url.trim() === '') {
        emptyUrls++;
        return;
      }
      
      const normalizedUrl = normalizeUrl(url);
      if (!normalizedUrl) {
        invalidUrls++;
        return;
      }
      
      // Track unique URLs
      urlMap.set(normalizedUrl, (urlMap.get(normalizedUrl) || 0) + 1);
      
      // Track domains
      try {
        const domain = extractDomain(normalizedUrl);
        if (domain) {
          domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
        }
      } catch (e) {
        // Ignore domain extraction errors
      }
    });
    
    // Calculate statistics
    const totalRows = dataRows.length;
    const uniqueUrls = urlMap.size;
    const duplicateUrls = Array.from(urlMap.values()).filter(count => count > 1).length;
    const totalDuplicateRows = Array.from(urlMap.values()).reduce((sum, count) => sum + (count > 1 ? count : 0), 0);
    
    // Report statistics
    Logger.log(`\n📈 URL STATISTICS:`);
    Logger.log(`   Total rows processed: ${totalRows}`);
    Logger.log(`   Empty URLs: ${emptyUrls}`);
    Logger.log(`   Invalid URLs: ${invalidUrls}`);
    Logger.log(`   Valid URLs: ${totalRows - emptyUrls - invalidUrls}`);
    Logger.log(`   Unique URLs: ${uniqueUrls}`);
    Logger.log(`   Duplicate URLs: ${duplicateUrls}`);
    Logger.log(`   Rows with duplicate URLs: ${totalDuplicateRows}`);
    
    // Top domains
    const sortedDomains = Array.from(domainMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (sortedDomains.length > 0) {
      Logger.log(`\n🌐 TOP DOMAINS:`);
      sortedDomains.forEach(([domain, count]) => {
        Logger.log(`   ${domain}: ${count} events`);
      });
    }
    
  } catch (error) {
    Logger.log(`❌ Error getting URL statistics: ${error.message}`);
    throw error;
  }
}

/**
 * Extracts domain from a URL
 * @param {string} url - The URL to extract domain from
 * @return {string} Domain name or empty string if not found
 */
function extractDomain(url) {
  try {
    // Add protocol if missing
    let fullUrl = url;
    if (!url.startsWith('http')) {
      fullUrl = 'https://' + url;
    }
    
    const urlObj = new URL(fullUrl);
    return urlObj.hostname;
  } catch (error) {
    return '';
  }
}

/**
 * Backward-compatible function to highlight duplicate URLs only
 * @param {number} urlColumn - Column index for URLs (0-based, default: 4 for column E)
 */
function highlightDuplicateURLs(urlColumn = 4) {
  Logger.log("🔄 Using legacy highlightDuplicateURLs function - now highlighting both URLs and Event IDs");
  highlightDuplicateRows(null, urlColumn);
}

/**
 * Test function to highlight specific rows (for debugging)
 * @param {Array} rowNumbers - Array of row numbers to highlight
 */
function testHighlightRows(rowNumbers = [16, 18]) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    Logger.log(`🧪 Testing highlight on rows: ${rowNumbers.join(', ')}`);
    
    // Clear existing highlighting first
    clearHighlighting();
    
    // Get sheet dimensions
    const lastColumn = sheet.getLastColumn();
    Logger.log(`📊 Sheet has ${lastColumn} columns`);
    
    // Highlight each test row
    rowNumbers.forEach(rowNum => {
      try {
        Logger.log(`🎨 Testing highlight for row ${rowNum}...`);
        const rowRange = sheet.getRange(rowNum, 1, 1, lastColumn);
        rowRange.setBackground('#ffcccc');
        
        // Verify the color was set
        const appliedColor = rowRange.getBackground();
        Logger.log(`✅ Row ${rowNum} background: ${appliedColor}`);
        
      } catch (error) {
        Logger.log(`❌ Error highlighting row ${rowNum}: ${error.message}`);
      }
    });
    
    Logger.log(`🧪 Test highlighting complete!`);
    
  } catch (error) {
    Logger.log(`❌ Test highlighting error: ${error.message}`);
  }
}

/**
 * Convenience function to run full duplicate analysis with highlighting
 */
function runFullDuplicateAnalysis() {
  Logger.log("🚀 Running full duplicate URL analysis...");
  findDuplicateURLs(4, true, null, false); // Events sheet: no header row
  getUrlStatistics(4, false);
}

/**
 * Formats duplicate results for email / alerts.
 * @param {Object} duplicateResults - From analyzeDuplicates() or findDuplicateURLs()
 * @return {string}
 */
function formatDuplicatesForEmail(duplicateResults) {
  if (!duplicateResults) {
    return 'Duplicates found: No (check did not run)\n';
  }

  if (!duplicateResults.hasDuplicates) {
    return 'Duplicates found: No\n';
  }

  let text = 'Duplicates found: Yes\n';
  text += `  Duplicate URL groups: ${duplicateResults.urlDuplicateGroups}\n`;
  text += `  Duplicate event ID groups: ${duplicateResults.eventIdDuplicateGroups}\n`;
  text += `  Rows involved: ${duplicateResults.rowsWithDuplicates}\n\n`;

  if (duplicateResults.urlDuplicates.length > 0) {
    text += 'Duplicate URLs:\n';
    duplicateResults.urlDuplicates.forEach(group => {
      text += `  ${group.key}\n    Rows: ${group.rows.join(', ')}\n`;
    });
    text += '\n';
  }

  if (duplicateResults.eventIdDuplicates.length > 0) {
    text += 'Duplicate event IDs:\n';
    duplicateResults.eventIdDuplicates.forEach(group => {
      text += `  ${group.key}\n    Rows: ${group.rows.join(', ')}\n`;
    });
    text += '\n';
  }

  return text;
}
