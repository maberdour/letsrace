<#
Usage:
  Run from repo root or any subfolder in PowerShell:
    pwsh -File scripts/automation/update-content.ps1

Description:
  Updates site HTML by injecting content from markdown files in /content.
  Currently supported:
    - content/page-introductions.md -> updates <p class="intro-text"> in pages/{type}/index.html
    - content/FAQ.md -> updates <div id="faq-list">...</div> in pages/faq.html
    - content/recent-changes.md -> updates content in pages/recent-changes.html

Notes:
  - No external modules required. Pure PowerShell.
  - Makes in-place edits, UTF-8 encoded.
  - Skips files that are missing without erroring the whole run.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
    param([string]$Start = (Get-Location).Path)
    $dir = Resolve-Path $Start
    while ($dir) {
        if (Test-Path (Join-Path $dir '.git')) { return $dir }
        $parent = Split-Path $dir -Parent
        if (-not $parent -or $parent -eq $dir) { break }
        $dir = $parent
    }
    return (Get-Location).Path
}

$RepoRoot = Resolve-RepoRoot
Write-Host "Repo root: $RepoRoot"

function Get-FileUtf8 {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Set-FileUtf8 {
    param([string]$Path, [string]$Content)
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Content, (New-Object System.Text.UTF8Encoding($false)))
}

function To-KebabCase {
    param([string]$s)
    if (-not $s) { return $s }
    return ($s.ToLower() -replace '\s+', '-')
}

function Escape-Html {
    param([string]$s)
    if ($null -eq $s) { return '' }
    $s = $s -replace '&','&amp;'
    $s = $s -replace '<','&lt;'
    $s = $s -replace '>','&gt;'
    $s = $s -replace '"','&quot;'
    $s = $s -replace "'",'&#39;'
    return $s
}

function Parse-IntroductionsMd {
    param([string]$md)
    $map = @{}
    $current = $null
    $buffer = New-Object System.Collections.Generic.List[string]
    foreach ($line in ($md -split "`r?`n")) {
        $h1 = [regex]::Match($line, '^#\s+(.+)$')
        if ($h1.Success) {
            if ($current -and $buffer.Count -gt 0) {
                $text = ($buffer -join ' ').Trim() -replace '\s+',' '
                if ($text) { $map[$current] = $text }
            }
            $buffer.Clear()
            $heading = $h1.Groups[1].Value.Trim()
            switch -Regex ($heading.ToLower()) {
                '^cyclo[- ]?cross$' { $current = 'Cyclo Cross'; continue }
                '^hill[- ]?climb$' { $current = 'Hill Climb'; continue }
                default { $current = $heading }
            }
            continue
        }
        if ($current) { $buffer.Add($line) }
    }
    if ($current -and $buffer.Count -gt 0) {
        $text = ($buffer -join ' ').Trim() -replace '\s+',' '
        if ($text) { $map[$current] = $text }
    }
    return $map
}

function Update-IntroTextFromMd {
    $mdPath = Join-Path $RepoRoot 'content/page-introductions.md'
    $md = Get-FileUtf8 $mdPath
    if (-not $md) { Write-Host "[intros] Skipped: $mdPath not found"; return }
    $map = Parse-IntroductionsMd -md $md
    if ($map.Keys.Count -eq 0) { Write-Host "[intros] Skipped: no headings parsed"; return }

    $canonical = @('Road','Track','BMX','MTB','Cyclo Cross','Speedway','Time Trial','Hill Climb')
    foreach ($type in $canonical) {
        if (-not $map.ContainsKey($type)) { continue }
        $kebab = To-KebabCase $type
        $pagePath = Join-Path $RepoRoot ("pages/$kebab/index.html")
        $html = Get-FileUtf8 $pagePath
        if (-not $html) { Write-Host "[intros] Missing page: pages/$kebab/index.html"; continue }
        $escaped = Escape-Html $map[$type]
        $pattern = '<p\s+class="intro-text"\s*>[\s\S]*?<\/p>'
        $replacement = @"
<p class="intro-text">$escaped</p>
"@
        $updated = [regex]::Replace($html, $pattern, $replacement, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($updated -ne $html) {
            Set-FileUtf8 -Path $pagePath -Content $updated
            Write-Host "[intros] Updated: pages/$kebab/index.html"
        } else {
            Write-Host "[intros] No change: pages/$kebab/index.html"
        }
    }
}

function Parse-FaqMd {
    param([string]$md)
    $items = New-Object System.Collections.Generic.List[object]
    $cur = @{ id=$null; q=''; a='' }
    foreach ($line in ($md -split "`r?`n")) {
        if ($line -match '^\s*ID:\s*(\d+)\s*$') {
            if ($cur.id -ne $null -and $cur.q -and $cur.a) { [void]$items.Add(@{ id=$cur.id; q=$cur.q.Trim(); a=$cur.a.Trim() }) }
            $cur = @{ id=[int]$matches[1]; q=''; a='' }
            continue
        }
        if ($line -match '^\s*Q:\s*(.+)$') { $cur.q = $matches[1]; continue }
        if ($line -match '^\s*A:\s*(.+)$') { $cur.a = $matches[1]; continue }
        if ($cur.a -and ($line -notmatch '^(ID:|Q:|A:)')) { $cur.a += "`n$line" }
    }
    if ($cur.id -ne $null -and $cur.q -and $cur.a) { [void]$items.Add(@{ id=$cur.id; q=$cur.q.Trim(); a=$cur.a.Trim() }) }
    return ,$items
}

function Update-FaqFromMd {
    $mdPath = Join-Path $RepoRoot 'content/FAQ.md'
    $md = Get-FileUtf8 $mdPath
    if (-not $md) { Write-Host "[faq] Skipped: $mdPath not found"; return }
    $items = Parse-FaqMd -md $md
    if (-not $items -or $items.Count -eq 0) { Write-Host "[faq] Skipped: no items parsed"; return }

    $pagePath = Join-Path $RepoRoot 'pages/faq.html'
    $html = Get-FileUtf8 $pagePath
    if (-not $html) { Write-Host "[faq] Missing page: pages/faq.html"; return }

    $itemsHtml = ($items | ForEach-Object {
        $id = [string]$_.id
        $qId = "faq-question-$id"
        $aId = "faq-answer-$id"
        $q = Escape-Html $_.q
        $a = Escape-Html $_.a
@"
<div class="faq-item" data-id="$id">
  <h2 class="faq-question" id="$qId" role="button" tabindex="0" aria-expanded="false" aria-controls="$aId">$q</h2>
  <div class="faq-answer" id="$aId" role="region" aria-labelledby="$qId" hidden>$a</div>
</div>
"@
    }) -join "`n`n"

    if ($html -match '<!--\s*FAQ_START\s*-->' -and $html -match '<!--\s*FAQ_END\s*-->') {
        $updated = [regex]::Replace(
            $html,
            '(<!--\s*FAQ_START\s*-->)([\s\S]*?)(<!--\s*FAQ_END\s*-->)',
            "`$1`n$itemsHtml`n`$3",
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
    }
    else {
        Write-Host "[faq] Markers not found in pages/faq.html (<!-- FAQ_START --> ... <!-- FAQ_END -->). Skipping update to avoid duplication."
        $updated = $html
    }
    if ($updated -ne $html) {
        Set-FileUtf8 -Path $pagePath -Content $updated
        Write-Host "[faq] Updated: pages/faq.html"
    } else {
        Write-Host "[faq] No change: pages/faq.html"
    }
}

function Process-InlineMarkdown {
    param([string]$text)
    $text = [regex]::Replace($text, '\*\*(.+?)\*\*', '<strong>$1</strong>')
    $text = [regex]::Replace($text, '\[(.+?)\]\((.+?)\)', '<a href="$2">$1</a>')
    return $text
}

function Convert-MarkdownToHtml {
    param([string]$md)
    if (-not $md) { return '' }

    $lines = $md -split "`r?`n"
    $output = New-Object System.Collections.Generic.List[string]
    $inList = $false
    $currentParagraph = New-Object System.Collections.Generic.List[string]

    foreach ($rawLine in $lines) {
        $line = $rawLine.Trim()

        if (-not $line) {
            if ($currentParagraph.Count -gt 0) {
                $paraText = ($currentParagraph -join ' ').Trim()
                if ($paraText) { [void]$output.Add("<p>$paraText</p>") }
                $currentParagraph.Clear()
            }
            if ($inList) {
                [void]$output.Add('</ul>')
                $inList = $false
            }
            continue
        }

        if ($line -match '^#\s+(.+)$') {
            if ($currentParagraph.Count -gt 0) {
                $paraText = ($currentParagraph -join ' ').Trim()
                if ($paraText) { [void]$output.Add("<p>$paraText</p>") }
                $currentParagraph.Clear()
            }
            if ($inList) {
                [void]$output.Add('</ul>')
                $inList = $false
            }
            [void]$output.Add("<h1>$($matches[1])</h1>")
            continue
        }

        if ($line -match '^##\s+(.+)$') {
            if ($currentParagraph.Count -gt 0) {
                $paraText = ($currentParagraph -join ' ').Trim()
                if ($paraText) { [void]$output.Add("<p>$paraText</p>") }
                $currentParagraph.Clear()
            }
            if ($inList) {
                [void]$output.Add('</ul>')
                $inList = $false
            }
            [void]$output.Add("<h2>$($matches[1])</h2>")
            continue
        }

        if ($line -match '^-\s+(.+)$') {
            if ($currentParagraph.Count -gt 0) {
                $paraText = ($currentParagraph -join ' ').Trim()
                if ($paraText) { [void]$output.Add("<p>$paraText</p>") }
                $currentParagraph.Clear()
            }
            if (-not $inList) {
                [void]$output.Add('<ul>')
                $inList = $true
            }
            [void]$output.Add("  <li>$($matches[1])</li>")
            continue
        }

        [void]$currentParagraph.Add($line)
    }

    if ($currentParagraph.Count -gt 0) {
        $paraText = ($currentParagraph -join ' ').Trim()
        if ($paraText) { [void]$output.Add("<p>$paraText</p>") }
    }
    if ($inList) {
        [void]$output.Add('</ul>')
    }

    $html = ($output -join "`n      `n      ").Trim()
    $html = Process-InlineMarkdown $html
    $html = [regex]::Replace($html, "`n{3,}", "`n`n")
    return $html.Trim()
}

function Replace-GeneralContentInHtml {
    param(
        [string]$html,
        [string]$h1Text,
        [string]$newContent
    )
    if (-not $html -or -not $newContent) { return $html }

    $contentToInsert = [regex]::Replace($newContent, '<h1>.*?</h1>\s*', '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Trim()
    $escapedH1 = [regex]::Escape($h1Text)
    $pattern = "(<div\s+class=[`"']general-content[`"']>\s*<h1>$escapedH1</h1>)\s*([\s\S]*?)(\s*</div>)"

    if ($html -match $pattern) {
        return [regex]::Replace(
            $html,
            $pattern,
            "`$1`n      `n      $contentToInsert`n    `$3",
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
    }

    return $html
}

function Update-RecentChangesFromMd {
    $mdPath = Join-Path $RepoRoot 'content/recent-changes.md'
    $md = Get-FileUtf8 $mdPath
    if (-not $md) { Write-Host "[recent-changes] Skipped: $mdPath not found"; return }

    $htmlContent = Convert-MarkdownToHtml -md $md
    if (-not $htmlContent) { Write-Host "[recent-changes] Skipped: no content parsed"; return }

    $pagePath = Join-Path $RepoRoot 'pages/recent-changes.html'
    $html = Get-FileUtf8 $pagePath
    if (-not $html) { Write-Host "[recent-changes] Missing page: pages/recent-changes.html"; return }

    $updated = Replace-GeneralContentInHtml -html $html -h1Text 'Recent Changes' -newContent $htmlContent
    if ($updated -ne $html) {
        Set-FileUtf8 -Path $pagePath -Content $updated
        Write-Host "[recent-changes] Updated: pages/recent-changes.html"
    } else {
        Write-Host "[recent-changes] No change: pages/recent-changes.html"
    }
}

try {
    Update-IntroTextFromMd
    Update-FaqFromMd
    Update-RecentChangesFromMd
    Write-Host "Content update complete."
} catch {
    Write-Error $_
    exit 1
}

