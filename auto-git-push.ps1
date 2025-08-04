# Function to convert markdown to HTML
function Convert-MarkdownToHtml {
    param (
        [string]$markdown
    )
    
    # Replace headers
    $html = $markdown -replace '^# (.*?)$', '<h1>$1</h1>' `
                      -replace '^## (.*?)$', '<h2>$1</h2>' `
                      -replace '^### (.*?)$', '<h3>$3</h3>'
    
    # Replace bold text
    $html = $html -replace '\*\*(.*?)\*\*', '<strong>$1</strong>'
    
    # Replace links
    $html = $html -replace '\[(.*?)\]\((.*?)\)', '<a href="$2">$1</a>'
    
    # Replace horizontal rules
    $html = $html -replace '^---$', '<hr>'
    
    # Replace bullet points
    $html = $html -replace '^\- (.*?)$', '<li>$1</li>'
    
    # Wrap lists in ul tags
    $html = $html -replace '(?ms)(<li>.*?</li>(\r?\n)*)+', '<ul>$0</ul>'
    
    # Replace paragraphs (lines with content)
    $html = $html -replace '(?m)^(?!<[uh][lr1-6>]|<li>|<p>).+', '<p>$0</p>'
    
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
  <div id="content">Loading...</div>

  <script src="render.js"></script>
  <script>
    renderHeader("About");
    document.getElementById("content").innerHTML = `
      <div class="about-content">
        $aboutHtml
      </div>
    `;
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