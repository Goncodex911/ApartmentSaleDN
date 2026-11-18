// Tỷ giá quy đổi USD ↔ VNĐ (mặc định 25.000, đổi qua biến môi trường USD_VND_RATE) — dùng chung cho bóc tin, ghép khách, trang khách
export function usdToVndRate(): number {
  const rate = Math.round(Number(process.env.USD_VND_RATE));
  return Number.isFinite(rate) && rate > 0 && rate <= 1_000_000 ? rate : 25000;
}
