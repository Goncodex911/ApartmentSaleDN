import React, { useEffect, useRef, useState } from 'react';
import { formatVnd } from '../../utils/format.js';
import { ChatMessage, chatApi } from '../../api/chatApi.js';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

interface ChatWidgetProps {
  code: string;
  ctvName: string;
  greeting?: string;
}

const storageKey = (code: string) => `chat-session-${code}`;
// localStorage có thể bị chặn (trình duyệt ẩn danh, Zalo in-app...) → bọc try/catch, chat vẫn chạy
const readSessionId = (code: string) => {
  try {
    return localStorage.getItem(storageKey(code)) || undefined;
  } catch {
    return undefined;
  }
};
const saveSessionId = (code: string, sessionId: string) => {
  try {
    localStorage.setItem(storageKey(code), sessionId);
  } catch {
    /* bỏ qua: chỉ mất khả năng giữ hội thoại khi tải lại trang */
  }
};

// Khung chat trợ lý AI trên trang xem phòng (Story 6.2 - AC1)
export const ChatWidget: React.FC<ChatWidgetProps> = ({ code, ctvName, greeting }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const sessionIdRef = useRef<string | undefined>(readSessionId(code));
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mở lại trang → tải lại hội thoại cũ của phiên
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    chatApi.history(code, sessionId).then((data) => setMessages(data.messages)).catch(() => undefined);
  }, [code]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setMessages((list) => [...list, { role: 'user', content: text }]);
    try {
      const result = await chatApi.send(code, text, sessionIdRef.current);
      sessionIdRef.current = result.sessionId;
      saveSessionId(code, result.sessionId);
      setMessages((list) => [...list, { role: 'assistant', content: result.reply, suggestions: result.suggestions }]);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Mất kết nối, bạn vui lòng thử lại hoặc gọi trực tiếp tư vấn viên nhé.';
      setMessages((list) => [...list, { role: 'assistant', content: message }]);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-violet-600 text-white text-sm font-bold shadow-lg"
      >
        <MessageCircle className="w-5 h-5" /> Hỏi ngay
      </button>
    );
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-4 sm:w-96 sm:h-[34rem] z-50 flex flex-col bg-white sm:rounded-2xl shadow-2xl border border-slate-200">
      <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-violet-600 text-white sm:rounded-t-2xl">
        <Bot className="w-6 h-6" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Trợ lý của {ctvName}</p>
          <p className="text-[11px] opacity-80">Trả lời ngay, kể cả ngoài giờ</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50 text-sm">
        <p className="max-w-[85%] p-2.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200 text-slate-700">
          {greeting || 'Xin chào! Anh/chị đang tìm phòng khu vực nào, tầm giá bao nhiêu ạ?'}
        </p>
        {messages.map((message, index) => (
          <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'space-y-2'}>
            <p
              className={`max-w-[85%] p-2.5 rounded-2xl whitespace-pre-line ${
                message.role === 'user' ? 'rounded-tr-sm bg-violet-600 text-white' : 'rounded-tl-sm bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {message.content}
            </p>
            {message.suggestions?.map((apartment) => (
              <a key={apartment.apartmentId} href={apartment.url} className="flex gap-2 p-2 max-w-[85%] rounded-xl bg-white border border-violet-200 hover:border-violet-400">
                {apartment.image && <img src={apartment.image} alt={apartment.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 line-clamp-2">{apartment.title}</span>
                  <span className="block text-xs font-bold text-violet-700">{formatVnd(apartment.price)}/tháng</span>
                  <span className="block text-[11px] text-slate-500">{apartment.district} · Xem ảnh →</span>
                </span>
              </a>
            ))}
          </div>
        ))}
        {sending && <p className="w-14 p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-400 animate-pulse">•••</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 p-2.5 border-t border-slate-100">
        <input
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button type="submit" disabled={!input.trim() || sending} className="px-3.5 rounded-xl bg-violet-600 text-white disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
