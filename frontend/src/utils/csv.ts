// Ô bắt đầu bằng = + - @ bị Excel hiểu là công thức (CSV injection) → thêm dấu ' phía trước
const cell = (value: unknown) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Tải file CSV UTF-8 có BOM (Excel mở đúng dấu tiếng Việt), tạo ngay trên trình duyệt — không cần thư viện. */
export function downloadCsv(fileName: string, header: string[], rows: unknown[][]) {
  const content = '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
