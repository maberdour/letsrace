# Auto Git Push Script for LetsRace.cc
# This script stages, commits, and pushes all changes to the repository

param(
    [string]$CommitMessage = ""
)

try {
    # Change to repository root for git operations
    Write-Host "Changing to repository root..." -ForegroundColor Cyan
    Set-Location -Path "../../"
    
    # Pull latest changes first to avoid conflicts
    Write-Host "Pulling latest changes..." -ForegroundColor Cyan
    git pull origin main
    
    # Stage all changes (suppress line ending conversion warnings)
    Write-Host "Staging all changes..." -ForegroundColor Cyan
    # Filter out line ending warnings from git add output
    $output = git add . 2>&1
    $output | Where-Object { 
        $_ -notmatch "LF will be replaced by CRLF" -and 
        $_ -notmatch "CRLF will be replaced by LF" -and
        $_ -notmatch "warning: in the working copy"
    } | ForEach-Object { if ($_ -and $_.ToString().Trim() -ne "") { Write-Host $_ } }
    
    # Prompt for commit message
    Write-Host "Enter a commit message (or press Enter for default):" -ForegroundColor Yellow
    $userMessage = Read-Host
    if ([string]::IsNullOrWhiteSpace($userMessage)) {
        $commitMessage = "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    } else {
        $commitMessage = $userMessage
    }
    Write-Host "Committing changes with message: $commitMessage" -ForegroundColor Cyan
    git commit -m "$commitMessage"
    
    # Push to the current branch
    Write-Host "Pushing to remote repository..." -ForegroundColor Cyan
    git push
    
    Write-Host "Git push completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error during git operations: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}