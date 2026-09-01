
$ports = @(3000, 5173, 5500)
Write-Host 'Matando procesos en puertos: 3000, 5173, 5500...' -ForegroundColor Yellow
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        Write-Host ('Matando PID ' + $c.OwningProcess + ' en puerto ' + $p) -ForegroundColor Red
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
Write-Host 'Matando ngrok...' -ForegroundColor Yellow
Stop-Process -Name ngrok -Force -ErrorAction SilentlyContinue
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

Write-Host 'Ejecutando iniciar-demo.ps1...' -ForegroundColor Green
.\iniciar-demo.ps1

