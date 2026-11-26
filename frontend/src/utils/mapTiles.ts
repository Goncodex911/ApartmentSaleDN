// Story 15.1: bản đồ nền theo cấu hình — CARTO Voyager (cần key, xem EXTERNAL_CONFIG.md mục 8.1); chưa cấu hình → OSM chuẩn.
// Service worker KHÔNG cache tile (Story 11.2; điều khoản CARTO cấm cache server, giới hạn cache máy 30 ngày).
export const DANANG_CENTER: [number, number] = [16.0544, 108.2022]; // [vĩ độ, kinh độ] cho Leaflet
// Cùng điểm theo thứ tự GeoJSON [kinh độ, vĩ độ] như `location.coordinates` (Story 19.3: trước đây bị dùng nhầm thứ tự)
export const DANANG_LNG_LAT: [number, number] = [DANANG_CENTER[1], DANANG_CENTER[0]];

/** Tọa độ GeoJSON hợp lệ: đúng 2 số hữu hạn (DB mặc định mảng rỗng [] khi chưa có vị trí — Story 19.3) */
export const isLngLat = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number' && Number.isFinite(n));

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || OSM_TILE_URL;

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
export const TILE_ATTRIBUTION = TILE_URL.includes('cartocdn.com')
  ? `${OSM_ATTRIBUTION}, &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>`
  : OSM_ATTRIBUTION;
