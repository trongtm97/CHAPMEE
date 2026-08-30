# ChapMee — One-shot deploy script (PowerShell 5.1+ compatible)
# Chạy trên máy local Windows, deploy toàn bộ lên VPS qua SSH.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy\deploy-vps.ps1
#
# SSH sẽ tự prompt password. KHÔNG paste password vào đây.

$ErrorActionPreference = "Stop"

# ===== Config =====
$VpsHost = "14.225.211.205"
$VpsUser = "deploy"
$AppDir = "/opt/chapmee/app"

$S3Endpoint     = "https://s3.vn-hcm-1.vietnix.cloud"
$S3Region       = "vn-hcm-1"
$S3MediaBucket  = "chapmee-media"
$S3TextBucket   = "chapmee-text"
$S3AccessKeyId  = "f248b5a9c1b49c3b69M2"
$S3SecretKey    = "EE3acCqv2gA2VBIPOrEdo29IaK3qrFFygu9Begvn"
$S3MediaBaseUrl = "https://media.chapmee.com"

# ===== Banner =====
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  ChapMee deploy -> $VpsUser@$VpsHost" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SSH se tu prompt password. Script se:" -ForegroundColor Yellow
Write-Host "  1. Backup DB"
Write-Host "  2. Pull code moi"
Write-Host "  3. Sua .env.production (S3 config)"
Write-Host "  4. Chay migrations"
Write-Host "  5. Xoa content cu (reels/community/comments)"
Write-Host "  6. Build + restart Docker"
Write-Host "  7. Verify"
Write-Host ""
Read-Host "Nhan Enter de tiep tuc, hoac Ctrl+C de huy" | Out-Null

# ===== Helpers =====
function Run-Ssh {
    param(
        [Parameter(Mandatory)][string]$Cmd,
        [string]$Title = ""
    )
    if ($Title) { Write-Host ""; Write-Host "=== $Title ===" -ForegroundColor Magenta }
    # Use single-quoted here-string for the command (no PowerShell interpolation)
    ssh -o StrictHostKeyChecking=accept-new -p 22 "${VpsUser}@${VpsHost}" $Cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: $Title" -ForegroundColor Red
        $choice = Read-Host "Tiep tuc? (y/n)"
        if ($choice -ne "y") { exit 1 }
    }
}

# ===== 1. Backup DB =====
$backupFile = "chapmee-pre-s3-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql.gz"
$cmd1 = @'
mkdir -p /opt/backups/chapmee-pre-s3
cd /opt/chapmee/app
docker compose -f docker-compose.production.yml exec -T postgres pg_dump -U chapmee -d chapmee --no-owner --no-acl
'@
$cmd1gz = "echo '$backupFile'"
Run-Ssh "$cmd1 | gzip > /opt/backups/chapmee-pre-s3/$backupFile" "1/8 - Backup Postgres"
Run-Ssh "ls -lh /opt/backups/chapmee-pre-s3/$backupFile" "1/8 - Verify backup"

# ===== 2. Pull code =====
Run-Ssh "cd $AppDir ; git fetch origin" "2/8 - Git fetch"
Run-Ssh "cd $AppDir ; git pull origin main" "2/8 - Git pull"
Run-Ssh "cd $AppDir ; grep -E 'minio' docker-compose.production.yml || echo OK" "2/8 - Verify compose (khong con minio)"

# ===== 3. Sửa .env.production =====
Run-Ssh "cd $AppDir ; cp -n .env.production .env.production.bak.\$(date +%s) 2>/dev/null ; ls -la .env.production*" "3/8 - Backup env cu"

# Build env mới (PowerShell builds, SSH writes)
$envBlock = @"
S3_ENDPOINT=$S3Endpoint
S3_REGION=$S3Region
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=$S3AccessKeyId
S3_SECRET_ACCESS_KEY=$S3SecretKey
S3_MEDIA_BUCKET=$S3MediaBucket
S3_MEDIA_PUBLIC_BASE_URL=$S3MediaBaseUrl
NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=$S3MediaBaseUrl
S3_TEXT_BUCKET=$S3TextBucket
"@
$envB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($envBlock))

$cmd3 = @"
cd $AppDir ; sed -i '/^S3_BUCKET=/d; /^S3_PUBLIC_BASE_URL=/d; /^NEXT_PUBLIC_S3_PUBLIC_BASE_URL=/d; /^MINIO_ROOT_/d' .env.production ; echo '$envB64' | base64 -d >> .env.production
"@
Run-Ssh $cmd3 "3/8 - Ghi de env moi"
Run-Ssh "cd $AppDir ; grep -E '^(S3_|NEXT_PUBLIC_S3_)' .env.production" "3/8 - Verify env cuoi"

# ===== 4. Migrations =====
Run-Ssh "cd $AppDir ; npm run env:validate -- --file .env.production 2>&1 | head -30" "4/8 - Validate env"
Run-Ssh "cd $AppDir ; psql \"\$DATABASE_URL\" -f drizzle/0034_reels_content_s3.sql 2>&1 | tail -5" "4/8 - Migration 0034 reels"
Run-Ssh "cd $AppDir ; psql \"\$DATABASE_URL\" -f drizzle/0035_community_posts_content_s3.sql 2>&1 | tail -5" "4/8 - Migration 0035 community"
Run-Ssh "cd $AppDir ; psql \"\$DATABASE_URL\" -f drizzle/0036_comments_content_s3.sql 2>&1 | tail -5" "4/8 - Migration 0036 comments"

# ===== 5. Clear old content =====
Write-Host ""
Write-Host "=== 5/8 - Dry-run clear old text content ===" -ForegroundColor Magenta
Run-Ssh "cd $AppDir ; docker compose -f docker-compose.production.yml run --rm web npx tsx scripts/clear-old-text-content.ts --dry-run 2>&1 | tail -10" "5/8 - Dry-run"

$confirm = Read-Host "`nXoa that reels/community/comments body cu? (yes/no)"
if ($confirm -eq "yes") {
    Run-Ssh "cd $AppDir ; docker compose -f docker-compose.production.yml run --rm web npx tsx scripts/clear-old-text-content.ts 2>&1 | tail -10" "5/8 - Clear that"
} else {
    Write-Host "Bo qua buoc 5." -ForegroundColor Yellow
}

# ===== 6. Build + restart =====
Run-Ssh "cd $AppDir ; docker compose -f docker-compose.production.yml --env-file .env.production build web 2>&1 | tail -20" "6/8 - Build image web"
Run-Ssh "cd $AppDir ; docker compose -f docker-compose.production.yml --env-file .env.production up -d 2>&1 | tail -20" "6/8 - Up stack"

# ===== 7. Verify =====
Run-Ssh "cd $AppDir ; sleep 15 ; docker compose -f docker-compose.production.yml ps" "7/8 - Containers status"
Run-Ssh "cd $AppDir ; docker compose -f docker-compose.production.yml logs --tail=50 web 2>&1 | grep -iE 's3|error|ready|listening' | head -20" "7/8 - Web logs"
Run-Ssh "cd $AppDir ; psql \"\$DATABASE_URL\" -c '\\d reels_items' 2>&1 | grep -E 'content_storage_type|content_object_key|body_preview'" "7/8 - Schema reels"
Run-Ssh "cd $AppDir ; psql \"\$DATABASE_URL\" -c '\\d community_posts' 2>&1 | grep -E 'content_storage_type|content_object_key|content_preview'" "7/8 - Schema community"
Run-Ssh "cd $AppDir ; psql \"\$DATABASE_URL\" -c '\\d comments' 2>&1 | grep -E 'content_storage_type|content_object_key|content_preview'" "7/8 - Schema comments"

# ===== 8. Test ảnh =====
Run-Ssh "curl -sI https://media.chapmee.com/chapmee-tts-batch-1.webp 2>&1 | head -3" "8/8 - Test media URL ngan"

# ===== Done =====
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  DEPLOY HOAN TAT" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Buoc tiep theo:" -ForegroundColor Cyan
Write-Host "1. Truy cap https://chapmee.com - verify homepage load"
Write-Host "2. Studio -> upload 1 reel moi, 1 comment moi"
Write-Host "3. Check DB: psql -c \"select id, content_storage_type from reels_items where content_storage_type='s3' limit 3\""
Write-Host "4. ROTATE access key tren Vietnix panel (key da gui trong chat)"
Write-Host "5. Setup cron backup S3 (xem docs/DEPLOY_VIETNIX_S3_FULL.md section 9)"
Write-Host ""
Write-Host "Luu y:" -ForegroundColor Yellow
Write-Host "- Key S3 da bi lo trong chat, can rotate NGAY sau khi deploy xong"
Write-Host "- Neu curl test URL o buoc 8 tra 200, setup thanh cong"
Write-Host "- Logs: docker compose -f docker-compose.production.yml logs -f web"
Write-Host ""
