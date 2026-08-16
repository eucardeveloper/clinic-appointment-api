# ============================================================
# clinic-api Refactoring Script
# Calistirmak icin: PowerShell'i Admin olarak ac, proje dizinine gel,
# .\git_refactor_clinic.ps1 komutunu calistir
# ============================================================

$ErrorActionPreference = "Stop"
$root = "C:\Users\enes_\OneDrive\Desktop\klinik-api"
Set-Location $root

Write-Host "=== Clinic API Refactoring Basladi ===" -ForegroundColor Cyan

# -------------------------------------------------------
# 1. ESKi DOSYALARI SIL (git rm ile izlensin)
# -------------------------------------------------------
Write-Host "`n[1/5] Eski dosyalar siliniyor..." -ForegroundColor Yellow

$oldFiles = @(
    "src\main\java\com\enesucar\klinik_api\KlinikApiApplication.java",
    "src\main\java\com\enesucar\klinik_api\CorsConfig.java",
    "src\main\java\com\enesucar\klinik_api\controller\TerminController.java",
    "src\main\java\com\enesucar\klinik_api\entity\Termin.java",
    "src\main\java\com\enesucar\klinik_api\service\TerminService.java",
    "src\main\java\com\enesucar\klinik_api\dto\TerminRequest.java",
    "src\main\java\com\enesucar\klinik_api\dto\TerminResponse.java",
    "src\main\java\com\enesucar\klinik_api\exception\TerminNotFoundException.java",
    "src\main\java\com\enesucar\klinik_api\exception\GlobalExceptionHandler.java",
    "src\main\java\com\enesucar\klinik_api\repository\TerminRepository.java",
    "src\test\java\com\enesucar\klinik_api\KlinikApiApplicationTests.java"
)

foreach ($f in $oldFiles) {
    $fullPath = Join-Path $root $f
    if (Test-Path $fullPath) {
        git rm -f $fullPath | Out-Null
        Write-Host "  Silindi: $f" -ForegroundColor Gray
    } else {
        Write-Host "  Bulunamadi (zaten yok): $f" -ForegroundColor DarkGray
    }
}

# -------------------------------------------------------
# 2. ESKi KLASORU SIL (bos kaldiysa)
# -------------------------------------------------------
Write-Host "`n[2/5] Eski klinik_api klasoru temizleniyor..." -ForegroundColor Yellow

$oldDirs = @(
    "src\main\java\com\enesucar\klinik_api\controller",
    "src\main\java\com\enesucar\klinik_api\entity",
    "src\main\java\com\enesucar\klinik_api\service",
    "src\main\java\com\enesucar\klinik_api\dto",
    "src\main\java\com\enesucar\klinik_api\exception",
    "src\main\java\com\enesucar\klinik_api\repository",
    "src\main\java\com\enesucar\klinik_api",
    "src\test\java\com\enesucar\klinik_api"
)

foreach ($d in $oldDirs) {
    $fullPath = Join-Path $root $d
    if (Test-Path $fullPath) {
        $items = Get-ChildItem $fullPath -Recurse -File
        if ($items.Count -eq 0) {
            Remove-Item $fullPath -Recurse -Force
            Write-Host "  Klasor silindi: $d" -ForegroundColor Gray
        }
    }
}

# -------------------------------------------------------
# 3. YENI DOSYALARI GIT'E EKLE
# -------------------------------------------------------
Write-Host "`n[3/5] Yeni dosyalar git'e ekleniyor..." -ForegroundColor Yellow

$newFiles = @(
    "src\main\java\com\enesucar\clinic_api\ClinicApiApplication.java",
    "src\main\java\com\enesucar\clinic_api\CorsConfig.java",
    "src\main\java\com\enesucar\clinic_api\controller\AppointmentController.java",
    "src\main\java\com\enesucar\clinic_api\entity\Appointment.java",
    "src\main\java\com\enesucar\clinic_api\service\AppointmentService.java",
    "src\main\java\com\enesucar\clinic_api\dto\AppointmentRequest.java",
    "src\main\java\com\enesucar\clinic_api\dto\AppointmentResponse.java",
    "src\main\java\com\enesucar\clinic_api\exception\AppointmentNotFoundException.java",
    "src\main\java\com\enesucar\clinic_api\exception\GlobalExceptionHandler.java",
    "src\main\java\com\enesucar\clinic_api\repository\AppointmentRepository.java",
    "src\test\java\com\enesucar\clinic_api\ClinicApiApplicationTests.java",
    "src\main\resources\application.properties",
    "pom.xml"
)

foreach ($f in $newFiles) {
    $fullPath = Join-Path $root $f
    if (Test-Path $fullPath) {
        git add $fullPath | Out-Null
        Write-Host "  Eklendi: $f" -ForegroundColor Gray
    } else {
        Write-Host "  UYARI - Bulunamadi: $f" -ForegroundColor Red
    }
}

# -------------------------------------------------------
# 4. FRONTEND KLASORUNU YENIDEN ADLANDIR
# -------------------------------------------------------
Write-Host "`n[4/5] Frontend klasoru yeniden adlandiriliyor..." -ForegroundColor Yellow

$oldFrontend = Join-Path $root "frontend\klinik-app"
$newFrontend = Join-Path $root "frontend\clinic-app"

if (Test-Path $oldFrontend) {
    # Git ile takip edilen dosyaları taşı
    $trackedFiles = git ls-files "frontend/klinik-app" 2>$null
    if ($trackedFiles) {
        foreach ($tf in $trackedFiles) {
            $newTf = $tf -replace "^frontend/klinik-app", "frontend/clinic-app"
            $srcPath = Join-Path $root ($tf -replace "/", "\")
            $dstPath = Join-Path $root ($newTf -replace "/", "\")
            $dstDir = Split-Path $dstPath
            if (-not (Test-Path $dstDir)) {
                New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
            }
            git mv $srcPath $dstPath 2>$null
        }
        Write-Host "  Git mv ile frontend/klinik-app -> frontend/clinic-app tamamlandi" -ForegroundColor Gray
    } else {
        # git takibi yoksa sadece rename
        Rename-Item $oldFrontend $newFrontend
        git add "frontend\clinic-app" 2>$null
        Write-Host "  Rename ile frontend/klinik-app -> frontend/clinic-app tamamlandi" -ForegroundColor Gray
    }
} else {
    Write-Host "  frontend\klinik-app bulunamadi, atlaniyor" -ForegroundColor DarkGray
}

# -------------------------------------------------------
# 5. GIT COMMIT VE PUSH
# -------------------------------------------------------
Write-Host "`n[5/5] Git commit ve push yapiliyor..." -ForegroundColor Yellow

git status --short

$commitMsg = "refactor: rename package klinik_api->clinic_api, translate German names to English

- Package renamed: com.enesucar.klinik_api -> com.enesucar.clinic_api
- Classes renamed: Termin->Appointment, KlinikApiApplication->ClinicApiApplication (and all related)
- Fields renamed: arztName->doctorName, terminZeit->appointmentTime, abteilung->department
- Methods renamed: alleTermine->getAllAppointments, terminSpeichern->saveAppointment, etc.
- Validation messages translated to English
- Exception message translated: 'Appointment not found with ID:'
- pom.xml artifactId: klinik-api -> clinic-api
- application.properties: spring.application.name=clinic-api
- frontend folder: klinik-app -> clinic-app
- API endpoint: /api/termine -> /api/appointments"

git commit -m $commitMsg

Write-Host "`nPush yapiliyor..." -ForegroundColor Yellow
git push

Write-Host "`n=== Refactoring Tamamlandi! ===" -ForegroundColor Green
Write-Host "Yeni paket yapisi: com.enesucar.clinic_api" -ForegroundColor Cyan
Write-Host "Tum Alman isimleri Ingilizce'ye cevrildi." -ForegroundColor Cyan
