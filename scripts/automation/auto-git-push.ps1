# Auto Git Push Script for LetsRace.cc
# This script stages, commits, and pushes all changes to the repository

param(
    [string]$CommitMessage = ""
)

try {
    # Change to repository root for git operations
    Write-Host "Changing to repository root..." -ForegroundColor Cyan
    Set-Location -Path "../../"
    
    # Stage all changes
    Write-Host "Staging all changes..." -ForegroundColor Cyan
    git add .
    
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