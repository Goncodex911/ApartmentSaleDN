import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, authApi } from '../api/authApi.js';
import { Lead, LeadStage, leadApi } from '../api/leadApi.js';
import { useLeads } from '../hooks/useLeads.js';
import { Navbar } from '../components/layout/Navbar.js';
import { ProfileModal } from '../components/profile/ProfileModal.js';
import { LeadCard } from '../components/leads/LeadCard.js';
import { LeadDetailModal } from '../components/leads/LeadDetailModal.js';
import { LeadFormModal } from '../components/leads/LeadFormModal.js';
import { LEAD_STAGES, STAGES_NEED_INPUT } from '../components/leads/leadStages.js';
import { Plus, RefreshCw, Users, AlertCircle } from 'lucide-react';

// Bảng Kanban phễu khách hàng (Story 6.1): cột cuộn ngang trên điện thoại, kéo-thả trên máy tính
export const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { leads, status, reload, upsert, remove } = useLeads();
  const [openLead, setOpenLead] = useState<{ lead: Lead; pendingStage?: LeadStage } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropError, setDropError] = useState('');

  useEffect(() => {
    authApi.getMe().then((res) => setCurrentUser(res.data)).catch(() => navigate('/login'));
  }, [navigate]);

  // Thả thẻ vào cột: cột cần thêm thông tin (Hẹn xem / Hủy) → mở Modal, còn lại chuyển ngay
  const handleDrop = async (stage: LeadStage) => {
    const lead = leads.find((item) => item._id === draggingId);
    setDraggingId(null);
    if (!lead || lead.stage === stage) return;
    if (STAGES_NEED_INPUT.includes(stage)) {
      setOpenLead({ lead, pendingStage: stage });
      return;
    }
    try {
      setDropError('');
      upsert(await leadApi.changeStage(lead._id, { stage }));
    } catch (err: any) {
      setDropError(err.response?.data?.message || 'Không chuyển được giai đoạn, vui lòng thử lại');
    }
  };

  const renderBoard = () => {
    if (status === 'loading') {
      return (
        <div className="flex gap-3 overflow-hidden animate-pulse">
          {LEAD_STAGES.map((stage) => (
            <div key={stage.key} className="w-[80vw] sm:w-72 shrink-0 h-64 bg-slate-200/70 rounded-2xl" />
          ))}
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="py-16 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-sm text-slate-600">Không tải được danh sách khách hàng.</p>
          <button onClick={reload} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Thử lại</button>
        </div>
      );
    }
    if (leads.length === 0) {
      return (
        <div className="py-16 text-center space-y-2 px-6">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700">Chưa có khách hàng nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Bấm "Thêm khách" để ghi nhận khách, hoặc gửi link xem phòng — khách chat với trợ lý AI sẽ tự xuất hiện ở đây.
          </p>
        </div>
      );
    }
    return (
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 scrollbar-none">
        {LEAD_STAGES.map((stage) => {
          const items = leads.filter((lead) => lead.stage === stage.key);
          return (
            <section
              key={stage.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.key)}
              className={`w-[80vw] sm:w-72 shrink-0 snap-start rounded-2xl bg-slate-100/80 p-2.5 flex flex-col max-h-[calc(100vh-12rem)] ${
                draggingId ? 'ring-2 ring-indigo-200' : ''
              }`}
            >
              <h2 className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-4 text-xs font-bold uppercase flex justify-between ${stage.accent}`}>
                {stage.label} <span>{items.length}</span>
              </h2>
              <div className="space-y-2 overflow-y-auto">
                {items.map((lead) => (
                  <LeadCard key={lead._id} lead={lead} onOpen={(item) => setOpenLead({ lead: item })} onDragStart={setDraggingId} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={currentUser} onOpenProfile={() => setIsProfileOpen(true)} onLogout={() => { localStorage.clear(); navigate('/login'); }} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Khách hàng của tôi</h1>
            <p className="text-xs text-slate-500">Chạm vào khách để chuyển giai đoạn và ghi chú</p>
          </div>
          <div className="flex gap-2">
            <button onClick={reload} title="Tải lại" className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
              <Plus className="w-4 h-4" /> Thêm khách
            </button>
          </div>
        </div>
        {dropError && <p className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{dropError}</p>}
        {renderBoard()}
      </main>

      {openLead && (
        <LeadDetailModal
          key={openLead.lead._id}
          lead={leads.find((item) => item._id === openLead.lead._id) ?? openLead.lead}
          pendingStage={openLead.pendingStage}
          onClose={() => setOpenLead(null)}
          onUpdated={upsert}
          onDeleted={(leadId) => {
            remove(leadId);
            setOpenLead(null);
          }}
        />
      )}
      {isFormOpen && <LeadFormModal onClose={() => setIsFormOpen(false)} onCreated={(lead) => { upsert(lead); setIsFormOpen(false); }} />}
      {isProfileOpen && currentUser && <ProfileModal user={currentUser} onClose={() => setIsProfileOpen(false)} onProfileUpdated={setCurrentUser} />}
    </div>
  );
};
