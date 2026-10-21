# ==============================================================================
# VODACOM ERP - ONE-CLICK SUPABASE TO LOCAL DEDICATED SERVER MIGRATION
# Run as Administrator on the Windows Dedicated Server (160.25.62.187)
# ==============================================================================
$ErrorActionPreference = "Stop"

$AppRoot = "C:\vodacom-erp"
$BackendDir = "$AppRoot\backend"
$PythonExe = "$BackendDir\venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  VODACOM ERP - MIGRATING DATABASE FROM SUPABASE TO SERVER  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Ensure data and backups folders exist
New-Item -ItemType Directory -Force -Path "$AppRoot\data" | Out-Null
New-Item -ItemType Directory -Force -Path "$AppRoot\backups" | Out-Null

# 2. Run the Python migration script (copies 100% of rows + updates backend\.env)
Write-Host "`n[1/4] Copying all tables & records from Supabase to C:\vodacom-erp\data\vodacom_erp.db..." -ForegroundColor Yellow
& $PythonExe "$BackendDir\migrate_from_supabase.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed! Backend .env was NOT changed." -ForegroundColor Red
    exit 1
}

# 3. Create initial compressed backup
Write-Host "`n[2/4] Creating initial compressed database backup..." -ForegroundColor Yellow
& $PythonExe "$BackendDir\backup_local_db.py"

# 4. Register Daily Automated Backup Task in Windows Task Scheduler (2:00 AM daily)
Write-Host "`n[3/4] Registering automated daily backup task (VodacomDailyDbBackup)..." -ForegroundColor Yellow
try {
    $TaskName = "VodacomDailyDbBackup"
    $Action = New-ScheduledTaskAction -Execute $PythonExe -Argument "`"$BackendDir\backup_local_db.py`"" -WorkingDirectory $BackendDir
    $Trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
    $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Force | Out-Null
    Write-Host "   ✅ Scheduled daily backup at 2:00 AM -> C:\vodacom-erp\backups\" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Could not register scheduled task automatically: $_" -ForegroundColor DarkYellow
}

# 5. Restart VodacomBackend service to use the new local database
Write-Host "`n[4/4] Restarting VodacomBackend service..." -ForegroundColor Yellow
Restart-Service VodacomBackend -Force
Start-Sleep -Seconds 3

$Svc = Get-Service VodacomBackend
Write-Host "   ✅ VodacomBackend Status: $($Svc.Status)" -ForegroundColor Green
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  🎉 SUCCESS! Vodacom ERP is now running 100% on your server!" -ForegroundColor Green
Write-Host "  📁 Live Database : C:\vodacom-erp\data\vodacom_erp.db" -ForegroundColor White
Write-Host "  💾 Daily Backups : C:\vodacom-erp\backups\" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
