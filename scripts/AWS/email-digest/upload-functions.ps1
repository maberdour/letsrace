# PowerShell script to upload Lambda function ZIP files to AWS
# Usage: .\upload-functions.ps1
# Prerequisites: AWS CLI must be installed and configured with credentials

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Uploading Lambda functions to AWS..." -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is available
try {
    $awsVersion = aws --version 2>&1
    Write-Host "Using AWS CLI: $awsVersion" -ForegroundColor Gray
} catch {
    Write-Host "Error: AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Functions to upload
$functions = @("subscribe", "unsubscribe", "preview-digest", "test-digest", "run-digest-now", "run-digest")

$uploaded = 0
$failed = 0

foreach ($func in $functions) {
    $zipPath = Join-Path $scriptDir "${func}.zip"
    $functionName = "letsrace-$func"
    
    if (-not (Test-Path $zipPath)) {
        Write-Host "⚠️  Skipping $functionName - ${func}.zip not found" -ForegroundColor Yellow
        $failed++
        continue
    }
    
    Write-Host "Uploading $functionName..." -ForegroundColor Cyan
    
    try {
        $result = aws lambda update-function-code `
            --function-name $functionName `
            --zip-file "fileb://$zipPath" `
            --region eu-west-2 `
            2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Successfully uploaded $functionName" -ForegroundColor Green
            $uploaded++
        } else {
            Write-Host "  ❌ Failed to upload $functionName" -ForegroundColor Red
            Write-Host "  Error: $result" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "  ❌ Exception uploading $functionName : $_" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

Write-Host "Upload complete!" -ForegroundColor Cyan
Write-Host "  ✅ Successfully uploaded: $uploaded" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "  ❌ Failed: $failed" -ForegroundColor Red
}
