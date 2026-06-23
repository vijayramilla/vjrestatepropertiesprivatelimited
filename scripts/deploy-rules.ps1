# Deploy Firestore + Storage rules to vjr-estate-df034
# Run: powershell -ExecutionPolicy Bypass -File scripts/deploy-rules.ps1

Set-Location (Join-Path $PSScriptRoot "..")

Write-Host ""
Write-Host "VJR Estate - Firebase Rules Deploy"
Write-Host "Project: vjr-estate-df034"
Write-Host ""

$deployOutput = npx firebase deploy --only firestore:rules,storage --project vjr-estate-df034 2>&1
$deployOutput | ForEach-Object { Write-Host $_ }

if ($LASTEXITCODE -ne 0 -and ($deployOutput -join " ") -match "authenticate|login") {
    Write-Host ""
    Write-Host "Firebase login required. Run these two commands:"
    Write-Host "  npx firebase login"
    Write-Host "  npm run deploy:rules"
    exit 1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done! Refresh Admin > Users in your browser."
} else {
    Write-Host ""
    Write-Host "Deploy failed. See errors above."
    exit 1
}
