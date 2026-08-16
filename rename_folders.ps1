# Masaüstündeki proje klasörlerini İngilizce'ye rename et

$desktop = "$env:USERPROFILE\OneDrive\Desktop"

$renames = @(
    @{ From = "klinik-api";        To = "clinic-api" },
    @{ From = "lagerverwaltung";   To = "inventory-management" },
    @{ From = "kundenverwaltung";  To = "customer-management" }
)

foreach ($item in $renames) {
    $oldPath = Join-Path $desktop $item.From
    $newPath = Join-Path $desktop $item.To

    if (Test-Path $oldPath) {
        Rename-Item -Path $oldPath -NewName $item.To
        Write-Host "✅ $($item.From)  →  $($item.To)" -ForegroundColor Green
    } elseif (Test-Path $newPath) {
        Write-Host "⏭️  $($item.To) zaten mevcut, atlandı." -ForegroundColor Yellow
    } else {
        Write-Host "❌ $($item.From) bulunamadı!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Tamamlandı!" -ForegroundColor Cyan
