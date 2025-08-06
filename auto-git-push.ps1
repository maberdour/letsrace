# Function to convert markdown to HTML
function Convert-MarkdownToHtml {
    param (
        [string]$markdown
    )
    
    # Split content into lines for better processing
    $lines = $markdown -split "`n"
    $html = ""
    $inList = $false
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i].Trim()
        
        # Skip empty lines
        if ([string]::IsNullOrWhiteSpace($line)) {
            if (-not $inList) {
                $html += "`n"
            }
            continue
        }
        
        # Process headers
        if ($line -match '^# (.+)$') {
            if ($inList) {
                $html += "</ul>`n"
                $inList = $false
            }
            $html += "<h1>$($matches[1])</h1>`n"
            continue
        }
        if ($line -match '^## (.+)$') {
            if ($inList) {
                $html += "</ul>`n"
                $inList = $false
            }
            $html += "<h2>$($matches[1])</h2>`n"
            continue
        }
        
        # Process horizontal rules
        if ($line -eq '---') {
            $html += "<hr>`n"
            continue
        }
        
        # Process list items
        if ($line -match '^\- (.+)$') {
            if (-not $inList) {
                $html += "<ul>`n"
                $inList = $true
            }
            $content = $matches[1]
            # Process bold text within list items
            $content = $content -replace '\*\*(.*?)\*\*', '<strong>$1</strong>'
            $html += "  <li>$content</li>`n"
            continue
        } elseif ($inList) {
            $html += "</ul>`n"
            $inList = $false
        }
        
        # Process links
        $line = $line -replace '\[(.*?)\]\((.*?)\)', '<a href="$2">$1</a>'
        
        # Process bold text
        $line = $line -replace '\*\*(.*?)\*\*', '<strong>$1</strong>'
        
        # Process regular paragraphs
        if (-not [string]::IsNullOrWhiteSpace($line)) {
            $html += "<p>$line</p>`n"
        }
    }
    
    # Close any open list
    if ($inList) {
        $html += "</ul>`n"
    }
    
    return $html
}

# Read about.md and convert to HTML
$aboutMd = Get-Content -Path "about.md" -Raw -Encoding UTF8
$aboutHtml = Convert-MarkdownToHtml -markdown $aboutMd

# Create the complete HTML document
$htmlDocument = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>About LetsRace.cc</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="styles.css" />
  <style>
    .about-content {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }
    .about-content h1 {
      font-size: 2rem;
      margin-bottom: 1.5rem;
    }
    .about-content h2 {
      font-size: 1.5rem;
      margin: 2rem 0 1rem;
      color: #000;
    }
    .about-content p {
      margin: 1rem 0;
      line-height: 1.6;
      color: #000;
    }
    .about-content ul {
      margin: 1rem 0;
      padding-left: 2rem;
    }
    .about-content li {
      margin: 0.5rem 0;
      line-height: 1.6;
      color: #000;
    }
    .about-content hr {
      margin: 2rem 0;
      border: none;
      border-top: 1px solid #eee;
    }
    .about-content strong {
      color: #000;
    }
    .about-content a {
      color: #0077cc;
      text-decoration: none;
    }
    .about-content a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="about-content">
    $aboutHtml
  </div>

  <script src="render.js?v=1"></script>
  <script>
    renderHeader("About");
    renderFooter();
  </script>
</body>
</html>
"@

# Write the HTML file with UTF-8 encoding
$htmlDocument | Out-File -FilePath "about.html" -Encoding UTF8

Write-Host "Updated about.html from about.md"

# Stage all changes
git add .

# Commit with a timestamped message
$commitMessage = "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git commit -m "$commitMessage"

# Push to the current branch
git push