# Pull About Content Script
# This script fetches about.md content and updates about.html without full repo push

param(
    [string]$SourceUrl = "https://raw.githubusercontent.com/maberdour/maberdour.github.io/main/content/about.md",
    [string]$OutputFile = "../pages/about.html",
    [switch]$DryRun
)

Write-Host "=== About Content Pull Script ===" -ForegroundColor Green
Write-Host "Source: $SourceUrl" -ForegroundColor Yellow
Write-Host "Output: $OutputFile" -ForegroundColor Yellow

# Function to convert markdown to HTML
function Convert-MarkdownToHtml {
    param([string]$Markdown)
    
    # Convert markdown to HTML
    $html = $Markdown -replace '^# (.+)$', '<h1>$1</h1>'
    $html = $html -replace '^## (.+)$', '<h2>$1</h2>'
    $html = $html -replace '\*\*(.+?)\*\*', '<strong>$1</strong>'
    $html = $html -replace '\[(.+?)\]\((.+?)\)', '<a href="$2">$1</a>'
    $html = $html -replace '^- (.+)$', '<li>$1</li>'
    
    # Handle paragraphs
    $html = $html -replace '^([^<].+)$', '<p>$1</p>'
    
    # Wrap lists
    $html = $html -replace '(<li>.+</li>)', '<ul>$1</ul>'
    
    # Clean up multiple consecutive <p> tags
    $html = $html -replace '</p>\s*<p>', '</p><p>'
    
    # Remove empty paragraphs
    $html = $html -replace '<p></p>', ''
    
    return $html
}

try {
    # Fetch markdown content
    Write-Host "Fetching markdown content..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $SourceUrl -UseBasicParsing
    $markdownContent = $response.Content
    
    Write-Host "Markdown content fetched successfully" -ForegroundColor Green
    
    # Convert to HTML
    Write-Host "Converting markdown to HTML..." -ForegroundColor Cyan
    $htmlContent = Convert-MarkdownToHtml -Markdown $markdownContent
    
    # Create the full HTML page
    $fullHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>About LetsRace.cc</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Find youth cycling events across the UK – including road races, BMX, cyclo-cross, MTB, and more. LetsRace.cc makes it easy to discover, share, and support grassroots bike racing." />
  <link rel="stylesheet" href="../assets/css/styles.css" />
  <script data-goatcounter="https://letsrace.goatcounter.com/count" 
async src="//gc.zgo.at/count.js"></script>
</head>
<body>
  <div class="about-content">
$htmlContent
  </div>

  <script src="../assets/js/render.js?v=1"></script>
  <script>
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    renderHeader("About");
    renderFooter();
  </script>
</body>
</html>
"@

    if ($DryRun) {
        Write-Host "=== DRY RUN - Content Preview ===" -ForegroundColor Yellow
        Write-Host $htmlContent -ForegroundColor White
        Write-Host "=== End Preview ===" -ForegroundColor Yellow
    } else {
        # Write to file
        Write-Host "Writing to $OutputFile..." -ForegroundColor Cyan
        $fullHtml | Out-File -FilePath $OutputFile -Encoding UTF8
        Write-Host "Successfully updated $OutputFile" -ForegroundColor Green
        
        # Show file info
        $fileInfo = Get-Item $OutputFile
        Write-Host "File size: $($fileInfo.Length) bytes" -ForegroundColor Gray
        Write-Host "Last modified: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "=== Script completed ===" -ForegroundColor Green
