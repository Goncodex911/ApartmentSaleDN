import { API_BASE, apiClient } from './client.js';

export type RealtimeType = 'apartment.created' | 'apartment.status' | 'apartment.price' | 'apartment.flagged' | 'announcement.changed' | 'reset';
// Story 16.9: thông báo chung vừa gửi / thu hồi → dải ghim tải lại
export const ANNOUNCEMENT_CHANGED = 'announcement:changed';
export interface RealtimeData {
  id: string;
  status: 'AVAILABLE' | 'UPCOMING' | 'DEPOSITED' | 'RENTED';
  price?: number;
  priceUsd?: number;
  label?: string;
  by?: string;
  flagged?: boolean; // Story 13.6: căn đang "Chờ xác minh"
}
export interface RealtimeMessage {
  type: RealtimeType;
  data: RealtimeData;
}

// Sự kiện trình duyệt: các trang (Bảng hàng, Bản đồ, chi tiết căn) nghe để cập nhật 1 căn tại chỗ
export const APARTMENT_REALTIME = 'apartment:realtime';

const STREAM_URL = `${API_BASE}/realtime/stream`; // Cùng địa chỉ với các API khác (proxy hoặc gọi thẳng backend)
const MAX_BACKOFF_MS = 30_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Giữ kết nối Server-Sent Events tới máy chủ (Story 11.4). Dùng fetch thay vì EventSource vì EventSource
 * không gửi được header Authorization. Máy chủ chủ động đóng sau ~25 giây (proxy Netlify cắt ở ~26 giây) →
 * nối lại ngay kèm Last-Event-ID để nhận bù sự kiện bị lỡ. App ẩn / mất mạng → ngắt, có lại → nối tiếp.
 * Trả về hàm dừng hẳn (đăng xuất).
 */
export function connectRealtime(onMessage: (message: RealtimeMessage) => void): () => void {
  let stopped = false;
  let lastEventId: string | undefined;
  let failures = 0;
  let refreshed = false;
  let controller: AbortController | null = null;
  let wake: (() => void) | null = null;

  const canConnect = () => !document.hidden && navigator.onLine;
  const onEnvironmentChange = () => {
    if (!canConnect()) controller?.abort(); // Tiết kiệm pin & 4G khi app chạy nền
    else wake?.();
  };
  document.addEventListener('visibilitychange', onEnvironmentChange);
  window.addEventListener('online', onEnvironmentChange);
  window.addEventListener('offline', onEnvironmentChange);

  // Tách từng khối sự kiện (phân cách bằng dòng trống) theo chuẩn SSE; dòng ":" là ping giữ kết nối
  const handleBlock = (block: string) => {
    let type = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('id:')) lastEventId = line.slice(3).trim();
      else if (line.startsWith('event:')) type = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (type === 'ready' || type === 'message' || !data) return;
    try {
      onMessage({ type: type as RealtimeType, data: JSON.parse(data) });
    } catch {
      /* Bỏ qua khối hỏng, không làm đứt luồng */
    }
  };

  const readStream = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      pending += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let boundary = pending.indexOf('\n\n');
      while (boundary !== -1) {
        handleBlock(pending.slice(0, boundary));
        pending = pending.slice(boundary + 2);
        boundary = pending.indexOf('\n\n');
      }
    }
  };

  const run = async () => {
    while (!stopped) {
      if (!canConnect()) {
        await new Promise<void>((resolve) => (wake = resolve));
        wake = null;
        continue;
      }
      const token = localStorage.getItem('token');
      if (!token) return;
      controller = new AbortController();
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' };
        if (lastEventId) headers['Last-Event-ID'] = lastEventId;
        const res = await fetch(STREAM_URL, { headers, signal: controller.signal, cache: 'no-store' });
        // 403 = tài khoản vừa bị khóa (Story 13.2) → /auth/me cũng 403 → apiClient đưa về trang đăng nhập
        if (res.status === 401 || res.status === 403) {
          // Vừa refresh mà vẫn 401 → coi là lỗi để giãn thời gian thử, không gọi dồn dập
          if (refreshed) throw new Error('Vẫn 401 sau khi làm mới token');
          // Token hết hạn → gọi 1 API thường để bộ chặn của apiClient tự refresh (lỗi refresh = tự về trang đăng nhập)
          await apiClient.get('/auth/me');
          refreshed = true;
          continue;
        }
        refreshed = false;
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const startedAt = Date.now();
        await readStream(res.body);
        // Kết nối đóng ngay (proxy trả rỗng) → coi là lỗi để giãn thời gian thử, tránh gọi dồn dập
        if (Date.now() - startedAt < 2000) throw new Error('Luồng đóng quá sớm');
        failures = 0;
      } catch {
        if (stopped) return;
        if (controller.signal.aborted) continue; // Chủ động ngắt khi app ẩn → không tính là lỗi
        failures += 1;
        await sleep(Math.min(MAX_BACKOFF_MS, 2000 * 2 ** (failures - 1)));
      }
    }
  };
  void run();

  return () => {
    stopped = true;
    controller?.abort();
    wake?.();
    document.removeEventListener('visibilitychange', onEnvironmentChange);
    window.removeEventListener('online', onEnvironmentChange);
    window.removeEventListener('offline', onEnvironmentChange);
  };
}
