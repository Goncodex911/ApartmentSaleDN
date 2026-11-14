import { Lead, pushLeadNote } from '../leads/lead.model.js';
import { NotificationService } from '../notifications/notification.service.js';
import { IChatSession } from './chat-session.model.js';

/**
 * Đồng bộ phiên chat AI vào phễu CRM của CTV (Story 6.2 - AC4):
 * - Tin đầu tiên → tạo Lead (AI_CHAT, NEW); các tin sau cập nhật dần tên, SĐT, nhu cầu.
 * - Báo CTV (in-app + Telegram) khi khách bắt đầu chat và khi khách để lại SĐT — mỗi loại 1 lần/phiên.
 */
export async function syncLeadFromChat(session: IChatSession): Promise<void> {
  let lead = session.leadId ? await Lead.findById(session.leadId) : null;
  const isNewLead = !lead;
  lead ??= new Lead({
    ctvId: session.ctvId,
    source: 'AI_CHAT',
    name: `Khách web #${session.sessionId.slice(0, 4).toUpperCase()}`,
    requirements: { districts: [] },
  });

  if (session.customer.name) lead.name = session.customer.name;
  if (session.customer.phone) lead.phone = session.customer.phone;
  for (const [key, value] of Object.entries(session.requirements)) {
    const isEmpty = value === undefined || value === null || (Array.isArray(value) && value.length === 0);
    if (!isEmpty) lead.set(`requirements.${key}`, value);
  }
  if (isNewLead) pushLeadNote(lead, 'Khách bắt đầu chat với trợ lý AI từ link xem phòng', true);
  else lead.lastActivityAt = new Date();
  await lead.save();
  session.leadId = lead._id as IChatSession['leadId'];

  const userId = String(session.ctvId);
  const leadId = String(lead._id);
  const area = lead.requirements.districts.join(', ');

  if (!session.notifiedStart) {
    await NotificationService.notify({
      userId,
      leadId,
      type: 'NEW_CHAT_LEAD',
      title: 'Khách mới nhắn tin',
      body: `${lead.name} vừa nhắn tin${area ? ` cần tìm phòng khu ${area}` : ''}, hãy vào hỗ trợ!`,
    });
    session.notifiedStart = true;
  }

  if (session.customer.phone && !session.notifiedPhone) {
    await NotificationService.notify({
      userId,
      leadId,
      type: 'NEW_CHAT_LEAD',
      title: 'Khách để lại số điện thoại',
      body: `Khách hàng ${lead.name} (${session.customer.phone}) vừa để lại SĐT${area ? `, cần phòng khu ${area}` : ''}. Gọi lại ngay!`,
    });
    session.notifiedPhone = true;
  }
}
