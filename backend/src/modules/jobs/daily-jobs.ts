import { Schema, model } from 'mongoose';
import { scanLeaseReminders } from './lease-reminder.service.js';
import { cleanupSubmissionMedia } from '../submissions/submission-cleanup.js';
import { TrashService } from '../apartments/trash.service.js';
import { checkQuotaAlerts } from '../health/quota-meters.js';

// Bản ghi khoá theo ngày: đảm bảo việc hằng ngày chỉ chạy 1 lần dù nhiều người mở app cùng lúc / nhiều máy chủ
const JobRun = model(
  'JobRun',
  new Schema<{ _id: string; lastRunDate: string }>({ _id: String, lastRunDate: String }, { collection: 'job_runs', versionKey: false })
);

/** Ngày hiện tại theo giờ Việt Nam dạng "2026-11-19" (máy chủ Render chạy giờ UTC). */
export const vnDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);

// Story 16.8a: ngày chạy gần nhất (giờ VN) — hiện trên trang Sức khỏe hệ thống
export const lastDailyRun = async () => (await JobRun.findById('daily').lean())?.lastRunDate ?? null;

let lastCheckedDate = ''; // Đã kiểm tra hôm nay trong tiến trình này → không hỏi DB ở mỗi request

/**
 * Việc hằng ngày (Story 11.5) — thay node-cron: Render gói free ngủ sau 15 phút không có truy cập nên lịch giờ cố định không chạy.
 * Gọi ở request đã đăng nhập (GET /auth/me khi mở app); lần đầu của mỗi ngày (giờ VN) mới chạy:
 * nhắc tái ký hợp đồng + dọn ảnh tin CTV bị từ chối. Trả true nếu lần gọi này đã chạy.
 */
export async function runDailyJobsIfDue(now = new Date()): Promise<boolean> {
  const today = vnDate(now);
  if (lastCheckedDate === today) return false;
  lastCheckedDate = today; // Gán trước khi chờ DB → các request đến cùng lúc trong tiến trình này bỏ qua ngay

  try {
    // Chỉ khớp khi chưa chạy hôm nay; đã chạy → upsert đụng _id có sẵn → lỗi trùng khoá (11000) = bỏ qua
    await JobRun.findOneAndUpdate({ _id: 'daily', lastRunDate: { $ne: today } }, { $set: { lastRunDate: today } }, { upsert: true });
  } catch (err: any) {
    if (err?.code === 11000) return false;
    lastCheckedDate = ''; // Lỗi DB → lần sau thử lại
    throw err;
  }

  const jobs: [string, Promise<unknown>][] = [['Nhắc tái ký', scanLeaseReminders(now)], ['Dọn Thùng rác', TrashService.purgeExpired(now)], ['Kiểm tra hạn mức', checkQuotaAlerts()]]; // Story 16.7, 16.8b
  if (process.env.CLOUDINARY_API_KEY) jobs.push(['Dọn ảnh tin CTV', cleanupSubmissionMedia(now)]);
  const results = await Promise.allSettled(jobs.map(([, job]) => job));
  results.forEach((result, index) => {
    if (result.status === 'rejected') console.error(`[Việc hằng ngày] ${jobs[index][0]} lỗi:`, result.reason?.message || result.reason);
  });
  return true;
}
