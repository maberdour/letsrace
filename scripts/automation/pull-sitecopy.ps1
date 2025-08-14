# Pull Site Copy Script
# This script fetches SiteCopy.md content and updates HTML pages

param(
    [string]$SourceUrl = "https://raw.githubusercontent.com/maberdour/letsrace/main/content/SiteCopy.md",
    [string]$Section = "",
    [switch]$DryRun,
    [switch]$AllSections
)

Write-Host "=== Site Copy Pull Script ===" -ForegroundColor Green
Write-Host "Source: $SourceUrl" -ForegroundColor Yellow

# Function to discover all H1 sections in markdown content
function Get-AllSections {
    param([string]$Markdown)
    
    $sections = @()
    $lines = $Markdown -split "`n"
    
    foreach ($line in $lines) {
        $line = $line.Trim()
        if ($line -match "^#\s*([^#].+)$") {
            $sectionName = $matches[1].Trim()
            $sections += $sectionName
        }
    }
    
    Write-Output $sections
}

# Function to map section names to HTML file paths
function Get-HtmlFilePath {
    param([string]$SectionName)
    
    # Special cases
    $mapping = @{
        "Homepage" = "../../index.html"
        "About" = "../../pages/about.html"
        "Road" = "../../pages/road.html"
        "Track" = "../../pages/track.html"
        "MTB" = "../../pages/mtb.html"
        "BMX" = "../../pages/bmx.html"
        "Cyclo-Cross" = "../../pages/cyclo-cross.html"
        "Time Trial" = "../../pages/time-trial.html"
        "Hill Climb" = "../../pages/hill-climb.html"
        "Speedway" = "../../pages/speedway.html"
    }
    
    if ($mapping.ContainsKey($SectionName)) {
        return $mapping[$SectionName]
    }
    
    # Default mapping for new sections
    $filename = $SectionName -replace " ", "-"
    $filename = $filename.ToLower()
    return "../../pages/$filename.html"
}

# Function to extract content from a specific H1 section
function Extract-SectionContent {
    param([string]$Markdown, [string]$SectionName)
    
    $lines = $Markdown -split "`n"
    $inTargetSection = $false
    $sectionContent = ""
    $pageTitle = ""
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i].Trim()
        
        # Check if this is the start of our target section
        if ($line -match "^#\s*$SectionName\s*$") {
            $inTargetSection = $true
            $pageTitle = $SectionName
            continue
        }
        
        # Check if we've hit another H1 section (end of current section)
        if ($inTargetSection -and $line -match "^#\s*[A-Z][a-z]") {
            $inTargetSection = $false
            break
        }
        
        # If we're in the target section, collect content
        if ($inTargetSection -and -not [string]::IsNullOrWhiteSpace($line)) {
            $sectionContent += $line + "`n"
        }
    }
    
    return @{
        Title = $pageTitle
        Content = $sectionContent.Trim()
    }
}

# Function to convert markdown content to HTML
function Convert-MarkdownToHtml {
    param([string]$Markdown)
    
    $lines = $Markdown -split "`n"
    $htmlLines = @()
    $inList = $false
    
    foreach ($line in $lines) {
        $line = $line.Trim()
        
        if ([string]::IsNullOrWhiteSpace($line)) {
            if ($inList) {
                $htmlLines += "</ul>"
                $inList = $false
            }
            continue
        }
        
        # Handle H2 headers
        if ($line -match '^## (.+)$') {
            if ($inList) {
                $htmlLines += "</ul>"
                $inList = $false
            }
            $htmlLines += "<h2>$($matches[1])</h2>"
            continue
        }
        
        # Handle list items
        if ($line -match '^- (.+)$') {
            if (-not $inList) {
                $htmlLines += "<ul>"
                $inList = $true
            }
            $htmlLines += "<li>$($matches[1])</li>"
            continue
        }
        
        # Handle links
        $line = $line -replace '\[(.+?)\]\((.+?)\)', '<a href="$2">$1</a>'
        
        # Handle bold text
        $line = $line -replace '\*\*(.+?)\*\*', '<strong>$1</strong>'
        
        # Handle regular paragraphs
        if ($inList) {
            $htmlLines += "</ul>"
            $inList = $false
        }
        $htmlLines += "<p>$line</p>"
    }
    
    # Close any open list
    if ($inList) {
        $htmlLines += "</ul>"
    }
    
    return $htmlLines -join "`n"
}

# Function to create HTML page
function Create-HtmlPage {
    param([string]$Title, [string]$Content)
    
    return @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>$Title - LetsRace.cc</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Find youth cycling events across the UK – including road races, BMX, cyclo-cross, MTB, and more. LetsRace.cc makes it easy to discover, share, and support grassroots bike racing." />
  <link rel="stylesheet" href="../assets/css/styles.css" />
</head>
<body>
  <header style="background:#0077cc;color:white;padding:1rem;text-align:center;">
    <h1 style="margin:0;font-size:2rem;font-weight:700;letter-spacing:0.5px;font-family:'Courier New',monospace;"><a href="../index.html" style="color:white;text-decoration:none;">letsrace.cc</a></h1>
    <nav style="margin-top:1rem;">
      <a href="../index.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Home</a>
      <a href="road.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Road</a>
      <a href="track.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Track</a>
      <a href="mtb.html" style="color:white;margin:0 0.5rem;text-decoration:none;">MTB</a>
      <a href="bmx.html" style="color:white;margin:0 0.5rem;text-decoration:none;">BMX</a>
      <a href="cyclo-cross.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Cyclo-Cross</a>
      <a href="time-trial.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Time Trial</a>
      <a href="hill-climb.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Hill Climb</a>
      <a href="speedway.html" style="color:white;margin:0 0.5rem;text-decoration:none;">Speedway</a>
      <a href="about.html" style="color:white;margin:0 0.5rem;text-decoration:none;font-weight:bold;">About</a>
    </nav>
  </header>
  
  <div class="about-content">
    <h1>$Title</h1>
$Content
  </div>

  <footer>
    <p>&copy; 2025 LetsRace.cc | <a href="about.html">About</a> | <a href="mailto:hello@letsrace.cc">Contact</a></p>
  </footer>
</body>
</html>
"@
}

try {
    # Fetch markdown content
    Write-Host "Fetching markdown content..." -ForegroundColor Cyan
    $response = Invoke-WebRequest -Uri $SourceUrl -UseBasicParsing -TimeoutSec 30
    $markdownContent = $response.Content
    
    Write-Host "Markdown content fetched successfully" -ForegroundColor Green
    Write-Host "Content length: $($markdownContent.Length) characters" -ForegroundColor Gray
    
    if ($AllSections) {
        # Process all sections
        Write-Host "Discovering all sections..." -ForegroundColor Cyan
        $allSections = Get-AllSections -Markdown $markdownContent
        
        Write-Host "Found sections: $($allSections -join ', ')" -ForegroundColor Green
        
        foreach ($section in $allSections) {
            Write-Host "`n--- Processing $section ---" -ForegroundColor Magenta
            
            $outputFile = Get-HtmlFilePath -SectionName $section
            Write-Host "Output file: $outputFile" -ForegroundColor Cyan
            
            # Extract section content
            $sectionData = Extract-SectionContent -Markdown $markdownContent -SectionName $section
            
            if ([string]::IsNullOrWhiteSpace($sectionData.Title)) {
                Write-Host "Warning: Section '$section' not found" -ForegroundColor Yellow
                continue
            }
            
            Write-Host "Found section: $($sectionData.Title)" -ForegroundColor Green
            
            # Convert to HTML
            $htmlContent = Convert-MarkdownToHtml -Markdown $sectionData.Content
            
            if ($DryRun) {
                Write-Host "=== DRY RUN - Content Preview for $section ===" -ForegroundColor Yellow
                Write-Host $htmlContent -ForegroundColor White
                Write-Host "=== End Preview ===" -ForegroundColor Yellow
            } else {
                # Create full HTML page
                $fullHtml = Create-HtmlPage -Title $sectionData.Title -Content $htmlContent
                
                # Write to file
                Write-Host "Writing to $outputFile..." -ForegroundColor Cyan
                $fullHtml | Out-File -FilePath $outputFile -Encoding UTF8 -NoNewline
                Write-Host "Successfully updated $outputFile" -ForegroundColor Green
                
                # Show file info
                $fileInfo = Get-Item $outputFile
                Write-Host "File size: $($fileInfo.Length) bytes" -ForegroundColor Gray
            }
        }
        
        Write-Host "`n=== All sections processed ===" -ForegroundColor Green
        
    } elseif ($Section -ne "") {
        # Process single section
        Write-Host "Section: $Section" -ForegroundColor Yellow
        
        $outputFile = Get-HtmlFilePath -SectionName $Section
        Write-Host "Output file: $outputFile" -ForegroundColor Cyan
        
        # Extract section content
        $sectionData = Extract-SectionContent -Markdown $markdownContent -SectionName $Section
        
        if ([string]::IsNullOrWhiteSpace($sectionData.Title)) {
            Write-Host "Error: Section '$Section' not found in the markdown content" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Found section: $($sectionData.Title)" -ForegroundColor Green
        
        # Convert to HTML
        $htmlContent = Convert-MarkdownToHtml -Markdown $sectionData.Content
        
        if ($DryRun) {
            Write-Host "=== DRY RUN - Content Preview for $Section ===" -ForegroundColor Yellow
            Write-Host $htmlContent -ForegroundColor White
            Write-Host "=== End Preview ===" -ForegroundColor Yellow
        } else {
            # Create full HTML page
            $fullHtml = Create-HtmlPage -Title $sectionData.Title -Content $htmlContent
            
            # Write to file
            Write-Host "Writing to $outputFile..." -ForegroundColor Cyan
            $fullHtml | Out-File -FilePath $outputFile -Encoding UTF8 -NoNewline
            Write-Host "Successfully updated $outputFile" -ForegroundColor Green
            
            # Show file info
            $fileInfo = Get-Item $outputFile
            Write-Host "File size: $($fileInfo.Length) bytes" -ForegroundColor Gray
        }
        
    } else {
        Write-Host "Error: Please specify either -Section 'SectionName' or -AllSections" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "=== Script completed ===" -ForegroundColor Green
