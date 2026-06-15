<#
  One-command deploy of the TripIn backend to the Aliyun server.
  Builds the jar, uploads it, backs up the old one, swaps, restarts, verifies.

  Usage (PowerShell):
    $env:SSH_PASS = '<server root password>'   # set once (or store as a user env var)
    .\deploy-backend.ps1                        # build + deploy
    .\deploy-backend.ps1 -SkipBuild             # deploy the existing target jar

  Rollback to the previous version:
    python ssh_run.py --host 101.132.146.92 --user root run "cd /home/admin/tripin && cp -f tripin-api-java.jar.bak tripin-api-java.jar && docker compose restart api"
#>
param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'

$Server    = '101.132.146.92'
$User      = 'root'
$RemoteDir = '/home/admin/tripin'
$JarName   = 'tripin-api-java.jar'
$Root      = $PSScriptRoot
$LocalJar  = Join-Path $Root 'services\api-java\target\tripin-api-java-0.1.0.jar'
$Ssh       = Join-Path $Root 'ssh_run.py'

if (-not $env:SSH_PASS) { throw 'Set $env:SSH_PASS (server root password) first.' }

if (-not $SkipBuild) {
  Write-Host '==> [1/4] building backend jar ...' -ForegroundColor Cyan
  mvn -f (Join-Path $Root 'services\api-java\pom.xml') -q -DskipTests package
}
if (-not (Test-Path $LocalJar)) { throw "jar not found: $LocalJar (drop -SkipBuild to build it)" }

Write-Host '==> [2/4] uploading to a temp file ...' -ForegroundColor Cyan
python $Ssh --host $Server --user $User put $LocalJar "$RemoteDir/$JarName.new"

Write-Host '==> [3/4] backup + swap + restart ...' -ForegroundColor Cyan
python $Ssh --host $Server --user $User run "cd $RemoteDir && cp -f $JarName $JarName.bak && cp -f $JarName.new $JarName && rm -f $JarName.new && (docker compose restart api 2>/dev/null || docker restart tripin-api) && echo RESTARTED"

Write-Host '==> [4/4] waiting for health ...' -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep 2
  try {
    $h = Invoke-RestMethod "http://${Server}:3001/api/v1/health" -TimeoutSec 4
    if ($h.ok) { $ok = $true; break }
  } catch {}
}
if ($ok) {
  Write-Host 'OK: backend deployed and healthy.' -ForegroundColor Green
} else {
  Write-Warning 'Backend not healthy within ~40s. Check: docker logs --tail 50 tripin-api'
  Write-Host 'Rollback command is in this script header.' -ForegroundColor Yellow
}
