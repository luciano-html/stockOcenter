# iniciar-demo.ps1 - Levanta MongoDB (Docker), backend, frontend y tunel ngrok de una
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "== stockOcenter - Demo ==" -ForegroundColor Cyan

# ---------- 1. MongoDB (Docker) ----------
Write-Host "`n[1/4] MongoDB (Docker)..." -ForegroundColor Yellow
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker no esta corriendo. Abriendo Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    $ready = $false
    foreach ($i in 1..60) {
        Start-Sleep -Seconds 5
        docker info *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    }
    if (-not $ready) {
        Write-Host "Docker Desktop no arranco. Abrilo manualmente y reintenta." -ForegroundColor Red
        exit 1
    }
}
Push-Location $root
docker compose up -d | Out-Host
Pop-Location

# ---------- 2. Backend ----------
Write-Host "`n[2/4] Backend (server, puerto 3000)..." -ForegroundColor Yellow
if (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue) {
    Write-Host "Puerto 3000 ya en uso (server ya corriendo)" -ForegroundColor DarkYellow
} else {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory "$root\server" -WindowStyle Normal
}

# ---------- 3. Frontend ----------
Write-Host "`n[3/4] Frontend (client, puerto 5173)..." -ForegroundColor Yellow
if (Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue) {
    Write-Host "Puerto 5173 ya en uso (client ya corriendo)" -ForegroundColor DarkYellow
} else {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory "$root\client" -WindowStyle Normal
}

# ---------- 4. Tunel ngrok ----------
Write-Host "`n[4/4] Tunel ngrok..." -ForegroundColor Yellow
$ngrokCmd = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $ngrokCmd) {
    $ngrokCmd = "C:\Users\luchardo\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"
}
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$ngrokCmd`" http 5173" -WindowStyle Normal

# ---------- Esperar y mostrar URL ----------
Write-Host "`nEsperando a que levanten los servicios..." -ForegroundColor Yellow
foreach ($i in 1..24) {
    Start-Sleep -Seconds 5
    if ((Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue) -and
        (Get-NetTCPConnection -State Listen -LocalPort 5173 -ErrorAction SilentlyContinue)) { break }
}

try {
    $t = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
    $url = ($t.tunnels | Where-Object { $_.public_url -match '^https' } | Select-Object -First 1).public_url
    if ($url) {
        Write-Host "`n==================" -ForegroundColor Green
        Write-Host "App lista: $url" -ForegroundColor Green
        Write-Host "Login: admin / admin123" -ForegroundColor Green
        Write-Host "==================" -ForegroundColor Green
    } else {
        Write-Host "ngrok todavia configurando. Mira la ventana de ngrok para la URL." -ForegroundColor Yellow
    }
} catch {
    Write-Host "ngrok todavia configurando. Mira la ventana de ngrok para la URL." -ForegroundColor Yellow
}

Write-Host "`nQuedaron 3 ventanas abiertas (server, client, ngrok). Dejalas corriendo para la demo." -ForegroundColor DarkGray