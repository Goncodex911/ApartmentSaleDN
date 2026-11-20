/** Khoảng cách gọn cho người đọc: < 1km làm tròn 50m ("~450m"), từ 1km lấy 1 số lẻ ("~1.2km") — Story 15.4 / 15.5. */
export const formatDistance = (meters: number) => (meters < 1000 ? `~${Math.round(meters / 50) * 50}m` : `~${(meters / 1000).toFixed(1).replace('.0', '')}km`);
