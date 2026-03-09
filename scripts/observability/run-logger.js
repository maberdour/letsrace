/**
 * Run logger for LetsRace nightly automation observability.
 * Writes a single log file per run to a configurable directory (e.g. Google Drive \LetsRace\Nightly Logs).
 * Zero npm dependencies; uses fs, path, and Intl for Europe/London timestamps.
 */

const fs = require('fs');
const path = require('path');

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SUCCESS'];
const TIMESTAMP_FORMAT_OPTS = { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

/**
 * Format timestamp as YYYY-MM-DD HH:mm:ss in Europe/London.
 * @returns {string}
 */
function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTimestamp() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', TIMESTAMP_FORMAT_OPTS).formatToParts(d);
  const get = (type) => (parts.find(p => p.type === type) || {}).value || '0';
  return `${get('year')}-${pad2(get('month'))}-${pad2(get('day'))} ${pad2(get('hour'))}:${pad2(get('minute'))}:${pad2(get('second'))}`;
}

/**
 * Format run date for filename: YYYY-MM-DD.
 * @param {Date|string} runDate
 * @returns {string}
 */
function formatRunDate(runDate) {
  if (typeof runDate === 'string') return runDate;
  const d = runDate instanceof Date ? runDate : new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (type) => (parts.find(p => p.type === type) || {}).value || '0';
  return `${get('year')}-${pad2(get('month'))}-${pad2(get('day'))}`;
}

/**
 * Format run date and time for filename: YYYY-MM-DD-HHmmss (one file per run).
 * @param {Date} runDate
 * @returns {string}
 */
function formatRunDateTime(runDate) {
  const d = runDate instanceof Date ? runDate : new Date();
  const parts = new Intl.DateTimeFormat('en-CA', TIMESTAMP_FORMAT_OPTS).formatToParts(d);
  const get = (type) => (parts.find(p => p.type === type) || {}).value || '0';
  return `${get('year')}-${pad2(get('month'))}-${pad2(get('day'))}-${pad2(get('hour'))}${pad2(get('minute'))}${pad2(get('second'))}`;
}

/**
 * Get yesterday's date string (YYYY-MM-DD) in Europe/London.
 * @returns {string}
 */
function getYesterdayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const get = (type) => (parts.find(p => p.type === type) || {}).value || '0';
  return `${get('year')}-${pad2(get('month'))}-${pad2(get('day'))}`;
}

/**
 * Create the log directory if it does not exist.
 * @param {string} logDir
 */
function ensureLogDir(logDir) {
  if (!logDir) return;
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create log directory ${logDir}: ${err.message}`);
  }
}

/**
 * Check if the most recent previous run's log exists and does not contain a run summary; if so, return a warning message.
 * Excludes currentLogPath so we don't treat the current run's new file as an incomplete previous run.
 * @param {string} logDir
 * @param {string} [currentLogPath] - Path to this run's log file; excluded from the check.
 * @returns {string|null} Warning message or null if previous run completed or no previous log.
 */
function checkIncompletePreviousRun(logDir, currentLogPath) {
  if (!fs.existsSync(logDir)) return null;
  const currentBase = currentLogPath ? path.basename(currentLogPath) : null;
  let latestPath = null;
  let latestMtime = 0;
  try {
    const files = fs.readdirSync(logDir);
    for (const f of files) {
      if (!f.startsWith('letsrace-run-') || !f.endsWith('.log')) continue;
      if (currentBase && f === currentBase) continue;
      const fp = path.join(logDir, f);
      const stat = fs.statSync(fp);
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latestPath = fp;
      }
    }
    if (!latestPath) return null;
    const stat = fs.statSync(latestPath);
    const size = Math.min(stat.size, 2048);
    const fd = fs.openSync(latestPath, 'r');
    const buffer = Buffer.alloc(size);
    fs.readSync(fd, buffer, 0, size, stat.size - size);
    fs.closeSync(fd);
    const tail = buffer.toString('utf8');
    if (tail.includes('RUN STATUS:') || tail.includes('=== NIGHTLY RUN SUMMARY ===')) return null;
    return `Previous run did not complete (log: ${path.basename(latestPath)})`;
  } catch {
    return null;
  }
}

/**
 * Create a run logger that writes to letsrace-run-YYYY-MM-DD-HHmmss.log (one file per run).
 * @param {string} logDir - Base directory for logs (e.g. G:\\LetsRace\\Nightly Logs or \\LetsRace\\Nightly Logs).
 * @param {Date} runDate - Run start time for filename (default: now Europe/London).
 * @returns {{ info: Function, warn: Function, error: Function, success: Function, debug: Function, logStructuredError: Function, logDataOutput: Function, writeRunSummary: Function, getLogPath: Function }}
 */
function createRunLogger(logDir, runDate) {
  ensureLogDir(logDir);
  const runTime = runDate instanceof Date ? runDate : new Date();
  const dateTimeStr = formatRunDateTime(runTime);
  const logPath = path.join(logDir, `letsrace-run-${dateTimeStr}.log`);

  const runStartBanner = `========== RUN START ========== ${formatTimestamp()} ==========\n`;
  fs.appendFileSync(logPath, runStartBanner);

  // Incomplete-run check: write at start of this run if previous run did not complete (exclude this run's file)
  const incompleteWarning = checkIncompletePreviousRun(logDir, logPath);
  if (incompleteWarning) {
    const line = `[${formatTimestamp()}] WARN SYSTEM PREVIOUS_RUN ${incompleteWarning}\n`;
    fs.appendFileSync(logPath, line);
  }

  function writeLine(level, component, task, message) {
    const line = `[${formatTimestamp()}] ${level} ${component || ''} ${task || ''} ${message}\n`;
    fs.appendFileSync(logPath, line);
  }

  function log(level, component, task, message) {
    const comp = (component || '').trim();
    const t = (task || '').trim();
    const msg = (message || '').trim();
    writeLine(level, comp, t, msg);
  }

  return {
    getLogPath() {
      return logPath;
    },

    info(component, task, message) {
      log('INFO', component, task, message);
    },
    warn(component, task, message) {
      log('WARN', component, task, message);
    },
    error(component, task, message) {
      log('ERROR', component, task, message);
    },
    success(component, task, message) {
      log('SUCCESS', component, task, message);
    },
    debug(component, task, message) {
      log('DEBUG', component, task, message);
    },

    /**
     * Log an error with structured metadata (URL, Loop Index, XPath, etc.).
     * @param {string} component
     * @param {string} task
     * @param {string} message
     * @param {Record<string, string|number>} metadata
     */
    logStructuredError(component, task, message, metadata = {}) {
      this.error(component, task, message);
      for (const [key, value] of Object.entries(metadata)) {
        if (value !== undefined && value !== null) {
          fs.appendFileSync(logPath, `  ${key}: ${value}\n`);
        }
      }
    },

    /**
     * Log data output (file created with record count and optional size).
     * @param {string} fileName
     * @param {number} recordCount
     * @param {number} [sizeBytes]
     * @param {string} [step]
     */
    logDataOutput(fileName, recordCount, sizeBytes, step) {
      this.info('DATA', step || '', 'Output file created');
      fs.appendFileSync(logPath, `  File: ${fileName}\n`);
      fs.appendFileSync(logPath, `  Records: ${recordCount}\n`);
      if (sizeBytes != null) {
        const sizeKb = Math.round(sizeBytes / 1024);
        fs.appendFileSync(logPath, `  Size: ${sizeKb} KB\n`);
      }
    },

    /**
     * Write the nightly run summary block.
     * @param {Object} stats
     * @param {number} [stats.tasksRun]
     * @param {number} [stats.tasksSuccessful]
     * @param {number} [stats.tasksFailed]
     * @param {number} [stats.warnings]
     * @param {Array<{ file: string, records: number }>} [stats.dataFiles]
     * @param {string} [stats.totalDuration] - e.g. "00:12:42"
     * @param {string} [stats.startTime] - Run start time (same run as this summary)
     * @param {string} [stats.endTime]
     * @param {string} [stats.runStatus] - COMPLETED | COMPLETED WITH ERRORS | FAILED
     */
    writeRunSummary(stats = {}) {
      const ts = formatTimestamp();
      fs.appendFileSync(logPath, `\n=== NIGHTLY RUN SUMMARY ===\n\n`);
      if (stats.startTime) {
        fs.appendFileSync(logPath, `Run started: ${stats.startTime}\n`);
        fs.appendFileSync(logPath, `Run ended:   ${stats.endTime || ts}\n\n`);
      }
      fs.appendFileSync(logPath, `Tasks Run: ${stats.tasksRun ?? 0}\n`);
      fs.appendFileSync(logPath, `Tasks Successful: ${stats.tasksSuccessful ?? 0}\n`);
      fs.appendFileSync(logPath, `Tasks Failed: ${stats.tasksFailed ?? 0}\n`);
      fs.appendFileSync(logPath, `Warnings: ${stats.warnings ?? 0}\n\n`);
      if (stats.dataFiles && stats.dataFiles.length > 0) {
        fs.appendFileSync(logPath, `Data Files Generated:\n`);
        for (const f of stats.dataFiles) {
          fs.appendFileSync(logPath, `${f.file} (${f.records} records)\n`);
        }
        fs.appendFileSync(logPath, `\n`);
      }
      fs.appendFileSync(logPath, `Total Duration: ${stats.totalDuration || '00:00:00'}\n`);
      if (!stats.startTime) {
        fs.appendFileSync(logPath, `End Time: ${stats.endTime || ts}\n\n`);
      }
      fs.appendFileSync(logPath, `RUN STATUS: ${stats.runStatus || 'COMPLETED'}\n`);
      fs.appendFileSync(logPath, `\n========== RUN END ==========\n`);
    },

    /** Raw append for multi-line blocks (e.g. task start/complete). Use sparingly. */
    appendRaw(text) {
      fs.appendFileSync(logPath, text);
    }
  };
}

module.exports = {
  createRunLogger,
  formatTimestamp,
  formatRunDate,
  formatRunDateTime,
  getYesterdayDateStr,
  ensureLogDir,
  checkIncompletePreviousRun,
  LEVELS
};
