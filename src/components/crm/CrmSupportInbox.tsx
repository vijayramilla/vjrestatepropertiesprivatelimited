import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, ArrowLeft, Send, Loader2, RefreshCw, ExternalLink,
} from 'lucide-react';
import { callDataProxy } from '@/lib/supabaseData';
import { CrmBtn, CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';

/**
 * CRM Partnership — "Partner Support / Live Chat" inbox.
 * Lists partner support conversations from partner_support_* tables via the
 * data-proxy (admin-gated server-side). Supports status filters, search,
 * unread indicators, assignment, priority, status changes and admin replies.
 */

export interface CrmSupportConversationRow {
  id: string;
  partner_id: string;
  support_ref: string;
  subject: string;
  category: string;
  status: 'Open' | 'In Progress' | 'Waiting for Partner' | 'Resolved';
  assigned_admin: string;
  priority: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  lastMessage?: string;
  unreadCount?: number;
  resolved_at?: string | null;
  resolved_by?: string | null;
  partner?: {
    partner_code: string | null;
    full_name: string;
    partner_type: string;
    status: string;
    mobile: string;
    email: string;
  } | null;
}

interface CrmSupportMessage {
  id: string;
  sender_role: 'partner' | 'admin';
  sender_name: string;
  body: string;
  created_at: string;
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'Open', label: 'Open' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Waiting for Partner', label: 'Waiting for Partner' },
  { key: 'Resolved', label: 'Resolved' },
] as const;

const STATUS_STYLE: Record<string, string> = {
  Open: 'bg-amber-50 text-amber-700 ring-amber-200',
  'In Progress': 'bg-sky-50 text-sky-700 ring-sky-200',
  'Waiting for Partner': 'bg-violet-50 text-violet-700 ring-violet-200',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const PRIORITY_STYLE: Record<string, string> = {
  High: 'bg-red-50 text-red-700 ring-red-200',
  Normal: 'bg-gray-100 text-gray-600 ring-gray-200',
  Low: 'bg-gray-50 text-gray-500 ring-gray-200',
};

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function TypeChip({ type }: { type?: string }) {
  const cls = type === 'Owner' ? 'bg-[#0A1628]/[0.06] text-[#0A1628]' : type === 'Builder' ? 'bg-[#C9A84C]/[0.14] text-[#96782A]' : 'bg-sky-50 text-sky-700';
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${cls}`}>{type ?? '—'}</span>;
}

export function CrmSupportInbox({ onOpenPartner }: { onOpenPartner?: (partnerId: string) => void }) {
  const [rows, setRows] = useState<CrmSupportConversationRow[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError('');
    callDataProxy('partner.support.adminList', {})
      .then((r) => setRows(r?.conversations ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load support conversations.'));
  }, []);

  useEffect(() => { load(); }, [load]);
  // Poll for newly opened/replied conversations while the inbox is visible.
  useEffect(() => {
    const t = setInterval(() => { if (!openId && document.visibilityState === 'visible') load(); }, 20000);
    return () => clearInterval(t);
  }, [load, openId]);

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (filter === 'unread') list = list.filter((c) => (c.unreadCount ?? 0) > 0);
    else if (filter !== 'all') list = list.filter((c) => c.status === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        [c.subject, c.support_ref, c.category, c.partner?.full_name, c.partner?.partner_code, c.lastMessage]
          .some((v) => String(v ?? '').toLowerCase().includes(q)),
      );
    }
    return list;
  }, [rows, filter, query]);

  const unreadTotal = (rows ?? []).reduce((n, c) => n + (c.unreadCount ?? 0), 0);

  if (openId) {
    return <CrmSupportConversation id={openId} onBack={() => { setOpenId(null); load(); }} onOpenPartner={onOpenPartner} />;
  }

  return (
    <div className="space-y-4">
      {/* Filters + search */}
      <CrmCard className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search partner, partner ID, support reference, subject…"
            className={`${CRM_INPUT} pl-9`}
          />
        </div>
        <button
          type="button"
          onClick={load}
          title="Refresh inbox"
          className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 text-[12px] font-semibold text-[#475467] transition-colors hover:bg-black/[0.03]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </CrmCard>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                active ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.12] text-[#8a6d1f]' : 'border-black/10 bg-white text-[#6b7280] hover:border-[#C9A84C]/40'
              }`}
            >
              {f.label}
              {f.key === 'unread' && unreadTotal > 0 && <span className="ml-1.5 opacity-70">{unreadTotal}</span>}
            </button>
          );
        })}
      </div>

      {error && <CrmCard className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</CrmCard>}
      {!rows && !error && (
        <CrmCard className="flex items-center justify-center gap-3 py-24 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading support conversations…
        </CrmCard>
      )}
      {rows && filtered.length === 0 && !error && (
        <CrmCard className="py-16 text-center text-sm text-gray-400">
          No support conversations match this view. Partner requests from Help &amp; Support appear here automatically.
        </CrmCard>
      )}

      {rows && filtered.length > 0 && (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(c.id)}
              className="block w-full cursor-pointer text-left"
            >
              <CrmCard className="p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(10,22,40,0.08)]">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${(c.unreadCount ?? 0) > 0 ? 'bg-[#C9A84C]' : 'bg-[#E4E7EC]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[13.5px] font-bold text-[#0A1628]">{c.subject}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ring-1 ${STATUS_STYLE[c.status] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>{c.status}</span>
                      {c.priority !== 'Normal' && (
                        <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ring-1 ${PRIORITY_STYLE[c.priority] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>{c.priority}</span>
                      )}
                      {(c.unreadCount ?? 0) > 0 && (
                        <span className="rounded-full bg-[#0A1628] px-1.5 py-0.5 text-[9.5px] font-bold text-[#D6B85D]">{c.unreadCount} unread</span>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-[#475467]">
                      <span className="font-semibold text-[#0A1628]">{c.partner?.full_name ?? 'Unknown partner'}</span>
                      <TypeChip type={c.partner?.partner_type} />
                      <span className="font-mono text-[10.5px] text-gray-400">{c.partner?.partner_code ?? c.partner_id.slice(0, 8)}</span>
                      {onOpenPartner && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); onOpenPartner(String(c.partner_id)); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onOpenPartner(String(c.partner_id)); } }}
                          className="inline-flex cursor-pointer items-center gap-0.5 font-semibold text-[#8a6d1f] underline underline-offset-2 hover:text-[#96782A]"
                        >
                          Partner 360° <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </p>
                    <p className="mt-1.5 truncate text-[12.5px] text-[#667085]">{c.lastMessage || `(${c.category})`}</p>
                    <p className="mt-1.5 font-mono text-[10px] text-gray-400">
                      {c.support_ref} · {c.category} · started {fmtWhen(c.created_at)} · last activity {fmtWhen(c.last_message_at)}
                      {c.assigned_admin ? ` · assigned: ${c.assigned_admin}` : ' · unassigned'}
                    </p>
                  </div>
                </div>
              </CrmCard>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Admin conversation view ── */
function CrmSupportConversation({ id, onBack, onOpenPartner }: { id: string; onBack: () => void; onOpenPartner?: (id: string) => void }) {
  const [conversation, setConversation] = useState<CrmSupportConversationRow | null>(null);
  const [messages, setMessages] = useState<CrmSupportMessage[] | null>(null);
  const [partner, setPartner] = useState<CrmSupportConversationRow['partner'] & { status?: string } | null>(null);
  const [relatedProps, setRelatedProps] = useState<{ id: string; property_code: string | null; title: string; status: string }[]>([]);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [assignInput, setAssignInput] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await callDataProxy('partner.support.adminGet', { id });
      setConversation(r?.conversation ?? null);
      setMessages(r?.messages ?? []);
      setPartner(r?.partner ?? null);
      setRelatedProps(r?.relatedProperties ?? []);
      setAssignInput(r?.conversation?.assigned_admin ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load this conversation.');
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 15000);
    return () => clearInterval(t);
  }, [load]);

  const msgList = useMemo(() => messages ?? [], [messages]);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [msgList.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSendError('');
    try {
      setSending(true);
      await callDataProxy('partner.support.adminReply', { id, body: text });
      setDraft('');
      await load();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed — your message was restored, try again.');
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const updateMeta = async (patch: Record<string, unknown>) => {
    setSavingMeta(true);
    try {
      await callDataProxy('partner.support.adminUpdate', { id, ...patch });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setSavingMeta(false);
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-semibold text-[#475467] hover:text-[#101828]">
        <ArrowLeft size={14} /> Back to support inbox
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        {/* Conversation */}
        <CrmCard className="flex min-h-[62vh] flex-col overflow-hidden">
          <div className="border-b border-black/[0.06] px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="text-[15px] font-bold text-[#0A1628]">{conversation?.subject ?? 'Conversation'}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ring-1 ${STATUS_STYLE[conversation?.status ?? ''] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>{conversation?.status}</span>
            </div>
            <p className="mt-0.5 font-mono text-[10.5px] text-gray-400">
              {conversation?.support_ref ?? ''}{conversation?.category ? ` · ${conversation.category}` : ''}
            </p>
          </div>

          <div ref={scrollerRef} className="flex-1 space-y-2.5 overflow-y-auto bg-[#FBF9F3] px-4 py-5">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-red-700 ring-1 ring-red-200">{error}</div>}
            {!messages && !error && (
              <div className="flex items-center justify-center gap-2 py-10 text-[12.5px] text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            )}
            {msgList.map((m) => {
              const fromAdmin = m.sender_role === 'admin';
              return (
                <div key={m.id} className={`flex ${fromAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm sm:max-w-[72%] ${fromAdmin ? 'bg-[#0A1628] text-white' : 'border border-[#E4E7EC] bg-white text-[#101828]'}`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 text-[9.5px] ${fromAdmin ? 'text-white/55' : 'text-gray-400'}`}>
                      {fromAdmin ? 'VJR Estate team' : (partner?.full_name ?? 'Partner')} · {fmtWhen(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-black/[0.06] bg-white px-4 py-3">
            {sendError && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-[11.5px] font-medium text-red-700 ring-1 ring-red-200">{sendError}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                maxLength={4000}
                rows={2}
                placeholder="Reply to the partner… (Enter to send)"
                className="min-h-[44px] w-full resize-y rounded-xl border border-black/[0.1] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#101828] outline-none focus:border-[#C9A84C]"
              />
              <CrmBtn onClick={send} disabled={sending || !draft.trim()} className="!min-h-[44px] shrink-0 !px-4">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              </CrmBtn>
            </div>
          </div>
        </CrmCard>

        {/* Partner summary + controls */}
        <div className="space-y-4">
          <CrmCard className="p-4">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-gray-400">Partner</p>
            <p className="mt-2 text-[14px] font-bold text-[#0A1628]">{partner?.full_name ?? '—'}</p>
            <p className="font-mono text-[11px] text-gray-400">{partner?.partner_code ?? '—'}</p>
            <div className="mt-2"><TypeChip type={partner?.partner_type} /></div>
            <p className="mt-2 text-[12px] text-[#475467]">{partner?.mobile ?? ''}</p>
            <p className="truncate text-[11.5px] text-gray-400">{partner?.email ?? ''}</p>
            {onOpenPartner && conversation && (
              <CrmBtn variant="ghost" className="mt-3 !min-h-[34px] !px-3 !text-[11px]" onClick={() => onOpenPartner(String(conversation.partner_id))}>
                Open Partner 360° <ExternalLink className="h-3 w-3" />
              </CrmBtn>
            )}
          </CrmCard>

          <CrmCard className="p-4">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-gray-400">Status</p>
            <select
              value={conversation?.status ?? ''}
              onChange={(e) => void updateMeta({ status: e.target.value })}
              disabled={savingMeta}
              className={`${CRM_INPUT} mt-2 !h-9 !py-0 text-[12.5px]`}
            >
              <option>Open</option>
              <option>In Progress</option>
              <option>Waiting for Partner</option>
              <option>Resolved</option>
            </select>
            <p className="mt-1.5 text-[10.5px] text-gray-400">
              {conversation?.status === 'Resolved'
                ? `Resolved ${fmtWhen(conversation.resolved_at)} by ${conversation.resolved_by}`
                : 'Resolve when the partner issue is closed.'}
            </p>

            <p className="mt-4 text-[9.5px] font-bold uppercase tracking-[0.18em] text-gray-400">Priority</p>
            <select
              value={conversation?.priority ?? 'Normal'}
              onChange={(e) => void updateMeta({ priority: e.target.value })}
              disabled={savingMeta}
              className={`${CRM_INPUT} mt-2 !h-9 !py-0 text-[12.5px]`}
            >
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
            </select>

            <p className="mt-4 text-[9.5px] font-bold uppercase tracking-[0.18em] text-gray-400">Assign to</p>
            <div className="mt-2 flex gap-1.5">
              <input
                value={assignInput}
                onChange={(e) => setAssignInput(e.target.value)}
                placeholder="admin email"
                className={`${CRM_INPUT} !h-9 flex-1 !py-0 text-[12.5px]`}
              />
              <CrmBtn variant="ghost" className="!min-h-[36px] !px-3" disabled={savingMeta} onClick={() => void updateMeta({ assignedAdmin: assignInput.trim() })}>
                Save
              </CrmBtn>
            </div>
          </CrmCard>

          {(relatedProps?.length ?? 0) > 0 && (
            <CrmCard className="p-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-gray-400">Related listings</p>
              <div className="mt-2 space-y-1.5">
                {relatedProps.slice(0, 5).map((p) => (
                  <p key={p.id} className="truncate text-[11.5px] text-[#475467]">
                    <span className="font-mono text-[10.5px] text-gray-400">{p.property_code ?? ''}</span> {p.title} · {p.status}
                  </p>
                ))}
              </div>
            </CrmCard>
          )}
        </div>
      </div>
    </div>
  );
}
