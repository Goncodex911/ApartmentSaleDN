# STORY 10.4: Mẫu bài gửi khách 10 dòng (VI / EN) + 3 ô mới trong Hồ sơ CTV (Epic 10)

**Bối cảnh:** `docs/stories/EPIC_10_MOBILE_FEEDBACK_POLISH.md` mục H. Khách muốn bài gửi theo mẫu đánh số quen dùng, bỏ link hệ thống trong bài.

## User Story
Là **CTV**, tôi muốn bài gửi khách theo đúng mẫu 10 dòng khách quen đọc, có link nhóm Zalo / WhatsApp của tôi,
để khách nắm thông tin nhanh và vào nhóm của tôi.

## Mẫu (bản English — bản tiếng Việt cùng cấu trúc)
```
Cozy 1BR apartment in Khue My
1️⃣ Type: apartment
2️⃣ Rooms: 1 bedroom
3️⃣ Square meters: 45 m2
4️⃣ Address: Khue My Dong 12
5️⃣ Distance to the sea: less than 1km
6️⃣ Price for 1 month: 690 USD/month (17 million VND/month)
7️⃣ Minimum rental period: 1 month
8️⃣ Free dates: 23.11.2026
9️⃣ Other conditions
- parking, elevator
- Free wifi, clean 1 a week
- deposit 1 month pay 1 month
🔟 Contact +84384575439 (Whatsapp, Viber, Zalo, Telegram…)
- Zalo group: https://zalo.me/g/...
- WhatsApp group: https://chat.whatsapp.com/...
```

## Quy tắc từng dòng
| Dòng | Dữ liệu | Thiếu dữ liệu |
|---|---|---|
| Tiêu đề | EN: tiêu đề tự sinh (`headlineEn`); VI: tiêu đề căn (đã che SĐT) | — |
| 1️⃣ Type | Loại căn (Story 8.4), EN chữ thường: apartment / studio / duplex / penthouse / whole house / villa | Bỏ dòng |
| 2️⃣ Rooms | Số phòng ngủ ("1 bedroom", "2 bedrooms"; studio → "studio") | — |
| 3️⃣ Square meters | Diện tích "45 m2" | Bỏ dòng |
| 4️⃣ Address | **Tên đường** (không số nhà — Story 8.3); EN viết không dấu, viết hoa chữ đầu mỗi từ | Khu vực |
| 5️⃣ Distance to the sea | < 1000m → "less than 1km"; ≥ 1000m → "1.5km" | Bỏ dòng |
| 6️⃣ Price | Có giá USD → "690 USD/month (17 million VND/month)"; không → "17 million VND/month" (lẻ: "6.5 million") | — |
| 7️⃣ Minimum rental period | "1 month" / "6 months" | Bỏ dòng |
| 8️⃣ Free dates | Sắp trống → ngày `dd.mm.yyyy`; đang trống → "now" (VI: "ngay") | — |
| 9️⃣ Other conditions | Dòng 1: tiện ích (chữ thường, theo danh mục Story 8.5 trừ dịch vụ); Dòng 2: dịch vụ bao gồm (Free wifi, **clean 1 a week**, …); Dòng 3: **Điều kiện thanh toán** của CTV | Bỏ dòng con trống |
| 🔟 Contact | SĐT Zalo (hoặc SĐT) của CTV dạng `+84...` + "(Whatsapp, Viber, Zalo, Telegram…)"; link **nhóm Zalo**, **nhóm WhatsApp** của CTV | Bỏ dòng link trống |

- Đánh số liền **1️⃣ → 🔟** (mẫu gốc thiếu 1️⃣).
- **Không** gửi kèm link hệ thống `/p/...` trong bài (bỏ phần gộp link của Story 9.4). Nút "Tạo link / Lượt xem" **giữ nguyên**.
- Giữ danh sách trắng: không SĐT chủ nhà, không số nhà, không link map, không mô tả gốc.

## Tiêu chí chấp nhận (Gherkin)
- Given căn có đủ dữ liệu như mẫu, CTV đã điền Hồ sơ
- When bấm Gửi khách (English) → nội dung khớp mẫu từng dòng; (Tiếng Việt) → cùng 10 dòng bằng tiếng Việt.
- Given căn thiếu diện tích / khoảng cách biển / thuê tối thiểu → bỏ đúng dòng đó, số thứ tự các dòng còn lại **giữ nguyên số** (khách quen vị trí).
- Given CTV chưa điền nhóm Zalo / WhatsApp → không in 2 dòng link.

**Hồ sơ CTV** có 3 ô mới:
- **Điều kiện thanh toán** (mặc định "deposit 1 month pay 1 month", tối đa 200 ký tự).
- **Link nhóm Zalo** (chỉ nhận `https://zalo.me/...`), **Link nhóm WhatsApp** (chỉ nhận `https://chat.whatsapp.com/...`).

## Phạm vi kỹ thuật
| File | Thay đổi |
|---|---|
| `backend/src/modules/auth/user.model.ts` | `paymentTerms` (mặc định "deposit 1 month pay 1 month"), `zaloGroupLink`, `whatsappGroupLink` |
| `backend/src/modules/users/user.validation.ts` | Kiểm tra độ dài + tên miền link |
| `frontend/src/api/authApi.ts` | Kiểu `User` thêm 3 trường |
| `components/profile/ProfileModal.tsx` | 3 ô mới (chữ ≥ 16px) |
| `frontend/src/utils/shareTemplate.ts` (mới) | Dựng 10 dòng dùng chung cho VI / EN (nhãn theo ngôn ngữ) |
| `utils/shareText.ts`, `utils/shareTextEn.ts` | Gọi `shareTemplate` |
| `components/apartment/CopyShareButton.tsx`, `ApartmentDetailModal.tsx` | Bỏ gộp link `/p/...` và bỏ tạo sẵn link khi mở chi tiết |

## Kiểm thử & Định nghĩa hoàn thành (DoD)
- [ ] Thử `shareTemplate` với căn mẫu → khớp mẫu EN từng dòng; bản VI đúng 10 dòng; căn thiếu dữ liệu bỏ đúng dòng.
- [ ] Hồ sơ: lưu 3 ô mới; link sai tên miền → báo lỗi; bài gửi khách dùng đúng dữ liệu vừa lưu.
- [ ] Không còn link `/p/...` trong bài; không lộ SĐT chủ / số nhà / link map.
- [ ] Báo cáo, đề xuất commit `feat(share): 10-line customer template with CTV payment terms and group links (Story 10.4)` chờ duyệt.
