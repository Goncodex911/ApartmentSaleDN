import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.js';
import { isPrivilegedRole } from '../apartments/apartment.model.js';
import { RealtimeEvent, currentEventId, eventsAfter, realtimeBus } from './realtime.bus.js';

const PING_MS = 15_000;
// Proxy Netlify cắt request sau ~26 giây → máy chủ tự đóng trước để client nối lại gọn, không báo lỗi
const MAX_CONNECTION_MS = 25_000;

// CTV không xem căn đã cho thuê → chỉ báo id + trạng thái để gỡ / làm mờ thẻ, không gửi tên & giá
const viewFor = (event: RealtimeEvent, role?: string) =>
  'status' in event.data && event.data.status === 'RENTED' && !isPrivilegedRole(role) ? { id: event.data.id, status: 'RENTED' } : event.data;

export class RealtimeController {
  /** GET /realtime/stream — luồng Server-Sent Events cập nhật kho phòng (Story 11.4). */
  static stream(req: AuthRequest, res: Response) {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx (bản local / Docker) không gom luồng
    });
    res.flushHeaders();

    const role = req.user?.role;
    const send = (event: RealtimeEvent) =>
      res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(viewFor(event, role))}\n\n`);

    res.write('retry: 2000\n\n');
    const lastId = req.get('Last-Event-ID');
    if (lastId) {
      const missed = eventsAfter(lastId);
      if (missed) missed.forEach(send);
      else res.write('event: reset\ndata: {}\n\n');
    }
    // Mốc hiện tại → lần nối lại sau gửi kèm để nhận bù đúng từ đây
    res.write(`id: ${currentEventId()}\nevent: ready\ndata: {}\n\n`);

    realtimeBus.on('event', send);
    const ping = setInterval(() => res.write(': ping\n\n'), PING_MS);
    const timeout = setTimeout(() => res.end(), MAX_CONNECTION_MS);
    req.on('close', () => {
      clearInterval(ping);
      clearTimeout(timeout);
      realtimeBus.off('event', send);
    });
  }
}
