# Stage all changes
git add .

# Commit with a timestamped message
$commitMessage = "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git commit -m "$commitMessage"

# Push to the current branch
git push