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
      const courseInfoIndex = 3; // Column D = Location / course info (for CTT)

      const eventName = (row[nameIndex] || '').toString();
      const oldRegion = (row[regionIndex] || '').toString();
      const courseInfo = (row[courseInfoIndex] || '').toString();

      let newRegion = oldRegion;

      // 1) Base mapping from existing region text (BC-style regions, etc.)
      if (oldRegion) {
        newRegion = mapBCRegion(oldRegion);
      }

      // 2) If region is still blank or unchanged and we have CTT-style course info,
      //    derive the region from county using the same logic as ImportCSV-CTT,
      //    implemented locally below (parseCourseInfo + getRegionFromCounty).
      if ((!newRegion || newRegion === oldRegion) && courseInfo) {
        try {
          const parsed = parseCourseInfo(courseInfo);
          if (parsed && parsed.region) {
            newRegion = parsed.region;
          }
        } catch (err) {
          Logger.log(`⚠️ Error deriving region from course info on row ${i + 1}: ${err.message}`);
        }
      }

      // 3) Override to "London & South East" if event name contains "London"
      if (eventName.toLowerCase().includes('london')) {
        if (newRegion !== 'London & South East') {
          Logger.log(`Row ${i + 1}: "${newRegion || oldRegion}" → "London & South East" (event name contains "London")`);
        }
        newRegion = 'London & South East';
      }

      // 4) Apply change if region actually changed and we have a non-empty value
      if (newRegion && newRegion !== oldRegion) {
        row[regionIndex] = newRegion;
        updatedCount++;
        if (!eventName.toLowerCase().includes('london')) {
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

/**
 * Parses the concatenated course information field to extract region
 * Format: "County | Distance | Course Code | Course Name"
 * (Copied from ImportCSV-CTT.gs so this file can run in isolation.)
 * @param {string} courseInfo - The concatenated course information
 * @return {{region: string}} Object containing region
 */
function parseCourseInfo(courseInfo) {
  if (!courseInfo) {
    return { region: '' };
  }

  // Split by pipe character and trim whitespace
  const parts = courseInfo.split('|').map(function(part) { return part.trim(); });

  // Extract county (first element) for region lookup
  const county = parts[0] || '';

  // Get region from county using lookup
  const region = getRegionFromCounty(county);

  return { region: region };
}

/**
 * Maps UK counties to regions (matching site filter regions exactly)
 * Only returns regions that exist in the website filter list.
 * (Copied from ImportCSV-CTT.gs so this file can run in isolation.)
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
    'Bristol City, Bristol': 'South', // Avon
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
    'Highland Council': 'Scotland',
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
  return validRegions.indexOf(region) !== -1 ? region : '';
}
