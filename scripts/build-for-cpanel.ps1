# Sagatavo deploy mapi cPanel (Windows)
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Out = Join-Path $Root "deploy\serv.trioit.lv"

Write-Host "-> Building frontend..."
Set-Location (Join-Path $Root "frontend")
"VITE_API_URL=/api/v1" | Out-File -Encoding utf8 .env.production
npm ci
npm run build

Write-Host "-> Building backend..."
Set-Location (Join-Path $Root "backend")
npm ci
npm run build

Write-Host "-> Assembling deploy folder..."
if (Test-Path $Out) { Remove-Item -Recurse -Force $Out }
New-Item -ItemType Directory -Path (Join-Path $Out "public"), (Join-Path $Out "uploads") -Force | Out-Null

Copy-Item -Recurse (Join-Path $Root "backend\dist") (Join-Path $Out "dist")
Copy-Item (Join-Path $Root "backend\package.json"), (Join-Path $Root "backend\package-lock.json") $Out
Copy-Item -Recurse (Join-Path $Root "frontend\dist\*") (Join-Path $Out "public")

Write-Host "Gatavs: $Out"
Write-Host "Augsupielade visu mapi uz /home/TAVSUSER/serv.trioit.lv/"
