/**
 * One-off / retrospective CTT location cleanup
 *
 * Rewrites Column D for existing CTT rows from
 *   "County | Distance | Course Code [| Course Name]"
 * to
 *   "Distance | Course Title"
 *
 * Run manually once after pasting into the Apps Script project.
 * Does not run as part of the nightly CTT import.
 *
 * Entry point: reformatCTTCourseLocations()
 */

/**
 * Updates Column D on the Events sheet for CTT events only.
 * Safe to re-run (idempotent once titles are applied).
 */
function reformatCTTCourseLocations() {
  try {
    Logger.log('▶️ Reformatting CTT course locations in sheet.');

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName('Events') || spreadsheet.getActiveSheet();
    if (!spreadsheet.getSheetByName('Events')) {
      Logger.log('⚠️ Sheet "Events" not found; using active sheet.');
    }

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      Logger.log('❌ No data found in sheet.');
      return;
    }

    let updatedCount = 0;
    const locationIndex = 3; // Column D
    const urlIndex = 4; // Column E

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const url = (row[urlIndex] || '').toString();
      if (!extractCTTEventIdForLocationReformat_(url)) continue;

      const currentLocation = (row[locationIndex] || '').toString();
      if (!currentLocation) continue;

      const cleaned = currentLocation.replace(/\s+,/g, ',').trim();
      const formattedLocation = formatCTTCourseLocationForReformat_(cleaned);
      if (!formattedLocation || formattedLocation === currentLocation) continue;

      row[locationIndex] = formattedLocation;
      updatedCount += 1;
      Logger.log(`📍 Row ${i + 1}: "${currentLocation}" → "${formattedLocation}"`);
    }

    if (updatedCount > 0) {
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      Logger.log(`✅ Reformatted ${updatedCount} CTT location(s) in Column D.`);
    } else {
      Logger.log('ℹ️ No CTT locations needed updating.');
    }
  } catch (error) {
    Logger.log('❌ Error reformatting CTT locations: ' + error.message);
    throw error;
  }
}

/**
 * Course code → display title lookup (keys lowercase).
 * Keep in sync with CTT_COURSE_CODE_TITLES in ImportCSV-CTT.gs.
 */
var CTT_COURSE_CODE_TITLES_FOR_REFORMAT_ = {
  'h2.5/10': 'Weston on the Green Airfield',
  'hillingdon': 'Hillingdon Cycle Circuit',
  'p917/7.6': 'Goodwood Motor Circuit',
  't10c': 'Croft Circuit',
  'pthruxton 10': 'Thruxton Circuits',
  'rc10/21b': 'Brawdy Airfield'
};

/**
 * Formats course info as "Distance | Course Title".
 * @param {string} courseInfo
 * @return {string}
 */
function formatCTTCourseLocationForReformat_(courseInfo) {
  if (!courseInfo) return '';

  var parts = courseInfo
    .toString()
    .split('|')
    .map(function(part) { return part.trim(); })
    .filter(Boolean);

  if (parts.length >= 3) {
    parts = parts.slice(1);
  }

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  var distance = parts[0];
  var courseCode = parts[1];
  var existingName = parts[2] || '';
  var lookedUpTitle = CTT_COURSE_CODE_TITLES_FOR_REFORMAT_[courseCode.toLowerCase()];
  var title = lookedUpTitle || existingName || courseCode;

  return distance + ' | ' + title;
}

/**
 * Extracts CTT event ID from URL (CTT rows only).
 * @param {string} url
 * @return {string}
 */
function extractCTTEventIdForLocationReformat_(url) {
  if (!url) return '';
  var cttMatch = url.toString().match(/\/events\/(\d+)(?:-|$|\/)/);
  return cttMatch ? cttMatch[1] : '';
}
