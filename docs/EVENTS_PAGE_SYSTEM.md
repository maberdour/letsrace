# Events Page System

This document describes the events page system for LetsRace.cc, which provides dynamic, filterable event listings for each cycling discipline type.

## Overview

The system consists of:

1. **Shared JavaScript Module** (`/assets/js/events-page.js`) - Handles all functionality
2. **CSS** — discipline pages typically load `/assets/css/styles.css` (shared layout and event UI); `/assets/css/events-page.css` exists for legacy or standalone styling if linked.
3. **HTML Templates** - One page per event type
4. **Data Files** - Generated daily by Google Apps Script from the `Events` Google Sheet

## How It Works

### Data Flow

1. **Nightly data import (CSV → Google Sheet)**  
   - Time-based triggers in Google Apps Script run the ImportCSV scripts:  
     - `ImportCSV-BC.gs` (`appendNewEvents_ByDateAndName_WithDateFix`) imports `event_data.csv` from Google Drive (British Cycling events) into the `Events` sheet.  
     - `ImportCSV-CTT.gs` (`appendNewCTTEvents_ByDateAndName_WithDateFix`) imports `ctt_event_data.csv` from Google Drive (CTT events) into the same sheet.  
   - These scripts normalize dates, regions, URLs and handle duplicate detection based on BC/CTT event IDs, updating or inserting rows with timestamps.

2. **Daily Build (Google Sheet → JSON files)**  
   - The `dailyBuild()` function in `DailyBuildAndDeploy.gs` runs on a 03:30 Europe/London time-based trigger and generates JSON files from the `Events` sheet:  
     - `/data/manifest.json` - Points to today's versioned files  
     - `/data/index/facets.vYYYYMMDD.json` - Search metadata  
     - `/data/type/{type}.vYYYYMMDD.json` - Event data per type

3. **Page Load (JSON → rendered list)**  
   - JavaScript fetches the manifest for current file URLs, loads facets and the discipline shard, populates region checkboxes from facet metadata, and renders the list.

4. **User Interaction** — client-side filtering (see [Regional vs national scope](#regional-vs-national-scope)):
   - Multi-region selection (checkboxes)
   - Optional “national events only” mode (title-based; see below)
   - URL query `regions` (comma-separated) and `localStorage` for persistence
   - Analytics when available (e.g. Plausible)

### Event Types Supported

- `road` - Road cycling events
- `track` - Track cycling events  
- `bmx` - BMX events
- `mtb` - Mountain bike events
- `cyclo-cross` - Cyclo-cross events
- `time-trial` - Time trial events
- `hill-climb` - Hill climb events
- `speedway` - Speedway events

## Regional vs national scope

Discipline pages (`assets/js/events-page.js`) and the Newly Added page (`assets/js/newly-added.js`, for its regional/national split) use the same definition of a **national-titled** event: the event **name** matches the regex `/\bnational\b/i` (word “national”, case-insensitive). This mirrors `isNationalEvent()` in `scripts/google-apps/DailyBuildAndDeploy.gs`, used when building facet counts.

| Mode | What the user sees |
|------|---------------------|
| **Regional** (default; “Show National Events Only” off) | Every upcoming event whose sheet **`region`** is one of the selected regions. That includes national-level races **held in** that region (e.g. a National Youth Omnium in London & South East still appears when that region is selected). |
| **National only** (toggle on) | Only national-titled events, **all regions** (region checkboxes are disabled in the UI). |

So “national only” is a **title** filter for UK-wide national listings; “regional” is a **geography** filter (sheet region) and is not mutually exclusive with national-titled events.

Homepage discipline tile counts when **not** in national-only mode sum `facets.counts["{Discipline}|{region}"]` for selected regions (all events in those buckets). National-only tiles use `facets.counts_national`.

## Creating New Event Type Pages

To add a page for another discipline (e.g. cyclo-cross):

1. **Create the directory and file**, e.g. `pages/cyclo-cross/index.html`.

2. **Copy a live page as the structural template** — e.g. `pages/track/index.html`: same filter block (`#filter-toggle`, `#filter-content`, `#national-only`, `#region-checkboxes`, `#select-all-regions`, `#clear-regions`), results block (`#result-count`, `#empty-state`, `#event-list`), shared CSS/JS includes, and `<body data-type="…">` in kebab-case matching the manifest shard key (`cyclo-cross`, `road`, etc.).

3. **Customize** `<title>`, `<meta name="description">`, `<h1>`, intro copy, and `renderHeader("…")` / `data-type`.

The module detects `data-type`, loads the matching shard from the manifest, fills regions from facets, and applies filtering as described above.

## Required HTML Structure

The script validates a core set of IDs. Match an existing discipline page (e.g. track); required elements include:

```text
#region-checkboxes      — container; checkboxes injected from facets
#select-all-regions      — optional but expected if present in template
#clear-regions           — required
#result-count            — required
#empty-state             — required
#event-list              — required
#build-stamp             — required by init (often in footer via render.js)
#filter-toggle, #filter-content — collapsible filter panel
#national-only           — optional; national vs regional scope
.region-filter           — used to enable/disable region UI when national-only is on
```

## Features

### Filtering
- **Regions**: Multi-select checkboxes; options come from `facets.regions` (canonical list).
- **National only**: Toggle restricts the list to national-titled events UK-wide; turning it off returns to regional mode (see [Regional vs national scope](#regional-vs-national-scope)).
- **Upcoming only**: Events before today (Europe/London date) are excluded in code, not via date pickers on the page.

### URL State Management
- Selected regions are stored in the URL as `?regions=Region1,Region2` (and restored on load).
- Scope (regional vs national) is persisted in `localStorage` (`eventScope`) alongside saved region selection where applicable.

### Accessibility
- Proper ARIA labels and live regions
- Keyboard navigation support
- Screen reader friendly structure

### Analytics
- Automatic tracking of filter changes
- Event click tracking (if Plausible is available)
- No tracking without user consent

### Performance
- Debounced input handling (200ms)
- Efficient DOM updates
- Parallel data fetching
- Client-side filtering for instant results

## Data Schema

### Event Object
```json
{
  "id": "string",                       // 8-char SHA1 prefix
  "name": "string",
  "type": "Road|Track|BMX|MTB|Cyclo Cross|Speedway|Time Trial|Hill Climb",
  "region": "string",                   // canonicalized
  "venue": "string",
  "postcode": "string|null",            // UK postcode if found
  "date": "YYYY-MM-DD",                 // UK local date
  "start_time": "HH:mm|null",
  "url": "string",
  "source": "string",                   // "Google Sheet"
  "last_updated": "YYYY-MM-DDTHH:mm:ssZ"
}
```

### Manifest Structure
```json
{
  "type": {
    "road": "/data/type/road.vYYYYMMDD.json",
    "track": "/data/type/track.vYYYYMMDD.json",
    // ... other types
  },
  "index": {
    "facets": "/data/index/facets.vYYYYMMDD.json"
  }
}
```

### Facets Structure
```json
{
  "types": ["Road", "Track", "BMX", "MTB", "Cyclo Cross", "Speedway", "Time Trial", "Hill Climb"],
  "regions": ["London & South East", "South West", ...],
  "counts": {
    "Road": 123,
    "London & South East": 210,
    "Track|London & South East": 33
  },
  "counts_national": {
    "Road": 12,
    "Track": 5
  },
  "last_build": "YYYY-MM-DDTHH:mm:ssZ"
}
```

`counts` includes every event in each type/region bucket (including national-titled events assigned to that region). `counts_national` is per **discipline name** (sheet `type`): count of events that are both that type and national-titled, used for the homepage when “national only” is enabled.

## Error Handling

The system gracefully handles:
- Network failures when fetching data
- Missing or invalid manifest structure
- Empty event lists
- Invalid date formats
- Missing DOM elements

Error states are clearly communicated to users with helpful messages.

## Browser Support

- Modern browsers with ES6+ support
- No polyfills required
- Progressive enhancement approach
- Graceful degradation for older browsers

## Performance Considerations

- **Bundle Size**: ~8KB minified JavaScript
- **No Dependencies**: Vanilla JavaScript only
- **Efficient Rendering**: Batch DOM updates
- **Smart Caching**: Versioned files can be cached long-term
- **Minimal Network**: Only fetches required data

## Maintenance

### Adding New Event Types
1. Update the Google Apps Script to include the new type
2. Create the corresponding HTML page
3. Test with sample data

### Updating Styles
- Prefer `/assets/css/styles.css` for rules shared with the homepage; use `/assets/css/events-page.css` only if those pages link it explicitly.

### Modifying Functionality
- Update `/assets/js/events-page.js`
- Test across all event type pages
- Consider backward compatibility

## Troubleshooting

### Common Issues

1. **"Missing data-type attribute"**
   - Ensure `<body data-type="...">` is set correctly

2. **"Missing required DOM elements"**
   - Check that all required IDs are present in HTML

3. **"Failed to fetch manifest"**
   - Verify `/data/manifest.json` exists and is accessible
   - Check network connectivity

4. **"Invalid manifest structure"**
   - Ensure manifest contains expected `type` and `index` properties
   - Verify the event type exists in the manifest

### Debug Mode
Add `?debug=true` to any event page URL to see detailed console logging.

## Future Enhancements

Potential improvements:
- Server-side rendering for better SEO
- Advanced filtering options
- Event search functionality
- Calendar view
- Export functionality
- Real-time updates
- Offline support
