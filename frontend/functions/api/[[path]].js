/**
 * Cloudflare Pages Function: chuyển tiếp mọi request /api/* sang backend Render
 * (thay cho dòng "/api/* https://...onrender.com/api/:splat 200!" trong _redirects mà Cloudflare không hỗ trợ).
 * Trình duyệt chỉ thấy 1 tên miền → cookie Refresh Token (HttpOnly, SameSite=Lax) vẫn hoạt động, không cần CORS.
 * Body trả về được truyền thẳng (stream) → kết nối real-time SSE không bị gom lại.
 *
 * Biến môi trường (Cloudflare → Settings → Variables): API_ORIGIN — địa chỉ backend, bỏ trống = Render hiện tại.
 * Netlify không đọc thư mục này (Netlify dùng netlify/functions), nên 2 nơi deploy chạy song song được.
 */
const DEFAULT_API_ORIGIN = 'https://roommaster-api-0keh.onrender.com';

export async function onRequest({ request, env }) {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, env.API_ORIGIN || DEFAULT_API_ORIGIN);

  const headers = new Headers(request.headers);
  // IP thật của khách cho bộ giới hạn tần suất / nhật ký thiết bị (backend đọc qua TRUST_PROXY).
  // Ghi đè X-Forwarded-For do trình duyệt gửi lên để không giả mạo được IP.
  const clientIp = request.headers.get('CF-Connecting-IP');
  if (clientIp) headers.set('X-Forwarded-For', clientIp);
  headers.set('X-Forwarded-Host', incoming.host);
  headers.set('X-Forwarded-Proto', 'https');
  headers.delete('Host');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  try {
    return await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual', // Để trình duyệt tự xử lý chuyển hướng của backend
    });
  } catch {
    // Render đang ngủ / khởi động lại → trả JSON để giao diện hiện thông báo lỗi tiếng Việt như các lỗi API khác
    return Response.json({ success: false, message: 'Máy chủ đang khởi động, vui lòng thử lại sau ít giây' }, { status: 502 });
  }
}
