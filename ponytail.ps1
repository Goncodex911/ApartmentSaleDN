<#
.SYNOPSIS
    Ponytail CLI Helper for ApartmentSaleProject
.DESCRIPTION
    Hỗ trợ gọi công cụ Ponytail trực tiếp từ Terminal
    Ví dụ:
        .\ponytail review
        .\ponytail audit
        .\ponytail help
#>

param (
    [Parameter(Position=0)]
    [string]$Command,

    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$ArgsRemaining
)

function Show-Help {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "   PONYTAIL CLI - The Lazy Senior Dev     " -ForegroundColor Magenta
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "'The best code is the code you never wrote.'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Cú pháp sử dụng trong Terminal:"
    Write-Host "  .\ponytail review   : Yêu cầu AI rà soát code thừa, over-engineering"
    Write-Host "  .\ponytail audit    : Kiểm tra toàn bộ project về dependencies và độ phức tạp"
    Write-Host "  .\ponytail help     : Xem trợ giúp"
    Write-Host ""
    Write-Host "Lưu ý: Trong khung Chat với AI, bạn chỉ cần gõ:" -ForegroundColor Yellow
    Write-Host "  - 'ponytail: <yêu cầu code tối giản>'" -ForegroundColor White
    Write-Host "  - 'ponytail review' hoặc 'ponytail-review'" -ForegroundColor White
    Write-Host ""
}

if ($Command -eq "review") {
    Write-Host "[PONYTAIL REVIEW] Để AI thực hiện review, hãy gõ trong khung Chat:" -ForegroundColor Green
    Write-Host "-> 'ponytail review'" -ForegroundColor Yellow
    Write-Host "AI sẽ quét các file đã thay đổi, chỉ ra chính xác các dòng cần cắt giảm và tối ưu." -ForegroundColor Gray
    exit 0
}

elseif ($Command -eq "audit") {
    Write-Host "[PONYTAIL AUDIT] Kiểm tra sơ bộ dự án..." -ForegroundColor Cyan
    $jsFiles = Get-ChildItem -Path $PSScriptRoot -Include *.js,*.ts,*.tsx,*.jsx -Recurse -Exclude node_modules,dist,build
    Write-Host "Tổng số file mã nguồn: $($jsFiles.Count)" -ForegroundColor White
    Write-Host "Gõ 'ponytail audit' trong chat AI để nhận báo cáo audit toàn diện." -ForegroundColor Yellow
    exit 0
}

else {
    Show-Help
}

