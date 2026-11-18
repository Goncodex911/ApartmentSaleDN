/**
 * Giá rút gọn cho bong bóng trên bản đồ (Story 11.2): 8.500.000 → "8.5tr", 14.000.000 → "14tr";
 * căn chỉ có giá USD (price = 0) → "$600"; dưới 1 triệu → "850k".
 */
export function priceShort(price: number, priceUsd?: number): string {
  if (!price && priceUsd) return `$${priceUsd}`;
  if (price >= 1_000_000) return `${Number((price / 1_000_000).toFixed(1))}tr`;
  return price ? `${Math.round(price / 1000)}k` : '?';
}
