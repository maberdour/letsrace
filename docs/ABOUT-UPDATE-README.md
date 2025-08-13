# About Page Update System

This system allows you to update the About page content without doing a complete repository push.

## Files

- `about.md` - The source markdown content for the About page
- `pull-about.ps1` - PowerShell script that fetches and converts the content
- `pull-about.bat` - Simple batch file for easy execution
- `about.html` - The generated HTML page (updated by the script)

## How to Use

### Option 1: Using the Batch File (Easiest)
1. Double-click `pull-about.bat`
2. The script will automatically fetch the latest `about.md` content and update `about.html`

### Option 2: Using PowerShell Directly
```powershell
# Basic usage
.\pull-about.ps1

# Preview changes without updating the file
.\pull-about.ps1 -DryRun

# Use a different source URL
.\pull-about.ps1 -SourceUrl "https://example.com/about.md"

# Use a different output file
.\pull-about.ps1 -OutputFile "about-new.html"
```

### Option 3: Manual Update
1. Edit `about.md` with your changes
2. Run the pull script to update `about.html`
3. The script will automatically convert markdown to HTML and maintain the page structure

## Markdown Support

The script supports basic markdown formatting:
- `# Heading` → `<h1>Heading</h1>`
- `## Subheading` → `<h2>Subheading</h2>`
- `**bold text**` → `<strong>bold text</strong>`
- `[link text](url)` → `<a href="url">link text</a>`
- `- list item` → `<li>list item</li>`
- Regular paragraphs are automatically wrapped in `<p>` tags

## Benefits

- **Quick Updates**: Update content without full repository operations
- **Version Control**: Keep `about.md` in version control for content history
- **Separation of Concerns**: Content (markdown) separate from presentation (HTML)
- **Easy Editing**: Markdown is easier to write and edit than HTML
- **Consistent Structure**: The script maintains the same HTML structure every time

## Workflow

1. Edit `about.md` with your content changes
2. Run `pull-about.bat` or `.\pull-about.ps1`
3. Preview the changes (optional: use `-DryRun` flag)
4. The `about.html` file is automatically updated
5. Deploy the updated `about.html` file

## Troubleshooting

- **PowerShell Execution Policy**: If you get execution policy errors, run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **Network Issues**: Check your internet connection if the script can't fetch the markdown content
- **File Permissions**: Ensure you have write permissions in the directory

## Notes

- The script preserves the HTML structure, header, footer, and styling
- Only the content within the `<div class="about-content">` is updated
- The script includes proper error handling and colored output for better visibility
