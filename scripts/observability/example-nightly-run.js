#!/usr/bin/env node
/**
 * Example Node orchestrator for LetsRace nightly automation.
 * Creates the observability log, runs the macro BAT, records task lifecycle and data output, then writes run summary.
 * Schedule this script (e.g. Windows Task Scheduler) instead of running the BAT directly.
 * Default paths come from scripts/observability/config.js (Google Drive). Env and CLI override.
 *
 * Usage: node example-nightly-run.js [--log-dir <path>] [--repo-root <path>] [--datasources-path <path>] [--no-shutdown]
 *
 * Env: LETSRACE_LOG_DIR, LETSRACE_REPO_ROOT, LETSRACE_DATASOURCES_PATH
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { createRunLogger, formatTimestamp } = require('./run-logger');
const { createTaskTracker, formatDuration } = require('./task-tracker');
const { startResourceMonitor } = require('./resource-monitor');

let config;
try {
  config = require('./config');
} catch {
  config = {};
}
const DEFAULT_LOG_DIR = config.nightlyLogsDir || path.join(process.cwd(), 'logs', 'nightly');
const DEFAULT_REPO_ROOT = config.repoRoot || process.cwd();
const DEFAULT_DATASOURCES = config.datasourcesPath || '';
const DEFAULT_UIVISION_LOGS = config.uivisionLogsPath || '';
const RESOURCE_INTERVAL_MS = 2 * 60 * 1000;

function parseArgs() {
  const argv = process.argv.slice(2);
  const options = {
    logDir: process.env.LETSRACE_LOG_DIR || DEFAULT_LOG_DIR,
    repoRoot: process.env.LETSRACE_REPO_ROOT || DEFAULT_REPO_ROOT,
    datasourcesPath: process.env.LETSRACE_DATASOURCES_PATH || DEFAULT_DATASOURCES,
    uivisionLogsPath: process.env.LETSRACE_UIVISION_LOGS || DEFAULT_UIVISION_LOGS,
    noShutdown: false,
    summarizeOnly: false
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--log-dir' && argv[i + 1]) {
      options.logDir = argv[++i];
    } else if (argv[i] === '--repo-root' && argv[i + 1]) {
      options.repoRoot = argv[++i];
    } else if (argv[i] === '--datasources-path' && argv[i + 1]) {
      options.datasourcesPath = argv[++i];
    } else if (argv[i] === '--uivision-logs' && argv[i + 1]) {
      options.uivisionLogsPath = argv[++i];
    } else if (argv[i] === '--no-shutdown') {
      options.noShutdown = true;
    } else if (argv[i] === '--summarize-only') {
      options.summarizeOnly = true;
    }
  }
  return options;
}

/**
 * Get record count, size and mtime for a CSV file (line count minus header, file size).
 * @param {string} filePath
 * @returns {{ records: number, sizeBytes: number, mtimeMs: number }|null}
 */
function getCsvStats(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    const records = Math.max(0, lines.length - 1);
    const sizeBytes = stat.size;
    return { records, sizeBytes, mtimeMs: stat.mtimeMs };
  } catch {
    return null;
  }
}

/**
 * Get CSV stats only if the file was updated on or after the given timestamp.
 * This prevents counting stale CSVs from previous runs.
 * @param {string} filePath
 * @param {number} minMtimeMs
 * @returns {{ records: number, sizeBytes: number }|null}
 */
function getCsvStatsIfUpdated(filePath, minMtimeMs) {
  const stats = getCsvStats(filePath);
  if (!stats) return null;
  if (stats.mtimeMs < minMtimeMs) return null;
  return { records: stats.records, sizeBytes: stats.sizeBytes };
}

/**
 * Find the most recent UI.Vision log file in the given directory.
 * @param {string} logsDir
 * @returns {string|null}
 */
function findLatestUiVisionLog(logsDir) {
  try {
    if (!logsDir || !fs.existsSync(logsDir)) return null;
    const entries = fs.readdirSync(logsDir)
      .filter((name) => name.toLowerCase().endsWith('.txt'))
      .map((name) => {
        const fullPath = path.join(logsDir, name);
        const stat = fs.statSync(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      });
    if (!entries.length) return null;
    entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return entries[0].fullPath;
  } catch {
    return null;
  }
}

/**
 * Inspect a UI.Vision log file for obvious macro failures.
 * Currently treats any "Macro failed" line or "Error #<code>" as a failure signal.
 * @param {string} logPath
 * @returns {{ failed: boolean, message?: string }}
 */
function analyzeUiVisionLog(logPath) {
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split(/\r?\n/);
    let failed = false;
    let message = '';
    let lastPlayIndex = -1;
    let lastCompletedIndex = -1;

    lines.forEach((line, idx) => {
      if (line.includes('Macro failed')) {
        failed = true;
        message = line.trim();
      } else {
        const m = line.match(/Error #\d+/);
        if (m) {
          failed = true;
          message = line.trim();
        }
      }
      if (line.includes('[status] Playing macro')) {
        lastPlayIndex = idx;
      }
      if (line.includes('Macro completed')) {
        lastCompletedIndex = idx;
      }
    });

    // If a macro was started but we never see "Macro completed" after that,
    // treat it as an abnormal termination even without an explicit error.
    if (!failed && lastPlayIndex !== -1 && (lastCompletedIndex === -1 || lastCompletedIndex < lastPlayIndex)) {
      failed = true;
      message = message || 'Macro started but did not reach "Macro completed" (likely killed or aborted externally)';
    }

    if (!failed) return { failed: false };
    const short = message || `UI.Vision macro log (${path.basename(logPath)}) reported failure`;
    return {
      failed: true,
      message: `UI.Vision reported macro failure in ${path.basename(logPath)}: ${short}`
    };
  } catch {
    return { failed: false };
  }
}

function main() {
  const options = parseArgs();
  const runStartTime = Date.now();
  const runStartTimeStr = formatTimestamp();
  const logger = createRunLogger(options.logDir, new Date());
  const tracker = createTaskTracker(logger);

  logger.info('SYSTEM', '', 'Nightly run started (Node orchestrator)');

  const resourceMonitor = startResourceMonitor(logger, RESOURCE_INTERVAL_MS, {
    logFilePath: logger.getLogPath()
  });

  const batPath = path.join(options.repoRoot, 'scripts', 'AWS', 'run-macro-and-shutdown v2.bat');
  const batDir = path.dirname(batPath);

  tracker.startTask('Macro Automation', 'Nightly macros (BC + CTT)');

  // Helper to finish the run using logs and CSVs (shared between normal and summarize-only modes).
  function finalizeRun({ code = 0, signal = null, error = undefined, durationOverrideSec = null }) {
    const durationSec = durationOverrideSec != null ? durationOverrideSec : (Date.now() - runStartTime) / 1000;

    // Start with process-level status
    let taskError = null;
    if (error) {
      taskError = `BAT failed to start: ${error}`;
      logger.error('SYSTEM', '', taskError);
    } else if (code !== 0 && code != null) {
      taskError = `Exit code ${code}${signal ? `, signal ${signal}` : ''}`;
      logger.error('SYSTEM', '', taskError);
    }

    // Overlay macro-level status from UI.Vision logs if available.
    let uiVisionFailure = null;
    if (options.uivisionLogsPath) {
      const latestLog = findLatestUiVisionLog(options.uivisionLogsPath);
      if (latestLog) {
        const analysis = analyzeUiVisionLog(latestLog);
        if (analysis.failed) {
          uiVisionFailure = analysis.message || `UI.Vision macro failure (see ${path.basename(latestLog)})`;
          logger.warn('SYSTEM', '', uiVisionFailure);
        }
      }
    }

    if (taskError || uiVisionFailure) {
      const combined = taskError && uiVisionFailure
        ? `${taskError}; ${uiVisionFailure}`
        : (taskError || uiVisionFailure);
      tracker.failTask(combined, durationSec);
    } else {
      tracker.completeTask({});
    }

    const dataFiles = [];
    let bcStats = null;
    let cttStats = null;
    if (options.datasourcesPath) {
      const bcCsv = path.join(options.datasourcesPath, 'event_data.csv');
      const cttCsv = path.join(options.datasourcesPath, 'ctt_event_data.csv');

      // Only count CSVs that were actually written during this run.
      bcStats = getCsvStatsIfUpdated(bcCsv, runStartTime);
      if (bcStats) {
        logger.logDataOutput('event_data.csv', bcStats.records, bcStats.sizeBytes);
        dataFiles.push({ file: 'event_data.csv', records: bcStats.records });
      }

      cttStats = getCsvStatsIfUpdated(cttCsv, runStartTime);
      if (cttStats) {
        logger.logDataOutput('ctt_event_data.csv', cttStats.records, cttStats.sizeBytes);
        dataFiles.push({ file: 'ctt_event_data.csv', records: cttStats.records });
      }

      const macrosOk = !!(bcStats && cttStats);
      if (!macrosOk) {
        let msg;
        if (!bcStats && !cttStats) {
          msg = 'No macro CSV output found (BC and CTT missing)';
        } else if (!bcStats) {
          msg = 'BC macro output missing (event_data.csv not found or empty)';
        } else {
          msg = 'CTT macro output missing (ctt_event_data.csv not found or empty)';
        }
        logger.warn('SYSTEM', '', msg);
      }
    }

    resourceMonitor.stop();
    const totalDurationStr = formatDuration(durationSec);
    const macrosOk = !!(bcStats && cttStats);
    const taskOk = !taskError && !uiVisionFailure && code === 0 && code != null && !error && macrosOk;
    const runStatus = taskOk ? 'COMPLETED' : 'COMPLETED WITH ERRORS';
    logger.writeRunSummary({
      tasksRun: 1,
      tasksSuccessful: taskOk ? 1 : 0,
      tasksFailed: taskOk ? 0 : 1,
      warnings: (uiVisionFailure ? 1 : 0) + (!macrosOk && !taskError ? 1 : 0),
      dataFiles,
      totalDuration: totalDurationStr,
      startTime: runStartTimeStr,
      endTime: formatTimestamp(),
      runStatus
    });

    // In summarize-only mode, never trigger shutdown; the BAT controls it.
    if (!options.summarizeOnly && process.platform === 'win32' && !options.noShutdown) {
      logger.info('SYSTEM', '', 'Triggering shutdown');
      const { execSync } = require('child_process');
      try {
        execSync('shutdown /s /f /t 0', { stdio: 'ignore' });
      } catch (e) {
        logger.warn('SYSTEM', '', `Shutdown command failed: ${e.message}`);
      }
    }
  }

  // Summarize-only mode: do not run the BAT, just analyze logs and CSVs.
  if (options.summarizeOnly) {
    finalizeRun({ code: 0, signal: null, error: undefined });
    return;
  }

  // Run the batch via cmd.exe so Windows runs the .bat and handles spaces correctly.
  const child = spawn('cmd.exe', ['/c', batPath], {
    cwd: batDir,
    env: { ...process.env, LETSRACE_ORCHESTRATED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const MAX_RUN_MS = 2 * 60 * 60 * 1000; // safety timeout (e.g. 2 hours)
  const timeout = setTimeout(() => {
    logger.error('SYSTEM', '', `Macro BAT exceeded ${MAX_RUN_MS / 60000} minutes; killing process`);
    try {
      child.kill('SIGTERM');
    } catch (e) {
      logger.warn('SYSTEM', '', `Failed to kill BAT: ${e.message}`);
    }
  }, MAX_RUN_MS);

  const exitPromise = new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      resolve({ code, signal });
    });
    child.on('error', (err) => {
      resolve({ code: -1, error: err.message });
    });
  });

  exitPromise.then(({ code, signal, error }) => {
    clearTimeout(timeout);
    finalizeRun({ code, signal, error });
  });
}

main();
