import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChatCircleDots, EnvelopeSimple, FileText, ArrowLeft, PaperPlaneRight, CircleNotch,
} from '@phosphor-icons/react';
import { callDataProxy } from '@/lib/supabaseData';

/**
 * Partner Help & Support — real support conversations persisted in the
 * partner_support_* tables via the data-proxy. The 24/7 claim is stated as
 * availability of leaving messages at any time; response expectations are
 * honest (no fabricated presence/ready-agents). All authorization is
 * enforced server-side: partner scoping happens in the proxy from the token.
 *
 * Availability note: there is no continuously staffed chat desk yet, so the
 * UI says messages are accepted 24/7 and replies follow team hours — see
 * final report for the operational follow-up.
 */

interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_role: 'partner' | 'admin';
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface SupportConversation {
  id: string;
  support_ref: string;
  subject: string;
  category: string;
  status: 'Open' | 'In Progress' | 'Waiting for Partner' | 'Resolved';
  assigned_admin: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  lastMessage?: string;
  lastMessageAt2?: string;
  unreadCount?: number;
}

const CATEGORIES = [
  'Property Listing',
  'Buyer Enquiry',
  'Site Visit or Booking',
  'Agreement and Verification',
  'Revenue and Settlement',
  'Account Access',
  'Other',
] as const;

const STATUS_STYLE: Record<string, string> = {
  Open: 'bg-amber-50 text-amber-700 ring-amber-200',
  'In Progress': 'bg-sky-50 text-sky-700 ring-sky-200',
  'Waiting for Partner': 'bg-violet-50 text-violet-700 ring-violet-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const card = 'rounded-xl border border-[#E4E7EC] bg-white';
const tiny = 'text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]';

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function PartnerSupportSection({ partnerCode }: { partnerCode?: string }) {
  const [conversations, setConversations] = useState<SupportConversation[] | null>(null);
  const [listError, setListError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const loadList = useCallback(() => {
    setListError('');
    callDataProxy('partner.support.list', {})
      .then((r) => setConversations(r?.conversations ?? []))
      .catch((e) => setListError(e instanceof Error ? e.message : 'Unable to load your support conversations.'));
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  if (openId) {
    return (
      <ConversationView
        id={openId}
        onBack={() => { setOpenId(null); loadList(); }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Heading ── */}
      <div className={`${card} p-5 sm:p-6`}>
        <p className={tiny}>Help &amp; Support</p>
        <h1 className="mt-1 text-[20px] font-bold tracking-tight text-[#101828]">Get help, fast</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#667085]">
          Get help with your listings, enquiries, bookings, agreements, verification, or partner account.
        </p>
      </div>

      {/* ── Live chat ── */}
      <div className={`${card} p-5 sm:p-6`}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A1628] text-[#D6B85D]">
            <ChatCircleDots size={20} weight="regular" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-bold text-[#101828]">Live Chat</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Messages accepted 24/7
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#667085]">
              Describe your issue and the VJR Estate team will reply in this conversation. You can leave a message at any
              time; replies are sent during team working hours — the conversation stays open either way.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                className="admin-btn-primary no-underline inline-flex min-h-[44px] items-center justify-center gap-2"
              >
                <ChatCircleDots className="h-4 w-4" aria-hidden="true" /> Start Live Chat
              </button>
              <Link to="/contact" className="admin-btn-secondary no-underline inline-flex min-h-[44px] items-center justify-center gap-2">
                <EnvelopeSimple className="h-4 w-4" aria-hidden="true" /> Contact VJR Estate
              </Link>
            </div>
            {partnerCode && (
              <p className="mt-3 text-[11px] text-[#98A2B3]">Your Partner ID: <span className="font-mono font-semibold text-[#475467]">{partnerCode}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* ── My support requests ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[#101828]">My Support Requests</h2>
          <button type="button" onClick={loadList} className="cursor-pointer text-[12px] font-semibold text-[#475467] underline underline-offset-2 hover:text-[#101828]">Refresh</button>
        </div>
        {listError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">{listError}</div>
        )}
        {!conversations && !listError && (
          <div className={`${card} flex items-center justify-center gap-2 p-10 text-[13px] text-[#98A2B3]`}>
            <CircleNotch className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {conversations && conversations.length === 0 && !listError && (
          <div className={`${card} px-6 py-12 text-center`}>
            <ChatCircleDots className="mx-auto h-8 w-8 text-[#D0D5DD]" aria-hidden="true" />
            <p className="mt-3 text-[13.5px] font-semibold text-[#101828]">No support conversations yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-[#667085]">
              Start a live chat above and your conversations will appear here with status and replies.
            </p>
          </div>
        )}
        {conversations && conversations.length > 0 && (
          <div className={`${card} divide-y divide-[#F2F4F7]`}>
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setOpenId(c.id)}
                className="flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#FBF9F3]"
              >
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${(c.unreadCount ?? 0) > 0 ? 'bg-[#C9A84C]' : 'bg-[#E4E7EC]'}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[13px] font-semibold text-[#101828]">{c.subject}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ring-1 ${STATUS_STYLE[c.status] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>{c.status}</span>
                    {(c.unreadCount ?? 0) > 0 && (
                      <span className="rounded-full bg-[#C9A84C] px-1.5 py-0.5 text-[9.5px] font-bold text-[#101828]">{c.unreadCount} new</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-[#667085]">{c.lastMessage || c.category}</p>
                  <p className="mt-1 font-mono text-[10px] text-[#98A2B3]">{c.support_ref} · started {fmtWhen(c.created_at)} · updated {fmtWhen(c.updated_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Policies ── */}
      <div className={`${card} p-5`}>
        <p className={tiny}>Platform policies</p>
        <div className="mt-3 flex flex-col gap-2 text-[12.5px]">
          <Link to="/partner-terms" target="_blank" className="font-semibold text-[#101828] underline underline-offset-2">Partner Terms &amp; Conditions</Link>
          <Link to="/partner-privacy" target="_blank" className="font-semibold text-[#101828] underline underline-offset-2">Partner Privacy Policy</Link>
        </div>
      </div>

      {composeOpen && (
        <NewConversationModal
          onClose={() => setComposeOpen(false)}
          onCreated={(id) => { setComposeOpen(false); loadList(); setOpenId(id); }}
        />
      )}
    </div>
  );
}

/* ── New conversation modal ── */
function NewConversationModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<string>('Property Listing');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!subject.trim() || !body.trim()) { setError('Add a subject and describe your issue.'); return; }
    setSending(true);
    try {
      const r = await callDataProxy('partner.support.create', { subject, category, body });
      onCreated(String(r?.conversation?.id ?? ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the conversation. Your draft is kept — try again.');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Start a live chat">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] px-5 py-4">
          <h3 className="text-[15px] font-bold text-[#101828]">Start a conversation</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-[#667085] hover:bg-[#F2F4F7]" aria-label="Close">✕</button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={160}
              placeholder="e.g. Listing photos not uploading"
              className="mt-1 w-full rounded-lg border border-[#E4E7EC] px-3 py-2.5 text-[13px] text-[#101828] outline-none focus:border-[#C9A84C]"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Issue category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[13px] text-[#101828] outline-none focus:border-[#C9A84C]"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Describe your issue</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="Include your property code or partner ID when relevant…"
              className="mt-1 w-full resize-y rounded-lg border border-[#E4E7EC] px-3 py-2.5 text-[13px] leading-relaxed text-[#101828] outline-none focus:border-[#C9A84C]"
            />
            <span className="mt-1 block text-right text-[10px] text-[#98A2B3]">{body.length}/4000</span>
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700 ring-1 ring-red-200">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[#E4E7EC] px-5 py-3.5">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-[#E4E7EC] px-4 py-2.5 text-[13px] font-semibold text-[#475467] hover:bg-[#F8F9FB]">Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="admin-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 disabled:opacity-60"
          >
            {sending ? <CircleNotch className="h-4 w-4 animate-spin" /> : <PaperPlaneRight className="h-4 w-4" />}
            {sending ? 'Starting…' : 'Start conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Conversation view (partner side) ── */
function ConversationView({ id, onBack }: { id: string; onBack: () => void }) {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await callDataProxy('partner.support.get', { id });
      setConversation(r?.conversation ?? null);
      setMessages(r?.messages ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load this conversation.');
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  // Light polling keeps replies arriving without a realtime dependency;
  // it stops slowly blurring focus by only refetching when visible.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000);
    return () => clearInterval(t);
  }, [load]);

  const messagesList = useMemo(() => messages ?? [], [messages]);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messagesList.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSendError('');
    setDraft('');
    setSending(true);
    try {
      await callDataProxy('partner.support.reply', { id, body: text });
      await load();
    } catch (e) {
      setDraft(text); // never lose the draft on failure
      setSendError(e instanceof Error ? e.message : 'Send failed — your message was restored, try again.');
    } finally {
      setSending(false);
    }
  };

  const statusChip = conversation && (
    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ring-1 ${STATUS_STYLE[conversation.status] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>{conversation.status}</span>
  );

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-semibold text-[#475467] hover:text-[#101828]">
        <ArrowLeft size={14} /> Back to Help &amp; Support
      </button>

      <div className={`${card} flex min-h-[62vh] flex-col overflow-hidden`}>
        {/* Header */}
        <div className="border-b border-[#E4E7EC] px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-[15px] font-bold text-[#101828]">{conversation?.subject ?? 'Conversation'}</h2>
            {statusChip}
          </div>
          <p className="mt-0.5 font-mono text-[10.5px] text-[#98A2B3]">
            {conversation?.support_ref ?? ''}
            {conversation?.category ? ` · ${conversation.category}` : ''}
            {conversation?.assigned_admin ? ` · handled by ${conversation.assigned_admin}` : ''}
          </p>
        </div>

        {/* Messages */}
        <div ref={scrollerRef} className="flex-1 space-y-2.5 overflow-y-auto bg-[#FBF9F3] px-4 py-5 sm:px-5">
          {loadError && <div className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-red-700 ring-1 ring-red-200">{loadError}</div>}
          {!messages && !loadError && (
            <div className="flex items-center justify-center gap-2 py-10 text-[12.5px] text-[#98A2B3]"><CircleNotch className="h-4 w-4 animate-spin" /> Loading conversation…</div>
          )}
          {messages && messages.length === 0 && (
            <p className="py-10 text-center text-[12.5px] text-[#98A2B3]">No messages yet.</p>
          )}
          {messagesList.map((m) => {
            const fromPartner = m.sender_role === 'partner';
            return (
              <div key={m.id} className={`flex ${fromPartner ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm sm:max-w-[72%] ${
                    fromPartner ? 'bg-[#0A1628] text-white' : 'border border-[#E4E7EC] bg-white text-[#101828]'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-[9.5px] ${fromPartner ? 'text-white/55' : 'text-[#98A2B3]'}`}>
                    {fromPartner ? 'You' : 'VJR Estate team'} · {fmtWhen(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="border-t border-[#E4E7EC] bg-white px-4 py-3 sm:px-5">
          {conversation?.status === 'Resolved' && (
            <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11.5px] font-medium text-emerald-800 ring-1 ring-emerald-200">
              This conversation is resolved — sending another message will reopen it.
            </p>
          )}
          {sendError && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-[11.5px] font-medium text-red-700 ring-1 ring-red-200">{sendError}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              maxLength={4000}
              rows={2}
              placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
              className="min-h-[44px] w-full resize-y rounded-xl border border-[#E4E7EC] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#101828] outline-none focus:border-[#C9A84C]"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !draft.trim()}
              className="admin-btn-primary inline-flex h-[44px] shrink-0 items-center justify-center gap-1.5 !px-4 disabled:opacity-50"
              aria-label="Send message"
            >
              {sending ? <CircleNotch className="h-4 w-4 animate-spin" /> : <PaperPlaneRight size={15} weight="bold" />}
            </button>
          </div>
        </div>
      </div>

      <div className={`${card} flex items-center gap-2 p-3 text-[11.5px] text-[#667085]`}>
        <FileText size={14} aria-hidden="true" />
        Replies arrive here and in your Activity History. Related partner terms: <Link to="/partner-terms" target="_blank" className="font-semibold text-[#101828] underline underline-offset-2">Partner Terms</Link>.
      </div>
    </div>
  );
}
