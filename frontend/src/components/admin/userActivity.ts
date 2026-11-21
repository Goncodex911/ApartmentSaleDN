import { timeAgo } from '../../utils/format.js';

export const ONLINE_MS = 5 * 60 * 1000;
export const isOnline = (lastActiveAt?: string) => Boolean(lastActiveAt) && Date.now() - new Date(lastActiveAt!).getTime() < ONLINE_MS;

/** "Đang hoạt động" (trong 5 phút) / "Hoạt động 3 giờ trước" / chưa ghi nhận — Story 16.3 */
export const activityText = (lastActiveAt?: string) => {
  if (!lastActiveAt) return 'Chưa ghi nhận hoạt động';
  return isOnline(lastActiveAt) ? 'Đang hoạt động' : `Hoạt động ${timeAgo(lastActiveAt)}`;
};
