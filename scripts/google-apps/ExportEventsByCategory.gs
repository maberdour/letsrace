/**
 * Export Events by Category Web Service
 * 
 * This script provides a web API endpoint to filter and export cycling events
 * from a Google Sheet based on discipline type and future dates.
 * 
 * Features:
 * - Filter events by discipline type (road, mtb, track, etc.)
 * - Only return future events
 * - Include Region data from Column F
 * - Structured JSON response for frontend consumption
 * - Caching and compression headers
 */

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Events");
    const data = sheet.getDataRange().getValues();

    // Handle case where e or e.parameter is undefined
    const typeParam = (e && e.parameter && e.parameter.type ? e.parameter.type : "").toLowerCase();
    
    // Define discipline type mappings
    const mergedTypes = {
      "road": ["Road", "Closed Circuit", "Town Centre Crit", "Go-Ride"],
      "mtb": ["MTB 4X", "MTB DH", "MTB XC", "MTB Enduro"],
      "track": ["Track", "Track League"],
      "bmx": ["BMX", "BMX Freestyle"],
      "cyclo-cross": ["Cyclo-Cross"],
      "time-trial": ["Time Trial"],
      "hill-climb": ["Hill-Climb"],
      "speedway": ["Speedway"]
    };

    const allowed = mergedTypes[typeParam] || [];
    
    // Column indices
    const DATE_INDEX = 0;       // Column A = Event Date
    const NAME_INDEX = 1;       // Column B = Event Name
    const DISCIPLINE_INDEX = 2; // Column C = Discipline
    const LOCATION_INDEX = 3;   // Column D = Location
    const URL_INDEX = 4;        // Column E = URL
    const REGION_INDEX = 5;     // Column F = Region

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight

    // Filter and structure the data
    const filtered = data.filter(row => {
      const rawDate = row[DATE_INDEX];
      const discipline = row[DISCIPLINE_INDEX] || "";

      // Try to parse the event date
      const eventDate = new Date(rawDate);
      if (isNaN(eventDate)) {
        return false;
      }

      // Normalize eventDate to midnight
      eventDate.setHours(0, 0, 0, 0);
      
      const isAllowed = allowed.includes(discipline);
      const isFutureDate = eventDate >= today;

      return isAllowed && isFutureDate;
    }).map(row => {
      // Structure the response data
      return {
        date: row[DATE_INDEX] || "",
        name: row[NAME_INDEX] || "",
        discipline: row[DISCIPLINE_INDEX] || "",
        location: row[LOCATION_INDEX] || "",
        url: row[URL_INDEX] || "",
        region: row[REGION_INDEX] || "",
        imported: row[6] || "" // Timestamp of when event was imported
      };
    });

    // Create response object with metadata
    const response = {
      type: typeParam,
      count: filtered.length,
      events: filtered,
      generated: new Date().toISOString()
    };

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("❌ Error in ExportEventsByCategory: " + error.message);
    
    // Return error response
    const errorResponse = {
      error: "Internal server error",
      message: error.message,
      generated: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}