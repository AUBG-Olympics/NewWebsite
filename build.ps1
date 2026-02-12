param(
    [Parameter(Position=0)]
    [ValidateSet("frontend", "backend", "all", "start-frontend", "start-backend", "start-all")]
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Require-Command {
    param(
        [string]$Command,
        [string]$InstallInstructions
    )
    if (-not (Test-Command $Command)) {
        Write-Host "Error: '$Command' is not installed or not in PATH" -ForegroundColor Red
        Write-Host ""
        Write-Host "Installation instructions:" -ForegroundColor Yellow
        Write-Host $InstallInstructions -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
}

function Build-Frontend {
    Require-Command "pnpm" "Install pnpm using one of these methods:`n  - npm install -g pnpm`n  - iwr https://get.pnpm.io/install.ps1 -useb | iex`n  - choco install pnpm`n  - scoop install pnpm"
    
    Write-Host "Building frontend..." -ForegroundColor Cyan
    Push-Location frontend
    try {
        pnpm install
        if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
        pnpm build
        if ($LASTEXITCODE -ne 0) { throw "pnpm build failed" }
        Write-Host "Frontend build completed successfully!" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

function Build-Backend {
    Require-Command "pip" "Install Python from https://www.python.org/downloads/`nMake sure to check 'Add Python to PATH' during installation."
    
    Write-Host "Building backend..." -ForegroundColor Cyan
    Push-Location backend
    try {
        pip install -r requirements.txt
        if ($LASTEXITCODE -ne 0) { throw "pip install failed" }
        Write-Host "Backend build completed successfully!" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

function Start-Frontend {
    Require-Command "pnpm" "Install pnpm using one of these methods:`n  - npm install -g pnpm`n  - iwr https://get.pnpm.io/install.ps1 -useb | iex`n  - choco install pnpm`n  - scoop install pnpm"
    
    Write-Host "Starting frontend..." -ForegroundColor Cyan
    Push-Location frontend
    pnpm dev
    Pop-Location
}

function Start-Backend {
    Require-Command "python" "Install Python from https://www.python.org/downloads/`nMake sure to check 'Add Python to PATH' during installation."
    
    Write-Host "Starting backend..." -ForegroundColor Cyan
    Push-Location backend
    python -m src.entry
    Pop-Location
}

function Start-All {
    Require-Command "pnpm" "Install pnpm using one of these methods:`n  - npm install -g pnpm`n  - iwr https://get.pnpm.io/install.ps1 -useb | iex`n  - choco install pnpm`n  - scoop install pnpm"
    Require-Command "python" "Install Python from https://www.python.org/downloads/`nMake sure to check 'Add Python to PATH' during installation."
    
    Write-Host "Starting frontend and backend..." -ForegroundColor Cyan
    $frontendPath = (Resolve-Path "frontend").Path
    $backendPath = (Resolve-Path "backend").Path
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; pnpm dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python -m src.entry"
}

switch ($Target) {
    "frontend" { Build-Frontend }
    "backend" { Build-Backend }
    "all" { 
        Build-Frontend
        Build-Backend
    }
    "start-frontend" { Start-Frontend }
    "start-backend" { Start-Backend }
    "start-all" { Start-All }
}

