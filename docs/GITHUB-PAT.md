# GitHub personal access token (daily build)

Use this page when a fine-grained PAT is created or regenerated (for example a token named `letsrace-daily-build` on GitHub).

## Where the token goes

| Put the PAT here | Do **not** put it here |
|------------------|------------------------|
| **Google Apps Script** → Project settings (gear) → **Script properties** → property **`GITHUB_TOKEN`** | GitHub repo → Settings → Secrets and variables → Actions |
| | GitHub environment secrets |
| | SSH keys or deploy keys |
| | Committed files in this repository |

The nightly daily build does **not** use GitHub Actions. There are no `.github/workflows` in this repo that consume a PAT. Empty Actions secrets on `maberdour/letsrace` are expected.

The name `letsrace-daily-build` on GitHub is only a label for you. Apps Script must use the property key **`GITHUB_TOKEN`** (see `DailyBuildAndDeploy.gs` → `TOKEN_PROPERTY_KEY`).

## Replace an existing token

1. Regenerate or create the fine-grained PAT on GitHub (copy the value once).
2. Open the Google Apps Script project that runs `DailyBuildAndDeploy.gs`.
3. Project settings → Script properties → edit **`GITHUB_TOKEN`** → paste the new value → Save.
4. Run **`dailyBuild()`** once and check Executions logs.
5. Confirm a new commit on `main` at https://github.com/maberdour/letsrace (`chore(data): daily build YYYY-MM-DD`).

## Fine-grained PAT permissions

- **Repository access:** `maberdour/letsrace` only
- **Contents:** Read and write (required to commit JSON via the Contents API)
- **Metadata:** Read (default)

## Related docs

- [Daily Build and Deploy](../scripts/google-apps/README-DailyBuild.md) — full pipeline and setup
- [Deployment rules](../.cursor/rules/deployment.mdc) — automation overview for agents

## Local git (optional, separate)

If you push to GitHub over HTTPS from your PC, update the stored credential in Windows Credential Manager for `github.com`. That is independent of the Apps Script `GITHUB_TOKEN`.
