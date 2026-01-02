# Daily Build and Deploy Script

This Google Apps Script stack keeps the LetsRace.cc site updated every night. Time-based triggers first run the ImportCSV scripts to pull fresh events from British Cycling and Cycling Time Trials CSVs into the `Events` Google Sheet, then the Daily Build script converts that sheet data into static JSON files and commits them to a GitHub repository for website deployment.

## Features

- **Data Processing**: Reads events from Google Sheet and normalizes data
- **Future Events Only**: Filters to events from today onwards (Europe/London timezone)
- **Type Partitioning**: Creates separate JSON files for each event type
- **Facets Index**: Builds searchable index with counts and regions
- **GitHub Integration**: Commits files via GitHub Contents API
- **Automated Triggers**: Runs daily at 03:30 Europe/London time

## Nightly Flow

The full nightly pipeline runs as follows (all times Europe/London):

1. **~03:00 – Import CSV to Sheet**  
   - Time-based triggers run the ImportCSV Apps Scripts:  
     - `ImportCSV-BC.gs` → `appendNewEvents_ByDateAndName_WithDateFix()` (British Cycling CSV → Google Sheet)  
     - `ImportCSV-CTT.gs` → `appendNewCTTEvents_ByDateAndName_WithDateFix()` (Cycling Time Trials CSV → Google Sheet)  
   - These scripts:  
     - Read `event_data.csv` and `ctt_event_data.csv` from Google Drive  
     - Normalize and de-duplicate events using BC/CTT event IDs  
     - Update or insert rows in the `Events` sheet, with created/updated timestamps and canonical regions

2. **03:30 – Daily build and deploy**  
   - The `dailyBuild()` trigger runs (configured by `createDailyTrigger()`):  
     - Reads all events from the `Events` sheet  
     - Normalizes and filters to future events  
     - Generates versioned JSON files per type and the facets index  
     - Updates `manifest.json` to point to the latest versions  
     - Commits everything to GitHub (`main` branch), which GitHub Pages then serves

3. **Frontend consumption**  
   - Event pages (e.g. Road, Track, BMX) load `/data/manifest.json` and the appropriate type/facets JSON on each page view  
   - The event lists are rendered client‑side from these static JSON files.

## File Structure

The script generates the following file structure in the GitHub repository:

```
/data/
├── type/
│   ├── road.v20241218.json
│   ├── track.v20241218.json
│   ├── bmx.v20241218.json
│   ├── mtb.v20241218.json
│   ├── cyclo-cross.v20241218.json
│   ├── speedway.v20241218.json
│   ├── time-trial.v20241218.json
│   └── hill-climb.v20241218.json
├── index/
│   └── facets.v20241218.json
└── manifest.json
```

## Setup Instructions

### 1. Set GitHub Token

**IMPORTANT**: You must manually set your GitHub personal access token in Script Properties:

1. Go to your Google Apps Script project
2. Click on "Project Settings" (gear icon)
3. Click on "Script Properties" tab
4. Add a new property:
   - **Key**: `GITHUB_TOKEN`
   - **Value**: Your GitHub personal access token
5. Click "Add script property" and save

**Security Note**: Never hardcode tokens in your script. Always use Script Properties for sensitive data.

#### Creating a GitHub Personal Access Token

If you don't have a GitHub token yet:

1. Go to GitHub.com and sign in
2. Click your profile picture → "Settings"
3. Scroll down to "Developer settings" (bottom left)
4. Click "Personal access tokens" → "Tokens (classic)"
5. Click "Generate new token" → "Generate new token (classic)"
6. Give it a descriptive name (e.g., "LetsRace Daily Build")
7. Set expiration (recommend 90 days or custom)
8. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
9. Click "Generate token"
10. **Copy the token immediately** (you won't see it again)
11. Use this token in the Script Properties setup above

### 2. Create Daily Trigger

Run the `createDailyTrigger()` function to set up automatic daily execution at 03:30 Europe/London time.

### 3. Test the Build

Run the `dailyBuild()` function to test the complete process and verify everything works correctly.

## Configuration

The script is configured with the following constants:

- **Spreadsheet ID**: `1r3GiuG-VF-wo-rwC6e8a25DjmN2dSmNtjpbAIUOk9Js`
- **Sheet Name**: `Events`
- **GitHub Owner**: `maberdour`
- **GitHub Repository**: `letsrace`
- **Target Branch**: `main`
- **Timezone**: `Europe/London`

## Data Processing

### Input Format

The script expects a Google Sheet with the following columns (no header row):

| Column | Index | Description |
|--------|-------|-------------|
| A | 0 | Event Date |
| B | 1 | Event Name |
| C | 2 | Event Type |
| D | 3 | Location |
| E | 4 | URL |
| F | 5 | Region |
| G | 6 | Date Added |

### Output Format

Each event is normalized to the following JSON schema:

```json
{
  "id": "string",
  "name": "string",
  "type": "Road|Track|BMX|MTB|Cyclo Cross|Speedway|Time Trial|Hill Climb",
  "region": "string",
  "venue": "string",
  "postcode": "string|null",
  "date": "YYYY-MM-DD",
  "start_time": "HH:mm|null",
  "url": "string",
  "source": "string",
  "last_updated": "YYYY-MM-DDTHH:mm:ssZ"
}
```

### Data Normalization

- **Types**: Mapped to canonical list with common variants supported
- **Regions**: Canonicalized using predefined mappings
- **Dates**: Converted to ISO format (YYYY-MM-DD) in Europe/London timezone
- **IDs**: Deterministic SHA-1 hash based on name, date, and venue
- **Whitespace**: Trimmed and condensed

## Event Types

The script supports these canonical event types:

- Road
- Track
- BMX
- MTB
- Cyclo Cross
- Speedway
- Time Trial
- Hill Climb

## Region Mapping

Regions are mapped to standardized names:

- London & South East
- South West
- Midlands
- North West
- North East
- Yorkshire
- East
- Wales
- Scotland
- Northern Ireland

## Functions Reference

### Main Functions

- `dailyBuild()` - Main function that runs the complete build process
- `createDailyTrigger()` - Sets up daily automation trigger
- `setGitHubToken()` - Stores GitHub token in Script Properties

### Utility Functions

- `getGitHubToken()` - Retrieves token from Script Properties
- `isoLocalDateUK(date)` - Converts date to YYYY-MM-DD in Europe/London
- `nowISO()` - Returns current time in ISO format (UTC)
- `toKebabCase(type)` - Converts type to kebab-case for filenames
- `hashId(input)` - Generates deterministic SHA-1 hash
- `putGithubFile(path, content, message)` - Commits file to GitHub

### Data Processing Functions

- `readSheetData()` - Reads data from Google Sheet
- `processSheetData(sheetData)` - Normalizes and validates data
- `partitionByType(events)` - Groups events by type
- `buildFacetsIndex(events)` - Creates searchable index
- `parseEventDate(dateValue)` - Parses various date formats
- `normalizeType(typeValue)` - Maps to canonical types
- `normalizeRegion(regionValue)` - Canonicalizes regions

## Error Handling

The script includes comprehensive error handling:

- Invalid dates are logged and skipped
- Unknown event types are logged and skipped
- GitHub API errors are logged with full response details
- Large shard warnings (>5000 events) are logged
- All errors are logged with row numbers for debugging

## Logging

The script provides detailed logging throughout the process:

- Number of rows read from sheet
- Number of rows skipped with reasons
- Events processed per type
- Files committed to GitHub
- Build summary with counts

## Security

- GitHub token is stored securely in Script Properties
- Token is never logged or exposed in output
- All API requests use HTTPS
- Error responses don't expose sensitive information

## Troubleshooting

### Common Issues

1. **GitHub Push Protection Blocked**: If you see "Push cannot contain secrets" error:
   - The script no longer contains hardcoded tokens
   - Set your token manually in Script Properties as described above
   - If you previously committed a token, you may need to rotate it

2. **GitHub API Errors**: Check token permissions and repository access
3. **Invalid Dates**: Review date formats in the Google Sheet
4. **Unknown Types**: Add new type mappings to the `normalizeType()` function
5. **Large Shards**: Consider implementing monthly splits for types with >5000 events

### Debugging

- Check the Apps Script execution logs for detailed error messages
- Verify Google Sheet permissions and data format
- Test individual functions before running the full build
- Review GitHub repository permissions and branch protection rules

## Performance Considerations

- The script processes data in memory for efficiency
- Large datasets (>10,000 events) may require optimization
- GitHub API rate limits are respected with proper error handling
- Empty shards are still written to maintain consistent structure

## Future Enhancements

Potential improvements for future versions:

- Monthly data splits for large event types
- Incremental updates instead of full rebuilds
- Data validation rules and schema enforcement
- Backup and rollback capabilities
- Performance monitoring and metrics
- Webhook notifications for build status
