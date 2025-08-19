# Events Page System

This document describes the events page system for LetsRace.cc, which provides dynamic, filterable event listings for each cycling discipline type.

## Overview

The system consists of:

1. **Shared JavaScript Module** (`/assets/js/events-page.js`) - Handles all functionality
2. **CSS Styles** (`/assets/css/events-page.css`) - Consistent styling
3. **HTML Templates** - One page per event type
4. **Data Files** - Generated daily by Google Apps Script

## How It Works

### Data Flow

1. **Daily Build** - Google Apps Script generates JSON files:
   - `/data/manifest.json` - Points to today's versioned files
   - `/data/index/facets.vYYYYMMDD.json` - Search metadata
   - `/data/type/{type}.vYYYYMMDD.json` - Event data per type

2. **Page Load** - JavaScript:
   - Fetches manifest to get current file URLs
   - Loads facets and type-specific data
   - Populates filters and renders events

3. **User Interaction** - Client-side filtering:
   - Region selection
   - Date range filtering
   - URL state management
   - Analytics tracking

### Event Types Supported

- `road` - Road cycling events
- `track` - Track cycling events  
- `bmx` - BMX events
- `mtb` - Mountain bike events
- `cyclo-cross` - Cyclo-cross events
- `time-trial` - Time trial events
- `hill-climb` - Hill climb events
- `speedway` - Speedway events

## Creating New Event Type Pages

To create a new event type page (e.g., for "cyclo-cross"):

1. **Create the directory and file:**
   ```bash
   mkdir -p pages/cyclo-cross
   touch pages/cyclo-cross/index.html
   ```

2. **Copy the template HTML:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Cyclo-Cross Events - LetsRace</title>
       <link rel="stylesheet" href="/assets/css/events-page.css">
       <meta name="description" content="Find cyclo-cross events across the UK">
   </head>
   <body data-type="cyclo-cross">
       <main>
           <h1>Cyclo-Cross Events</h1>
           
           <!-- Filter Controls -->
           <div class="filters">
               <div class="filter-group">
                   <label for="filter-region">Region</label>
                   <select id="filter-region">
                       <option value="">Loading regions...</option>
                   </select>
               </div>
               
               <div class="filter-group">
                   <label for="filter-from">From</label>
                   <input id="filter-from" type="date">
               </div>
               
               <div class="filter-group">
                   <label for="filter-to">To</label>
                   <input id="filter-to" type="date">
               </div>
               
               <div class="filter-group">
                   <button id="filter-reset">Reset</button>
               </div>
           </div>
           
           <!-- Results -->
           <div class="results">
               <div id="result-count" aria-live="polite">Loading events...</div>
               
               <div id="empty-state" hidden>
                   No events match your filters.
               </div>
               
               <ul id="event-list" role="list">
                   <!-- Events will be populated by JavaScript -->
               </ul>
           </div>
           
           <!-- Footer -->
           <footer>
               <small id="build-stamp">Loading...</small>
           </footer>
       </main>
       
       <!-- Load the events page module -->
       <script type="module" src="/assets/js/events-page.js"></script>
   </body>
   </html>
   ```

3. **Customize the content:**
   - Change `<title>` to match the event type
   - Update `<meta name="description">`
   - Change `<h1>` content
   - Set `<body data-type="cyclo-cross">` (use kebab-case)

That's it! The JavaScript module will automatically:
- Detect the event type from `data-type`
- Load the correct data files
- Populate filters with available regions
- Handle all filtering and rendering

## Required HTML Structure

Every event type page must include these elements with exact IDs:

```html
<!-- Filter Controls -->
<select id="filter-region">
<input id="filter-from" type="date">
<input id="filter-to" type="date">
<button id="filter-reset">

<!-- Results -->
<div id="result-count" aria-live="polite">
<div id="empty-state" hidden>
<ul id="event-list" role="list">

<!-- Footer -->
<small id="build-stamp">
```

## Features

### Filtering
- **Region**: Dropdown populated from facets data
- **Date Range**: From/To date inputs with today as default "From"
- **Reset**: Button to restore default filters

### URL State Management
- Filters are reflected in URL parameters
- Page reload preserves filter state
- Default values are omitted from URL

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
  "last_build": "YYYY-MM-DDTHH:mm:ssZ"
}
```

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
- Modify `/assets/css/events-page.css`
- Changes apply to all event type pages automatically

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
