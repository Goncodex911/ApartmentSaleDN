import { useCallback, useEffect, useState } from 'react';
import { Lead, leadApi } from '../api/leadApi.js';

/** Tải & cập nhật danh sách khách của CTV (tách data-fetching khỏi UI Kanban). */
export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');

  const reload = useCallback(() => {
    setStatus('loading');
    leadApi
      .list()
      .then((items) => {
        setLeads(items);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(reload, [reload]);

  // Thay/thêm 1 khách sau khi tạo/sửa, đưa lên đầu (hoạt động gần nhất)
  const upsert = useCallback((lead: Lead) => {
    setLeads((list) => [lead, ...list.filter((item) => item._id !== lead._id)]);
  }, []);

  const remove = useCallback((leadId: string) => {
    setLeads((list) => list.filter((item) => item._id !== leadId));
  }, []);

  return { leads, status, reload, upsert, remove };
}
