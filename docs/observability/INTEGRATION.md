# Observability System – Integration Guide

This document describes how to use and integrate the LetsRace automation observability system into your nightly pipeline.

## Overview

The observability system writes **one log file per run** (filename includes start time) to a configurable directory on Google Drive (see **config.js**: `nightlyLogsDir`, e.g. `H:\My Drive\Clients\LetsRace\NightlyLogs`). The log records:

- Task start/complete/fail with duration
- Progress messages and structured errors
- Data output (file name, record count, size)
- Optional resource snapshots (CPU, memory, disk, Chrome processes)
- A run summary at the end

Timestamps use **Europe/London**. Each run creates a new log file: `letsrace-run-YYYY-MM-DD-HHmmss.log` (e.g. `letsrace-run-2026-03-07-020015.log`).

## Config file (Google Drive)

Scripts run from the mapped Google Drive. Paths are set in **`scripts/observability/config.js`**:

| Config key          | Purpose |
| ------------------- | ------- |
| `driveRoot`         | Base path for LetsRace on the Drive, e.g. `H:\My Drive\Clients\LetsRace` |
| `nightlyLogsDir`    | Nightly run log files, e.g. `H:\My Drive\Clients\LetsRace\NightlyLogs` |
| `uivisionRoot`      | UIVision root; under it: `macros`, `datasources`, `logs` |
| `repoRoot`          | Repo root (scripts, BAT); default `driveRoot\Repository\letsrace` |
| `datasourcesPath`   | Where `event_data.csv` and `ctt_event_data.csv` are written (`uivisionRoot\datasources`) |
| `uivisionLogsPath`  | UI.Vision per-macro logs (`uivisionRoot\logs`) |
| `macrosPath`        | BC/CTT macro definitions (`uivisionRoot\macros`) |

**Edit `config.js`** to match your Drive mount (e.g. change `H:` to `G:` if your EC2 maps Drive as G:). Environment variables and CLI options **override** these defaults.

## EC2 and Google Drive layout

On the EC2 machine, the **mapped Google Drive** (e.g. `H:\My Drive\Clients\LetsRace`) contains:

| Path (from config)       | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `driveRoot\NightlyLogs`  | **Our observability log** – one file per run, e.g. `letsrace-run-YYYY-MM-DD-HHmmss.log`. |
| `driveRoot\UIVision\macros`      | BC and CTT macro definitions (UI.Vision reads these).                  |
| `driveRoot\UIVision\datasources`  | URL CSVs (inputs) and `event_data.csv` / `ctt_event_data.csv` (outputs). |
| `driveRoot\UIVision\logs`        | UI.Vision’s own per-macro run logs.                                     |
| `driveRoot\Repository\letsrace` | Repo (scripts, BAT files) – scripts run from here.                     |

## Configurable paths (overrides)

Env vars and CLI options override the config file:

| Purpose           | Env variable              | CLI/Orchestrator option   | Example value                    |
| ----------------- | ------------------------- | ------------------------- | -------------------------------- |
| Log directory     | `LETSRACE_LOG_DIR`        | `--log-dir`               | `H:\My Drive\Clients\LetsRace\NightlyLogs` |
| Repo root         | `LETSRACE_REPO_ROOT`      | `--repo-root`             | `H:\My Drive\Clients\LetsRace\Repository\letsrace` |
| Datasources (CSV) | `LETSRACE_DATASOURCES_PATH` | `--datasources-path`    | `H:\My Drive\Clients\LetsRace\UIVision\datasources` |

## Current status (BAT-only runner)

The nightly pipeline is currently intentionally **BAT-only** for stability:

- Primary runner: `scripts/AWS/run-macro-and-shutdown v2.bat` (runs **BC-Events**, then **CTT-Events**, then shuts down)
- Testing runner: `scripts/AWS/run-macros-only.bat` (runs the same macros, **no shutdown**)

Logs to use when troubleshooting:

- BAT orchestration log: `H:\My Drive\Clients\LetsRace\NightlyLogs\macro-log.txt`
- UI.Vision logs: `H:\My Drive\Clients\LetsRace\UIVision\logs\log-*.txt`
- Output CSVs: `H:\My Drive\Clients\LetsRace\UIVision\datasources\event_data*.csv` and `ctt_event_data*.csv`

## Node observability scripts (disabled for now)

The Node observability tooling under `scripts/observability/` (including `example-nightly-run.js`) is kept in the repo for future step-by-step reintroduction, but it is **not part of the nightly runner** at the moment.

## CLI reference

The CLI (`cli.js`) can be invoked by batch or PowerShell to append a single entry without running the full orchestrator.

**Base:**

```bash
node scripts/observability/cli.js [--log-dir <path>] [--repo-root <path>] <command> [args...]
```

**Commands:**

| Command         | Arguments                                                                 | Description |
| --------------- | ------------------------------------------------------------------------- | ----------- |
| `init`          | (none)                                                                    | Create today’s run log and write “Nightly run started”. |
| `log`           | `LEVEL COMPONENT TASK MESSAGE...`                                         | Single log line (LEVEL: INFO, WARN, ERROR, SUCCESS, DEBUG). |
| `task-start`    | `COMPONENT TASK_NAME...`                                                  | Start a task (writes --- TASK START --- block). |
| `task-complete` | `COMPONENT TASK_NAME [durationSec]`                                       | Complete the current task; optional duration in seconds. |
| `task-fail`     | `COMPONENT TASK_NAME error message...`                                    | Log task failure. |
| `data-output`   | `FILE RECORDS [SIZE_KB]`                                                  | Log “Output file created” with File, Records, Size. |
| `summary`       | `[--state <path>] [--tasks-run N] [--tasks-ok N] [--tasks-failed N] [--duration HH:MM:SS] [--data-file "name:records"] ...` | Write the run summary block. |

**Examples:**

```bash
node cli.js --log-dir "G:\LetsRace\Nightly Logs" init
node cli.js --log-dir "G:\LetsRace\Nightly Logs" log INFO MACRO BC-Events "Starting macro"
node cli.js --log-dir "G:\LetsRace\Nightly Logs" task-start "Macro Automation" "BC Event Scraper"
node cli.js --log-dir "G:\LetsRace\Nightly Logs" data-output event_data.csv 78 42
node cli.js --log-dir "G:\LetsRace\Nightly Logs" summary --tasks-run 1 --tasks-ok 1 --duration 00:12:42 --data-file "event_data.csv:78" --data-file "ctt_event_data.csv:145"
```

## Programmatic API (Node)

From Node scripts you can use the modules directly:

```javascript
const { createRunLogger } = require('./run-logger');
const { createTaskTracker } = require('./task-tracker');
const { startResourceMonitor } = require('./resource-monitor');

const logDir = 'G:\\LetsRace\\Nightly Logs';
const logger = createRunLogger(logDir, new Date());
const tracker = createTaskTracker(logger);

tracker.startTask('Macro Automation', 'My Task');
logger.info('Macro Automation', 'My Task', 'Progress message');
tracker.completeTask({ eventsExtracted: 78, rowsWritten: 78 });

const monitor = startResourceMonitor(logger, 120000);
// ... later: monitor.stop();

logger.writeRunSummary({
  tasksRun: 1,
  tasksSuccessful: 1,
  tasksFailed: 0,
  warnings: 0,
  dataFiles: [{ file: 'event_data.csv', records: 78 }],
  totalDuration: '00:02:34',
  endTime: '2026-03-07 01:05:00',
  runStatus: 'COMPLETED'
});
```

## Google Apps Script (GAS)

GAS runs in the cloud and does not write to the EC2 log file. The nightly observability log covers only the **local** run (macros, file generation, resource monitoring). Import and Daily Build (GAS) are separate; use Apps Script execution logs for those. Optionally, you can log a step in the run that produces the CSVs, e.g. “GAS Import and Daily Build scheduled 03:00 / 03:30 UK”.

## Incomplete-run detection

When a new run starts, the logger checks whether **yesterday’s** log file exists and contains a run summary (`RUN STATUS:` or `=== NIGHTLY RUN SUMMARY ===`). If it does not, the new log starts with a warning line:  
`WARNING: Previous run did not complete (log: letsrace-run-YYYY-MM-DD-HHmmss.log)`.

## Adding new tasks or metrics

- **New task**: Call `tracker.startTask(component, taskName)`, then `tracker.progress(message)` as needed, then `tracker.completeTask(stats)` or `tracker.failTask(message, durationSec)`.
- **New log line**: Use `logger.info(component, task, message)` (or `warn`, `error`, `success`, `debug`).
- **Structured error**: Use `logger.logStructuredError(component, task, message, { URL: '...', 'Loop Index': 21, XPath: '...' })`.
- **Data output**: Use `logger.logDataOutput(fileName, recordCount, sizeBytes, step)`.

For deployment and “what to copy where”, see [DEPLOYMENT.md](DEPLOYMENT.md).
