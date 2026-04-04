param(
  [Parameter(Mandatory = $false)]
  [string] $DumpPath,
  [switch] $SkipList
)
# اعتبارسنجی فایل dump بدون نوشتن روی دیتابیس اصلی: pg_restore --list
# همچنین می‌تواند روی دیتابیس تست بازیابی کند اگر TEST_DATABASE_URL ست باشد.
# RPO: حداکثر داده‌ای که با از دست رفتن بکاپ از دست می‌رود (بین دو بکاپ).
# RTO: حداکثر زمان از قطعی تا سرویس دوباره بالا (بکاپ + بازیابی + deploy).
$ErrorActionPreference = "Stop"

if (-not $DumpPath) {
  $dir = Join-Path $PSScriptRoot "..\server\backups"
  if (Test-Path $dir) {
    $DumpPath = Get-ChildItem -Path $dir -Filter "pg-*.dump" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
  }
}
if (-not $DumpPath -or -not (Test-Path $DumpPath)) {
  throw "DumpPath not found. Run scripts/pg-backup.ps1 first or pass -DumpPath"
}

if (-not $SkipList) {
  Write-Host "[verify] pg_restore --list (structure check)"
  & pg_restore --list $DumpPath | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "pg_restore --list failed — dump corrupt or wrong format" }
  Write-Host "[verify] list OK"
}

$turl = $env:TEST_DATABASE_URL
if ($turl) {
  Write-Host "[verify] restoring to TEST_DATABASE_URL (isolated DB only)"
  & pg_restore --dbname=$turl --clean --if-exists --no-owner --no-acl $DumpPath
  if ($LASTEXITCODE -ne 0) { throw "pg_restore to test DB failed" }
  Write-Host "[verify] restore to test DB OK — drop test DB manually if needed"
} else {
  Write-Host "[verify] TEST_DATABASE_URL not set — skipped full restore test (set for CI/staging)"
}
