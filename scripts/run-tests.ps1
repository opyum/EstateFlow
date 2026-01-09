Write-Host "=== Running EstateFlow Tests ===" -ForegroundColor Green

# Backend tests
Write-Host "`n[1/3] Running Backend Tests..." -ForegroundColor Cyan
Push-Location backend
if (Test-Path "EstateFlow.Api.Tests") {
    dotnet test --verbosity normal
} else {
    Write-Host "No backend tests found, skipping..."
}
Pop-Location

# Frontend unit tests
Write-Host "`n[2/3] Running Frontend Unit Tests..." -ForegroundColor Cyan
Push-Location frontend
npm run test:run
Pop-Location

# E2E tests
if ($env:RUN_E2E -eq "true") {
    Write-Host "`n[3/3] Running E2E Tests..." -ForegroundColor Cyan
    Push-Location frontend
    npm run test:e2e
    Pop-Location
} else {
    Write-Host "`n[3/3] Skipping E2E Tests (set RUN_E2E=true to run)" -ForegroundColor Yellow
}

Write-Host "`n=== All Tests Completed ===" -ForegroundColor Green
