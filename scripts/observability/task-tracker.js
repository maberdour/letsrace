/**
 * Task lifecycle tracking for LetsRace nightly automation.
 * Wraps the run logger to record task start, progress, complete, and fail with duration.
 */

const { createRunLogger, formatTimestamp } = require('./run-logger');

/**
 * Format duration in seconds as HH:MM:SS or MM:SS.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatDuration(totalSeconds) {
  if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Create a task tracker that uses the given run logger.
 * @param {ReturnType<typeof createRunLogger>} logger - Run logger instance.
 * @returns {{ startTask: Function, progress: Function, completeTask: Function, failTask: Function, getCurrentTask: Function }}
 */
function createTaskTracker(logger) {
  let currentComponent = null;
  let currentTaskName = null;
  let taskStartTime = null;

  return {
    getCurrentTask() {
      return { component: currentComponent, taskName: currentTaskName, startTime: taskStartTime };
    },

    /**
     * Start a task and write --- TASK START --- block.
     * @param {string} component - e.g. "Macro Automation"
     * @param {string} taskName - e.g. "BC Event Scraper"
     */
    startTask(component, taskName) {
      currentComponent = component || '';
      currentTaskName = taskName || '';
      taskStartTime = Date.now();
      const startTimeStr = formatTimestamp();
      logger.appendRaw(`--- TASK START ---\nTask: ${currentTaskName}\nComponent: ${currentComponent}\nStart Time: ${startTimeStr}\n\n`);
    },

    /**
     * Log a progress message for the current task.
     * @param {string} message
     */
    progress(message) {
      if (currentComponent != null && currentTaskName != null) {
        logger.info(currentComponent, currentTaskName, message || '');
      } else {
        logger.info('', '', message || '');
      }
    },

    /**
     * Complete the current task with optional stats (eventsExtracted, rowsWritten).
     * @param {Object} [stats]
     * @param {number} [stats.eventsExtracted]
     * @param {number} [stats.rowsWritten]
     */
    completeTask(stats = {}) {
      const durationSec = taskStartTime != null ? (Date.now() - taskStartTime) / 1000 : 0;
      const durationStr = formatDuration(durationSec);
      logger.appendRaw(`--- TASK COMPLETE ---\nTask: ${currentTaskName || ''}\nStatus: SUCCESS\nDuration: ${durationStr}\n`);
      if (stats.eventsExtracted != null) logger.appendRaw(`Events Extracted: ${stats.eventsExtracted}\n`);
      if (stats.rowsWritten != null) logger.appendRaw(`Rows Written: ${stats.rowsWritten}\n`);
      logger.appendRaw('\n');
      currentComponent = null;
      currentTaskName = null;
      taskStartTime = null;
    },

    /**
     * Mark the current task as failed.
     * @param {string} errorMessage
     * @param {number} [durationSec] - If omitted, computed from task start time.
     */
    failTask(errorMessage, durationSec) {
      const dur = durationSec != null ? durationSec : (taskStartTime != null ? (Date.now() - taskStartTime) / 1000 : 0);
      const durationStr = formatDuration(dur);
      logger.appendRaw(`--- TASK FAILED ---\nTask: ${currentTaskName || ''}\nError: ${errorMessage || 'Unknown'}\nDuration: ${durationStr}\n\n`);
      currentComponent = null;
      currentTaskName = null;
      taskStartTime = null;
    }
  };
}

module.exports = {
  createTaskTracker,
  formatDuration
};
