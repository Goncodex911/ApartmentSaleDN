import { z } from 'zod';

// Thông báo lỗi mặc định của zod bằng tiếng Việt (áp dụng toàn cục khi module này được import)
z.config(z.locales.vi());

// SĐT Việt Nam: 0xxxxxxxxx hoặc (+)84xxxxxxxxx, đầu số 3/5/7/8/9.
// Neo ^...$ để không chấp nhận chuỗi có ký tự thừa (VD: "abc0912345678xyz").
export const vnPhoneRegex = /^(?:\+?84|0)[35789]\d{8}$/;

/**
 * Chuẩn hóa SĐT về 1 dạng duy nhất "0xxxxxxxxx" trước khi lưu/so khớp.
 * iPhone tự điền từ danh bạ/Keychain thường ra "+84 85 434 69 68" → trước đây đăng nhập báo sai mật khẩu
 * vì DB lưu "0854346968" (so khớp nguyên chuỗi).
 */
export const normalizeVnPhone = (raw: string) =>
  raw
    .trim()
    .replace(/[\s.\-()]/g, '')
    .replace(/^(?:\+?84)(?=[35789]\d{8}$)/, '0');

export const vnPhone = (message: string) =>
  z.string().transform(normalizeVnPhone).pipe(z.string().regex(/^0[35789]\d{8}$/, message));

export type DeepPartial<T> = T extends readonly unknown[] | Date
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/**
 * Tạo schema cập nhật một phần (PATCH) từ schema tạo mới: bỏ mọi .default()/.prefault() (kể cả lồng nhau)
 * và cho mọi trường thành optional. Từ zod v4, .partial() vẫn điền giá trị mặc định cho trường không gửi lên
 * → sửa giá thuê cũng làm reset status/images... về mặc định. Hàm này tránh việc ghi đè dữ liệu cũ đó.
 */
export function toPatchSchema(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodDefault || schema instanceof z.ZodPrefault || schema instanceof z.ZodOptional) {
    return toPatchSchema(schema.unwrap() as z.ZodType);
  }
  if (schema instanceof z.ZodObject) {
    const fields = Object.entries(schema.shape).map(([key, field]) => [key, toPatchSchema(field as z.ZodType).optional()]);
    return z.object(Object.fromEntries(fields));
  }
  return schema;
}
