# Copy ChapMee default mascot avatars into public/images/default-avatars.
# Usage (from repo root):
#   powershell -File scripts/copy-default-avatars.ps1
# Optional source folder:
#   powershell -File scripts/copy-default-avatars.ps1 -SourceDir "C:\path\to\source"

param(
  [string]$SourceDir = "C:\Users\trong\OneDrive\Máy tính\XNCONVERT\ẢNH ĐẠI DIỆN MÈO"
)

$repoRoot = Split-Path $PSScriptRoot -Parent
$destDir = Join-Path $repoRoot "public\images\default-avatars"

if (-not (Test-Path $SourceDir)) {
  Write-Error "Source folder not found: $SourceDir"
  exit 1
}

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

$files = Get-ChildItem $SourceDir -Filter "*.webp" | Sort-Object Name
if ($files.Count -ne 30) {
  Write-Warning "Expected 30 .webp files, found $($files.Count)."
}

for ($i = 0; $i -lt $files.Count; $i++) {
  $num = "{0:D2}" -f ($i + 1)
  $target = Join-Path $destDir "chapmee-avatar-$num.webp"
  Copy-Item $files[$i].FullName $target -Force
}

Write-Host "Copied $($files.Count) avatars to $destDir"
