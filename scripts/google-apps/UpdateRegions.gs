/**
 * Update Regions Script
 * 
 * This script updates existing region names in the Google Sheet to use
 * the standardized region names.
 */

function updateExistingRegions() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      Logger.log("❌ No data found in sheet.");
      return;
    }
    
    let updatedCount = 0;
    
    // Process each row (skip header if present)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const regionIndex = 5; // Column F = Region
      const nameIndex = 1; // Column B = Event Name
      
      // Check if event name contains "London" - override region regardless of original assignment
      const eventName = row[nameIndex] || '';
      if (eventName.toString().toLowerCase().includes('london')) {
        const oldRegion = row[regionIndex] || '';
        if (oldRegion !== 'London & South East') {
          row[regionIndex] = 'London & South East';
          updatedCount++;
          Logger.log(`Row ${i + 1}: "${oldRegion}" → "London & South East" (event name contains "London")`);
        }
      } else if (row[regionIndex]) {
        // Only update region mapping if event name doesn't contain "London"
        const oldRegion = row[regionIndex];
        const newRegion = mapBCRegion(oldRegion);
        
        if (oldRegion !== newRegion) {
          row[regionIndex] = newRegion;
          updatedCount++;
          Logger.log(`Row ${i + 1}: "${oldRegion}" → "${newRegion}"`);
        }
      }
    }
    
    if (updatedCount > 0) {
      // Update the sheet with modified data
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      Logger.log(`✅ Updated ${updatedCount} region entries.`);
    } else {
      Logger.log("ℹ️ No regions needed updating.");
    }
    
  } catch (error) {
    Logger.log("❌ Error updating regions: " + error.message);
    throw error;
  }
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
