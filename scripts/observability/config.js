/**
 * Google Drive paths for LetsRace observability (EC2 with mapped Drive).
 * Edit these to match your Drive mount (e.g. H: or G:). Env vars and CLI args override these defaults.
 */

const path = require('path');

const DRIVE_ROOT = 'H:\\My Drive\\Clients\\LetsRace';
const NIGHTLY_LOGS_DIR = path.join(DRIVE_ROOT, 'NightlyLogs');
const UIVISION_ROOT = path.join(DRIVE_ROOT, 'UIVision');

module.exports = {
  /** Base path for LetsRace on the mapped Google Drive */
  driveRoot: DRIVE_ROOT,
  /** Nightly run log files (e.g. letsrace-run-YYYY-MM-DD.log) */
  nightlyLogsDir: NIGHTLY_LOGS_DIR,
  /** UIVision root; macros = UIVision/macros, datasources = UIVision/datasources, logs = UIVision/logs */
  uivisionRoot: UIVISION_ROOT,
  /** Repo root (scripts, BAT files). Default: driveRoot/Repository/letsrace */
  repoRoot: path.join(DRIVE_ROOT, 'Repository', 'letsrace'),
  /** CSV outputs from macros (event_data.csv, ctt_event_data.csv) */
  datasourcesPath: path.join(UIVISION_ROOT, 'datasources'),
  /** UI.Vision per-macro run logs */
  uivisionLogsPath: path.join(UIVISION_ROOT, 'logs'),
  /** Macros folder (BC/CTT macro definitions) */
  macrosPath: path.join(UIVISION_ROOT, 'macros')
};
