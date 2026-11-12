<#
.SYNOPSIS
    BMAD CLI Helper for ApartmentSaleProject
.DESCRIPTION
    Hỗ trợ gọi lệnh bmad trực tiếp từ Terminal (PowerShell)
    Ví dụ: 
        .\bmad create story "Xác thực JWT"
        .\bmad list
        .\bmad dev "STORY-1.1"
#>

param (
    [Parameter(Position=0)]
    [string]$Command,

    [Parameter(Position=1)]
    [string]$SubCommand,

    [Parameter(Position=2, ValueFromRemainingArguments=$true)]
    [string[]]$ArgsRemaining
)

$TasksDir = Join-Path $PSScriptRoot "tasks"
if (-not (Test-Path $TasksDir)) {
    New-Item -ItemType Directory -Path $TasksDir -Force | Out-Null
}

function Show-Help {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "   BMAD CLI - Apartment Sale Project      " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Cú pháp sử dụng:"
    Write-Host "  .\bmad create story `"<Tên story>`"     : Tạo một file story mẫu trong tasks/"
    Write-Host "  .\bmad list                             : Xem danh sách các story hiện có"
    Write-Host "  .\bmad dev `"<Mã story>`"                : Hiển thị nội dung story cần lập trình"
    Write-Host "  .\bmad help                             : Xem trợ giúp"
    Write-Host ""
    Write-Host "Lưu ý: Trong khung Chat với AI, bạn chỉ cần gõ:" -ForegroundColor Yellow
    Write-Host "  - 'bmad create story: <tên tính năng>'" -ForegroundColor White
    Write-Host "  - 'bmad-dev: <tên file story>'" -ForegroundColor White
    Write-Host ""
}

if ($Command -eq "create" -and $SubCommand -eq "story") {
    $Title = ($ArgsRemaining -join " ").Trim()
    if (-not $Title) {
        $Title = Read-Host "Nhập tên tính năng/story"
    }

    $Count = (Get-ChildItem -Path $TasksDir -Filter "*.md").Count + 1
    $Slug = ($Title.ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
    $FileName = "STORY-$Count-$Slug.md"
    $FilePath = Join-Path $TasksDir $FileName

    $Template = @"
# STORY-${Count}: $Title

## 1. Mô tả (User Story)
* **Là một:** [Vai trò người dùng: Admin / Manager / CTV]
* **Tôi muốn:** [Hành động mong muốn]
* **Để:** [Giá trị mang lại]

## 2. Tiêu chuẩn chấp nhận (Acceptance Criteria - Gherkin)
* **AC1: Kịch bản thành công**
  * Given: [Điều kiện ban đầu]
  * When: [Hành động kích hoạt]
  * Then: [Kết quả kỳ vọng]

## 3. Phạm vi Kỹ thuật (Technical Scope)
* **Backend:** [Các file Controller, Service, Model cần tạo/sửa]
* **Frontend:** [Các component, API hook cần tạo/sửa]
* **Database:** [Các collection/field MongoDB liên quan]

## 4. Định nghĩa Hoàn thành (Definition of Done)
- [ ] Code tuân thủ WORKING_RULES.md (không tự ý commit git).
- [ ] Tự kiểm tra cú pháp và build không có lỗi.
- [ ] Đã kiểm thử theo đúng Acceptance Criteria.
"@

    Set-Content -Path $FilePath -Value $Template -Encoding UTF8
    Write-Host "[THÀNH CÔNG] Đã tạo file story mới:" -ForegroundColor Green
    Write-Host "-> $FilePath" -ForegroundColor Cyan
    Write-Host "Bây giờ bạn có thể yêu cầu AI: 'bmad-dev $FileName'" -ForegroundColor Yellow
    exit 0
}

elseif ($Command -eq "list") {
    Write-Host "`n--- DANH SÁCH STORIES TRONG TASKS/ ---" -ForegroundColor Cyan
    $Files = Get-ChildItem -Path $TasksDir -Filter "*.md"
    if ($Files.Count -eq 0) {
        Write-Host "Chưa có file story nào trong thư mục tasks/." -ForegroundColor Yellow
    } else {
        foreach ($f in $Files) {
            Write-Host "• $($f.Name)" -ForegroundColor White
        }
    }
    Write-Host ""
    exit 0
}

elseif ($Command -eq "dev") {
    $Target = ($SubCommand + " " + ($ArgsRemaining -join " ")).Trim()
    if (-not $Target) {
        Write-Host "Vui lòng nhập tên file story (VD: .\bmad dev STORY-1.1)" -ForegroundColor Red
        exit 1
    }
    $Match = Get-ChildItem -Path $TasksDir -Filter "*$Target*" | Select-Object -First 1
    if ($Match) {
        Write-Host "[BMAD-DEV] Nội dung story $($Match.Name):" -ForegroundColor Green
        Get-Content $Match.FullName
    } else {
        Write-Host "[LỖI] Không tìm thấy story khớp với '$Target'" -ForegroundColor Red
    }
    exit 0
}

else {
    Show-Help
}
