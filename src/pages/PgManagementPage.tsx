import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Bed,
  Wrench,
  Receipt,
  Users,
  Siren,
  Phone,
  ArrowRight,
  CheckCircle,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { setPageMeta } from '@/lib/siteMeta';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { siteContact } from '@/data/siteContact';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Karnataka compliance, tracked',
    body: 'BBMP trade licence, Fire NOC, FSSAI, occupancy certificate and CCTV retention — every licence tracked with auto-renewal alerts 45 and 15 days before expiry, and a health score you can show a bank.',
  },
  {
    icon: Bed,
    title: 'Bed-level control',
    body: 'Room and bed mapping with per-bed pricing for single, double and triple sharing. Occupancy, notice beds and move-outs in one view — no more spreadsheets.',
  },
  {
    icon: Receipt,
    title: 'Transparent owner statements',
    body: 'Monthly statement: rent collected − VJR fee (with GST invoice) − maintenance − a disclosed coordination margin. Net payout on schedule, every month. NRI payouts routed via NRO per FEMA.',
  },
  {
    icon: Users,
    title: 'Tenant lifecycle, end to end',
    body: 'Lead → viewing → digital KYC and police verification → agreement (notarised ≤11 months, Sub-Registrar beyond) → move-in inventory with photos → renewals with escalation.',
  },
  {
    icon: Wrench,
    title: 'Repairs without surprises',
    body: 'Tenant complaints with SLA timers and photo proof. On-site managers approve small repairs; anything above your agreed cap needs your sign-off in the app.',
  },
  {
    icon: Siren,
    title: 'PG-specific operations',
    body: 'Gate visitor and parcel log with resident alerts, weekly mess menu publishing, duty roster coverage checks, notice board with BBMP 1533 and Police 101, and a resident emergency button.',
  },
];

const FEES = [
  {
    title: 'Management fee',
    price: '8–12%',
    body: 'Of rent collected for residential; 6–10% commercial. Or a flat monthly fee per building (₹5,000–15,000, tiered by size). Vacancy-protected option: no fee for any month the unit sits vacant.',
  },
  {
    title: 'Onboarding & inspection',
    price: '₹2,500',
    body: 'One-time. Includes the full inventory audit with photos, document vault setup and compliance gap report for your building.',
  },
  {
    title: 'Tenant placement',
    price: 'Configurable',
    body: 'One month\'s rent or 50%, charged per new tenant placed. Corporate placements handled with TDS compliance built in.',
  },
  {
    title: 'Maintenance margin',
    price: '12%',
    body: 'On coordinated repair costs — shown as a disclosed line on every statement, never buried in invoices.',
  },
];

const FAQS = [
  {
    q: 'Who owns the property and the rent?',
    a: 'You do. VJR manages under a management contract: you keep ownership and receive the rent; VJR earns the agreed management fee. We never take your title as collateral and payouts hit your account on the agreed schedule.',
  },
  {
    q: 'What licences does my PG actually need in Bangalore?',
    a: 'A BBMP trade licence is mandatory for hosting 5+ unrelated paying guests, renewed annually. Fire Safety NOC from KSFES is required, FSSAI if you run a kitchen (within 3 months of the trade licence), plus occupancy certificate compliance and CCTV coverage of entries, exits and corridors with 90-day footage retention. We track all of it with expiry alerts.',
  },
  {
    q: 'How is the deposit handled?',
    a: 'Deposits sit in a separate ledger from rent and are settled with itemised deductions after a move-out inventory comparison against move-in photos. We flag any deposit that crosses the Karnataka ceiling — 10 months\' rent for residential premises.',
  },
  {
    q: 'I\'m an NRI owner. How do payouts work?',
    a: 'Rent is routed to your NRO account per FEMA rules, with a registered Power of Attorney tracked on file before we execute anything on your behalf. 30% TDS is handled with quarterly Form 16A certificates, and you get downloadable monthly and annual statements for tax filing.',
  },
  {
    q: 'How fast will vacant beds be filled?',
    a: 'Your property is listed on vjrestate.com with photos and video walkthrough, and feeds the same lead pipeline our leasing team uses — enquiries route to viewings within 24 hours in most localities.',
  },
];

export default function PgManagementPage() {
  useEffect(() => {
    setPageMeta(
      'PG & Building Management in Bangalore — VJR Estate',
      'Full-service PG and building management in Bangalore: bed-level operations, Karnataka licence compliance (BBMP trade licence, Fire NOC, FSSAI), transparent owner statements and tenant lifecycle management.',
    );
  }, []);

  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0A1628] pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-40">
        <div className="pointer-events-none absolute -top-32 right-[-10%] h-[480px] w-[480px] rounded-full bg-[#C9A84C]/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-30%] left-[-5%] h-[420px] w-[420px] rounded-full bg-[#C9A84C]/[0.05] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#C9A84C]">
              <span className="inline-block h-px w-8 bg-[#C9A84C]" />
              PG &amp; Building Management · Bangalore
            </p>
            <h1 className="mt-5 text-[2.4rem] leading-[1.08] text-white sm:text-5xl lg:text-[3.4rem]" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Your building,<br />
              <span className="text-[#C9A84C]">run like a business.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-base">
              Hand your PG or rental building to VJR Estate's management desk. You keep ownership and the rent —
              we run beds, licences, repairs, tenants and payouts with a transparency your CA will love.
              Purpose-built for Bangalore's paying-guest market.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#register"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0A1628] transition-all hover:-translate-y-0.5 hover:bg-[#E4C877]"
              >
                Register your property
                <ArrowRight size={15} weight="bold" />
              </a>
              <a
                href={siteContact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/20 px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:border-[#C9A84C] hover:text-[#C9A84C]"
              >
                <WhatsappLogo size={16} />
                WhatsApp the desk
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {[
                ['Bed-level', 'occupancy mapping'],
                ['45/15-day', 'licence alerts'],
                ['Monthly', 'payout statements'],
              ].map(([big, small]) => (
                <div key={big}>
                  <p className="text-lg font-semibold text-[#C9A84C]">{big}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">{small}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">Live owner dashboard preview</p>
              <div className="mt-5 space-y-3">
                <MiniStat label="Occupancy" value="87%" sub="22 of 25 beds" />
                <MiniStat label="Rent collected · Sep" value="₹2,41,000" sub="UPI · NACH · Card" />
                <MiniStat label="Compliance health" value="92 / 100" sub="BBMP licence renews in 40 days" accent />
                <MiniStat label="Net payout (Sep)" value="₹1,96,340" sub="After fee + GST, maintenance & margin" />
              </div>
              <div className="mt-5 rounded-xl bg-[#C9A84C]/10 p-4 text-[11px] leading-relaxed text-white/60">
                Exact statement format owners receive every month — rent collected, fee with 18% GST invoice,
                maintenance log, disclosed margin, net payout.
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Model explainer ── */}
      <section className="border-b border-gray-100 bg-[#FBF9F3] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#96782A]">The management contract</p>
            <h2 className="mt-3 text-3xl text-[#0A1628] sm:text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
              VJR manages. You own. The rent is yours.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
              This is not a lease-and-sublet scheme. Under our management contract the title never moves,
              the rent is yours, and VJR earns a disclosed fee for running the building properly.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: Bed, step: '01', title: 'You keep ownership', body: 'Sale deed, Khata and titles stay with you. We add a document vault with licences and inspections, not a transfer.' },
              { icon: Receipt, step: '02', title: 'Rent flows to you', body: 'Tenants pay; we collect, reconcile and disburse with a monthly statement. GST invoice for our fee, every time.' },
              { icon: ShieldCheck, step: '03', title: 'VJR runs operations', body: 'Beds, compliance, repairs, tenants, gate and mess — run by our warden network under SLAs you can audit.' },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
                className="admin-card p-6 sm:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1628] text-[#C9A84C]">
                    <s.icon size={20} />
                  </span>
                  <span className="roman-numeral text-2xl text-gray-200">{s.step}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#0A1628]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="max-w-2xl"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#96782A]">What we run for you</p>
            <h2 className="mt-3 text-3xl text-[#0A1628] sm:text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Everything a Bangalore PG operator does — done properly.
            </h2>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: EASE }}
                className="card-lift group rounded-2xl border border-gray-100 bg-white p-6 sm:p-7"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C9A84C]/10 text-[#96782A] transition-colors group-hover:bg-[#0A1628] group-hover:text-[#C9A84C]">
                  <f.icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-[#0A1628]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fees ── */}
      <section className="bg-[#0A1628] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="max-w-2xl"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#C9A84C]">Fees, in the open</p>
            <h2 className="mt-3 text-3xl text-white sm:text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
              No hidden margins. Ever.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/55">
              Every rupee we earn is a line item on your statement. GST invoices issued for every fee.
              RERA-registered managing agent.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
              >
                <p className="text-2xl font-semibold text-[#C9A84C]">{f.price}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">{f.title}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-white/55">{f.body}</p>
              </motion.div>
            ))}
          </div>
          <p className="mt-6 text-[11px] text-white/35">
            Indicative for Bangalore buildings · GST at 18% applies on management fees · final terms fixed in your management agreement.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#FBF9F3] py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#96782A]">Questions owners ask</p>
            <h2 className="mt-3 text-3xl text-[#0A1628] sm:text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
              The honest answers.
            </h2>
          </motion.div>
          <div className="mt-10 space-y-3">
            {FAQS.map((f, i) => (
              <Faq key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Owner registration ── */}
      <OwnerRegister />
    </div>
  );
}

function MiniStat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-[#C9A84C]/40 bg-[#C9A84C]/[0.08]' : 'border-white/10 bg-white/[0.03]'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/45">{sub}</p>
    </div>
  );
}

function Faq({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="admin-card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <span className="text-[15px] font-semibold text-[#0A1628]">{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} className="text-xl leading-none text-[#96782A]">+</motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="overflow-hidden"
      >
        <p className="px-5 pb-5 text-sm leading-relaxed text-gray-600">{a}</p>
      </motion.div>
    </div>
  );
}

/* ───────────── Owner onboarding form ───────────── */

function OwnerRegister() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    propertyType: 'PG Building',
    locality: '',
    beds: '12',
    currentRent: '',
    notes: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.locality) {
      setError('Name, phone and locality are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await addDoc(collection(db, 'pg_owner_leads'), {
        ...form,
        beds: Number(form.beds) || 0,
        source: 'pg-management-page',
        status: 'new',
        createdAt: Timestamp.now(),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit — please WhatsApp us instead.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <section id="register" className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: EASE }}>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle size={32} weight="fill" />
            </span>
            <h2 className="mt-6 text-2xl text-[#0A1628] sm:text-3xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
              You're on the desk's list.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
              Our property management team will call within one working day with a compliance gap report for
              your building and a draft fee structure. Urgent? WhatsApp us anytime.
            </p>
            <a
              href={siteContact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#C9A84C] px-8 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0A1628] transition-all hover:bg-[#E4C877]"
            >
              <WhatsappLogo size={16} /> Message the desk
            </a>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="register" className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#96782A]">For property owners</p>
            <h2 className="mt-3 text-3xl text-[#0A1628] sm:text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Register your building for management.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600">
              Tell us about the property — we'll run a free compliance gap report (licences, safety, occupancy
              limits) and send a draft fee structure before you commit to anything.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                'Free compliance gap report within 48 hours',
                'Draft management agreement with every fee line-itemised',
                'Onboarding inspection with full photo inventory',
                'Your building listed on vjrestate.com for tenant leads',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-[#C9A84C]" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-6 text-sm">
              <a href={`tel:${siteContact.phoneTel}`} className="inline-flex items-center gap-2 font-medium text-[#0A1628] transition-colors hover:text-[#96782A]">
                <Phone size={16} className="text-[#C9A84C]" /> {siteContact.phoneDisplay}
              </a>
              <span className="hidden h-4 w-px bg-gray-200 sm:block" />
              <span className="text-gray-500">{siteContact.hoursLabel}</span>
            </div>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            onSubmit={submit}
            className="admin-card p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <RegField label="Your name"><input className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></RegField>
              <RegField label="Phone"><input className="admin-input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98450 00000" /></RegField>
              <RegField label="Email (optional)"><input className="admin-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></RegField>
              <RegField label="Property type">
                <select className="admin-select" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })}>
                  {['PG Building', 'Co-living', 'Apartment block', 'Commercial'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </RegField>
              <RegField label="Locality"><input className="admin-input" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} placeholder="Indiranagar" /></RegField>
              <RegField label="Beds / units"><input className="admin-input" type="number" min={1} value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} /></RegField>
              <RegField label="Current monthly rent (optional)">
                <input className="admin-input" type="number" value={form.currentRent} onChange={(e) => setForm({ ...form, currentRent: e.target.value })} placeholder="₹" />
              </RegField>
              <RegField label="Anything specific?">
                <input className="admin-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Vacant floors, licence pending…" />
              </RegField>
            </div>

            {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">{error}</p>}

            <button
              type="submit"
              disabled={sending}
              className="admin-btn-primary mt-6 w-full !min-h-[52px] !text-[12px]"
            >
              {sending ? 'Submitting…' : 'Register for management'}
              <ArrowRight size={15} weight="bold" />
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
              We use your details only to prepare the management proposal — see our{' '}
              <Link to="/privacy" className="underline hover:text-[#0A1628]">privacy policy</Link>.
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
}

function RegField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      {children}
    </label>
  );
}
