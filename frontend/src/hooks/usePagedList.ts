import { useEffect, useRef, useState } from 'react';

type PageResult<T> = { items: T[]; total: number };

/**
 * Danh sách có bộ lọc + ô tìm (chờ 300ms sau lần gõ cuối) + "Tải thêm" — dùng cho các trang quản trị (Epic 13).
 * `filterKey` đổi (tab) hoặc từ khóa đổi → tải lại trang 1; kết quả của truy vấn cũ về muộn bị bỏ qua.
 */
export function usePagedList<T extends { _id: string }>(filterKey: string, search: string, fetchPage: (page: number, query: string) => Promise<PageResult<T>>) {
  const [query, setQuery] = useState(search.trim());
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const currentKey = useRef('');
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const key = `${filterKey}|${query}|${reloadKey}`;
    currentKey.current = key;
    setState('loading');
    fetchRef
      .current(1, query)
      .then((result) => {
        if (currentKey.current !== key) return;
        setItems(result.items);
        setTotal(result.total);
        setPage(1);
        setState('ready');
      })
      .catch(() => currentKey.current === key && setState('error'));
  }, [filterKey, query, reloadKey]);

  const loadMore = async () => {
    const key = currentKey.current;
    setLoadingMore(true);
    try {
      const result = await fetchRef.current(page + 1, query);
      if (currentKey.current !== key) return;
      setItems((list) => [...list, ...result.items]);
      setPage(page + 1);
    } catch {
      // Lỗi tải thêm: giữ danh sách đang có, bấm lại được
    } finally {
      setLoadingMore(false);
    }
  };

  // Cập nhật 1 dòng sau thao tác (không tải lại cả danh sách)
  const replace = (item: T) => setItems((list) => list.map((current) => (current._id === item._id ? item : current)));

  return { items, total, state, loadingMore, hasMore: items.length < total, loadMore, replace, reload: () => setReloadKey((key) => key + 1) };
}
