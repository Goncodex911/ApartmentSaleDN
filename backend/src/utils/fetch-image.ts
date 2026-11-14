const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/**
 * Tải ảnh từ URL về Buffer: chỉ chấp nhận http(s), timeout 8 giây, tối đa 15MB.
 */
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (!/^https?:\/\//i.test(url)) throw new Error(`URL ảnh không hợp lệ: ${url}`);

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Không thể tải ảnh (HTTP ${res.status}): ${url}`);
  if (Number(res.headers.get('content-length')) > MAX_IMAGE_BYTES) throw new Error(`Ảnh vượt quá 15MB: ${url}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error(`Ảnh vượt quá 15MB: ${url}`);
  return buffer;
}
