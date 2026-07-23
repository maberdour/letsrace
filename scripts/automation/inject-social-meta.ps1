<#
Usage (optional local preview / seed — nightly build does this automatically):
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/automation/inject-social-meta.ps1

Reads content/page-metadata.md and updates <title>, meta description, Open Graph,
Twitter Card, canonical URL, and WebSite JSON-LD on public HTML pages.

Live site path: Google Apps Script dailyBuild() Step 11d (DailyBuildAndDeploy.gs)
applies the same markdown every night. You do not need to run this script manually.
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

function Escape-HtmlAttribute {
    param([string]$Value)
    if ($null -eq $Value) { return '' }
    return ($Value -replace '&', '&amp;' -replace '"', '&quot;')
}

function Parse-PageMetadataMarkdown {
    param([string]$Markdown)

    $defaults = @{}
    $pages = @{}
    $current = $null

    foreach ($line in ($Markdown -split "`r?`n")) {
        if ($line -match '^#\s+(.+)\s*$') {
            $name = $Matches[1].Trim()
            if ($name -match '(?i)^defaults$') {
                $current = 'defaults'
            } else {
                $current = $name
                if (-not $pages.ContainsKey($current)) {
                    $pages[$current] = @{}
                }
            }
            continue
        }
        if ($line -match '^([a-z_]+):\s*(.*)$') {
            $key = $Matches[1].ToLowerInvariant()
            $value = $Matches[2].Trim()
            if ($current -eq 'defaults') {
                $defaults[$key] = $value
            } elseif ($current) {
                $pages[$current][$key] = $value
            }
        }
    }

    return @{ Defaults = $defaults; Pages = $pages }
}

function Convert-PublicPathToRepoFile {
    param([string]$PublicPath)
    $p = $PublicPath.Trim()
    if ($p -eq '/') { return 'index.html' }
    if ($p.StartsWith('/')) { $p = $p.Substring(1) }
    if ($p.EndsWith('/')) { return ($p + 'index.html') }
    return $p
}

function Build-SocialMetaBlock {
    param(
        [string]$OgTitle,
        [string]$OgDescription,
        [string]$CanonicalUrl,
        [string]$OgImage,
        [string]$OgType,
        [string]$SiteName,
        [string]$TwitterCard,
        [string]$SiteUrl
    )

    $t = Escape-HtmlAttribute $OgTitle
    $d = Escape-HtmlAttribute $OgDescription
    $u = Escape-HtmlAttribute $CanonicalUrl
    $img = Escape-HtmlAttribute $OgImage
    $type = Escape-HtmlAttribute $OgType
    $name = Escape-HtmlAttribute $SiteName
    $card = Escape-HtmlAttribute $TwitterCard
    $jsonUrl = ($SiteUrl.TrimEnd('/') + '/')
    $json = @"
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "$($SiteName -replace '"','\"')",
    "url": "$jsonUrl"
  }
"@

    return @"
  <!-- Open Graph / social sharing -->
  <link rel="canonical" href="$u">
  <meta property="og:title" content="$t">
  <meta property="og:description" content="$d">
  <meta property="og:image" content="$img">
  <meta property="og:url" content="$u">
  <meta property="og:type" content="$type">
  <meta property="og:site_name" content="$name">
  <meta name="twitter:card" content="$card">
  <meta name="twitter:title" content="$t">
  <meta name="twitter:description" content="$d">
  <meta name="twitter:image" content="$img">
  <script type="application/ld+json">
$json
  </script>
  <!-- End social sharing meta -->
"@
}

function Remove-ExistingSocialMeta {
    param([string]$Content)

    $Content = [regex]::Replace(
        $Content,
        '(?s)\s*<!-- Open Graph / social sharing -->.*?<!-- End social sharing meta -->\s*',
        "`n"
    )
    $Content = [regex]::Replace(
        $Content,
        '(?s)\s*<!-- Open Graph / social sharing -->.*?<meta\s+name="twitter:image"[^>]*>\s*',
        "`n"
    )
    $Content = [regex]::Replace(
        $Content,
        '(?m)^\s*<meta\s+(?:property="og:[^"]+"|name="twitter:[^"]+")\s+content="[^"]*"\s*/?>\s*\r?\n',
        ''
    )
    $Content = [regex]::Replace(
        $Content,
        '(?m)^\s*<link\s+rel="canonical"\s+href="[^"]*"\s*/?>\s*\r?\n',
        ''
    )
    $Content = [regex]::Replace(
        $Content,
        '(?s)\s*<script\s+type="application/ld\+json">\s*\{\s*"@context":\s*"https://schema\.org"\s*,\s*"@type":\s*"WebSite".*?</script>\s*',
        "`n"
    )
    return $Content
}

function Set-TitleAndDescription {
    param([string]$Content, [string]$Title, [string]$Description)

    $safeTitle = Escape-HtmlAttribute $Title
    $safeDesc = Escape-HtmlAttribute $Description

    $Content = [regex]::Replace($Content, '<title>[^<]*</title>', "<title>$safeTitle</title>", 1)

    if ($Content -match '<meta\s+name="description"\s+content="[^"]*"\s*/?>') {
        $Content = [regex]::Replace(
            $Content,
            '<meta\s+name="description"\s+content="[^"]*"\s*/?>',
            "<meta name=`"description`" content=`"$safeDesc`" />",
            1
        )
    } else {
        $Content = [regex]::Replace(
            $Content,
            '(<title>[^<]*</title>)',
            "`$1`n  <meta name=`"description`" content=`"$safeDesc`" />",
            1
        )
    }
    return $Content
}

function Update-PageFromMetadata {
    param(
        [string]$FilePath,
        [string]$RepoRoot,
        [string]$PublicPath,
        [hashtable]$PageMeta,
        [hashtable]$Defaults
    )

    $siteUrl = if ($Defaults.ContainsKey('site_url') -and $Defaults['site_url']) {
        ($Defaults['site_url'] -replace '/$', '')
    } else { 'https://www.letsrace.cc' }
    $siteName = if ($Defaults.ContainsKey('site_name') -and $Defaults['site_name']) { $Defaults['site_name'] } else { 'LetsRace.cc' }
    $imagePath = if ($Defaults.ContainsKey('image') -and $Defaults['image']) { $Defaults['image'] } else { '/images/Social-Share.png' }
    $ogImage = if ($imagePath -match '^https?://') { $imagePath } else { $siteUrl + $(if ($imagePath.StartsWith('/')) { $imagePath } else { "/$imagePath" }) }
    $ogType = if ($Defaults.ContainsKey('og_type') -and $Defaults['og_type']) { $Defaults['og_type'] } else { 'website' }
    $twitterCard = if ($Defaults.ContainsKey('twitter_card') -and $Defaults['twitter_card']) { $Defaults['twitter_card'] } else { 'summary_large_image' }

    $title = [string]$PageMeta['title']
    $description = [string]$PageMeta['description']
    if ([string]::IsNullOrWhiteSpace($title) -or [string]::IsNullOrWhiteSpace($description)) {
        Write-Warning "Skipping (missing title/description): $FilePath"
        return
    }

    $ogTitle = if ($PageMeta.ContainsKey('og_title') -and $PageMeta['og_title']) { [string]$PageMeta['og_title'] } else { $title }
    $ogDescription = if ($PageMeta.ContainsKey('og_description') -and $PageMeta['og_description']) { [string]$PageMeta['og_description'] } else { $description }

    $relative = $FilePath.Substring($RepoRoot.Length).TrimStart('\', '/').Replace('\', '/')
    $canonicalUrl = $siteUrl + $(if ($PublicPath -eq '/') { '/' } else { $PublicPath })

    $content = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
    $content = Set-TitleAndDescription -Content $content -Title $title -Description $description
    $content = Remove-ExistingSocialMeta -Content $content

    $block = Build-SocialMetaBlock `
        -OgTitle $ogTitle `
        -OgDescription $ogDescription `
        -CanonicalUrl $canonicalUrl `
        -OgImage $ogImage `
        -OgType $ogType `
        -SiteName $siteName `
        -TwitterCard $twitterCard `
        -SiteUrl $siteUrl

    $descMatch = [regex]::Match($content, '<meta\s+name="description"\s+content="[^"]*"\s*/?>')
    if (-not $descMatch.Success) {
        Write-Warning "Skipping (no description meta): $FilePath"
        return
    }
    $content = $content.Insert($descMatch.Index + $descMatch.Length, "`n$block")
    [System.IO.File]::WriteAllText($FilePath, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Updated: $relative"
}

$RepoRoot = Resolve-RepoRoot
$mdPath = Join-Path $RepoRoot 'content\page-metadata.md'
if (-not (Test-Path $mdPath)) {
    throw "Missing metadata file: $mdPath"
}

$parsed = Parse-PageMetadataMarkdown -Markdown ([System.IO.File]::ReadAllText($mdPath, [System.Text.Encoding]::UTF8))
$defaults = $parsed.Defaults
$pages = $parsed.Pages

foreach ($publicPath in ($pages.Keys | Sort-Object)) {
    $repoRelative = Convert-PublicPathToRepoFile -PublicPath $publicPath
    $filePath = Join-Path $RepoRoot ($repoRelative -replace '/', [IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path $filePath)) {
        Write-Warning "Page file not found for $publicPath -> $repoRelative"
        continue
    }
    Update-PageFromMetadata -FilePath $filePath -RepoRoot $RepoRoot -PublicPath $publicPath -PageMeta $pages[$publicPath] -Defaults $defaults
}

$shareImage = Join-Path $RepoRoot 'images\Social-Share.png'
if (-not (Test-Path $shareImage)) {
    Write-Host ""
    Write-Host "Note: images/Social-Share.png is not present yet. Add it before deploy so previews show the share image." -ForegroundColor Yellow
}

Write-Host "Done. Metadata applied from content/page-metadata.md."
