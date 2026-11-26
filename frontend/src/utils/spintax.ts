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

  // Vị trí theo khu vực — khóa trùng danh mục ZONES chuẩn (utils/danang.ts). Chỉ mô tả khu vực, KHÔNG mô tả tiện ích căn
  // (tiện ích lấy từ dữ liệu thật — Story 19.1)
  locationHighlights: {
    'Mỹ An': '{gần biển Mỹ Khê | khu phố Tây An Thượng sầm uất | xung quanh nhiều quán cafe nhà hàng | khu vực dân trí cao}',
    'An Hải': '{gần cầu Rồng & sông Hàn | thuận tiện đi trung tâm và biển | khu dân cư yên tĩnh}',
    'Khuê Mỹ': '{gần biển Non Nước | khu dân cư yên tĩnh | gần các trường đại học}',
    'Sơn Trà': '{gần biển Phạm Văn Đồng | không khí thoáng mát | thuận tiện đi trung tâm và biển}',
    'Hải Châu': '{trung tâm thành phố | gần chợ Hàn & đường Bạch Đằng | tiện ích xung quanh đầy đủ}',
    'Ngũ Hành Sơn': '{không gian yên tĩnh | gần các trường đại học | gần biển Non Nước}',
    'Hòa Xuân': '{khu đô thị mới Hòa Xuân | đường rộng thoáng | yên tĩnh, gần sông Cẩm Lệ}',
  } as Record<string, string>,

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
  const byZone: Record<string, string[]> = {
    'Mỹ An': ['#CanhoMyAn', '#CanhoAnThuong', '#Canhoganbien'],
    'An Hải': ['#CanhoAnHai', '#CanhoganSongHan'],
    'Khuê Mỹ': ['#CanhoKhueMy', '#CanhoNonNuoc'],
    'Sơn Trà': ['#CanhoSonTra', '#CanhoPhuocMy'],
    'Hải Châu': ['#CanhoHaiChau', '#CanhotrungtamDanang'],
    'Ngũ Hành Sơn': ['#CanhoNguHanhSon', '#CanhoNonNuoc'],
    'Hòa Xuân': ['#CanhoHoaXuan'],
  };
  return [...base, ...(byZone[zone ?? ''] ?? [])].join(' ');
}
