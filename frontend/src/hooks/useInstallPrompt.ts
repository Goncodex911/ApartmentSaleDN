import { useEffect, useState } from 'react';
import { isStandalone, isTouchDevice } from '../utils/device.js';

// Sự kiện cài đặt của Chrome / Samsung Internet / Cốc Cốc (chưa có trong kiểu DOM chuẩn)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'android' | 'ios-safari' | 'ios-other';

const DISMISS_KEY = 'installPrompt.dismissedAt';
const VISITS_KEY = 'installPrompt.visits';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const FIRST_VISIT_DELAY_MS = 30_000;

// localStorage có thể bị chặn (ẩn danh, trình duyệt trong Zalo) → bọc try/catch
const storage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Không lưu được → lần sau có thể hiện lại, chấp nhận
    }
  },
};

// Bắt sự kiện ngay khi app tải (sự kiện chỉ phát 1 lần lúc mở trang, trước khi component kịp mount)
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); // Tự hiện thanh của app thay cho thanh mặc định của Chrome
  deferredPrompt = event as BeforeInstallPromptEvent;
  listeners.forEach((notify) => notify());
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  storage.set(DISMISS_KEY, String(Number.MAX_SAFE_INTEGER)); // Đã cài → không bao giờ hiện lại
  listeners.forEach((notify) => notify());
});
// Đếm số lần mở app (mỗi lần tải trang 1 lần) — chỉ nhắc cài từ lần mở thứ 2
const visits = Number(storage.get(VISITS_KEY) || 0) + 1;
storage.set(VISITS_KEY, String(visits));

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// Trình duyệt trong app (Zalo, Facebook...) và Chrome / Firefox / Edge trên iPhone không cài được app → phải mở bằng Safari
const isIOSSafari = () => !/CriOS|FxiOS|EdgiOS|OPiOS|Zalo|FBAN|FBAV|Instagram|Line\//i.test(navigator.userAgent);

function detectPlatform(): InstallPlatform | null {
  if (isStandalone() || !isTouchDevice()) return null; // Đã cài hoặc đang dùng máy tính
  if (isIOS()) return isIOSSafari() ? 'ios-safari' : 'ios-other';
  return deferredPrompt ? 'android' : null; // Android: chỉ hiện khi trình duyệt cho phép cài
}

/**
 * Thanh hướng dẫn cài app (Story 9.2): Android gọi hộp cài đặt hệ thống, iPhone hướng dẫn 2 bước trong Safari.
 * Không làm phiền: đóng → 7 ngày sau mới hiện lại; lần mở đầu tiên chờ 30 giây.
 */
export function useInstallPrompt() {
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [ready, setReady] = useState(visits > 1);

  useEffect(() => {
    const update = () => setPlatform(detectPlatform());
    update();
    listeners.add(update);
    const timer = ready ? undefined : setTimeout(() => setReady(true), FIRST_VISIT_DELAY_MS);
    return () => {
      listeners.delete(update);
      clearTimeout(timer);
    };
  }, [ready]);

  const snoozed = Date.now() - Number(storage.get(DISMISS_KEY) || 0) < SNOOZE_MS;

  const dismiss = () => {
    storage.set(DISMISS_KEY, String(Date.now()));
    setPlatform(null);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') storage.set(DISMISS_KEY, String(Number.MAX_SAFE_INTEGER));
    else dismiss();
    setPlatform(null);
  };

  return { platform: ready && !snoozed ? platform : null, install, dismiss };
}
