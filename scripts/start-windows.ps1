$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    Write-Host 'Starting Docker deployment...'
    docker compose up --build
    exit $LASTEXITCODE
}

Write-Host 'Docker not found. Trying local Node.js workflow...'
$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) {
    Write-Host 'Node.js is not installed. Install Docker Desktop or Node.js 20+ and PostgreSQL.'
    exit 1
}

if (-not (Test-Path 'node_modules')) {
    npm install
}

npm start
