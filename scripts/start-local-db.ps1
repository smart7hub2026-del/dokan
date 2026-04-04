# راه‌اندازی PostgreSQL لوکال با Docker — اگر Docker نصب نیست، پیام راهنما
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot
Set-Location $root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "Docker روی این سیستم پیدا نشد." -ForegroundColor Yellow
  Write-Host "۱) Docker Desktop برای ویندوز را از https://www.docker.com/products/docker-desktop/ نصب کنید و یک‌بار Restart کنید."
  Write-Host "۲) یا PostgreSQL 16 را جداگانه نصب کنید، دیتابیس «dokanyar» بسازید و DATABASE_URL را در .env بگذارید."
  Write-Host ""
  exit 1
}

docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[OK] PostgreSQL در حال اجراست روی پورت 5432" -ForegroundColor Green
Write-Host "حالا یک‌بار اجرا کنید: npm run db:migrate"
