$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Stop-PortProcess {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Port
  )

  $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $connections) {
    return
  }

  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Stopped process on port $Port (PID $processId)"
    } catch {
      Write-Host "Could not stop PID $processId on port $Port"
    }
  }
}

function Start-TripinContainers {
  $postgresExists = docker ps -a --format '{{.Names}}' | Select-String -SimpleMatch 'tripin-postgres' -Quiet
  $redisExists = docker ps -a --format '{{.Names}}' | Select-String -SimpleMatch 'tripin-redis' -Quiet

  if ($postgresExists -and $redisExists) {
    Write-Host 'Starting existing Docker containers...'
    docker start tripin-postgres tripin-redis | Out-Host
    return
  }

  Write-Host 'Starting Docker containers...'
  docker compose up -d
}

Start-TripinContainers

Write-Host 'Cleaning stale processes on ports 3000 and 3001...'
Stop-PortProcess -Port 3000
Stop-PortProcess -Port 3001

$healthCommand = @"
Set-Location '$root'
for (`$i = 0; `$i -lt 20; `$i++) {
  try {
    `$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/v1/health' -UseBasicParsing -TimeoutSec 3
    if (`$response.StatusCode -eq 200) {
      Write-Host 'API health check passed.'
      exit 0
    }
  } catch {
    Start-Sleep -Seconds 1
  }
}
Write-Host 'API did not become healthy in time.'
exit 1
"@

$apiCommand = @"
Set-Location '$root'
`$env:JAVA_HOME = 'D:\DevTools\Java\MicrosoftJDK21'
`$env:Path = 'D:\DevTools\Java\MicrosoftJDK21\bin;' + `$env:Path
npm.cmd run start:api
"@

$webCommand = @"
Set-Location '$root'
npm.cmd --workspace apps/web run dev
"@

Write-Host 'Launching API window...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', $apiCommand

Write-Host 'Waiting for API to become healthy...'
powershell -NoProfile -Command $healthCommand | Out-Host

Write-Host 'Launching Web window...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', $webCommand

Write-Host ''
Write-Host 'TripIn is starting.'
Write-Host 'Frontend: http://localhost:3000'
Write-Host 'API health: http://localhost:3001/api/v1/health'
Write-Host ''
Write-Host 'If a new window shows an error, keep that window open and send me the screenshot.'
