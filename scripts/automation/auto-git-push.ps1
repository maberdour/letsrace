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

try {
    # Read about.md and convert to HTML
    Write-Host "Reading content/about.md..." -ForegroundColor Cyan
    $aboutMd = Get-Content -Path "../../content/about.md" -Raw -Encoding UTF8
    $aboutHtml = Convert-MarkdownToHtml -markdown $aboutMd

    # Read template and replace content placeholder
    Write-Host "Reading template and generating HTML..." -ForegroundColor Cyan
    $template = Get-Content -Path "../../assets/templates/template-about.html" -Raw -Encoding UTF8
    $htmlDocument = $template -replace '\{\{CONTENT\}\}', $aboutHtml

    # Write the HTML file with UTF-8 encoding
    Write-Host "Writing pages/about.html..." -ForegroundColor Cyan
    $htmlDocument | Out-File -FilePath "../../pages/about.html" -Encoding UTF8

    Write-Host "Updated pages/about.html from content/about.md" -ForegroundColor Green
} catch {
    Write-Host "Error updating about.html: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

try {
    # Change to repository root for git operations
    Write-Host "Changing to repository root..." -ForegroundColor Cyan
    Set-Location -Path "../../"
    
    # Stage all changes
    Write-Host "Staging all changes..." -ForegroundColor Cyan
    git add .
    
    # Commit with a timestamped message
    $commitMessage = "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host "Committing changes..." -ForegroundColor Cyan
    git commit -m "$commitMessage"
    
    # Push to the current branch
    Write-Host "Pushing to remote repository..." -ForegroundColor Cyan
    git push
    
    Write-Host "Git push completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error during git operations: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}