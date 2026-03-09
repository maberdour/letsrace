/**
 * Resource monitoring for LetsRace nightly automation.
 * At a configurable interval, logs CPU, memory, disk, and Chrome process count (best-effort on Windows).
 * Zero npm dependencies; uses os and optional child_process for WMIC/tasklist.
 */

const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Get memory used in GB (total - free).
 * @returns {{ usedGb: number, totalGb: number }}
 */
function getMemoryUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    usedGb: Math.round((used / 1024 / 1024 / 1024) * 10) / 10,
    totalGb: Math.round((total / 1024 / 1024 / 1024) * 10) / 10
  };
}

/**
 * Get CPU load (best-effort on Windows: wmic cpu get loadpercentage).
 * @returns {number|null} Percentage 0-100 or null if unavailable.
 */
function getCpuUsage() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('wmic cpu get loadpercentage', { encoding: 'utf8', timeout: 3000 });
      const match = out.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
    const load = os.loadavg();
    if (load && load[0] != null) return Math.min(100, Math.round(load[0] * 25)); // rough: 4 cores -> 4.0 = 100%
  } catch {
    // ignore
  }
  return null;
}

/**
 * Get free disk space for the drive containing the given path (Windows: wmic logicaldisk).
 * @param {string} [filePath] - Path on the drive to check (e.g. log file path).
 * @returns {{ freeGb: number }|null}
 */
function getDiskFree(filePath) {
  try {
    if (process.platform === 'win32' && filePath) {
      const drive = path.resolve(filePath).split(path.sep)[0] || 'C:';
      const out = execSync(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace`, { encoding: 'utf8', timeout: 3000 });
      const match = out.match(/\d+/);
      if (match) {
        const freeBytes = parseInt(match[0], 10);
        return { freeGb: Math.round(freeBytes / 1024 / 1024 / 1024) };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Count Chrome processes (tasklist on Windows).
 * @returns {number}
 */
function getChromeProcessCount() {
  try {
    if (process.platform === 'win32') {
      const out = execSync('tasklist /FI "IMAGENAME eq chrome.exe"', { encoding: 'utf8', timeout: 2000 });
      const lines = out.split(/\r?\n/).filter((line) => line.toLowerCase().includes('chrome.exe'));
      return lines.length;
    }
  } catch {
    // ignore
  }
  return 0;
}

/**
 * Gather all resource metrics and return a string block for logging.
 * @param {string} [logFilePath] - Optional path for disk free (drive).
 * @returns {string}
 */
function gatherResourceBlock(logFilePath) {
  const mem = getMemoryUsage();
  const cpu = getCpuUsage();
  const disk = getDiskFree(logFilePath);
  const chrome = getChromeProcessCount();

  const lines = [];
  if (cpu != null) lines.push(`CPU: ${cpu}%`);
  lines.push(`Memory: ${mem.usedGb} GB used`);
  if (disk != null) lines.push(`Disk: ${disk.freeGb} GB free`);
  lines.push(`Chrome processes: ${chrome}`);
  return lines.join('\n');
}

/**
 * Start a resource monitor that logs at the given interval.
 * @param {ReturnType<typeof import('./run-logger').createRunLogger>} logger - Run logger instance.
 * @param {number} intervalMs - Interval in milliseconds (e.g. 120000 for 2 minutes).
 * @param {Object} [options]
 * @param {string} [options.logFilePath] - Path to log file (for disk free drive).
 * @returns {{ stop: Function }}
 */
function startResourceMonitor(logger, intervalMs, options = {}) {
  const logFilePath = options.logFilePath || (logger.getLogPath && logger.getLogPath());
  let intervalId = null;

  function tick() {
    try {
      const block = gatherResourceBlock(logFilePath);
      logger.debug('SYSTEM', '', '');
      if (logger.appendRaw) {
        logger.appendRaw(block.split('\n').map((line) => '  ' + line).join('\n') + '\n');
      }
    } catch (err) {
      logger.warn('SYSTEM', 'RESOURCE', `Resource snapshot failed: ${err.message}`);
    }
  }

  intervalId = setInterval(tick, intervalMs);

  return {
    stop() {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  };
}

module.exports = {
  startResourceMonitor,
  getMemoryUsage,
  getCpuUsage,
  getDiskFree,
  getChromeProcessCount,
  gatherResourceBlock
};
