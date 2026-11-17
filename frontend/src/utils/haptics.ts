/** Rung nhẹ 1 nhịp khi bấm (Story 9.4). iPhone không hỗ trợ rung → bỏ qua, không lỗi. */
export const tapFeedback = () => {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Trình duyệt chặn rung (VD chưa có thao tác người dùng) → bỏ qua
  }
};
