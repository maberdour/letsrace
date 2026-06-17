param(
    [Parameter(Mandatory = $true)][string]$MacroFile,
    [Parameter(Mandatory = $true)][int]$StartEpoch,
    [int]$MaxWindow = 7200,
    [string]$LogDir = 'H:\My Drive\Clients\LetsRace\UIVision\logs',
    [int]$GraceSecs = 30,
    [int]$PollAttempts = 15,
    [int]$PollIntervalSecs = 2
)

function Get-LogStartTime([string]$name) {
    if ($name -match 'log-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.txt$') {
        return Get-Date -Year ([int]$matches[1]) -Month ([int]$matches[2]) -Day ([int]$matches[3]) `
            -Hour ([int]$matches[4]) -Minute ([int]$matches[5]) -Second ([int]$matches[6])
    }
    return $null
}

function Get-AttemptLogFile([string]$MacroName, [datetime]$MinDate, [datetime]$MaxDate) {
    $playPat = 'Playing macro ' + [regex]::Escape($MacroName) + '(\.json)?'
    $candidates = @(Get-ChildItem -Path $LogDir -Filter 'log-*.txt' -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            $t = Get-LogStartTime $_.Name
            if ($t -and $t -ge $MinDate -and $t -le $MaxDate) {
                [pscustomobject]@{ File = $_; LogTime = $t }
            }
        } |
        Sort-Object LogTime -Descending)

    foreach ($item in $candidates) {
        $head = Get-Content -Path $item.File.FullName -ErrorAction SilentlyContinue -TotalCount 20
        if (-not $head) { continue }
        $text = ($head -join "`n")
        if ($text -match $playPat) {
            return $item.File
        }
    }

    return $null
}

function Read-AttemptResult([System.IO.FileInfo]$LogFile) {
    $head = Get-Content -Path $LogFile.FullName -ErrorAction SilentlyContinue -TotalCount 60
    $tail = Get-Content -Path $LogFile.FullName -ErrorAction SilentlyContinue -Tail 500
    if (-not $head -and -not $tail) { return 2 }

    $text = (($head + $tail) -join "`n")
    if ($text -match 'Macro completed') { return 0 }
    if ($text -match 'Macro failed' -or $text -match 'Error #\d+') { return 1 }
    return 2
}

try {
    if (-not (Test-Path -LiteralPath $LogDir)) { exit 2 }

    $minDate = [DateTimeOffset]::FromUnixTimeSeconds($StartEpoch).LocalDateTime.AddSeconds(-$GraceSecs)
    $maxDate = $minDate.AddSeconds($MaxWindow + $GraceSecs)

    for ($i = 0; $i -lt $PollAttempts; $i++) {
        $logFile = Get-AttemptLogFile -MacroName $MacroFile -MinDate $minDate -MaxDate $maxDate
        if ($logFile) {
            $result = Read-AttemptResult -LogFile $logFile
            if ($result -ne 2) { exit $result }
        }

        if ($i -lt ($PollAttempts - 1)) {
            Start-Sleep -Seconds $PollIntervalSecs
        }
    }

    exit 2
}
catch {
    exit 2
}
