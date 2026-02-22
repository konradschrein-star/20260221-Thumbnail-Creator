# setup.ps1 - Development Environment Setup Script

Write-Host "Setting up AI Thumbnail Rendering Farm Environment..." -ForegroundColor Cyan

# 1. Initialize .env file
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example. PLEASE UPDATE API KEYS IN .env!" -ForegroundColor Green
    }
    else {
        Write-Warning ".env.example not found. Please create .env manually."
    }
}
else {
    Write-Host ".env already exists." -ForegroundColor Gray
}

# 2. Check for Docker
if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    Write-Host "Docker found. Pulling required images..." -ForegroundColor Blue
    docker-compose pull
    Write-Host "Docker images pulled." -ForegroundColor Green
}
else {
    Write-Warning "Docker not found. Please install Docker Desktop to run with docker-compose."
}

# 3. Create necessary local storage directories
$StorageDirs = @("backend/storage", "worker/storage", "backend/temp", "worker/temp")
foreach ($Dir in $StorageDirs) {
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir -Force | Out-Null
        Write-Host "Created storage directory: $Dir" -ForegroundColor Gray
    }
}

Write-Host "Setup complete! Run 'docker-compose up' to start the system." -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White
