# ChapMee — build Docker image locally, transfer via docker save/load, deploy on VPS.
# Does NOT upload .env.production. Does NOT run docker build on VPS.
#
# ⛔ VPS 4GB không đủ RAM — KHÔNG build trên server. Xem docs/VPS_BUILD_RUNBOOK.md
#
# Usage (hoặc: npm run deploy:vps sau khi set env):
#   $env:VPS_USER = "deploy"
#   $env:VPS_HOST = "your.vps.ip"
#   $env:VPS_PATH = "/opt/chapmee/app"
#   $env:IMAGE_NAME = "chapmee-web"
#   powershell -ExecutionPolicy Bypass -File scripts\deploy\deploy-local-to-vps.ps1
#
# Rollback:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy\deploy-local-to-vps.ps1 -Rollback

[CmdletBinding()]
param(
    [string]$VpsUser = $env:VPS_USER,
    [string]$VpsHost = $env:VPS_HOST,
    [string]$VpsPath = $(if ($env:VPS_PATH) { $env:VPS_PATH } else { "/opt/chapmee/app" }),
    [string]$ImageName = $(if ($env:IMAGE_NAME) { $env:IMAGE_NAME } else { "chapmee-web" }),
    [string]$ComposeFile = "docker-compose.prod.yml",
    [string]$EnvFile = ".env.production",
    [int]$SshPort = 22,
    [switch]$Rollback,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$TagDeploy = "${ImageName}:deploy-${Timestamp}"
$TagLatest = "${ImageName}:latest"
$ArchiveLocal = Join-Path $RepoRoot ".deploy-${ImageName}-${Timestamp}.tar.gz"
$ArchiveRemoteName = Split-Path $ArchiveLocal -Leaf
$ArchiveRemote = "$VpsPath/images/$ArchiveRemoteName"
$RollbackFile = "$VpsPath/.deploy-rollback-image"
$SshTarget = "${VpsUser}@${VpsHost}"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Invoke-Ssh([string]$RemoteCommand) {
    & ssh -p $SshPort -o StrictHostKeyChecking=accept-new $SshTarget $RemoteCommand
    if ($LASTEXITCODE -ne 0) {
        throw "SSH command failed (exit $LASTEXITCODE)"
    }
}

function Invoke-SshBash([string]$Script) {
    $normalized = $Script -replace "`r`n", "`n" -replace "`r", "`n"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
    $b64 = [Convert]::ToBase64String($bytes)
    Invoke-Ssh "echo $b64 | base64 -d | bash"
}

function Invoke-Scp([string]$LocalPath, [string]$RemotePath) {
    & scp -P $SshPort -o StrictHostKeyChecking=accept-new $LocalPath "${SshTarget}:${RemotePath}"
    if ($LASTEXITCODE -ne 0) {
        throw "scp failed (exit $LASTEXITCODE)"
    }
}

function Save-DockerImageGzip([string[]]$Tags, [string]$OutputPath) {
    # OutputPath ends with .tar.gz — strip .gz only (not ChangeExtension, which yields .tar.tar).
    $tarPath = $OutputPath -replace '\.gz$', ''
    if (Test-Path $tarPath) { Remove-Item $tarPath -Force }
    if (Test-Path $OutputPath) { Remove-Item $OutputPath -Force }

    & docker save @Tags -o $tarPath
    if ($LASTEXITCODE -ne 0) { throw "docker save failed" }

    if (Get-Command gzip -ErrorAction SilentlyContinue) {
        & gzip -f $tarPath
        Move-Item -Force "${tarPath}.gz" $OutputPath
        return
    }

    # Windows: compress with .NET (no WSL/gzip required).
    $inStream = [System.IO.File]::OpenRead($tarPath)
    try {
        $outStream = [System.IO.File]::Create($OutputPath)
        try {
            $gzip = New-Object System.IO.Compression.GZipStream(
                $outStream,
                [System.IO.Compression.CompressionMode]::Compress
            )
            try {
                $inStream.CopyTo($gzip)
            } finally {
                $gzip.Dispose()
            }
        } finally {
            $outStream.Dispose()
        }
    } finally {
        $inStream.Dispose()
        Remove-Item $tarPath -Force
    }
}

Assert-Command docker
Assert-Command ssh
Assert-Command scp

if ([string]::IsNullOrWhiteSpace($VpsUser) -or [string]::IsNullOrWhiteSpace($VpsHost)) {
    throw "Set VPS_USER and VPS_HOST environment variables (no passwords in this script)."
}

if ($Rollback) {
    Write-Step "Rollback on VPS using $RollbackFile"
    Invoke-SshBash @"
set -euo pipefail
cd '$VpsPath'
test -f '$RollbackFile'
ROLLBACK_TAG=`$(cat '$RollbackFile')
docker image inspect "`$ROLLBACK_TAG" >/dev/null
docker tag "`$ROLLBACK_TAG" '$TagLatest'
if grep -q '^CHAPMEE_WEB_IMAGE=' '$EnvFile'; then
  sed -i 's|^CHAPMEE_WEB_IMAGE=.*|CHAPMEE_WEB_IMAGE=$TagLatest|' '$EnvFile'
else
  echo 'CHAPMEE_WEB_IMAGE=$TagLatest' >> '$EnvFile'
fi
docker compose -f '$ComposeFile' --env-file '$EnvFile' up -d --pull never web
sleep 5
docker compose -f '$ComposeFile' --env-file '$EnvFile' ps web
"@
    Write-Host "Rollback complete." -ForegroundColor Green
    exit 0
}

Write-Step "1/7 - Verify VPS paths"
Invoke-Ssh "test -d '$VpsPath' && test -f '$VpsPath/$ComposeFile'"
Invoke-Ssh "mkdir -p '$VpsPath/images'"

if ($SkipBuild) {
    Write-Step "2/7 - Skip build (using existing $TagLatest)"
    docker image inspect $TagLatest 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Image $TagLatest not found locally; run without -SkipBuild" }
    docker tag $TagLatest $TagDeploy
    if ($LASTEXITCODE -ne 0) { throw "docker tag failed" }
} else {
    Write-Step "2/7 - Docker build locally ($TagDeploy)"
    Push-Location $RepoRoot
    try {
        $heap = if ($env:NODE_MAX_OLD_SPACE_SIZE) { $env:NODE_MAX_OLD_SPACE_SIZE } else { "8192" }
        $buildArgs = @("build", "-t", $TagDeploy, "-t", $TagLatest, "--build-arg", "NODE_MAX_OLD_SPACE_SIZE=$heap")
        if ($env:NEXT_PUBLIC_APP_URL) {
            $buildArgs += @("--build-arg", "NEXT_PUBLIC_APP_URL=$($env:NEXT_PUBLIC_APP_URL)")
        }
        if ($env:NEXT_PUBLIC_SITE_URL) {
            $buildArgs += @("--build-arg", "NEXT_PUBLIC_SITE_URL=$($env:NEXT_PUBLIC_SITE_URL)")
        }
        if ($env:NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL) {
            $buildArgs += @("--build-arg", "NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=$($env:NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL)")
        }
        $buildArgs += "."
        & docker @buildArgs
        if ($LASTEXITCODE -ne 0) { throw "docker build failed" }
    }
    finally {
        Pop-Location
    }
}

Write-Step "3/7 - Save image to $ArchiveLocal"
Save-DockerImageGzip @($TagDeploy, $TagLatest) $ArchiveLocal
$sizeMb = [math]::Round((Get-Item $ArchiveLocal).Length / 1MB, 2)
Write-Host "Archive size: ${sizeMb} MB"

Write-Step "4/7 - Upload archive (scp)"
Invoke-Scp $ArchiveLocal $ArchiveRemote

Write-Step "5/7 - Load image on VPS + record rollback tag"
Invoke-SshBash @"
set -euo pipefail
cd '$VpsPath'
if docker image inspect '$TagLatest' >/dev/null 2>&1; then
  ROLLBACK_TAG='${ImageName}:rollback-${Timestamp}'
  docker tag '$TagLatest' "`$ROLLBACK_TAG"
  echo "`$ROLLBACK_TAG" > '$RollbackFile'
  echo "Saved rollback: `$ROLLBACK_TAG"
fi
if [[ '$ArchiveRemoteName' == *.tar.gz ]]; then
  gunzip -c '$ArchiveRemote' | docker load
else
  docker load -i '$ArchiveRemote'
fi
docker image inspect '$TagDeploy' >/dev/null
docker tag '$TagDeploy' '$TagLatest'
"@

Write-Step "6/7 - docker compose up -d (NO --build)"
Invoke-SshBash @"
set -euo pipefail
cd '$VpsPath'
test -f '$EnvFile'
if grep -q '^CHAPMEE_WEB_IMAGE=' '$EnvFile'; then
  sed -i 's|^CHAPMEE_WEB_IMAGE=.*|CHAPMEE_WEB_IMAGE=$TagLatest|' '$EnvFile'
else
  echo 'CHAPMEE_WEB_IMAGE=$TagLatest' >> '$EnvFile'
fi
docker compose -f '$ComposeFile' --env-file '$EnvFile' up -d --pull never
"@

Write-Step "7/7 - Verify"
Start-Sleep -Seconds 8
Invoke-Ssh "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -20"
try {
    Invoke-Ssh "curl -sf http://127.0.0.1:3000/api/health"
    Write-Host "Health check: OK" -ForegroundColor Green
}
catch {
    Write-Host "Health check FAILED - try rollback:" -ForegroundColor Red
    Write-Host "  powershell -File scripts\deploy\deploy-local-to-vps.ps1 -Rollback"
    throw
}

if (Test-Path $ArchiveLocal) {
    Remove-Item $ArchiveLocal -Force
}

Write-Host ""
Write-Host "Deploy OK" -ForegroundColor Green
Write-Host "  Image: $TagDeploy"
Write-Host "  Rollback: deploy-local-to-vps.ps1 -Rollback"
Write-Host "  Logs: ssh $SshTarget 'cd $VpsPath && docker compose -f $ComposeFile --env-file $EnvFile logs -f web'"
