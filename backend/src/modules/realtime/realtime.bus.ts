import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';
import { maskPhonesInText } from '../../utils/phone-text.js';

export type RealtimeEventType = 'apartment.created' | 'apartment.status' | 'apartment.price' | 'apartment.flagged';

export interface RealtimeEvent {
  id: string; // "<mã lần khởi động>-<số thứ tự>" — client gửi lại qua Last-Event-ID để nhận bù
  type: RealtimeEventType;
  data: { id: string; status: string; price: number; priceUsd?: number; label: string; by?: string; flagged?: boolean };
}

type ApartmentLike = { _id: unknown; title: string; status: string; price: number; priceUsd?: number; verification?: unknown };

// Render free chạy 1 máy chủ → giữ sự kiện trong bộ nhớ là đủ; khởi động lại thì mã khởi động đổi → client tải lại danh sách
const BOOT_ID = randomBytes(4).toString('hex');
const BUFFER_SIZE = 200;
const buffer: RealtimeEvent[] = [];
let sequence = 0;

export const realtimeBus = new EventEmitter();
realtimeBus.setMaxListeners(0); // Mỗi người đang mở app là 1 listener

export const currentEventId = () => `${BOOT_ID}-${sequence}`;

/** Phát sự kiện căn hộ cho mọi người đang kết nối (Story 11.4). Tên căn che SĐT vì tin gốc có thể chứa SĐT chủ nhà. */
export function publishApartmentEvent(type: RealtimeEventType, apartment: ApartmentLike, by?: string): void {
  sequence += 1;
  const event: RealtimeEvent = {
    id: currentEventId(),
    type,
    data: {
      id: String(apartment._id),
      status: apartment.status,
      price: apartment.price,
      priceUsd: apartment.priceUsd,
      label: maskPhonesInText(apartment.title).slice(0, 80),
      by,
      flagged: Boolean(apartment.verification), // Story 13.6: nhãn "Chờ xác minh" trên thẻ
    },
  };
  buffer.push(event);
  if (buffer.length > BUFFER_SIZE) buffer.shift();
  realtimeBus.emit('event', event);
}

/**
 * Sự kiện phát sau mốc lastId. Trả null khi không gửi bù được (máy chủ đã khởi động lại, hoặc mốc quá cũ đã rơi khỏi bộ đệm)
 * → client phải tải lại toàn bộ danh sách.
 */
export function eventsAfter(lastId: string): RealtimeEvent[] | null {
  const [bootId, rawSeq] = lastId.split('-');
  const lastSeq = Number(rawSeq);
  if (bootId !== BOOT_ID || !Number.isInteger(lastSeq) || lastSeq > sequence) return null;
  const oldestSeq = sequence - buffer.length + 1;
  if (lastSeq < oldestSeq - 1) return null;
  return buffer.filter((event) => Number(event.id.split('-')[1]) > lastSeq);
}
