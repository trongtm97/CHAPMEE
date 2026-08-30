# Pack ChapMee source for VPS upload (no node_modules, .next, secrets, or dev-only files).
$ErrorActionPreference = "Stop"
$src = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dst = Join-Path (Split-Path $src -Parent) "ChapMee VPS"

if (Test-Path $dst) {
  Remove-Item $dst -Recurse -Force
}
New-Item -ItemType Directory -Path $dst -Force | Out-Null

$excludeDirs = @(
  "node_modules",
  ".next",
  ".git",
  "backups",
  "coverage",
  "ChapMee VPS",
  ".codex-screenshots",
  ".cursor"
)

$excludeFiles = @(
  ".env",
  ".env.local",
  ".env.production",
  "tsconfig.tsbuildinfo",
  "docker-compose.local.yml",
  "chapters.json",
  "imports.json"
)

$xd = ($excludeDirs | ForEach-Object { "/XD"; $_ }) -join " "
$xf = ($excludeFiles | ForEach-Object { "/XF"; $_ }) -join " "

$robocopyArgs = @(
  $src,
  $dst,
  "/E",
  "/XD", $excludeDirs,
  "/XF", $excludeFiles,
  "/XF", "*.log",
  "/NFL",
  "/NDL",
  "/NJH",
  "/NJS",
  "/NC",
  "/NS"
)
& robocopy @robocopyArgs | Out-Null
# Robocopy exit codes 0-7 = success
if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

$readme = @"
ChapMee — gói deploy lên VPS
============================

Đã loại: node_modules, .next, .git, .env.local, backup, docker-compose.local.yml, log dev.

Trên VPS (Ubuntu):
  1. Giải nén vào /opt/chapmee/app
  2. cp .env.example .env.production   (chỉnh secret — KHÔNG dùng file .env.local từ máy dev)
  3. docker compose up -d --build
  4. docker compose exec app node scripts/db-migrate-foundation.mjs
  5. docker compose exec app node scripts/db-apply-legacy-migrations.mjs

Chi tiết: DEPLOY_VIETNIX.md trong thư mục này.

Backup DB trên VPS (sau khi chạy): ./scripts/backup-db.sh → /opt/backups/chapmee-db/

Media: sync MinIO/S3 riêng (xem LOCAL_MEDIA_MIGRATION.md nếu migrate từ local).
"@
Set-Content -Path (Join-Path $dst "README_VPS.txt") -Value $readme -Encoding UTF8

$files = Get-ChildItem $dst -Recurse -File -ErrorAction SilentlyContinue
$sizeMb = [math]::Round(($files | Measure-Object Length -Sum).Sum / 1MB, 2)
$fileCount = $files.Count

Write-Host "Done: $dst"
Write-Host "Files: $fileCount | Size: $sizeMb MB"
Write-Host "Next: nén folder 'ChapMee VPS' thanh .zip roi upload len VPS."
