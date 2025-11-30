# PowerShell script to package Lambda functions for deployment
# Usage: .\package-functions.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Packaging Lambda functions..." -ForegroundColor Cyan
Write-Host ""

# Functions to package
$functions = @("subscribe", "unsubscribe", "preview-digest", "test-digest", "run-digest-now", "run-digest")

# Clean up old zip files
Write-Host "Cleaning up old zip files..." -ForegroundColor Yellow
Get-ChildItem -Path . -Filter "*.zip" | Remove-Item -Force

# Package each function
foreach ($func in $functions) {
    Write-Host "Packaging $func..." -ForegroundColor Cyan
    
    if (-not (Test-Path "${func}.js")) {
        Write-Host "Error: ${func}.js not found!" -ForegroundColor Red
        exit 1
    }
    
    # Create zip file
    $zipPath = "${func}.zip"
    
    # Remove existing zip if it exists
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    # Create temporary directory for packaging
    $tempDir = Join-Path $env:TEMP "lambda-package-$func"
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    # Copy function file as index.js (Lambda expects index.js)
    Copy-Item "${func}.js" -Destination (Join-Path $tempDir "index.js")
    
    # Copy shared folder
    Copy-Item "shared" -Destination (Join-Path $tempDir "shared") -Recurse -Force
    
    # Copy node_modules folder
    Copy-Item "node_modules" -Destination (Join-Path $tempDir "node_modules") -Recurse -Force
    
    # Create zip file from temp directory
    Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
    
    # Clean up temp directory
    Remove-Item $tempDir -Recurse -Force
    
    # Check if zip was created successfully
    if (Test-Path $zipPath) {
        $size = (Get-Item $zipPath).Length / 1KB
        $sizeStr = "{0:N2} KB" -f $size
        Write-Host "Created ${func}.zip ($sizeStr)" -ForegroundColor Green
    } else {
        Write-Host "Error: Failed to create ${func}.zip" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
}

Write-Host "All functions packaged successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Upload each .zip file to its corresponding Lambda function in AWS Console"
Write-Host "2. Or use AWS CLI to update functions:"
Write-Host ""
foreach ($func in $functions) {
    $cmd = "aws lambda update-function-code --function-name letsrace-$func --zip-file fileb://$func.zip"
    Write-Host "   $cmd"
    Write-Host ""
}
