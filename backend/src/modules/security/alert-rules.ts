import { AuditLog } from '../audit/audit-log.model.js';
import { onAuditLogged } from '../audit/audit.service.js';
import { DEFAULT_ALERT_THRESHOLDS, SystemConfigService } from '../admin/system-config.service.js';
import { deviceOf } from '../../utils/user-agent.js';
import { SecurityAlertService } from './security-alert.service.js';

/**
 * Story 16.5: phát hiện bất thường ngay tại điểm ghi nhật ký (không quét định kỳ).
 * Bộ đếm cửa sổ trượt trong bộ nhớ — đủ cho 1 máy chủ; Render ngủ / khởi động lại thì đếm lại từ 0 (chấp nhận).
 */
const MINUTE = 60 * 1000;
const hits = new Map<string, number[]>();

// Ghi 1 lần + trả số lần trong cửa sổ `windowMs` gần nhất
function hitCount(key: string, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => at > now - windowMs);
  recent.push(now);
  if (hits.size > 10_000) hits.clear(); // Chặn bộ nhớ phình ra
  hits.set(key, recent);
  return recent.length;
}

const thresholds = async () => ({ ...DEFAULT_ALERT_THRESHOLDS, ...(await SystemConfigService.get()).alertThresholds });

// Admin / Quản lý đăng nhập bằng cặp "hệ điều hành · trình duyệt" chưa từng thấy trong 20 lần đăng nhập trước
async function isNewDevice(userId: string, userAgent?: string) {
  const previous = await AuditLog.find({ userId, action: 'LOGIN' }).sort({ createdAt: -1 }).skip(1).limit(20).select('userAgent').lean();
  if (!previous.length) return false; // Lần đầu có nhật ký đăng nhập (vừa bật tính năng) → không báo nhầm
  const device = deviceOf(userAgent);
  return !previous.some((entry) => deviceOf(entry.userAgent) === device);
}

onAuditLogged(({ action, userId, userName, userRole, details, userAgent }) => {
  const run = async () => {
    if (action === 'UNMASK_OWNER_CONTACT' && userId) {
      const count = hitCount(`contact:${userId}`, 60 * MINUTE);
      const { ownerContactPerHour } = await thresholds();
      if (count >= ownerContactPerHour) {
        await SecurityAlertService.raise({ rule: 'OWNER_CONTACT_SCRAPE', severity: 'SECURITY', key: userId, userId, subject: userName, count, message: `${userName} đã xem SĐT chủ ${count} lần trong 1 giờ` });
      }
    }
    if (action === 'LOGIN_FAILED' || action === 'LOGIN_BLOCKED') {
      const phone = String(details?.phone ?? '');
      const count = action === 'LOGIN_BLOCKED' ? 10 : hitCount(`login:${phone}`, 15 * MINUTE);
      if (count >= 10) {
        await SecurityAlertService.raise({ rule: 'LOGIN_BRUTE_FORCE', severity: 'SECURITY', key: phone, userId, subject: phone, count, message: `SĐT ${phone} đăng nhập sai ≥ 10 lần trong 15 phút${action === 'LOGIN_BLOCKED' ? ' — đã bị tạm chặn' : ''}` });
      }
    }
    if (action === 'DELETE_APARTMENT' && userId && !details?.bulk) {
      const count = hitCount(`delete:${userId}`, 10 * MINUTE);
      const { deletesPer10Min } = await thresholds();
      if (count >= deletesPer10Min) {
        await SecurityAlertService.raise({ rule: 'MASS_DELETE', severity: 'IMPORTANT', key: userId, userId, subject: userName, count, message: `${userName} đã xóa ${count} căn trong 10 phút` });
      }
    }
    if (action === 'LOGIN' && userId && (userRole === 'ADMIN' || userRole === 'MANAGER') && (await isNewDevice(userId, userAgent))) {
      await SecurityAlertService.raise({ rule: 'NEW_DEVICE_PRIVILEGED', severity: 'IMPORTANT', key: userId, userId, subject: userName, count: 1, message: `${userName} đăng nhập từ thiết bị mới: ${deviceOf(userAgent)}` });
    }
  };
  run().catch((err) => console.error('[SecurityAlert] Lỗi phát hiện:', err.message));
});
