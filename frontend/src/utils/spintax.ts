/**
 * Thuật toán phân giải Spintax {A | B | C} chống trùng lặp bài đăng Zalo (Story 17.2 / Epic 17).
 * Hỗ trợ các cụm lồng nhau và chọn ngẫu nhiên từ đồng nghĩa.
 */
export function resolveSpintax(template: string): string {
  let result = template;
  const regex = /\{([^{}]+)\}/g;

  // Lặp cho đến khi hết các cụm { ... } lồng nhau
  while (regex.test(result)) {
    result = result.replace(regex, (_, choices) => {
      const parts = choices.split('|').map((s: string) => s.trim());
      return parts[Math.floor(Math.random() * parts.length)] || '';
    });
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Từ điển Spintax tiếng Việt chuyên ngành BĐS & Căn hộ Đà Nẵng
 */
export const SPINTAX_TEMPLATES = {
  // Mở đầu giật tít / Deal tốt
  dealHeadings: [
    '🔥 {SIÊU PHẨM GIẢM SÂU | CĂN HỘ MỚI TINH VỪA TRỐNG | HÀNG TUYỂN GIÁ CỰC TỐT | CHÍNH CHỦ CHO THUÊ}',
    '✨ {CỰC PHẨM PHÒNG ĐẸP | PHÒNG MỚI FULL NỘI THẤT | CĂN HỘ HIỆN ĐẠI TIỆN NGHI | HÀNG HIẾM VỪA CẬP BẾN}',
    '⚡ {GIẢM GIÁ ĐẶC BIỆT | GIÁ THUÊ SIÊU ƯU ĐÃI | DUY NHẤT 1 CĂN GIÁ TỐT | CHỐT NHANH KẺO LỠ}',
  ],

  // Mở đầu phong cách Chuyên nghiệp
  proHeadings: [
    '🏢 {CHO THUÊ CĂN HỘ CAO CẤP | CĂN HỘ DỊCH VỤ HIỆN ĐẠI | THÔNG BÁO PHÒNG TRỐNG TẠI}',
    '📋 {BẢNG HÀNG CĂN HỘ CHUẨN ĐÀ NẴNG | PHÒNG ĐẸP TRUNG TÂM | CHO THUÊ CĂN HỘ KHU VỰC}',
  ],

  // Vị trí theo khu vực
  locationHighlights: {
    'Mỹ An': '{sát biển Mỹ Khê | cách bãi tắm vài bước chân | khu phố du lịch sầm uất | khu vực dân trí cao an ninh}',
    'An Thượng': '{ngay trung tâm phố Tây An Thượng | xung quanh bạt ngàn quán cafe nhà hàng | khu người nước ngoài văn minh | đi bộ ra biển 2 phút}',
    'Sơn Trà': '{gần cầu Rồng & cầu Sông Hàn | không khí thoáng mát trong lành | thuận tiện đi lại trung tâm và biển | khu vực an ninh tuyệt đối}',
    'Hải Châu': '{trung tâm thành phố Hải Châu | gần chợ Hàn & đường Bạch Đằng | tiện ích vây quanh không thiếu thứ gì | thuận tiện đi làm & học tập}',
    'Ngũ Hành Sơn': '{không gian yên tĩnh trong lành | gần các trường đại học lớn | đường lớn ô tô đỗ tận cửa | giá thuê siêu hợp lý}',
  } as Record<string, string>,

  // Nội thất & tiện ích
  furnitureVariants: [
    '{Full nội thất cao cấp chỉ việc xách vali vào ở | Đầy đủ tiện nghi hiện đại | Nội thất mới tinh 100% | Trang bị từ A đến Z không thiếu thứ gì}',
    '{Bếp nấu riêng biệt đầy đủ tủ lạnh, hút mùi | Khu bếp tiện nghi thoải mái nấu nướng | Bếp riêng rộng rãi sạch sẽ}',
    '{Máy giặt riêng, ban công đón gió trời | Có máy giặt riêng, cửa sổ thoáng mát | Ban công view thoáng ngập tràn ánh sáng}',
    '{Tòa nhà thang máy, hầm để xe rộng rãi | Thang máy tốc độ cao, camera an ninh 24/7 | Khóa vân tay an toàn, giờ giấc tự do}',
  ],

  // Lời kêu gọi hành động (Call To Action)
  ctaVariants: [
    '👉 {Liên hệ ngay em để xem phòng trực tiếp 24/7 | Nhắn Zalo em gửi định vị và video chi tiết | Gọi hotline bên dưới để giữ phòng đẹp nhất}',
    '📞 {Zalo/Hotline: | Call/Zalo hỗ trợ xem phòng: | Kết bạn Zalo em tư vấn tận tâm:}',
  ],
};

/**
 * Sinh hashtag theo khu vực
 */
export function generateDanangHashtags(zone?: string): string {
  const base = ['#ChothuecanhoDanang', '#CanhoDanang', '#PhongtroDanang'];
  if (zone === 'Mỹ An' || zone === 'An Thượng') {
    base.push('#CanhoMyAn', '#CanhoAnThuong', '#Canhoganbien');
  } else if (zone === 'Sơn Trà') {
    base.push('#CanhoSonTra', '#CanhoganSongHan', '#CanhoPhuocMy');
  } else if (zone === 'Hải Châu') {
    base.push('#CanhoHaiChau', '#CanhotrungtamDanang');
  } else if (zone === 'Ngũ Hành Sơn') {
    base.push('#CanhoNguHanhSon', '#CanhoNonNuoc');
  }
  return base.join(' ');
}
