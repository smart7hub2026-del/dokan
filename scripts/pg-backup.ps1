# نمونه بکاپ PostgreSQL (نیاز: pg_dump در PATH، DATABASE_URL در env)
# استفاده: .\scripts\pg-backup.ps1
# RPO: با cron هر N ساعت، حداکثر N ساعت تراکنش ممکن است از دست برود.
# بعد از بکاپ: .\scripts\pg-restore-verify.ps1 (و در صورت تمایل TEST_DATABASE_URL برای بازیابی آزمایشی)
$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) { throw "DATABASE_URL is not set" }
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$out = Join-Path $PSScriptRoot "..\server\backups\pg-$stamp.dump"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
& pg_dump --dbname=$env:DATABASE_URL -Fc -f $out
Write-Host "Wrote $out"
