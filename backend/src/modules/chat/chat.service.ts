import { Apartment } from '../apartments/apartment.model.js';
import { User } from '../auth/user.model.js';
import { ShareLink } from '../share/share-link.model.js';
import { ShareLinkService } from '../share/share-link.service.js';
import { toPublicListing } from '../share/public-listing.util.js';
import { getVisibleImages } from '../share/photo.service.js';
import { SearchService } from '../search/search.service.js';
import { stripPhoneNumbers } from '../../utils/phone-text.js';
import { randomCode } from '../../utils/random-code.js';
import { ChatSession, IChatSession, IChatSuggestion } from './chat-session.model.js';
import { askChatAi } from './chat-ai.js';
import { syncLeadFromChat } from './chat-lead.js';
import { createCounter } from '../../middlewares/rate-limit.js';
import { usdToVndRate } from '../../config/currency.js';

const MAX_USER_MESSAGES_PER_SESSION = 30;
const AI_HISTORY_SIZE = 12;
const FALLBACK_REPLY = 'Dạ em đã ghi nhận nhu cầu của anh/chị. Tư vấn viên sẽ liên hệ lại anh/chị ngay ạ!';
const LINK_EXPIRED = { status: 404, message: 'Link không còn hiệu lực' };
const TOO_MANY_SESSIONS = { status: 429, message: 'Bạn đã mở quá nhiều cuộc trò chuyện, vui lòng thử lại sau' };
const newSessionLimit = createCounter({ windowMs: 60 * 60 * 1000, max: 5 });

/**
 * Gợi ý tối đa 3 căn thật còn trống theo nhu cầu (Story 6.2 - AC3), bỏ căn đang xem và căn đã gợi ý.
 * Link mỗi căn là link xem phòng của chính CTV chủ phiên chat → khách vẫn ở trong "kênh" của CTV.
 */
async function suggestApartments(session: IChatSession): Promise<IChatSuggestion[]> {
  const { districts, zones = [], maxBudget, budgetCurrency, bedrooms, allowPets, carParking } = session.requirements;
  if (!districts.length && !zones.length && !maxBudget) return [];

  const excluded = new Set([String(session.apartmentId)]);
  session.messages.forEach((message) => message.suggestions?.forEach((s) => excluded.add(String(s.apartmentId))));

  // Story 14.7: khách nói khu vực ("Mỹ An") → lọc theo khu vực; ngân sách USD quy ra VNĐ theo tỷ giá cấu hình
  const budgetVnd = maxBudget && (budgetCurrency === 'USD' ? maxBudget * usdToVndRate() : maxBudget);
  const { items } = await SearchService.search({
    zones: zones.length ? zones : undefined,
    district: zones.length ? undefined : districts[0],
    maxPrice: budgetVnd ? Math.round(budgetVnd * 1.05) : undefined,
    bedrooms: bedrooms ?? undefined, // Story 19.6: giữ 0 (Studio)
    allowPets: allowPets || undefined,
    carParking: carParking || undefined,
    status: 'AVAILABLE',
    limit: 8,
  });

  const picks = items.filter((item: any) => !excluded.has(String(item._id))).slice(0, 3);
  return Promise.all(
    picks.map(async (apartment: any) => ({
      apartmentId: apartment._id,
      title: stripPhoneNumbers(apartment.title),
      price: apartment.price,
      district: apartment.location.district,
      image: getVisibleImages(apartment)[0],
      url: (await ShareLinkService.getOrCreateLink(String(apartment._id), String(session.ctvId))).url,
    }))
  );
}

const toPublicMessages = (session: IChatSession) =>
  session.messages.map(({ role, content, suggestions, createdAt }) => ({ role, content, suggestions, createdAt }));

export class ChatService {
  /** Lịch sử 1 phiên chat (khách tải lại trang vẫn thấy hội thoại). */
  static async getSession(code: string, sessionId: string) {
    const session = await ChatSession.findOne({ sessionId, shareCode: code });
    if (!session) throw { status: 404, message: 'Không tìm thấy phiên chat' };
    return { sessionId, messages: toPublicMessages(session) };
  }

  /** Khách gửi 1 tin: AI trả lời → cập nhật nhu cầu → gợi ý căn → đồng bộ CRM & báo CTV. */
  static async sendMessage(code: string, input: { sessionId?: string; message: string }, viewer: { id?: string; ip: string }) {
    const link = await ShareLink.findOne({ code }).lean();
    if (!link) throw LINK_EXPIRED;
    const [apartment, ctv] = await Promise.all([
      Apartment.findById(link.apartmentId).lean(),
      User.findById(link.ctvId).select('name phone zaloPhone zaloLink avatarUrl greetingMessage status').lean(),
    ]);
    if (!apartment || !ctv || ctv.status !== 'ACTIVE') throw LINK_EXPIRED;

    const existing = input.sessionId ? await ChatSession.findOne({ sessionId: input.sessionId, shareCode: code }) : null;
    // Story 14.7: mỗi phiên mới = 1 khách + 1 thông báo cho CTV → giới hạn số phiên MỚI theo IP trên mỗi link (sessionId bịa / hết hạn cũng tính)
    if (!existing && newSessionLimit.hit(`${viewer.ip}:${code}`)) throw TOO_MANY_SESSIONS;
    const session =
      existing ??
      new ChatSession({ sessionId: randomCode(24), shareCode: code, ctvId: link.ctvId, apartmentId: link.apartmentId });
    if (session.userMessageCount >= MAX_USER_MESSAGES_PER_SESSION) {
      throw { status: 429, message: 'Phiên chat đã đạt giới hạn, tư vấn viên sẽ liên hệ trực tiếp với bạn' };
    }
    session.messages.push({ role: 'user', content: input.message, createdAt: new Date() });
    session.userMessageCount += 1;

    // Ngữ cảnh gửi AI chỉ là dữ liệu công khai (không có chủ nhà, địa chỉ chính xác, ảnh, liên hệ CTV)
    const { images: _images, ctv: _ctv, ...publicApartment } = toPublicListing(apartment as any, ctv);
    const ai = await askChatAi({
      ctvName: ctv.name,
      apartment: publicApartment,
      requirements: session.requirements,
      history: session.messages.slice(-AI_HISTORY_SIZE),
    });

    if (ai) {
      for (const [key, value] of Object.entries(ai.requirements)) session.set(`requirements.${key}`, value);
      if (ai.customer.name) session.customer.name = ai.customer.name;
      if (ai.customer.phone) session.customer.phone = ai.customer.phone;
    }
    const suggestions = ai?.wantsSuggestions ? await suggestApartments(session) : [];
    const reply = ai?.reply || FALLBACK_REPLY;
    session.messages.push({ role: 'assistant', content: reply, suggestions: suggestions.length ? suggestions : undefined, createdAt: new Date() });

    // CTV tự thử chat trên link của mình → không tạo khách, không tự báo cho mình.
    // Story 14.7: chỉ tạo khách từ tin thứ 2 (hoặc ngay khi để lại SĐT) → khách mở chat rồi bỏ đi không làm đầy phễu
    const isRealLead = session.userMessageCount >= 2 || Boolean(session.customer.phone);
    if (viewer.id !== String(link.ctvId) && isRealLead) await syncLeadFromChat(session);
    await session.save();

    return { sessionId: session.sessionId, reply, suggestions };
  }
}
