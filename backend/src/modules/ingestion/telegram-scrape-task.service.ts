import { randomUUID } from 'node:crypto';
import { TelegramUserbotService } from './telegram-userbot.service.js';

export interface ScrapeTaskState {
  id: string;
  userId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  percent: number;
  logs: string[];
  apartments: any[];
  total: number;
  error?: string;
  startedAt: Date;
}

// Giữ kết quả tác vụ 1 giờ để trình duyệt kịp đọc, sau đó dọn khỏi bộ nhớ
const TASK_TTL_MS = 60 * 60 * 1000;

/**
 * Chạy cào tin Telegram dưới nền.
 * Lý do: proxy Netlify cắt request sau ~26 giây (504), trong khi cào + AI bóc tách nhiều bài mất vài phút.
 * API chỉ trả về taskId ngay lập tức, frontend hỏi tiến trình định kỳ qua getTask.
 */
export class TelegramScrapeTaskService {
  private static tasks = new Map<string, ScrapeTaskState>();

  public static start(userId: string, options: { chatInput: string; targetSender: string; limit: number }) {
    this.cleanupExpired();

    // Mỗi người chỉ chạy 1 tác vụ cùng lúc để tránh bị Telegram chặn vì flood
    const running = [...this.tasks.values()].find((t) => t.userId === userId && t.status === 'RUNNING');
    if (running) return running;

    const task: ScrapeTaskState = {
      id: randomUUID(),
      userId,
      status: 'RUNNING',
      percent: 0,
      logs: [],
      apartments: [],
      total: 0,
      startedAt: new Date(),
    };
    this.tasks.set(task.id, task);

    TelegramUserbotService.scrapeTargetSender(userId, {
      ...options,
      onProgress: ({ log, percent }) => {
        task.logs.push(log);
        task.percent = percent;
      },
    })
      .then((result) => {
        task.apartments = result.apartments;
        task.total = result.total;
        task.percent = 100;
        task.status = 'COMPLETED';
      })
      .catch((err: any) => {
        task.error = err?.message || 'Lỗi trong quá trình cào tin';
        task.status = 'FAILED';
      });

    return task;
  }

  public static getTask(userId: string, taskId: string): ScrapeTaskState | null {
    const task = this.tasks.get(taskId);
    return task && task.userId === userId ? task : null;
  }

  private static cleanupExpired() {
    const now = Date.now();
    for (const [id, task] of this.tasks) {
      if (task.status !== 'RUNNING' && now - task.startedAt.getTime() > TASK_TTL_MS) this.tasks.delete(id);
    }
  }
}
