import { randomUUID } from 'node:crypto';
import { TelegramHarvestService, LogLevel } from './telegram-harvest.service.js';

export interface ScrapeLog {
  at: number;
  level: LogLevel;
  text: string;
}

export interface ScrapeTaskState {
  id: string;
  userId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  percent: number;
  logs: ScrapeLog[];
  apartments: any[];
  error?: string;
  errorCode?: string; // TELEGRAM_SESSION_DEAD → trang tải lại trạng thái kết nối
  startedAt: Date;
  stopRequested: boolean;
}

const TASK_TTL_MS = 60 * 60 * 1000; // Giữ kết quả 1 giờ để trình duyệt kịp đọc
const MAX_LOGS = 300;

/**
 * Chạy cào tin Telegram dưới nền.
 * Lý do: proxy Netlify cắt request sau ~26 giây (504), trong khi cào + AI bóc tách nhiều bài mất vài phút.
 * API chỉ trả taskId, frontend hỏi tiến trình định kỳ; tắt màn hình điện thoại / tải lại trang vẫn theo dõi tiếp được.
 */
export class TelegramScrapeTaskService {
  private static tasks = new Map<string, ScrapeTaskState>();

  public static start(userId: string, options: { chatInput: string; targetSender: string; limit: number }) {
    this.cleanupExpired();

    // Mỗi người chỉ chạy 1 tác vụ cùng lúc để tránh bị Telegram chặn vì flood
    const running = this.getActive(userId);
    if (running) return running;

    const task: ScrapeTaskState = {
      id: randomUUID(),
      userId,
      status: 'RUNNING',
      percent: 0,
      logs: [],
      apartments: [],
      startedAt: new Date(),
      stopRequested: false,
    };
    this.tasks.set(task.id, task);

    TelegramHarvestService.scrapeTargetSender(userId, {
      ...options,
      shouldStop: () => task.stopRequested,
      onProgress: ({ level, text, percent, item }) => {
        task.logs.push({ at: Date.now(), level, text });
        if (task.logs.length > MAX_LOGS) task.logs.splice(0, task.logs.length - MAX_LOGS);
        if (percent !== undefined) task.percent = percent;
        if (item) task.apartments.push(item); // Căn hộ hiện dần trên trang khi đang quét
      },
    })
      .then(() => {
        task.percent = 100;
        task.status = task.stopRequested ? 'CANCELLED' : 'COMPLETED';
      })
      .catch((err: any) => {
        task.error = err?.message || 'Lỗi trong quá trình cào tin';
        task.errorCode = err?.code;
        task.logs.push({ at: Date.now(), level: 'error', text: task.error! });
        task.status = 'FAILED';
      });

    return task;
  }

  public static getTask(userId: string, taskId: string): ScrapeTaskState | null {
    const task = this.tasks.get(taskId);
    return task && task.userId === userId ? task : null;
  }

  public static getActive(userId: string): ScrapeTaskState | null {
    return [...this.tasks.values()].find((t) => t.userId === userId && t.status === 'RUNNING') ?? null;
  }

  /** Dừng sau bài đang xử lý (không cắt ngang giữa chừng để không mất ảnh đã tải) */
  public static cancel(userId: string, taskId: string): ScrapeTaskState | null {
    const task = this.getTask(userId, taskId);
    if (task?.status === 'RUNNING') task.stopRequested = true;
    return task;
  }

  /**
   * Bản gửi cho trình duyệt (bỏ userId). `entries` = log có giờ + mức độ (frontend mới);
   * `logs` = chuỗi thuần cho frontend cũ trên Netlify (đang khóa deploy) không bị crash khi backend lên trước.
   * Xóa `logs` sau khi Netlify deploy bản frontend mới.
   */
  public static toPublic(task: ScrapeTaskState) {
    const { userId: _userId, logs, ...rest } = task;
    return { ...rest, entries: logs, logs: logs.map((log) => log.text), total: task.apartments.length };
  }

  private static cleanupExpired() {
    const now = Date.now();
    for (const [id, task] of this.tasks) {
      if (task.status !== 'RUNNING' && now - task.startedAt.getTime() > TASK_TTL_MS) this.tasks.delete(id);
    }
  }
}
