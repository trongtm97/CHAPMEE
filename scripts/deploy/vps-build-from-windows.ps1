# ChapMee — upload source + build on VPS (SSH key, no password).
# Usage (PowerShell, repo root):
#   powershell -ExecutionPolicy Bypass -File scripts\deploy\vps-build-from-windows.ps1
# Background on VPS (if SSH times out):
#   powershell -ExecutionPolicy Bypass -File scripts\deploy\vps-build-from-windows.ps1 -Background

[CmdletBinding()]
param(
    [string]$VpsUser = $(if ($env:VPS_USER) { $env:VPS_USER } else { "deploy" }),
    [string]$VpsHost = $(if ($env:VPS_HOST) { $env:VPS_HOST } else { "14.225.211.205" }),
    [switch]$Background,
    [switch]$SkipPack
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Archive = Join-Path $RepoRoot ".deploy-pack.tar.gz"
$SshTarget = "${VpsUser}@${VpsHost}"
$RemoteScript = "/tmp/vps-build-remote-once.sh"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) { throw "ssh not found" }
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) { throw "scp not found" }
if (-not (Get-Command tar -ErrorAction SilentlyContinue)) { throw "tar not found (Windows 10+ built-in)" }

if (-not $SkipPack) {
    Write-Step "Pack source"
    if (Test-Path $Archive) { Remove-Item $Archive -Force }
    Push-Location $RepoRoot
    try {
        & tar -czf $Archive `
            --exclude=node_modules `
            --exclude=.next `
            --exclude=.git `
            --exclude=.env.production `
            --exclude=.env `
            --exclude=.env.local `
            --exclude=.deploy-pack.tar.gz `
            --exclude=.codex-tmp `
            --exclude=.cursor `
            --exclude="*.tar" `
            --exclude="*.tar.gz" `
            .
        if ($LASTEXITCODE -ne 0) { throw "tar failed" }
        $mb = [math]::Round((Get-Item $Archive).Length / 1MB, 2)
        Write-Host "Archive: ${mb} MB"
    }
    finally {
        Pop-Location
    }
}

Write-Step "Upload tarball + build script"
$LocalScript = Join-Path $RepoRoot "scripts\deploy\vps-build-remote-once.sh"
$scriptLf = Join-Path $env:TEMP "vps-build-remote-once.sh"
# ponytail: normalize CRLF→LF so bash on VPS accepts `set -euo pipefail`
$scriptText = [IO.File]::ReadAllText($LocalScript) -replace "`r`n","`n" -replace "`r","`n"
[IO.File]::WriteAllText($scriptLf, $scriptText)
& scp -o StrictHostKeyChecking=accept-new $Archive "${SshTarget}:/tmp/chapmee-deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "scp tarball failed" }
& scp -o StrictHostKeyChecking=accept-new $scriptLf "${SshTarget}:${RemoteScript}"
if ($LASTEXITCODE -ne 0) { throw "scp script failed" }

if ($Background) {
    Write-Step "Start build in background on VPS"
    & ssh -o StrictHostKeyChecking=accept-new $SshTarget "chmod +x ${RemoteScript}; nohup bash ${RemoteScript} > /tmp/chapmee-deploy-wrapper.log 2>&1 & echo started"
    if ($LASTEXITCODE -ne 0) { throw "ssh background start failed" }
    Write-Host "Tail log: ssh $SshTarget 'tail -f /tmp/chapmee-build-*.log'" -ForegroundColor Green
    exit 0
}

Write-Step "Build on VPS (webpack on 4GB VPS often 1-3 hours)"
& ssh -o StrictHostKeyChecking=accept-new $SshTarget "chmod +x ${RemoteScript}; bash ${RemoteScript}"
if ($LASTEXITCODE -ne 0) { throw "VPS build failed" }

Write-Host ""
Write-Host "Deploy OK" -ForegroundColor Green
Write-Host "  Health: ssh $SshTarget 'curl -sf http://127.0.0.1:3000/api/health'"
Write-Host "  Docs:   docs/VPS_BUILD_RUNBOOK.md"
