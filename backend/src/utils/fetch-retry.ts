// Lỗi tạm thời từ API bên ngoài (quá tải / giới hạn tần suất) → đáng thử lại
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch có thời gian chờ cho MỖI lần gọi và tự thử lại khi gặp lỗi tạm thời (VD Gemini báo 503 "high demand").
 * Mặc định thử lại 2 lần, chờ 2 giây rồi 6 giây. Lỗi khác (400, 401, 403...) trả về ngay để bên gọi xử lý.
 */
export async function fetchWithRetry(url: string, init: RequestInit, timeoutMs: number, retryDelaysMs = [2000, 6000]): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= retryDelaysMs.length) return response;
    } catch (err: any) {
      // Hết thời gian chờ cũng là lỗi tạm thời; lỗi mạng khác hoặc đã hết lượt → ném ra
      if (err.name !== 'AbortError' || attempt >= retryDelaysMs.length) throw err;
    } finally {
      clearTimeout(timer);
    }
    await sleep(retryDelaysMs[attempt]);
  }
}
