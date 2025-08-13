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

# Read template and replace content placeholder
$template = Get-Content -Path "template-about.html" -Raw -Encoding UTF8
$htmlDocument = $template -replace '\{\{CONTENT\}\}', $aboutHtml

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