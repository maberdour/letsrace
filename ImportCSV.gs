function appendNewEvents_ByDateAndName_WithDateFix() {
  const folderId = '1KQaUXfUNbIQSABXI-SdfNhrk6AmoP30_';
  const filename = 'event_data.csv';

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

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const sheetData = sheet.getDataRange().getValues();

  // ✅ Build set of normalized keys (Col A = Date, Col B = Event Name)
  const existingKeys = new Set();
  sheetData.forEach(row => {
    const dateKey = normalizeDate(row[0]);
    const name = normalizeValue(row[1]);
    if (dateKey && name) {
      existingKeys.add(`${dateKey}|${name}`);
    }
  });

  const now = formatDateTime(new Date());
  const newRows = [];

  csvData.forEach(row => {
    const dateKey = normalizeDate(row[0]);
    const name = normalizeValue(row[1]);
    const rawUrl = row[4] ? row[4].toString().trim() : '';
    const key = `${dateKey}|${name}`;

    if (existingKeys.has(key)) return;

    // Normalize URL
    if (rawUrl.startsWith('/events')) {
      row[4] = 'https://www.britishcycling.org.uk' + rawUrl;
    }

    row.push(now);
    newRows.push(row);
  });

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    Logger.log(`✅ Added ${newRows.length} new events.`);
  } else {
    Logger.log("ℹ️ No new rows to add.");
  }
}

function normalizeDate(value) {
  if (!value) return '';
  try {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      // already a date
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else if (typeof value === 'string') {
      // parse string like "Tue 03/06/25"
      const match = value.match(/(\d{2})\/(\d{2})\/(\d{2})/);
      if (match) {
        const [ , d, m, y ] = match;
        const fullYear = Number(y) < 50 ? '20' + y : '19' + y; // assume 2000s
        return `${fullYear}-${m}-${d}`;
      }
    }
  } catch (e) {
    Logger.log("Date parsing error: " + e.message);
  }
  return '';
}

function normalizeValue(value) {
  return (value || '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .toLowerCase();
}

function formatDateTime(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}