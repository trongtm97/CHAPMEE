# Copy minimal ChapMee production bundle for manual VPS upload.
# Usage: powershell -File scripts/copy-vps-bundle.ps1

$ErrorActionPreference = "Stop"
$src = "D:\PROGRAM-TRONG\CHAPCHAP"
$dst = "D:\PROGRAM-TRONG\Chapmee\app"

if (-not (Test-Path $src)) {
  Write-Error "Source not found: $src"
}

New-Item -ItemType Directory -Force -Path $dst | Out-Null

$excludeDirs = @(
  "node_modules", ".next", ".git", "docs", "backups", "coverage", "dist", "out",
  ".cursor", ".vscode", ".idea", ".github", ".codex-screenshots"
)

$xd = ($excludeDirs | ForEach-Object { "/XD", $_ }) -join " "

# Exclude heavy / dev-only files at root
$excludeFiles = @(
  ".env.local", ".env.production", "chapters.json", "imports.json",
  "tsconfig.tsbuildinfo", "package-lock.json",
  "docker-compose.local.yml", "docker-compose.yml",
  "DEPLOY_VIETNIX.md", "INFRA_MIGRATION.md", "LOCAL_SETUP.md",
  "LOCAL_MEDIA_MIGRATION.md", "MEDIA_PLATFORM.md", "README.md",
  "CHAPMEE_SKILLS.md", "DESIGN.md", "SEO_AUDIT_REPORT.md",
  "*.log", ".next-dev*"
)

$xf = ($excludeFiles | ForEach-Object { "/XF", $_ }) -join " "

Write-Host "Copying production bundle..."
Write-Host "  From: $src"
Write-Host "  To:   $dst"

$robocopyArgs = @(
  $src, $dst,
  "/E", "/R:2", "/W:2", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np"
) + ($excludeDirs | ForEach-Object { "/XD"; $_ }) + ($excludeFiles | ForEach-Object { "/XF"; $_ })

& robocopy @robocopyArgs | Out-Null
# Robocopy exit 0-7 = success
if ($LASTEXITCODE -ge 8) {
  Write-Error "robocopy failed with exit $LASTEXITCODE"
}

$readme = @"
ChapMee — VPS upload bundle (production)
=========================================
Generated from CHAPCHAP repo. Upload this folder to /opt/chapmee/app on VPS.

Included: source for Docker build, compose, Caddy, migrations, deploy/backup scripts.
Excluded: node_modules, .next, docs, .git, .env.local, logs, dev compose.

On VPS after upload:
  1. cp .env.production.example -> /opt/chapmee/.env.production (edit secrets)
  2. docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
  3. See docs on dev machine: DEPLOY_VIETNIX_PRODUCTION.md (not uploaded to save space)

Full guide path on PC: D:\PROGRAM-TRONG\CHAPCHAP\docs\DEPLOY_VIETNIX_PRODUCTION.md
"@

Set-Content -Path (Join-Path $dst "UPLOAD_README.txt") -Value $readme -Encoding UTF8

Write-Host "Done. Bundle at: $dst"
Write-Host "Next: upload to VPS (zip/rsync/scp), then follow UPLOAD_README.txt"
