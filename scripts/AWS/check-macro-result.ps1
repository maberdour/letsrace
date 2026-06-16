param(
    [Parameter(Mandatory = $true)][string]$MacroFile,
    [Parameter(Mandatory = $true)][int]$StartEpoch,
    [int]$MaxWindow = 7200,
    [string]$LogDir = 'H:\My Drive\Clients\LetsRace\UIVision\logs',
    [int]$GraceSecs = 30
)

function Get-LogStartTime([string]$name) {
    if ($name -match 'log-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.txt$') {
        return Get-Date -Year ([int]$matches[1]) -Month ([int]$matches[2]) -Day ([int]$matches[3]) `
            -Hour ([int]$matches[4]) -Minute ([int]$matches[5]) -Second ([int]$matches[6])
    }
    return $null
}

$minDate = [DateTimeOffset]::FromUnixTimeSeconds($StartEpoch).LocalDateTime.AddSeconds(-$GraceSecs)
$maxDate = $minDate.AddSeconds($MaxWindow + $GraceSecs)
$playPat = 'Playing macro ' + [regex]::Escape($MacroFile) + '(\.json)?'

try {
    $files = Get-ChildItem -Path $LogDir -Filter 'log-*.txt' -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            $t = Get-LogStartTime $_.Name
            if ($t -and $t -ge $minDate -and $t -le $maxDate) {
                [pscustomobject]@{ File = $_; LogTime = $t }
            }
        } |
        Sort-Object LogTime -Descending

    if (-not $files) { exit 2 }

    foreach ($item in $files) {
        $head = Get-Content -Path $item.File.FullName -ErrorAction SilentlyContinue -TotalCount 60
        $tail = Get-Content -Path $item.File.FullName -ErrorAction SilentlyContinue -Tail 500
        $text = (($head + $tail) -join "`n")
        if ($text -match $playPat) {
            if ($text -match 'Macro completed') { exit 0 }
            if ($text -match 'Macro failed' -or $text -match 'Error #\d+') { exit 1 }
        }
    }

    exit 2
}
catch {
    exit 2
}
