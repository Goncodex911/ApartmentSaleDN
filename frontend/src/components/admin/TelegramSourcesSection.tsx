import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SystemSettings, adminApi } from '../../api/adminApi.js';
import { DashboardSection } from './DashboardParts.js';
import { Button } from '../ui/Button.js';
import { fieldClass } from '../ui/Input.js';

const errorText = (err: any) => err.response?.data?.message || 'Không lưu được, vui lòng thử lại';

/** Công tắc bật/tắt: vùng chạm 44px, đọc được bằng trình đọc màn hình (role="switch"). */
const Switch: React.FC<{ checked: boolean; label: string; disabled?: boolean; onChange: (next: boolean) => void }> = ({ checked, label, disabled, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className="shrink-0 h-11 px-1 flex items-center cursor-pointer disabled:opacity-60">
    <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}>
      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${checked ? 'translate-x-5' : ''}`} />
    </span>
  </button>
);

/**
 * [ADMIN] Nhóm Telegram nguồn (Story 13.5): thêm / tạm dừng / xóa — có hiệu lực ngay, không khởi động lại máy chủ.
 * Thêm Chat ID KHÔNG tự đưa bot vào nhóm → ghi rõ hướng dẫn.
 */
export const TelegramSourcesSection: React.FC<{ settings: SystemSettings; onChange: (next: SystemSettings) => void }> = ({ settings, onChange }) => {
  const [name, setName] = useState('');
  const [chatId, setChatId] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = async (key: string, action: () => Promise<SystemSettings>) => {
    setBusy(key);
    setError('');
    try {
      onChange(await action());
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy('');
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await run('add', () => adminApi.addTelegramSource({ name: name.trim(), chatId: chatId.trim() }))) {
      setName('');
      setChatId('');
    }
  };

  return (
    <DashboardSection title="Nguồn cào tin Telegram" note="Bot chỉ đọc được nhóm khi đã được thêm vào nhóm và tắt Privacy Mode (BotFather → /setprivacy → Disable) hoặc là quản trị viên nhóm.">
      {settings.envFallbackCount > 0 && (
        <p className="p-3 rounded-xl bg-amber-50 text-sm text-amber-900">
          Đang dùng {settings.envFallbackCount} nhóm khai báo trong biến môi trường máy chủ. Thêm nhóm ở đây thì danh sách trên web sẽ thay thế.
        </p>
      )}
      {settings.telegramSources.length === 0 && settings.envFallbackCount === 0 && (
        <p className="p-3 rounded-xl bg-slate-100 text-sm text-slate-700">Chưa giới hạn nhóm: bot nhận tin từ mọi cuộc trò chuyện có bot. Nên thêm nhóm nguồn khi chạy thật.</p>
      )}
      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{error}</p>}

      <ul className="divide-y divide-slate-100">
        {settings.telegramSources.map((source) => (
          <li key={source.chatId} className="flex items-center gap-2 py-2">
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${source.active ? 'text-slate-900' : 'text-slate-600'}`}>{source.name}</p>
              <p className="text-xs text-slate-600 break-words">
                {source.chatId} · {source.active ? 'Đang bật' : 'Tạm dừng'} · {source.weeklyCount} tin / 7 ngày
              </p>
            </div>
            <Switch checked={source.active} label={`Bật nhóm ${source.name}`} disabled={!!busy} onChange={(active) => run(source.chatId, () => adminApi.toggleTelegramSource(source.chatId, active))} />
            <button
              type="button"
              aria-label={`Xóa nhóm ${source.name}`}
              disabled={!!busy}
              onClick={() => window.confirm(`Xóa nhóm "${source.name}" khỏi nguồn cào tin?`) && run(source.chatId, () => adminApi.removeTelegramSource(source.chatId))}
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="w-5 h-5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Tên nhóm</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hội cho thuê căn hộ Sơn Trà" className={fieldClass} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Chat ID</span>
          <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890" autoComplete="off" className={fieldClass} />
        </label>
        <Button type="submit" icon={Plus} loading={busy === 'add'} disabled={name.trim().length < 2 || !chatId.trim()}>Thêm nhóm</Button>
      </form>
    </DashboardSection>
  );
};
