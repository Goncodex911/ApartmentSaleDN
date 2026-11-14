/**
 * Từ điển các điểm mốc, trường đại học, bệnh viện & tòa nhà lớn tại Hà Nội
 * Tọa độ chuẩn GeoJSON: [kinh độ (longitude), vĩ độ (latitude)]
 */

export interface ILandmark {
  id: string;
  name: string;
  shortName: string;
  aliases: string[];
  coordinates: [number, number]; // [lng, lat]
  district: string;
  category: 'UNIVERSITY' | 'BUILDING' | 'HOSPITAL' | 'AREA';
}

export const HANOI_LANDMARKS: ILandmark[] = [
  {
    id: 'dhqg',
    name: 'ĐH Quốc Gia Hà Nội',
    shortName: 'ĐH Quốc Gia',
    aliases: ['dhqg', 'quoc gia', 'vnu', 'dai hoc quoc gia', 'xuan thuy'],
    coordinates: [105.7825, 21.0378],
    district: 'Cầu Giấy',
    category: 'UNIVERSITY',
  },
  {
    id: 'dhsp',
    name: 'ĐH Sư Phạm Hà Nội',
    shortName: 'ĐH Sư Phạm',
    aliases: ['dhsp', 'su pham', 'dai hoc su pham'],
    coordinates: [105.7836, 21.0369],
    district: 'Cầu Giấy',
    category: 'UNIVERSITY',
  },
  {
    id: 'dhtm',
    name: 'ĐH Thương Mại',
    shortName: 'ĐH Thương Mại',
    aliases: ['dhtm', 'thuong mai', 'dai hoc thuong mai', 'ho tung mau'],
    coordinates: [105.7725, 21.0366],
    district: 'Cầu Giấy',
    category: 'UNIVERSITY',
  },
  {
    id: 'ftu',
    name: 'ĐH Ngoại Thương (FTU)',
    shortName: 'ĐH Ngoại Thương',
    aliases: ['ftu', 'ngoai thuong', 'dai hoc ngoai thuong', 'chua lang'],
    coordinates: [105.8055, 21.0227],
    district: 'Đống Đa',
    category: 'UNIVERSITY',
  },
  {
    id: 'ajc',
    name: 'Học viện Báo chí & Tuyên truyền',
    shortName: 'HV Báo Chí',
    aliases: ['ajc', 'bao chi', 'hoc vien bao chi', 'tuyen truyen'],
    coordinates: [105.7907, 21.0375],
    district: 'Cầu Giấy',
    category: 'UNIVERSITY',
  },
  {
    id: 'hust',
    name: 'ĐH Bách Khoa Hà Nội',
    shortName: 'ĐH Bách Khoa',
    aliases: ['bk', 'bach khoa', 'hust', 'dai hoc bach khoa', 'dai co viet'],
    coordinates: [105.8431, 21.0048],
    district: 'Hai Bà Trưng',
    category: 'UNIVERSITY',
  },
  {
    id: 'neu',
    name: 'ĐH Kinh tế Quốc dân (NEU)',
    shortName: 'ĐH KTQD (NEU)',
    aliases: ['neu', 'ktqd', 'kinh te quoc dan', 'giai phong'],
    coordinates: [105.8427, 20.9998],
    district: 'Hai Bà Trưng',
    category: 'UNIVERSITY',
  },
  {
    id: 'huce',
    name: 'ĐH Xây Dựng Hà Nội',
    shortName: 'ĐH Xây Dựng',
    aliases: ['nuce', 'huce', 'xay dung', 'dai hoc xay dung'],
    coordinates: [105.8429, 21.0033],
    district: 'Hai Bà Trưng',
    category: 'UNIVERSITY',
  },
  {
    id: 'hmu',
    name: 'ĐH Y Hà Nội',
    shortName: 'ĐH Y Hà Nội',
    aliases: ['hmu', 'y ha noi', 'dai hoc y', 'ton that tung'],
    coordinates: [105.8322, 21.0035],
    district: 'Đống Đa',
    category: 'UNIVERSITY',
  },
  {
    id: 'ba',
    name: 'Học viện Ngân Hàng',
    shortName: 'HV Ngân Hàng',
    aliases: ['hvnh', 'ngan hang', 'hoc vien ngan hang', 'chua boc'],
    coordinates: [105.8282, 21.0089],
    district: 'Đống Đa',
    category: 'UNIVERSITY',
  },
  {
    id: 'keangnam',
    name: 'Tòa nhà Keangnam Landmark 72',
    shortName: 'Keangnam 72',
    aliases: ['keangnam', 'landmark 72', 'kangnam', 'pham hung'],
    coordinates: [105.7839, 21.0167],
    district: 'Nam Từ Liêm',
    category: 'BUILDING',
  },
  {
    id: 'lotte',
    name: 'Lotte Center Liễu Giai',
    shortName: 'Lotte Liễu Giai',
    aliases: ['lotte', 'lieu giai', 'lotte dao tan', 'lotte center'],
    coordinates: [105.8128, 21.0326],
    district: 'Ba Đình',
    category: 'BUILDING',
  },
  {
    id: 'vincom_tdh',
    name: 'Vincom Center Trần Duy Hưng',
    shortName: 'Vincom Trần Duy Hưng',
    aliases: ['vincom tran duy hung', 'tdh', 'tran duy hung'],
    coordinates: [105.7972, 21.0076],
    district: 'Cầu Giấy',
    category: 'BUILDING',
  },
  {
    id: 'bach_mai',
    name: 'Bệnh viện Bạch Mai',
    shortName: 'BV Bạch Mai',
    aliases: ['bach mai', 'bv bach mai', 'benh vien bach mai'],
    coordinates: [105.8407, 21.0006],
    district: 'Đống Đa',
    category: 'HOSPITAL',
  },
  {
    id: 'ho_guom',
    name: 'Hồ Gươm / Phố Cổ',
    shortName: 'Hồ Gươm',
    aliases: ['ho guom', 'pho co', 'hoan kiem', 'bo ho'],
    coordinates: [105.8524, 21.0287],
    district: 'Hoàn Kiếm',
    category: 'AREA',
  },
];

/**
 * Tọa độ tâm các quận Hà Nội (dùng làm vị trí ước lượng khi chỉ có tên quận)
 */
export const HANOI_DISTRICT_CENTROIDS: Record<string, [number, number]> = {
  'cầu giấy': [105.7944, 21.0333],
  'đống đa': [105.8239, 21.0181],
  'ba đình': [105.8194, 21.0341],
  'hai bà trưng': [105.8532, 21.0069],
  'thanh xuân': [105.8078, 20.9937],
  'nam từ liêm': [105.7663, 21.0125],
  'bắc từ liêm': [105.7533, 21.0667],
  'hoàn kiếm': [105.8544, 21.0285],
  'tây hồ': [105.8192, 21.0694],
  'hà đông': [105.7744, 20.9723],
  'hoàng mai': [105.8561, 20.9739],
  'long biên': [105.8953, 21.0361],
};

