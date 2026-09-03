import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  Trash2,
  X,
  MapPin,
  ArrowRight,
  CornerDownRight,
  Sparkles,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { processQuery, type UserRole } from '../../ai/ragEngine';
import { conversationStore, type AiMessage } from '../../ai/conversationStore';
import { formatINR } from '../../ai/dataConnector';

const GOLD = '#C9A84C';

const QUICK_QUESTIONS = [
  'Show best rental yield properties',
  'Find PG buildings in HSR Layout',
  'Compare top 3 PG buildings',
  'Show upcoming auctions',
  'Market overview Bangalore',
];

// ─── Lightweight markdown-lite renderer (bold + bullets, HTML-safe) ─────────
function inlineFormat(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-bold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function renderAnswer(text: string): ReactNode {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    if (/^[-•*]\s/.test(trimmed)) {
      return (
        <div key={i} className="flex gap-2">
          <span className="mt-px shrink-0 text-[#C9A84C]">•</span>
          <span className="min-w-0">{inlineFormat(trimmed.replace(/^[-•*]\s/, ''))}</span>
        </div>
      );
    }
    return <p key={i}>{inlineFormat(trimmed)}</p>;
  });
}

// ─── Typing indicator ────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="Nexa is typing">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: GOLD }}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Property mini card ──────────────────────────────────────────────────────
function PropertyMiniCard({ property }: { property: { id: string; title: string; type: string; location: string; price: number; monthlyRental: number; images?: string[]; areaSqft?: number } }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/properties/${property.id}`)}
      className="group flex w-full items-center gap-3 rounded-xl border border-[#C9A84C]/20 bg-white/[0.05] p-2.5 text-left transition-all duration-200 hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
    >
      {property.images?.[0] ? (
        <img
          src={property.images[0]}
          alt=""
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <MapPin size={18} className="text-[#C9A84C]/70" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">{property.type}</p>
        <p className="truncate text-[13px] font-semibold text-white">{property.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[14px] font-extrabold text-[#C9A84C]">{formatINR(property.price)}</span>
          {property.monthlyRental > 0 && (
            <span className="text-[11px] font-semibold text-emerald-400">+{formatINR(property.monthlyRental)}/mo</span>
          )}
        </div>
      </div>
      <ArrowRight size={16} className="shrink-0 text-[#C9A84C]/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#C9A84C]" />
    </button>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: AiMessage }) {
  const navigate = useNavigate();
  const isUser = message.role === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {!isUser && (
        <div className="mb-1.5 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E8C76A]">
            <Bot size={12} className="text-[#0A1628]" fill="currentColor" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9A84C]">Nexa</span>
        </div>
      )}

      <div
        className={`max-w-[92%] rounded-2xl border px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isUser
            ? 'rounded-tr-md border-[#C9A84C]/30 bg-[#C9A84C]/20 text-white/90'
            : 'rounded-tl-md border-white/10 bg-white/[0.06] text-white/85'
        }`}
      >
        {message.isLoading ? <TypingIndicator /> : <div className="whitespace-pre-wrap">{renderAnswer(message.content)}</div>}
      </div>

      {!isUser && message.properties && message.properties.length > 0 && (
        <div className="mt-2.5 w-full space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
            Matching properties ({message.properties.length})
          </p>
          <div className="space-y-2">
            {message.properties.slice(0, 5).map((p) => (
              <PropertyMiniCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      )}

      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {message.sources.map((source, i) => (
            <span key={i} className="flex items-center gap-1 rounded border border-[#C9A84C]/20 bg-[#C9A84C]/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-[#C9A84C]/80">
              <ShieldCheck size={9} />
              {source}
            </span>
          ))}
        </div>
      )}

      {!isUser && message.intent === 'PROPERTY_SEARCH' && message.properties?.length === 0 && (
        <button
          type="button"
          onClick={() => navigate('/properties')}
          className="mt-2 flex items-center gap-1 rounded-lg border border-[#C9A84C]/25 px-2.5 py-1.5 text-[11px] font-semibold text-[#C9A84C] transition-colors duration-200 hover:bg-[#C9A84C]/10"
        >
          View all properties <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}


// ─── Suggested question chips ────────────────────────────────────────────────
function SuggestionChips({ questions, onAsk }: { questions: string[]; onAsk: (q: string) => void }) {
  if (!questions.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onAsk(q)}
          className="flex items-center gap-1 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-3 py-1.5 text-[11px] font-medium text-white/75 transition-all duration-200 hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
        >
          <CornerDownRight size={11} className="text-[#C9A84C]" />
          {q}
        </button>
      ))}
    </div>
  );
}

// ─── Welcome message ─────────────────────────────────────────────────────────
const WELCOME: AiMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! I’m Nexa, your property intelligence assistant for Bangalore real estate.\n\nI can help you:\n\n• Find properties matching your requirements\n• Compare properties\n• Analyze rental income and investment potential\n• Calculate EMI and estimated purchase costs\n• Explore auction properties\n• Understand property details and available information',
  timestamp: Date.now(),
};

// ─── MAIN PANEL ──────────────────────────────────────────────────────────────
export default function VJRAIPanel({
  isOpen,
  onClose,
  userRole = 'public',
}: {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole;
}) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' });
  }, [messages, reduceMotion]);

  useEffect(() => {
    if (!isOpen) return;
    conversationStore.clear();
    setMessages([WELCOME]);
    setSuggestions(QUICK_QUESTIONS);
    const t = window.setTimeout(() => inputRef.current?.focus(), 350);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || isSending) return;
    setInput('');
    setIsSending(true);
    setSuggestions([]);

    const userMsg: AiMessage = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
    const loadingMsg: AiMessage = { id: `loading-${Date.now()}`, role: 'assistant', content: '', isLoading: true, timestamp: Date.now() };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    const history = conversationStore.getHistory();
    conversationStore.addMessage({ role: 'user', content: text });

    try {
      // Pass only PRIOR messages — callGemini appends the live query itself.
      const result = await processQuery(text, history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content })), userRole);

      const assistantMsg: AiMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        properties: result.properties,
        intent: result.intent,
        sources: result.sources,
        calculations: result.calculations,
        confidence: result.confidence,
        timestamp: Date.now(),
      };
      conversationStore.addMessage({ role: 'assistant', content: result.answer });

      setMessages((prev) => prev.map((m) => (m.id === loadingMsg.id ? assistantMsg : m)));
      setSuggestions(result.suggestedQuestions);
    } catch {
      conversationStore.removeMessage(loadingMsg.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, isLoading: false, content: 'Sorry, I couldn’t complete that request. Please try again.' }
            : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Nexa assistant"
            initial={{ x: reduceMotion ? 0 : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 right-0 top-0 z-[130] flex w-full max-w-[420px] flex-col border-l border-[#C9A84C]/20 bg-[#0A1628] shadow-[-8px_0_40px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#C9A84C]/20 bg-gradient-to-br from-[#0A1628] via-[#122240] to-[#1a2f4e] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#E8C76A] shadow-[0_0_20px_rgba(201,168,76,0.35)]">
                  <Bot size={20} className="text-[#0A1628]" fill="currentColor" />
                </div>
                <div>
                  <p className="text-[15px] font-extrabold tracking-tight text-white">Nexa</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C9A84C]">
                    Property Intelligence
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    conversationStore.clear();
                    setMessages([WELCOME]);
                    setSuggestions(QUICK_QUESTIONS);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A84C]/25 text-white/50 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
                  aria-label="Close assistant"
                  title="Close assistant"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(201,168,76,0.3)_transparent]">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}

              {suggestions.length > 0 && !isSending && (
                <div className="pt-1">
                  <p className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/40">
                    <Sparkles size={11} className="text-[#C9A84C]" /> You might also ask
                  </p>
                  <SuggestionChips questions={suggestions} onAsk={send} />
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-[#C9A84C]/15 bg-[#0A1628] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 rounded-xl border border-[#C9A84C]/25 bg-white/[0.06] px-3.5 py-2.5 transition-colors duration-200 focus-within:border-[#C9A84C]/60">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder="Ask about any Bangalore property…"
                    className="w-full bg-transparent text-[13px] text-white placeholder:text-white/30 focus:outline-none"
                    aria-label="Ask Nexa"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!input.trim() || isSending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C9A84C] text-[#0A1628] shadow-[0_4px_16px_rgba(201,168,76,0.4)] transition-all duration-200 hover:scale-[1.04] hover:bg-[#E8C76A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C] disabled:cursor-not-allowed disabled:bg-[#C9A84C]/25 disabled:shadow-none disabled:hover:scale-100"
                  aria-label="Send message"
                >
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
                </button>
              </div>
              <p className="mt-2 text-center text-[9px] tracking-wide text-white/25">
                Nexa by VJR Estate
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
