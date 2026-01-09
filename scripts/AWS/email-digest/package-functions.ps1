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

# Create shared temp directory with node_modules (copy once, reuse for all functions)
$sharedTempDir = Join-Path $env:TEMP "lambda-package-shared"
if (Test-Path $sharedTempDir) {
    Write-Host "Cleaning up shared temp directory..." -ForegroundColor Yellow
    Remove-Item $sharedTempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $sharedTempDir | Out-Null

# Copy node_modules once to shared location (this is the slow part, but only done once)
Write-Host "Copying node_modules to shared location (this may take a moment)..." -ForegroundColor Cyan
$nodeModulesSource = Join-Path $scriptDir "node_modules"
$nodeModulesDest = Join-Path $sharedTempDir "node_modules"
if (Test-Path $nodeModulesSource) {
    # Use robocopy for faster copying (multi-threaded, faster than Copy-Item)
    $robocopyArgs = @($nodeModulesSource, $nodeModulesDest, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP")
    $null = & robocopy @robocopyArgs
    if ($LASTEXITCODE -ge 8) {
        Write-Host "Error: Failed to copy node_modules" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Warning: node_modules not found!" -ForegroundColor Yellow
}

# Copy shared folder once
Write-Host "Copying shared folder..." -ForegroundColor Cyan
Copy-Item "shared" -Destination (Join-Path $sharedTempDir "shared") -Recurse -Force

# Package each function
foreach ($func in $functions) {
    Write-Host "Packaging $func..." -ForegroundColor Cyan
    
    if (-not (Test-Path "${func}.js")) {
        Write-Host "Error: ${func}.js not found!" -ForegroundColor Red
        exit 1
    }
    
    # Create zip file
    $zipPath = Join-Path $scriptDir "${func}.zip"
    
    # Remove existing zip if it exists (do this early, before any operations)
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
    }
    
    # Create temporary directory for this function (lightweight, just for this function's files)
    $tempDir = Join-Path $env:TEMP "lambda-package-$func"
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    # Copy function file as index.js (Lambda expects index.js)
    Copy-Item "${func}.js" -Destination (Join-Path $tempDir "index.js")
    
    # Special case: run-digest-now requires run-digest.js
    if ($func -eq "run-digest-now") {
        if (Test-Path "run-digest.js") {
            Copy-Item "run-digest.js" -Destination (Join-Path $tempDir "run-digest.js")
        } else {
            Write-Host "Warning: run-digest.js not found, but required by run-digest-now" -ForegroundColor Yellow
        }
    }
    
    # Copy shared files from shared location
    Write-Host "  Copying shared files..." -ForegroundColor Gray
    
    # Copy node_modules using robocopy (faster for large directories)
    $nodeModulesSource = Join-Path $sharedTempDir "node_modules"
    $nodeModulesDest = Join-Path $tempDir "node_modules"
    if (Test-Path $nodeModulesSource) {
        $robocopyArgs = @($nodeModulesSource, $nodeModulesDest, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP")
        $null = & robocopy @robocopyArgs 2>&1
        if ($LASTEXITCODE -ge 8) {
            Write-Host "  Warning: robocopy failed for node_modules, using Copy-Item..." -ForegroundColor Yellow
            Copy-Item $nodeModulesSource -Destination $nodeModulesDest -Recurse -Force
        }
    }
    
    # Copy shared folder (small, so Copy-Item is fine)
    $sharedSource = Join-Path $sharedTempDir "shared"
    $sharedDest = Join-Path $tempDir "shared"
    if (Test-Path $sharedSource) {
        Copy-Item $sharedSource -Destination $sharedDest -Recurse -Force
    } else {
        Write-Host "  Error: shared folder not found in shared temp directory!" -ForegroundColor Red
        exit 1
    }
    
    # Verify files were copied
    Write-Host "  Verifying files..." -ForegroundColor Gray
    if (-not (Test-Path (Join-Path $tempDir "index.js"))) {
        Write-Host "Error: index.js not found in temp directory!" -ForegroundColor Red
        exit 1
    }
    if (-not (Test-Path (Join-Path $tempDir "shared"))) {
        Write-Host "Error: shared folder not found in temp directory!" -ForegroundColor Red
        Write-Host "  Temp directory contents:" -ForegroundColor Yellow
        Get-ChildItem -Path $tempDir | ForEach-Object { Write-Host "    $($_.Name)" -ForegroundColor Yellow }
        exit 1
    }
    if (-not (Test-Path (Join-Path $tempDir "shared\utils.js"))) {
        Write-Host "Error: shared\utils.js not found in temp directory!" -ForegroundColor Red
        Write-Host "  Shared folder contents:" -ForegroundColor Yellow
        if (Test-Path (Join-Path $tempDir "shared")) {
            Get-ChildItem -Path (Join-Path $tempDir "shared") | ForEach-Object { Write-Host "    $($_.Name)" -ForegroundColor Yellow }
        }
        exit 1
    }
    if (-not (Test-Path (Join-Path $tempDir "node_modules"))) {
        Write-Host "Error: node_modules folder not found in temp directory!" -ForegroundColor Red
        exit 1
    }
    
    # Create zip file from temp directory
    Write-Host "  Creating zip file..." -ForegroundColor Gray
    
    $zipCreated = $false
    $zipError = $null
    
    # Try to use 7-Zip if available (much faster), otherwise use .NET ZipFile (faster than Compress-Archive)
    $sevenZipPath = "C:\Program Files\7-Zip\7z.exe"
    if (Test-Path $sevenZipPath) {
        try {
            $sevenZipOutput = & $sevenZipPath "a" "-tzip" "-mx=5" $zipPath "$tempDir\*" 2>&1
            if ($LASTEXITCODE -eq 0) {
                $zipCreated = $true
            } else {
                Write-Host "  7-Zip failed (exit code: $LASTEXITCODE), trying .NET ZipFile..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  7-Zip exception: $_" -ForegroundColor Yellow
        }
    }
    
    if (-not $zipCreated) {
        try {
            Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
            # Ensure zip file doesn't exist before creating
            if (Test-Path $zipPath) {
                Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 100  # Brief pause to ensure file is released
            }
            [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
            $zipCreated = $true
        } catch {
            $zipError = $_.Exception.Message
            Write-Host "  .NET ZipFile failed: $zipError" -ForegroundColor Yellow
            Write-Host "  Falling back to Compress-Archive..." -ForegroundColor Yellow
            try {
                # Ensure zip file doesn't exist
                if (Test-Path $zipPath) {
                    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Milliseconds 100
                }
                Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
                $zipCreated = $true
            } catch {
                $zipError = $_.Exception.Message
                Write-Host "  Compress-Archive also failed: $zipError" -ForegroundColor Red
                Write-Host "  Temp directory: $tempDir" -ForegroundColor Gray
                Write-Host "  Files in temp directory:" -ForegroundColor Gray
                Get-ChildItem -Path $tempDir -Recurse | Select-Object -First 10 FullName | ForEach-Object { Write-Host "    $($_.FullName)" -ForegroundColor Gray }
            }
        }
    }
    
    # Clean up temp directory
    Remove-Item $tempDir -Recurse -Force
    
    # Check if zip was created successfully
    if (Test-Path $zipPath) {
        $size = (Get-Item $zipPath).Length / 1KB
        $sizeStr = "{0:N2} KB" -f $size
        Write-Host "  Created ${func}.zip ($sizeStr)" -ForegroundColor Green
    } else {
        Write-Host "Error: Failed to create ${func}.zip" -ForegroundColor Red
        if ($zipError) {
            Write-Host "  Error details: $zipError" -ForegroundColor Red
        }
        exit 1
    }
    
    Write-Host ""
}

# Clean up shared temp directory
Write-Host "Cleaning up shared temp directory..." -ForegroundColor Yellow
Remove-Item $sharedTempDir -Recurse -Force

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
