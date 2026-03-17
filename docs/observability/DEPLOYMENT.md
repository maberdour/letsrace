# Observability System – Deployment Instructions

This document tells you **what to copy where** and **what to update** in each environment so the nightly observability system works correctly. The GitHub repo is the source of truth. **Scripts run from the mapped Google Drive**; paths are set in a single config file.

---

## Config file (Google Drive paths)

Edit **`scripts/observability/config.js`** to match your Google Drive mount. It defines:

| Variable in config.js | Default value | Purpose |
| --------------------- | ------------- | ------- |
| `DRIVE_ROOT`          | `H:\My Drive\Clients\LetsRace` | Base path for LetsRace on the Drive. |
| (derived) `nightlyLogsDir` | `driveRoot\NightlyLogs` | Nightly run log files. |
| (derived) `uivisionRoot`   | `driveRoot\UIVision`    | UIVision root (macros, datasources, logs live under this). |
| (derived) `repoRoot`      | `driveRoot\Repository\letsrace` | Repo root where scripts and BAT files live. |

If your EC2 maps Google Drive as a different letter (e.g. `G:`), change `DRIVE_ROOT` in config.js (e.g. to `G:\My Drive\Clients\LetsRace`). The orchestrator and CLI use these defaults; env vars and CLI options override them.

---

## Environments: local PC test vs EC2 live

Both environments share the **same Google Drive locations**:

- **Drive root:** `H:\My Drive\Clients\LetsRace`
- **Repo root (from config):** `H:\My Drive\Clients\LetsRace\Repository\letsrace`
- **Config:** `DRIVE_ROOT` in `scripts/observability/config.js` should be `H:\My Drive\Clients\LetsRace` in **both** environments.

The only difference is **where** you run/schedule the orchestrator.

### Local PC test environment (developer machine)

- **Prerequisites (local PC):**
  - Google Drive desktop app mapped so `H:\My Drive\Clients\LetsRace` exists.
  - Node.js (≥ 14) installed and on the PATH.
  - Chrome + UI.Vision installed and configured as on EC2 (same macros and datasources under `H:\My Drive\Clients\LetsRace\UIVision`).

- **Run a test manually (BAT as orchestrator):**
  1. Open **Command Prompt** on your PC.
  2. Run:
     - cd /d "H:\My Drive\Clients\LetsRace\Repository\letsrace"
     - scripts\AWS\run-macro-and-shutdown v2.bat
  3. This:
     - Uses the same config and paths as EC2 (Drive-based).
     - Runs the BC + CTT macros via Chrome + UI.Vision.
     - Calls the Node summarizer (`scripts\observability\example-nightly-run.js --summarize-only --no-shutdown`) to write a nightly log to `H:\My Drive\Clients\LetsRace\NightlyLogs` (if Node is installed).
     - Shuts down your machine at the end of the run.

- **Optional: local scheduler for repeatable tests**
  - You can create a Windows Task Scheduler job on your PC pointing at the same `node example-nightly-run.js --no-shutdown` command if you want timed test runs.

### EC2 live environment

- **Prerequisites (EC2):**
  - EC2 has Google Drive mapped as `H:\` with the same `My Drive\Clients\LetsRace` content.
  - Node.js (≥ 14) installed and on the PATH on EC2.
  - Chrome + UI.Vision configured on EC2 using the same `H:\My Drive\Clients\LetsRace\UIVision` folder for macros, datasources, and logs.

- **Live nightly run:**
  - Follow **“EC2: scheduler and config”** below:
    - Scheduler runs `node "H:\My Drive\Clients\LetsRace\Repository\letsrace\scripts\observability\example-nightly-run.js"` on EC2.
    - `DRIVE_ROOT` stays `H:\My Drive\Clients\LetsRace` (same as local).
    - For a real nightly run that shuts EC2 down afterwards, omit `--no-shutdown`. For a diagnostic run, add `--no-shutdown`.

Because both environments share the same mapped Drive and repo, **no changes to config.js or paths are required when moving from local test to EC2 live**; only the scheduler location and shutdown behaviour differ.

---

## 1. What to copy where

### EC2 / Google Drive

Copy the repo (or the observability + AWS script folders) to the **mapped Google Drive** so the path matches `config.repoRoot`, e.g. `H:\My Drive\Clients\LetsRace\Repository\letsrace`. The scripts run from there; no need to copy to local C:.

| Repo path | Copy to (on Drive) | Purpose |
| --------- | ------------------ | ------- |
| **scripts/observability/** (all files, including **config.js**) | `driveRoot\Repository\letsrace\scripts\observability\` | Node module and **config.js** (edit drive paths here). Also contains the summarizer/orchestrator (`example-nightly-run.js`). |
| **scripts/AWS/run-macro-and-shutdown v2.bat** | `driveRoot\Repository\letsrace\scripts\AWS\run-macro-and-shutdown v2.bat` | **Primary nightly entry point.** Runs the BC + CTT macros via Chrome + UI.Vision, then calls the Node summarizer in summarize-only mode to write the nightly observability log, and finally shuts the machine down. |
| **scripts/AWS/run-macros-only.bat** (optional) | Same path | Legacy BAT that only runs the macros (no shutdown, no built-in summarizer). You can still use it if you prefer to schedule `example-nightly-run.js` as the full orchestrator. |

**On Google Drive, ensure these folders exist** (or they will be created when the script runs):

- `driveRoot\NightlyLogs` – nightly log files.
- `driveRoot\UIVision\datasources` – macro CSV inputs/outputs.
- `driveRoot\UIVision\macros` – macro definitions (if you sync from repo).
- `driveRoot\UIVision\logs` – UI.Vision per-macro logs.
- `driveRoot\UIVision\launcher` – UI.Vision launcher HTML (`Run-UI.Vision-Macro.html`).

> **UI.Vision launcher HTML:**  
> The batch files expect the UI.Vision launcher page (usually called `Run-UI.Vision-Macro.html`) to live at  
> `H:\My Drive\Clients\LetsRace\UIVision\launcher\Run-UI.Vision-Macro.html`  
> (i.e. `driveRoot\UIVision\launcher`).  
> If you previously had this file on the Windows Desktop (e.g. `C:\Users\Administrator\Desktop\Run-UI.Vision-Macro.html`), copy **that** file into `driveRoot\UIVision\launcher` so that both EC2 and your local PC use the same H: path.

**Requirements on EC2:**

- **Node.js** (e.g. version 14 or higher) installed and on the PATH.
- **Google Drive** mapped (e.g. as `H:` or `G:`) and available when the scheduled task runs. If the task runs at boot, add a short delay so the Drive is mounted before the script starts.

### Google Apps Script (GAS)

| Repo path | Copy to | Purpose |
| --------- | ------- | ------- |
| **scripts/google-apps/** (all .gs files) | Your Google Apps Script project (paste into the script editor) | ImportCSV-BC.gs, ImportCSV-CTT.gs, DailyBuildAndDeploy.gs, etc. |

**For observability v1:** No changes are required in GAS. The nightly log only covers the **local** run (macros on EC2). GAS execution logs remain the place to check for Import and Daily Build.

### UIVision (macro definitions)

| Repo path | Copy to | Purpose |
| --------- | ------- | ------- |
| **scripts/UIvision/uivision-BC-events.json** | Your UIVision macros location (e.g. Google Drive `\UIVision\macros`) | BC-Events macro. |
| **scripts/UIvision/uivision-CTT-events.json** | Same | CTT-Events macro. |

**For observability v1:** No changes are required in the macro files. Observability only records that the macros ran and what files they produced.

---

## 2. What to update in each location

### EC2: scheduler and config

1. **Edit `scripts/observability/config.js`**  
   Set `DRIVE_ROOT` to your mapped Drive path (e.g. `H:\My Drive\Clients\LetsRace` or `G:\My Drive\Clients\LetsRace`). The derived paths (NightlyLogs, UIVision, repo root) will then point at the correct folders on Drive.

2. **Point the scheduler at the BAT (final orchestration).**  
   The BAT runs BC + CTT macros via Chrome/UI.Vision, calls the Node summarizer, then shuts the machine down. Chrome and UI.Vision **must run in an interactive user session** (they do not work when the task runs in the background with “Run whether user is logged on or not”). Use **auto-logon** plus a task that runs **only when the user is logged on**, and **launch the BAT via `cmd.exe`** so the console and Chrome window are visible.

   **Windows Task Scheduler – EC2 with auto-logon (recommended):**  
   Enable Windows auto-logon for the Administrator (or the user that has H: and Chrome). Then create a task in **Task Scheduler → Create Task** (not “Create Basic Task”):

   | Tab | Setting | Value |
   |-----|--------|--------|
   | **General** | Name | `LetsRace nightly macros` (or any name) |
   | | Description | Runs BC + CTT macros via Chrome/UI.Vision, then shutdown. |
   | | Security | **Run only when user is logged on** |
   | | | **Run with highest privileges** (needed for `shutdown`) |
   | | Configure for | Windows 10/Windows Server 2016+ |
   | **Triggers** | New… | **Begin the task:** At log on |
   | | | **Specific user:** Administrator (or your EC2 user) |
   | | | **Delay task for:** 1 minute |
   | | | **Enabled** ✓ |
   | **Actions** | New… | **Action:** Start a program |
   | | | **Program/script:** `cmd.exe` |
   | | | **Add arguments:** `/c start "" "H:\My Drive\Clients\LetsRace\Repository\letsrace\scripts\AWS\run-macro-and-shutdown v2.bat"` |
   | | | **Start in:** `H:\My Drive\Clients\LetsRace\Repository\letsrace` |
   | **Conditions** | Power | Uncheck **Start the task only if the computer is on AC power** (EC2 is virtual) |
   | **Settings** | | **Allow task to be run on demand** ✓ |

   **Why `cmd.exe` and “start”:**  
   If the task runs the BAT file directly, Chrome can start but its window may not appear in the session (e.g. not visible in RDP). Running `cmd.exe /c start "" "path\to\bat"` opens a **visible console window** and runs the BAT in that window; Chrome then opens in the same session and the browser window is visible.

   **Account:** The task must run as the same user that is auto-logged on (e.g. Administrator). That user must have Google Drive (H:) and Chrome + UI.Vision configured.

3. **Paths for logs and datasources.**  
   They come from **config.js** by default. You only need env vars or CLI args if you want to override:
   - `LETSRACE_LOG_DIR`, `LETSRACE_REPO_ROOT`, `LETSRACE_DATASOURCES_PATH` (env), or
   - `--log-dir`, `--repo-root`, `--datasources-path` (CLI).

4. **Optional: no shutdown for testing (advanced / Node orchestrator mode).**  
   If you instead schedule `example-nightly-run.js` directly (full orchestrator mode), you can pass `--no-shutdown` in the scheduler arguments to skip the shutdown command while still writing the observability log.

### Google Apps Script

No updates are required for observability v1. Keep using your existing GAS scripts and execution logs.

### UIVision

No updates are required for observability v1. Keep copying the macro JSON files from the repo to your UIVision macros folder as before.

---

## 3. Quick checklist

- [ ] Node.js (≥ 14) installed on EC2.
- [ ] Repo on **Google Drive** at the path used in config (e.g. `H:\My Drive\Clients\LetsRace\Repository\letsrace`).
- [ ] **config.js** edited so `DRIVE_ROOT` matches your Drive mount (e.g. `H:\My Drive\Clients\LetsRace`).
- [ ] Google Drive mapped and available when the task runs (add startup delay if the task runs at boot).
- [ ] Scheduler runs `node "...\scripts\observability\example-nightly-run.js"` with the **Drive path** to the script.
- [ ] Scheduler “Start in” = repo root on Drive (same as `config.repoRoot`).
- [ ] GAS and UIVision: no changes; continue copying from repo as usual.

After deployment, each run creates a new log file in `driveRoot\NightlyLogs\` with the start time in the name: `letsrace-run-YYYY-MM-DD-HHmmss.log` (e.g. `letsrace-run-2026-03-07-020015.log`). Open that file to verify task start/complete, data output, and the run summary.
