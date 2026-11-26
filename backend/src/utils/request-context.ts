import type { Request } from 'express';

/**
 * IP thật của khách (Story 19.9 / GAP-03).
 * Giao diện Cloudflare Pages gọi THẲNG Render (1 tầng proxy) còn Netlify đi qua proxy (2 tầng) → đếm tầng X-Forwarded-For
 * theo TRUST_PROXY không đúng cho cả hai, khách có thể tự khai X-Forwarded-For để giả IP.
 * Render đứng sau Cloudflare: header CF-Connecting-IP do Cloudflare GHI ĐÈ (khách không giả được) → ưu tiên header này.
 * Request qua proxy Netlify (có x-nf-request-id) thì CF-Connecting-IP là IP máy chủ Netlify → giữ cách cũ (req.ip theo TRUST_PROXY).
 * Không có header → req.ip như trước.
 */
export const clientIp = (req: Request): string | undefined => (!req.get('x-nf-request-id') && req.get('cf-connecting-ip')) || req.ip;

// IP thật + thiết bị rút gọn 200 ký tự — dùng cho nhật ký & phiên đăng nhập (Story 16.2, 16.4)
export const requestContext = (req: Request) => ({ ip: clientIp(req), userAgent: req.get('user-agent')?.slice(0, 200) });
