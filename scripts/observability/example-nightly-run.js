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
    noShutdown: false
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
    }
  }
  return options;
}

/**
 * Get record count and size for a CSV file (line count minus header, file size).
 * @param {string} filePath
 * @returns {{ records: number, sizeBytes: number }|null}
 */
function getCsvStats(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    const records = Math.max(0, lines.length - 1);
    const sizeBytes = fs.statSync(filePath).size;
    return { records, sizeBytes };
  } catch {
    return null;
  }
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

    for (const line of lines) {
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

  // Run the same batch that works when double-clicked, in its own console via start /wait (matches manual run).
  const child = spawn('cmd.exe', ['/c', 'start', '/wait', '', batPath], {
    cwd: batDir,
    env: { ...process.env, LETSRACE_ORCHESTRATED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const exitPromise = new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      resolve({ code, signal });
    });
    child.on('error', (err) => {
      resolve({ code: -1, error: err.message });
    });
  });

  exitPromise.then(({ code, signal, error }) => {
    const durationSec = (Date.now() - runStartTime) / 1000;

    // Start with process-level status
    let taskError = null;
    if (error) {
      taskError = `BAT failed to start: ${error}`;
      logger.error('SYSTEM', '', taskError);
    } else if (code !== 0 && code != null) {
      taskError = `Exit code ${code}${signal ? `, signal ${signal}` : ''}`;
      logger.error('SYSTEM', '', taskError);
      if (stderr) logger.debug('SYSTEM', '', `BAT stderr: ${stderr.slice(0, 500)}`);
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
    if (options.datasourcesPath) {
      const bcCsv = path.join(options.datasourcesPath, 'event_data.csv');
      const cttCsv = path.join(options.datasourcesPath, 'ctt_event_data.csv');
      for (const [file, name] of [[bcCsv, 'event_data.csv'], [cttCsv, 'ctt_event_data.csv']]) {
        const stats = getCsvStats(file);
        if (stats) {
          logger.logDataOutput(name, stats.records, stats.sizeBytes);
          dataFiles.push({ file: name, records: stats.records });
        }
      }
    }

    resourceMonitor.stop();
    const totalDurationStr = formatDuration(durationSec);
    const taskOk = !taskError && !uiVisionFailure && code === 0 && code != null && !error;
    const runStatus = taskOk ? 'COMPLETED' : 'COMPLETED WITH ERRORS';
    logger.writeRunSummary({
      tasksRun: 1,
      tasksSuccessful: taskOk ? 1 : 0,
      tasksFailed: taskOk ? 0 : 1,
      warnings: uiVisionFailure && !taskError ? 1 : 0,
      dataFiles,
      totalDuration: totalDurationStr,
      startTime: runStartTimeStr,
      endTime: formatTimestamp(),
      runStatus
    });

    if (process.platform === 'win32' && !options.noShutdown) {
      logger.info('SYSTEM', '', 'Triggering shutdown');
      const { execSync } = require('child_process');
      try {
        execSync('shutdown /s /f /t 0', { stdio: 'ignore' });
      } catch (e) {
        logger.warn('SYSTEM', '', `Shutdown command failed: ${e.message}`);
      }
    }
  });
}

main();
