#!/usr/bin/env node
/**
 * CLI for LetsRace nightly observability. Invoked by batch or PowerShell to append a single entry.
 * Default paths come from scripts/observability/config.js (Google Drive). Env and --log-dir/--repo-root override.
 * Usage: node cli.js <command> [args...]
 * Options (before command): --log-dir <path>  --repo-root <path>
 */

const path = require('path');
const fs = require('fs');
const { createRunLogger, formatTimestamp } = require('./run-logger');
const { createTaskTracker, formatDuration } = require('./task-tracker');

let config;
try {
  config = require('./config');
} catch {
  config = {};
}

function getDefaultLogDir() {
  if (process.env.LETSRACE_LOG_DIR) return process.env.LETSRACE_LOG_DIR;
  if (config.nightlyLogsDir) return config.nightlyLogsDir;
  return path.join(process.cwd(), 'logs', 'nightly');
}

function getDefaultRepoRoot() {
  if (process.env.LETSRACE_REPO_ROOT) return process.env.LETSRACE_REPO_ROOT;
  if (config.repoRoot) return config.repoRoot;
  return process.cwd();
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = { logDir: null, repoRoot: null };
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--log-dir' && args[i + 1]) {
      options.logDir = args[++i];
    } else if (args[i] === '--repo-root' && args[i + 1]) {
      options.repoRoot = args[++i];
    } else {
      rest.push(args[i]);
    }
  }
  options.logDir = options.logDir || getDefaultLogDir();
  options.repoRoot = options.repoRoot || getDefaultRepoRoot();
  return { options, args: rest };
}

function runInit(logDir) {
  const logger = createRunLogger(logDir, new Date());
  logger.info('SYSTEM', '', 'Nightly run started');
  console.log('Log file:', logger.getLogPath());
}

function runLog(logDir, level, component, task, message) {
  const logger = createRunLogger(logDir, new Date());
  const l = (level || 'INFO').toUpperCase();
  if (!['DEBUG', 'INFO', 'WARN', 'ERROR', 'SUCCESS'].includes(l)) {
    console.error('Invalid level:', level);
    process.exit(1);
  }
  logger[l.toLowerCase()](component || '', task || '', message || '');
}

function runTaskStart(logDir, component, taskName) {
  const logger = createRunLogger(logDir, new Date());
  const tracker = createTaskTracker(logger);
  tracker.startTask(component || '', taskName || '');
}

function runTaskComplete(logDir, component, taskName, durationSec) {
  const logger = createRunLogger(logDir, new Date());
  const tracker = createTaskTracker(logger);
  const sec = durationSec != null ? parseFloat(durationSec) : 0;
  logger.appendRaw(`--- TASK COMPLETE ---\nTask: ${taskName || ''}\nComponent: ${component || ''}\nStatus: SUCCESS\nDuration: ${formatDuration(sec)}\n\n`);
}

function runTaskFail(logDir, component, taskName, errorMessage) {
  const logger = createRunLogger(logDir, new Date());
  logger.appendRaw(`--- TASK FAILED ---\nTask: ${taskName || ''}\nComponent: ${component || ''}\nError: ${errorMessage || 'Unknown'}\nDuration: 00:00\n\n`);
}

function runDataOutput(logDir, file, records, sizeKb) {
  const logger = createRunLogger(logDir, new Date());
  const sizeBytes = sizeKb != null ? parseFloat(sizeKb) * 1024 : undefined;
  logger.logDataOutput(file, parseInt(records, 10) || 0, sizeBytes);
}

function runSummary(logDir, summaryArgs) {
  const logger = createRunLogger(logDir, new Date());
  const stats = {
    tasksRun: summaryArgs.tasksRun ?? 0,
    tasksSuccessful: summaryArgs.tasksSuccessful ?? 0,
    tasksFailed: summaryArgs.tasksFailed ?? 0,
    warnings: summaryArgs.warnings ?? 0,
    dataFiles: summaryArgs.dataFiles || [],
    totalDuration: summaryArgs.totalDuration || '00:00:00',
    endTime: formatTimestamp(),
    runStatus: summaryArgs.runStatus || 'COMPLETED'
  };
  if (summaryArgs.stateFile && fs.existsSync(summaryArgs.stateFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(summaryArgs.stateFile, 'utf8'));
      Object.assign(stats, data);
    } catch (e) {
      console.error('Failed to read state file:', e.message);
    }
  }
  logger.writeRunSummary(stats);
}

function main() {
  const { options, args } = parseArgs(process.argv);
  const logDir = options.logDir;
  const cmd = args[0];
  if (!cmd) {
    console.error('Usage: node cli.js <command> [args...]');
    console.error('Commands: init | log <LEVEL> <COMPONENT> <TASK> <MESSAGE...> | task-start <COMPONENT> <TASK_NAME> | task-complete <COMPONENT> <TASK_NAME> [durationSec] | task-fail <COMPONENT> <TASK_NAME> <error_message> | data-output <FILE> <RECORDS> [SIZE_KB] | summary [--state <path>] [--tasks-run N] [--tasks-ok N] [--tasks-failed N] [--duration HH:MM:SS] [--data-file "file:records"] ...');
    process.exit(1);
  }

  try {
    switch (cmd) {
      case 'init':
        runInit(logDir);
        break;
      case 'log': {
        const level = args[1];
        const component = args[2] || '';
        const task = args[3] || '';
        const message = args.slice(4).join(' ');
        runLog(logDir, level, component, task, message);
        break;
      }
      case 'task-start': {
        const component = args[1] || '';
        const taskName = args.slice(2).join(' ');
        runTaskStart(logDir, component, taskName);
        break;
      }
      case 'task-complete': {
        const component = args[1] || '';
        const last = args[args.length - 1];
        const durationSec = /^\d+(\.\d+)?$/.test(last) ? parseFloat(last) : undefined;
        const taskName = durationSec != null ? args.slice(2, -1).join(' ') : args.slice(2).join(' ');
        runTaskComplete(logDir, component, taskName, durationSec);
        break;
      }
      case 'task-fail': {
        const component = args[1] || '';
        const taskName = args[2] || '';
        const errorMessage = args.slice(3).join(' ');
        runTaskFail(logDir, component, taskName, errorMessage);
        break;
      }
      case 'data-output': {
        const file = args[1];
        const records = args[2];
        const sizeKb = args[3];
        if (!file || records == null) {
          console.error('Usage: data-output <FILE> <RECORDS> [SIZE_KB]');
          process.exit(1);
        }
        runDataOutput(logDir, file, records, sizeKb);
        break;
      }
      case 'summary': {
        const summaryArgs = { dataFiles: [] };
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--state' && args[i + 1]) {
            summaryArgs.stateFile = args[++i];
          } else if (args[i] === '--tasks-run' && args[i + 1]) {
            summaryArgs.tasksRun = parseInt(args[++i], 10);
          } else if (args[i] === '--tasks-ok' && args[i + 1]) {
            summaryArgs.tasksSuccessful = parseInt(args[++i], 10);
          } else if (args[i] === '--tasks-failed' && args[i + 1]) {
            summaryArgs.tasksFailed = parseInt(args[++i], 10);
          } else if (args[i] === '--warnings' && args[i + 1]) {
            summaryArgs.warnings = parseInt(args[++i], 10);
          } else if (args[i] === '--duration' && args[i + 1]) {
            summaryArgs.totalDuration = args[++i];
          } else if (args[i] === '--status' && args[i + 1]) {
            summaryArgs.runStatus = args[++i];
          } else if (args[i] === '--data-file' && args[i + 1]) {
            const part = args[++i];
            const colon = part.indexOf(':');
            if (colon !== -1) {
              summaryArgs.dataFiles.push({ file: part.slice(0, colon), records: parseInt(part.slice(colon + 1), 10) || 0 });
            }
          }
        }
        runSummary(logDir, summaryArgs);
        break;
      }
      default:
        console.error('Unknown command:', cmd);
        process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

main();
