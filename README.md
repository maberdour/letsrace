# LetsRace.cc - Youth Cycling Events

A website that curates and displays youth cycling events across the UK, making it easy to find, share, and support grassroots bike racing.

## 🏗️ Project Structure

```
maberdour.github.io/
├── 📁 assets/           # Static resources
│   ├── 📁 css/         # Stylesheets
│   ├── 📁 js/          # JavaScript files
│   └── 📁 templates/   # HTML templates
├── 📁 pages/           # Category pages (road, track, etc.)
├── 📁 scripts/         # Automation and backend scripts
│   ├── 📁 automation/  # PowerShell scripts
│   └── 📁 google-apps/ # Google Apps Script files
├── 📁 content/         # Content files (markdown, data)
├── 📁 docs/            # Documentation
├── 📁 testing/         # Test and debug files
├── index.html          # Homepage (must stay in root for GitHub Pages)
└── CNAME               # Custom domain configuration
```

## 🚀 Quick Start

1. **View the site**: Visit [letsrace.cc](https://letsrace.cc)
2. **Browse events**: Use the navigation to explore different cycling disciplines
3. **Filter by region**: Select your region to see local events

## 📝 Content Management

### Updating the About Page
The About page content can be updated without a full repository push:

1. Edit `content/about.md` with your changes
2. Run the update script:
   ```powershell
   cd scripts/automation
   .\pull-about.ps1
   ```
   Or simply double-click `pull-about.bat`

### Updating the Recent Changes Page
The Recent Changes page (`/pages/recent-changes.html`) is built from markdown, same as About and FAQ:

1. Edit `content/recent-changes.md` with your changes
2. Preview locally:
   ```powershell
   pwsh -File scripts/automation/update-content.ps1
   ```
3. Commit the markdown (and updated HTML if previewing locally), or let the nightly build update the HTML automatically

### Adding New Events
Events are automatically fetched from British Cycling and Cycling Time Trials via nightly automation:

- UI.Vision scripts scrape latest events and write `event_data.csv` (British Cycling) and `ctt_event_data.csv` (CTT) into Google Drive.
- Google Apps Script ImportCSV jobs pull those CSVs into the `Events` Google Sheet, normalizing and de‑duplicating rows.
- At 03:30 UK time, the Daily Build script reads the sheet, generates versioned JSON files under `/data/`, and commits them to GitHub, which GitHub Pages then serves.

**GitHub PAT for the daily build:** stored in **Google Apps Script** Script properties as `GITHUB_TOKEN` — not in GitHub Actions repo secrets. See [docs/GITHUB-PAT.md](docs/GITHUB-PAT.md).

## 🛠️ Development

### Local Development
1. Clone the repository
2. Open `index.html` in a web browser
3. For testing, use files in the `testing/` directory

### File Organization
- **Assets**: CSS, JavaScript, and templates are in `assets/`
- **Pages**: All category pages are in `pages/`
- **Scripts**: Automation tools are in `scripts/`
- **Content**: Source content is in `content/`
- **Documentation**: All docs are in `docs/`

### Key Files
- `index.html` - Homepage
- `assets/css/styles.css` - Main stylesheet
- `assets/js/render.js` - Core rendering functions (header, footer, caching)
- `assets/js/events-page.js` - Event page system
- `assets/js/cache.js` - Caching system
- `content/about.md` - About page content
- `content/recent-changes.md` - Recent Changes page content (site fixes and improvements)

## 📚 Documentation

- [GitHub PAT (daily build credentials)](docs/GITHUB-PAT.md)
- [About Page Update System](docs/ABOUT-UPDATE-README.md)
- [Performance Optimizations](docs/PERFORMANCE_OPTIMIZATIONS.md)
- [Site Copy Guide](docs/SiteCopy.md)

## 🔧 Automation

### Available Scripts
- `scripts/automation/pull-about.ps1` - Update About page from markdown
- `scripts/automation/update-content.ps1` - Update FAQ, Recent Changes, and page intros from markdown
- `scripts/automation/auto-git-push.ps1` - Automated git operations
- `scripts/google-apps/` - Google Apps Scripts for data processing

## 🌐 Deployment

This site is deployed on GitHub Pages. The `index.html` file must remain in the root directory for proper deployment.

## 📞 Contact

- **Email**: [hello@letsrace.cc](mailto:hello@letsrace.cc)
- **Website**: [letsrace.cc](https://letsrace.cc)

## 📄 License

This project is maintained for the youth cycling community.
