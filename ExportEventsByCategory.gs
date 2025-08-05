function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Events");
  const data = sheet.getDataRange().getValues();

  const typeParam = (e.parameter.type || "").toLowerCase();
  
  // Debug log
  Logger.log("Type parameter received: " + typeParam);

  const mergedTypes = {
    "road": ["Road", "Closed Circuit", "Town Centre Crit", "Go-Ride"],
    "mtb": ["MTB 4X", "MTB DH", "MTB XC"],
    "track": ["Track", "Track League"],
    "bmx": ["BMX"],
    "cyclo-cross": ["Cyclo-Cross"],
    "time-trial": ["Time Trial"],
    "hill-climb": ["Hill-Climb"],
    "speedway": ["Speedway"]
  };

  const allowed = mergedTypes[typeParam] || [];
  
  // Debug log
  Logger.log("Allowed types: " + JSON.stringify(allowed));

  const DATE_INDEX = 0;       // Column A = Event Date
  const DISCIPLINE_INDEX = 2; // Column C = Discipline

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight
  
  // Debug log
  Logger.log("Today's date (for filtering): " + today);

  const filtered = data.filter(row => {
    const rawDate = row[DATE_INDEX];
    const discipline = row[DISCIPLINE_INDEX] || "";
    
    // Debug logs
    Logger.log("Processing row - Date: " + rawDate + ", Discipline: " + discipline);

    // Try to parse the event date
    const eventDate = new Date(rawDate);
    if (isNaN(eventDate)) {
      Logger.log("Invalid date found: " + rawDate);
      return false;
    }

    // Normalize eventDate to midnight
    eventDate.setHours(0, 0, 0, 0);
    
    const isAllowed = allowed.includes(discipline);
    const isFutureDate = eventDate >= today;
    
    // Debug logs
    Logger.log("Event date (normalized): " + eventDate);
    Logger.log("Is discipline allowed? " + isAllowed);
    Logger.log("Is future date? " + isFutureDate);

    return isAllowed && isFutureDate;
  });
  
  // Debug log
  Logger.log("Number of events after filtering: " + filtered.length);
  if (filtered.length > 0) {
    Logger.log("First filtered event: " + JSON.stringify(filtered[0]));
  }

  return ContentService
    .createTextOutput(JSON.stringify(filtered))
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader('Cache-Control', 'public, max-age=82800') // Cache for 23 hours
    .addHeader('Content-Encoding', 'gzip') // Enable compression
    .addHeader('Vary', 'Accept-Encoding'); // Handle different encodings
}