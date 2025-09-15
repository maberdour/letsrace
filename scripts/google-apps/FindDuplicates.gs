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
 */

/**
 * Main function to find and report duplicate URLs and Event IDs
 * @param {number} urlColumn - Column index for URLs (0-based, default: 4 for column E)
 * @param {boolean} highlightDuplicates - Whether to highlight duplicate rows (default: true)
 */
function findDuplicateURLs(urlColumn = 4, highlightDuplicates = true) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const sheetName = sheet.getName();
    Logger.log(`🔍 Starting duplicate URL analysis for sheet: "${sheetName}"`);
    Logger.log(`📍 URL column: ${String.fromCharCode(65 + urlColumn)} (index ${urlColumn})`);
    
    // Get all data from the sheet
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    if (data.length <= 1) {
      Logger.log("ℹ️ No data found or only header row present.");
      return;
    }
    
    // Skip header row and process data
    const dataRows = data.slice(1);
    const urlMap = new Map(); // URL -> array of row numbers
    const eventIdMap = new Map(); // Event ID -> array of row numbers
    const urlDuplicates = new Map(); // URL -> array of row numbers (only for duplicates)
    const eventIdDuplicates = new Map(); // Event ID -> array of row numbers (only for duplicates)
    
    Logger.log(`📊 Processing ${dataRows.length} data rows...`);
    
    // Process each row
    dataRows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because we skipped header and arrays are 0-based
      const url = row[urlColumn];
      
      if (!url || typeof url !== 'string' || url.trim() === '') {
        return; // Skip empty URLs
      }
      
      const normalizedUrl = normalizeUrl(url);
      if (!normalizedUrl) {
        return; // Skip invalid URLs
      }
      
      // Track this URL
      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, []);
      }
      urlMap.get(normalizedUrl).push(rowNumber);
      
      // Extract and track event ID
      const eventId = extractEventId(url);
      if (eventId) {
        if (!eventIdMap.has(eventId)) {
          eventIdMap.set(eventId, []);
        }
        eventIdMap.get(eventId).push(rowNumber);
      }
    });
    
    // Find URL duplicates
    urlMap.forEach((rowNumbers, url) => {
      if (rowNumbers.length > 1) {
        urlDuplicates.set(url, rowNumbers);
      }
    });
    
    // Find Event ID duplicates
    eventIdMap.forEach((rowNumbers, eventId) => {
      if (rowNumbers.length > 1) {
        eventIdDuplicates.set(eventId, rowNumbers);
      }
    });
    
    // Report results
    Logger.log(`\n📈 ANALYSIS RESULTS:`);
    Logger.log(`   Total unique URLs: ${urlMap.size}`);
    Logger.log(`   Duplicate URLs found: ${urlDuplicates.size}`);
    Logger.log(`   Total unique Event IDs: ${eventIdMap.size}`);
    Logger.log(`   Duplicate Event IDs found: ${eventIdDuplicates.size}`);
    
    if (urlDuplicates.size === 0 && eventIdDuplicates.size === 0) {
      Logger.log("✅ No duplicate URLs or Event IDs found!");
      return;
    }
    
    // Log detailed URL duplicate information
    if (urlDuplicates.size > 0) {
      Logger.log(`\n🔍 DUPLICATE URL DETAILS:`);
      urlDuplicates.forEach((rowNumbers, url) => {
        Logger.log(`\n📋 URL: ${url}`);
        Logger.log(`   Found in rows: ${rowNumbers.join(', ')}`);
        Logger.log(`   Count: ${rowNumbers.length} occurrences`);
        
        // Show some context for each duplicate row
        rowNumbers.forEach(rowNum => {
          const rowData = data[rowNum - 1]; // Convert to 0-based index
          const eventName = rowData[1] || 'Unknown'; // Assuming column B has event name
          const eventDate = rowData[0] || 'Unknown'; // Assuming column A has date
          Logger.log(`     Row ${rowNum}: "${eventName}" on ${eventDate}`);
        });
      });
    }
    
    // Log detailed Event ID duplicate information
    if (eventIdDuplicates.size > 0) {
      Logger.log(`\n🔍 DUPLICATE EVENT ID DETAILS:`);
      eventIdDuplicates.forEach((rowNumbers, eventId) => {
        Logger.log(`\n📋 Event ID: ${eventId}`);
        Logger.log(`   Found in rows: ${rowNumbers.join(', ')}`);
        Logger.log(`   Count: ${rowNumbers.length} occurrences`);
        
        // Show some context for each duplicate row
        rowNumbers.forEach(rowNum => {
          const rowData = data[rowNum - 1]; // Convert to 0-based index
          const eventName = rowData[1] || 'Unknown'; // Assuming column B has event name
          const eventDate = rowData[0] || 'Unknown'; // Assuming column A has date
          const url = rowData[urlColumn] || 'Unknown';
          Logger.log(`     Row ${rowNum}: "${eventName}" on ${eventDate}`);
          Logger.log(`       URL: ${url}`);
        });
      });
    }
    
    // Highlight duplicates if requested
    if (highlightDuplicates) {
      Logger.log(`\n🎨 Highlighting duplicate rows...`);
      highlightDuplicateRows(urlColumn, urlDuplicates, eventIdDuplicates);
    }
    
    Logger.log(`\n✅ Duplicate URL analysis complete!`);
    
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
 * @param {number} urlColumn - Column index for URLs (0-based, default: 4 for column E)
 * @param {Map} urlDuplicates - Map of duplicate URLs to row numbers
 * @param {Map} eventIdDuplicates - Map of duplicate Event IDs to row numbers
 */
function highlightDuplicateRows(urlColumn = 4, urlDuplicates = null, eventIdDuplicates = null) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    Logger.log(`🎨 Highlighting duplicate rows...`);
    
    // Get all data from the sheet
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    if (data.length <= 1) {
      Logger.log("ℹ️ No data found or only header row present.");
      return;
    }
    
    // First, clear any existing highlighting
    const range = sheet.getRange(1, 1, data.length, data[0].length);
    range.setBackground(null);
    
    const duplicateRows = new Set();
    
    // If no duplicates provided, find them ourselves
    if (!urlDuplicates && !eventIdDuplicates) {
      Logger.log("🔍 Finding duplicates for highlighting...");
      
      // Skip header row and process data
      const dataRows = data.slice(1);
      const urlMap = new Map();
      const eventIdMap = new Map();
      
      // Process each row to find duplicates
      dataRows.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because we skipped header and arrays are 0-based
        const url = row[urlColumn];
        
        if (!url || typeof url !== 'string' || url.trim() === '') {
          return; // Skip empty URLs
        }
        
        const normalizedUrl = normalizeUrl(url);
        if (!normalizedUrl) {
          return; // Skip invalid URLs
        }
        
        // Track this URL
        if (!urlMap.has(normalizedUrl)) {
          urlMap.set(normalizedUrl, []);
        }
        urlMap.get(normalizedUrl).push(rowNumber);
        
        // Extract and track event ID
        const eventId = extractEventId(url);
        if (eventId) {
          if (!eventIdMap.has(eventId)) {
            eventIdMap.set(eventId, []);
          }
          eventIdMap.get(eventId).push(rowNumber);
        }
      });
      
      // Find URL duplicates
      urlMap.forEach((rowNumbers) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNum => duplicateRows.add(rowNum));
        }
      });
      
      // Find Event ID duplicates
      eventIdMap.forEach((rowNumbers) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNum => duplicateRows.add(rowNum));
        }
      });
    } else {
      // Use provided duplicates
      if (urlDuplicates) {
        urlDuplicates.forEach((rowNumbers) => {
          rowNumbers.forEach(rowNum => duplicateRows.add(rowNum));
        });
      }
      
      if (eventIdDuplicates) {
        eventIdDuplicates.forEach((rowNumbers) => {
          rowNumbers.forEach(rowNum => duplicateRows.add(rowNum));
        });
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
          const lastColumn = sheet.getLastColumn();
          Logger.log(`🎨 Highlighting row ${rowNum} (columns 1-${lastColumn})`);
          
          // Create range for the entire row
          const rowRange = sheet.getRange(rowNum, 1, 1, lastColumn);
          
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
function getUrlStatistics(urlColumn = 4) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const sheetName = sheet.getName();
    Logger.log(`📊 URL Statistics for sheet: "${sheetName}"`);
    
    // Get all data from the sheet
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    if (data.length <= 1) {
      Logger.log("ℹ️ No data found or only header row present.");
      return;
    }
    
    // Skip header row and process data
    const dataRows = data.slice(1);
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
  highlightDuplicateRows(urlColumn);
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
  findDuplicateURLs(4, true); // URL in column E, with highlighting
  getUrlStatistics(4); // Get statistics for column E
}
