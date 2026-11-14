import React, { useEffect, useState } from 'react';
import { User } from '../../api/authApi.js';
import { userApi } from '../../api/userApi.js';
import { X, Check, Ban, Loader2, UserCheck } from 'lucide-react';

// [ADMIN] Duyệt các tài khoản Quản lý tự đăng ký (trạng thái PENDING)
export const PendingUsersModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState('');

  useEffect(() => {
    userApi
      .listUsers('PENDING')
      .then(setUsers)
      .catch(() => setError('Không tải được danh sách tài khoản chờ duyệt'));
  }, []);

  const handleDecision = async (userId: string, status: 'ACTIVE' | 'BLOCKED') => {
    setProcessingId(userId);
    setError('');
    try {
      await userApi.updateUserStatus(userId, status);
      setUsers((list) => list?.filter((user) => user._id !== userId) ?? null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không cập nhật được trạng thái tài khoản');
    } finally {
      setProcessingId('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" /> Tài khoản chờ duyệt
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto text-sm">
          {error && <p className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</p>}
          {!users && !error && (
            <div className="space-y-2 animate-pulse">
              {[0, 1].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}
            </div>
          )}
          {users?.length === 0 && <p className="py-8 text-center text-slate-500 text-xs">Không có tài khoản nào đang chờ duyệt.</p>}
          {users?.map((user) => (
            <div key={user._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-500">{user.phone} · Quản lý</p>
              </div>
              {processingId === user._id ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                <>
                  <button type="button" onClick={() => handleDecision(user._id, 'ACTIVE')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                    <Check className="w-3.5 h-3.5" /> Duyệt
                  </button>
                  <button type="button" onClick={() => handleDecision(user._id, 'BLOCKED')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold">
                    <Ban className="w-3.5 h-3.5" /> Từ chối
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
