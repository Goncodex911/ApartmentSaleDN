import type { Request } from 'express';

// IP thật (đã bật TRUST_PROXY) + thiết bị rút gọn 200 ký tự — dùng cho nhật ký & phiên đăng nhập (Story 16.2, 16.4)
export const requestContext = (req: Request) => ({ ip: req.ip, userAgent: req.get('user-agent')?.slice(0, 200) });
