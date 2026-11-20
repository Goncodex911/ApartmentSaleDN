/**
 * Dữ liệu địa lý thị trường Đà Nẵng: khu vực (quận cũ), phường, tâm khu vực & điểm mốc.
 * Tọa độ chuẩn GeoJSON: [kinh độ (longitude), vĩ độ (latitude)] — GẦN ĐÚNG (sai số vài trăm mét), đủ cho tìm theo bán kính.
 * Lưu ý: từ 7/2025 Đà Nẵng sáp nhập Quảng Nam và bỏ cấp quận, nhưng tin đăng & CTV vẫn gọi theo quận cũ
 * → dùng tên quận cũ làm "khu vực" (trường location.district).
 */

/** Khung Đà Nẵng mở rộng (gồm Hội An) — kiểm tra tọa độ ghim tay (Story 15.7) & kết quả định vị tên đường (15.6). */
export const inDanang = ([lng, lat]: [number, number]) => lng >= 107.9 && lng <= 108.4 && lat >= 15.8 && lat <= 16.25;

export interface ILandmark {
  id: string;
  name: string;
  shortName: string;
  aliases: string[]; // Viết không dấu, so khớp nguyên cụm từ
  coordinates: [number, number]; // [lng, lat]
  district: string;
  category: 'UNIVERSITY' | 'BUILDING' | 'HOSPITAL' | 'AREA';
}

export const DANANG_DISTRICTS = [
  'Hải Châu',
  'Thanh Khê',
  'Sơn Trà',
  'Ngũ Hành Sơn',
  'Liên Chiểu',
  'Cẩm Lệ',
  'Hòa Vang',
  'Hội An',
] as const;

/** Tâm khu vực (dùng làm tọa độ ước lượng khi căn chỉ có tên quận). */
export const DISTRICT_CENTROIDS: Record<string, [number, number]> = {
  'Hải Châu': [108.2208, 16.0471],
  'Thanh Khê': [108.1897, 16.064],
  'Sơn Trà': [108.24, 16.07],
  'Ngũ Hành Sơn': [108.25, 16.0],
  'Liên Chiểu': [108.15, 16.075],
  'Cẩm Lệ': [108.198, 16.015],
  'Hòa Vang': [108.05, 16.02],
  'Hội An': [108.338, 15.8801],
};

/** Phường (cũ) và khu hay gặp trong tin → khu vực. Dùng khi tin chỉ ghi phường, không ghi quận. */
export const WARD_TO_DISTRICT: Record<string, string> = {
  'Hải Châu 1': 'Hải Châu', 'Hải Châu 2': 'Hải Châu', 'Thạch Thang': 'Hải Châu', 'Thanh Bình': 'Hải Châu',
  'Thuận Phước': 'Hải Châu', 'Phước Ninh': 'Hải Châu', 'Hòa Thuận Đông': 'Hải Châu', 'Hòa Thuận Tây': 'Hải Châu',
  'Nam Dương': 'Hải Châu', 'Bình Hiên': 'Hải Châu', 'Bình Thuận': 'Hải Châu', 'Hòa Cường Bắc': 'Hải Châu',
  'Hòa Cường Nam': 'Hải Châu', 'Hòa Cường': 'Hải Châu',
  'Tam Thuận': 'Thanh Khê', 'Thanh Khê Tây': 'Thanh Khê', 'Thanh Khê Đông': 'Thanh Khê', 'Xuân Hà': 'Thanh Khê',
  'Tân Chính': 'Thanh Khê', 'Chính Gián': 'Thanh Khê', 'Vĩnh Trung': 'Thanh Khê', 'Thạc Gián': 'Thanh Khê',
  'An Khê': 'Thanh Khê', 'Hòa Khê': 'Thanh Khê',
  'An Hải Bắc': 'Sơn Trà', 'An Hải Đông': 'Sơn Trà', 'An Hải Tây': 'Sơn Trà', 'An Hải': 'Sơn Trà',
  'Mân Thái': 'Sơn Trà', 'Nại Hiên Đông': 'Sơn Trà', 'Phước Mỹ': 'Sơn Trà', 'Thọ Quang': 'Sơn Trà',
  'Mỹ An': 'Ngũ Hành Sơn', 'Khuê Mỹ': 'Ngũ Hành Sơn', 'Hòa Hải': 'Ngũ Hành Sơn', 'Hòa Quý': 'Ngũ Hành Sơn',
  'An Thượng': 'Ngũ Hành Sơn',
  'Hòa Hiệp Bắc': 'Liên Chiểu', 'Hòa Hiệp Nam': 'Liên Chiểu', 'Hòa Khánh Bắc': 'Liên Chiểu',
  'Hòa Khánh Nam': 'Liên Chiểu', 'Hòa Khánh': 'Liên Chiểu', 'Hòa Minh': 'Liên Chiểu',
  'Hòa An': 'Cẩm Lệ', 'Hòa Phát': 'Cẩm Lệ', 'Hòa Thọ Đông': 'Cẩm Lệ', 'Hòa Thọ Tây': 'Cẩm Lệ',
  'Hòa Xuân': 'Cẩm Lệ', 'Khuê Trung': 'Cẩm Lệ',
};

const lm = (
  id: string,
  name: string,
  shortName: string,
  aliases: string[],
  coordinates: [number, number],
  district: string,
  category: ILandmark['category']
): ILandmark => ({ id, name, shortName, aliases, coordinates, district, category });

export const LANDMARKS: ILandmark[] = [
  lm('bien-my-khe', 'Biển Mỹ Khê', 'Biển Mỹ Khê', ['my khe', 'my khe beach'], [108.247, 16.056], 'Sơn Trà', 'AREA'),
  lm('bien-non-nuoc', 'Biển Non Nước', 'Biển Non Nước', ['non nuoc', 'non nuoc beach'], [108.264, 16.001], 'Ngũ Hành Sơn', 'AREA'),
  lm('cv-bien-dong', 'Công viên Biển Đông', 'CV Biển Đông', ['bien dong', 'cong vien bien dong'], [108.2468, 16.0712], 'Sơn Trà', 'AREA'),
  lm('cau-rong', 'Cầu Rồng', 'Cầu Rồng', ['cau rong', 'dragon bridge'], [108.2272, 16.0612], 'Hải Châu', 'AREA'),
  lm('cau-song-han', 'Cầu Sông Hàn', 'Cầu Sông Hàn', ['song han', 'han river bridge'], [108.2268, 16.0721], 'Hải Châu', 'AREA'),
  lm('cho-han', 'Chợ Hàn', 'Chợ Hàn', ['cho han', 'han market'], [108.2241, 16.0682], 'Hải Châu', 'AREA'),
  lm('san-bay', 'Sân bay quốc tế Đà Nẵng', 'Sân bay', ['san bay', 'airport', 'san bay da nang'], [108.2019, 16.0544], 'Hải Châu', 'BUILDING'),
  lm('vincom', 'Vincom Plaza Ngô Quyền', 'Vincom', ['vincom', 'vincom ngo quyen'], [108.2302, 16.0717], 'Sơn Trà', 'BUILDING'),
  lm('lotte', 'Lotte Mart Đà Nẵng', 'Lotte Mart', ['lotte', 'lotte mart'], [108.2295, 16.0347], 'Hải Châu', 'BUILDING'),
  lm('bv-da-nang', 'Bệnh viện Đà Nẵng', 'BV Đà Nẵng', ['bv da nang', 'benh vien da nang'], [108.2155, 16.073], 'Hải Châu', 'HOSPITAL'),
  lm('dh-bach-khoa', 'ĐH Bách Khoa Đà Nẵng', 'ĐH Bách Khoa', ['bach khoa', 'dhbk', 'dut'], [108.1497, 16.0738], 'Liên Chiểu', 'UNIVERSITY'),
  lm('dh-su-pham', 'ĐH Sư Phạm Đà Nẵng', 'ĐH Sư Phạm', ['su pham', 'dhsp', 'ued'], [108.159, 16.0617], 'Liên Chiểu', 'UNIVERSITY'),
  lm('dh-kinh-te', 'ĐH Kinh tế Đà Nẵng', 'ĐH Kinh tế', ['dh kinh te', 'dai hoc kinh te', 'due'], [108.2401, 16.0476], 'Ngũ Hành Sơn', 'UNIVERSITY'),
  lm('dh-duy-tan', 'ĐH Duy Tân', 'ĐH Duy Tân', ['dh duy tan', 'dai hoc duy tan', 'dtu'] /* không dùng "duy tan" trơn: trùng tên đường ở Hải Châu */, [108.2119, 16.06], 'Thanh Khê', 'UNIVERSITY'),
  lm('dh-fpt', 'ĐH FPT Đà Nẵng', 'ĐH FPT', ['fpt', 'fpt city'], [108.26, 15.969], 'Ngũ Hành Sơn', 'UNIVERSITY'),
  lm('pho-co-hoi-an', 'Phố cổ Hội An', 'Phố cổ Hội An', ['pho co', 'ancient town'], [108.327, 15.877], 'Hội An', 'AREA'),
];

/**
 * Story 15.4 / 15.5 — tiện ích hiển thị trên bản đồ & trang khách. Danh sách RIÊNG, KHÔNG dùng để tìm kiếm:
 * "Phạm Văn Đồng" vừa là bãi biển vừa là tên đường — thêm vào LANDMARKS sẽ biến mọi lượt tìm theo đường đó thành tìm bán kính.
 * Tọa độ [kinh độ, vĩ độ] gần đúng.
 */
export type PoiGroup = 'BEACH' | 'MARKET' | 'UNIVERSITY' | 'TRANSPORT' | 'NIGHTLIFE';
export interface IPoi {
  id: string;
  name: string;
  nameEn: string;
  group: PoiGroup;
  coordinates: [number, number];
}
const landmarkPoi = (id: string, nameEn: string, group: PoiGroup): IPoi => {
  const landmark = LANDMARKS.find((lm) => lm.id === id)!;
  return { id, name: landmark.shortName, nameEn, group, coordinates: landmark.coordinates };
};

export const POIS: IPoi[] = [
  landmarkPoi('bien-my-khe', 'My Khe Beach', 'BEACH'),
  landmarkPoi('bien-non-nuoc', 'Non Nuoc Beach', 'BEACH'),
  { id: 'bien-pham-van-dong', name: 'Biển Phạm Văn Đồng', nameEn: 'Pham Van Dong Beach', group: 'BEACH', coordinates: [108.2462, 16.076] },
  { id: 'bien-t20', name: 'Biển T20', nameEn: 'T20 Beach', group: 'BEACH', coordinates: [108.2445, 16.0985] },
  landmarkPoi('cho-han', 'Han Market', 'MARKET'),
  { id: 'cho-con', name: 'Chợ Cồn', nameEn: 'Con Market', group: 'MARKET', coordinates: [108.214, 16.068] },
  { id: 'cho-bac-my-an', name: 'Chợ Bắc Mỹ An', nameEn: 'Bac My An Market', group: 'MARKET', coordinates: [108.2445, 16.0485] },
  landmarkPoi('vincom', 'Vincom Plaza', 'MARKET'),
  landmarkPoi('lotte', 'Lotte Mart', 'MARKET'),
  landmarkPoi('dh-bach-khoa', 'University of Science and Technology', 'UNIVERSITY'),
  landmarkPoi('dh-kinh-te', 'University of Economics', 'UNIVERSITY'),
  landmarkPoi('dh-su-pham', 'University of Education', 'UNIVERSITY'),
  landmarkPoi('dh-duy-tan', 'Duy Tan University', 'UNIVERSITY'),
  landmarkPoi('dh-fpt', 'FPT University', 'UNIVERSITY'),
  landmarkPoi('san-bay', 'Da Nang Airport', 'TRANSPORT'),
  landmarkPoi('cau-rong', 'Dragon Bridge', 'TRANSPORT'),
  landmarkPoi('cau-song-han', 'Han River Bridge', 'TRANSPORT'),
  { id: 'cau-tran-thi-ly', name: 'Cầu Trần Thị Lý', nameEn: 'Tran Thi Ly Bridge', group: 'TRANSPORT', coordinates: [108.2325, 16.0485] },
  { id: 'pho-tay-an-thuong', name: 'Phố Tây An Thượng', nameEn: 'An Thuong Area', group: 'NIGHTLIFE', coordinates: [108.2425, 16.051] }, // Chỉ dùng cho huy hiệu trang khách (15.5)
];
