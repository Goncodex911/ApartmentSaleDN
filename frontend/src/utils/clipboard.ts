/**
 * Ghi Clipboard: ưu tiên Clipboard API; fallback execCommand cho trang http:// (LAN) hoặc trình duyệt cũ.
 * Trên iOS phải gọi ngay trong sự kiện chạm (không có await mạng phía trước).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length); // iOS Safari cần chọn vùng thủ công
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }
}
