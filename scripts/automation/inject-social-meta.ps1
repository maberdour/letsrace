<#
Usage:
  pwsh -File scripts/automation/inject-social-meta.ps1

Injects or updates Open Graph and Twitter Card meta tags on public HTML pages.
Uses Favicon-180.png (same flag as apple-touch-icon) for og:image / twitter:image.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SiteUrl = 'https://letsrace.cc'
$OgImage = "$SiteUrl/Favicon-180.png"

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

function Get-CanonicalUrl {
    param([string]$RepoRoot, [string]$FilePath)
    $relative = $FilePath.Substring($RepoRoot.Length).TrimStart('\', '/').Replace('\', '/')
    if ($relative -eq 'index.html') { return "$SiteUrl/" }
    if ($relative -match '/index\.html$') {
        $dir = $relative -replace '/index\.html$', '/'
        return "$SiteUrl/$dir"
    }
    return "$SiteUrl/$relative"
}

function Escape-HtmlAttribute {
    param([string]$Value)
    if ($null -eq $Value) { return '' }
    return ($Value -replace '&', '&amp;' -replace '"', '&quot;')
}

function Build-SocialMetaBlock {
    param(
        [string]$Title,
        [string]$Description,
        [string]$Url
    )
    $t = Escape-HtmlAttribute $Title
    $d = Escape-HtmlAttribute $Description
    $u = Escape-HtmlAttribute $Url
    return @"
  <!-- Open Graph / social sharing -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="LetsRace.cc">
  <meta property="og:title" content="$t">
  <meta property="og:description" content="$d">
  <meta property="og:image" content="$OgImage">
  <meta property="og:image:width" content="180">
  <meta property="og:image:height" content="180">
  <meta property="og:url" content="$u">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="$t">
  <meta name="twitter:description" content="$d">
  <meta name="twitter:image" content="$OgImage">
"@
}

function Update-PageSocialMeta {
    param([string]$FilePath, [string]$RepoRoot)

    $content = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
    if ($content -notmatch '<title>([^<]+)</title>') {
        Write-Warning "Skipping (no title): $FilePath"
        return
    }
    $title = $Matches[1].Trim()

    $description = ''
    if ($content -match '<meta\s+name="description"\s+content="([^"]*)"') {
        $description = $Matches[1]
    } elseif ($content -match "<meta\s+name=`"description`"\s+content='([^']*)'") {
        $description = $Matches[1]
    } else {
        Write-Warning "Skipping (no description): $FilePath"
        return
    }

    $url = Get-CanonicalUrl -RepoRoot $RepoRoot -FilePath $FilePath
    $block = Build-SocialMetaBlock -Title $title -Description $description -Url $url

    if ($content -match '<!-- Open Graph / social sharing -->') {
        $content = [regex]::Replace(
            $content,
            '\s*<!-- Open Graph / social sharing -->.*?(?=\r?\n(?:  )?<(?:meta|link|style|script|title|!--))',
            "`n$block",
            [System.Text.RegularExpressions.RegexOptions]::Singleline
        )
        if ($content -notmatch '<!-- Open Graph / social sharing -->') {
            $content = [regex]::Replace(
                $content,
                '(?s)\s*<!-- Open Graph / social sharing -->.*?</head>',
                "`n$block`n</head>"
            )
        }
    } else {
        $headMatch = [regex]::Match($content, '(?s)<head>(.*?)</head>')
        if (-not $headMatch.Success) {
            Write-Warning "Skipping (no head): $FilePath"
            return
        }
        $head = $headMatch.Groups[1].Value
        $descMatch = [regex]::Match($head, '<meta\s+name="description"\s+content="[^"]*"\s*/?>')
        if (-not $descMatch.Success) {
            Write-Warning "Skipping (no description in head): $FilePath"
            return
        }
        $updatedHead = $head.Insert($descMatch.Index + $descMatch.Length, "`n$block")
        $content = $content.Replace($headMatch.Groups[1].Value, $updatedHead)
    }

    [System.IO.File]::WriteAllText($FilePath, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Updated: $FilePath"
}

$RepoRoot = Resolve-RepoRoot
$htmlFiles = @(
    (Join-Path $RepoRoot 'index.html')
) + @(
    Get-ChildItem -Path (Join-Path $RepoRoot 'pages') -Filter '*.html' -Recurse |
        Where-Object { $_.FullName -notmatch '\\test\.html$' } |
        ForEach-Object { $_.FullName }
)

foreach ($file in $htmlFiles) {
    if (Test-Path $file) {
        Update-PageSocialMeta -FilePath $file -RepoRoot $RepoRoot
    }
}

Write-Host "Done. Social meta injected on $($htmlFiles.Count) pages."
