import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Buildings, HouseLine, Briefcase, CaretLeft, CaretRight, CheckCircle, Clock, ShieldCheck, ListPlus, ArrowRight, SquaresFour } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';
import { callDataProxy } from '@/lib/supabaseData';
import { captureRegistrationLocation, locationFailureMessage, type RegistrationLocation } from '@/lib/registrationLocation';

type PartnerType = 'Owner' | 'Builder' | 'Agent';

/**
 * Partner registration — progressive disclosure flow:
 * Partner Type -> Account & Contact -> Profile -> Declarations -> Success.
 * Legal copy links to the partner-specific /partner-terms and /partner-privacy
 * documents (separate from the website-wide /terms and /privacy).
 * Branding: the global site header already carries the VJR Estate logo —
 * this page renders none of its own.
 */

/** One distinct, semantically correct icon per partner type. */
const PARTNER_CARDS: {
  value: PartnerType;
  icon: typeof HouseLine;
  iconLabel: string;
  title: string;
  commercial: string;
}[] = [
  {
    value: 'Owner',
    icon: HouseLine,
    iconLabel: 'Property owner',
    title: 'Property Owner',
    commercial: 'Zero listing fee · 1% service charge on qualifying sale transactions',
  },
  {
    value: 'Builder',
    icon: Buildings,
    iconLabel: 'Builder / developer',
    title: 'Builder / Developer',
    commercial: 'Zero listing fee · 50:50 share of Net Partnership Revenue',
  },
  {
    value: 'Agent',
    icon: Briefcase,
    iconLabel: 'Agent / broker',
    title: 'Agent / Broker',
    commercial: 'Zero listing fee · 50:50 share of Net Partnership Revenue',
  },
];

/** Commercial model, per selected type — single source of truth used by the
 * step-4 summary, the aside, and the success screen so wording never drifts. */
const COMMERCIAL_BY_TYPE: Record<PartnerType, { heading: string; lines: { k: string; v: string }[] }> = {
  Owner: {
    heading: 'Owner commercial model',
    lines: [
      { k: 'Listing fee', v: 'Zero — free to list' },
      { k: 'Subscription', v: 'Zero' },
      { k: 'Sale service charge', v: '1% of Transaction Value on qualifying successful sales' },
      { k: 'Lease / rental', v: 'Separately defined facilitation fee per the Partner Commercial Terms' },
    ],
  },
  Builder: {
    heading: 'Builder commercial model',
    lines: [
      { k: 'Listing fee', v: 'Zero — free to list' },
      { k: 'Subscription', v: 'Zero' },
      { k: 'Transactions', v: '50:50 share of Net Partnership Revenue actually received' },
      { k: 'Scope note', v: 'The split applies to commission/referral/facilitation revenue — not the property sale price' },
    ],
  },
  Agent: {
    heading: 'Agent commercial model',
    lines: [
      { k: 'Listing fee', v: 'Zero — free to list' },
      { k: 'Subscription', v: 'Zero' },
      { k: 'Transactions', v: '50:50 share of Net Partnership Revenue actually received' },
      { k: 'Scope note', v: 'The split applies to commission/referral/facilitation revenue — not the property sale price' },
    ],
  },
};

const EXPERIENCE_OPTIONS = ['0-1 Years', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];

const STEPS = ['01 — Partner Type', '02 — Your Details', '03 — About You', '04 — Declarations'] as const;
const STEP_SHORT = ['Partner Type', 'Your Details', 'About You', 'Declarations'] as const;

const GOLD = '#C9A84C';

interface FormState {
  partnerType: PartnerType;
  fullName: string;
  mobile: string;
  email: string;
  companyName: string;
  reraNumber: string;
  experienceYears: string;
  areas: string;
  city: string;
  consentTerms: boolean;
  consentPrivacy: boolean;
  consentAccuracy: boolean;
  consentMarketing: boolean;
}

const INITIAL: FormState = {
  partnerType: 'Owner',
  fullName: '',
  mobile: '',
  email: '',
  companyName: '',
  reraNumber: '',
  experienceYears: '',
  areas: '',
  city: 'Bengaluru',
  consentTerms: false,
  consentPrivacy: false,
  consentAccuracy: false,
  consentMarketing: false,
};

const labelCls = 'block text-xs font-medium text-[#475467] mb-1.5';
const inputCls =
  'w-full rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-[14px] text-[#101828] outline-none transition-colors placeholder:text-[#98A2B3] focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 disabled:bg-[#F8F9FB] disabled:text-[#667085]';
const selectCls = `${inputCls} pr-8`;

const label = (s: string) => s.replace(/ — /, ' · ').replace(/^0/, 'Step ').replace(/^Step (\d)/, '0$1');

export default function PartnerRegisterPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  // Category preselect from the How-It-Works page: /partner-register?type=Owner|Builder|Agent.
  const [searchParams] = useSearchParams();
  // LOGIN-FIRST: partner registration requires a verified Google identity so
  // the record is bound to the authenticated user server-side. Guests are
  // sent to the login experience with their destination preserved (the type
  // preselect rides along as its own query param there).
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=%2Fpartner-register', { replace: true });
    }
  }, [authLoading, user, navigate]);
  // Already-registered partners never re-run the wizard: the backend
  // confirms from the verified session and we send them to the dashboard
  // (covers logout/login returns and direct deep links).
  const [checkingExisting, setCheckingExisting] = useState(false);
  // Information the reviewer asked for (needs-info application): shown as a
  // banner so the applicant resumes with exactly the right details. The
  // registration wizard doubles as the completion workflow — submitting it
  // returns the application to the review queue server-side.
  const [requestedInfo, setRequestedInfo] = useState('');
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setCheckingExisting(true);
    void callDataProxy('partner.check', {}, {})
      .then((res) => {
        if (cancelled) return;
        if (res?.registered) {
          if (res.partner?.status === 'needs_info') {
            // Resume the application completion flow — do NOT bounce to the
            // dashboard, listing stays blocked until approval anyway.
            setRequestedInfo(String(res.partner.requestedInfo ?? res.partner.statusReason ?? ''));
          } else {
            navigate('/partner-dashboard', { replace: true });
          }
        }
        setCheckingExisting(false);
      })
      .catch(() => setCheckingExisting(false));
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => {
    const q = searchParams.get('type');
    return q === 'Owner' || q === 'Builder' || q === 'Agent' ? { ...INITIAL, partnerType: q } : INITIAL;
  });
  const [saving, setSaving] = useState(false);
  // Field-keyed validation errors render inline next to their control; the
  // single banner is reserved for API failures only.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  // Device location is captured automatically inside the SUBMIT handler
  // (user-initiated → the permission prompt fires from that interaction, not
  // from page load). A failed capture never blocks registration.
  const [locationNotice, setLocationNotice] = useState('');
  const [savedLocationSummary, setSavedLocationSummary] = useState<RegistrationLocation | null>(null);
  const capturedLocationRef = useRef<RegistrationLocation | null>(null);
  // Full backend response — the success screen must show exactly what the
  // API confirmed (status, partnerCode), never an assumed "active" state.
  const [done, setDone] = useState<null | { commissionPercent: number; status: string; partnerCode: string; fullName: string }>(null);

  // Signed-in users are pre-filled with their verified Google identity; the
  // registration is bound to their account server-side via the auth token.
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        email: user.email ?? '',
        fullName: prev.fullName || user.displayName || '',
      }));
    }
  }, [user]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const needsRera = form.partnerType !== 'Owner';
  const selectedCard = PARTNER_CARDS.find((c) => c.value === form.partnerType)!;
  const commercial = COMMERCIAL_BY_TYPE[form.partnerType];

  const validateStep = (s: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
      if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, ''))) errs.mobile = 'Enter a valid 10-digit mobile number.';
      if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    }
    if (s === 2 && needsRera && form.reraNumber.trim() && form.reraNumber.trim().length < 6) {
      errs.reraNumber = 'Enter a valid Karnataka RERA registration number, or leave it blank to add later.';
    }
    if (s === 3) {
      if (!form.consentTerms) errs.consentTerms = 'Required to register — tick to accept the Partner Terms & Conditions.';
      if (!form.consentPrivacy) errs.consentPrivacy = 'Required to register — tick to acknowledge the Partner Privacy Policy.';
      if (!form.consentAccuracy) errs.consentAccuracy = 'Required to register — tick to confirm your accuracy and authority declaration.';
    }
    return errs;
  };

  // Move keyboard focus to the first invalid control so users never have to
  // hunt for what failed; scroll honours prefers-reduced-motion.
  const FIELD_ID: Record<string, string> = {
    fullName: 'pr-name', mobile: 'pr-mobile', email: 'pr-email', reraNumber: 'pr-rera',
    consentTerms: 'pr-c-terms', consentPrivacy: 'pr-c-privacy', consentAccuracy: 'pr-c-accuracy',
  };
  const focusFirstInvalid = (errs: Record<string, string>) => {
    const order = ['fullName', 'mobile', 'email', 'reraNumber', 'consentTerms', 'consentPrivacy', 'consentAccuracy'];
    const key = order.find((k) => errs[k]);
    const el = (key ? document.getElementById(FIELD_ID[key]) : null) as HTMLElement | null;
    el?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el?.focus({ preventScroll: true });
  };
  const clearErr = (key: string) => setErrors((p) => { if (!p[key]) return p; const n = { ...p }; delete n[key]; return n; });

  const goNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); focusFirstInvalid(errs); return; }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrors({});
    setApiError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // guard against duplicate submissions
    const errs = validateStep(STEPS.length - 1);
    if (Object.keys(errs).length) { setErrors(errs); focusFirstInvalid(errs); return; }
    setErrors({});
    setApiError('');
    setSaving(true);
    try {
      // Automatic, user-initiated location capture — part of the existing
      // submission flow, no separate card or button. Failure is honest and
      // non-blocking: registration proceeds without a location.
      const capture = await captureRegistrationLocation();
      if (capture.location) {
        capturedLocationRef.current = capture.location;
        setSavedLocationSummary(capture.location);
        setLocationNotice('');
      } else {
        setLocationNotice(locationFailureMessage(capture.failure ?? 'UNAVAILABLE'));
      }
      const captured = capturedLocationRef.current;
      const result = await callDataProxy(
        'partner.register',
        {
          partnerType: form.partnerType,
          fullName: form.fullName.trim(),
          mobile: form.mobile.replace(/\D/g, ''),
          email: form.email.trim(),
          companyName: form.companyName.trim(),
          reraNumber: needsRera ? form.reraNumber.trim().toUpperCase() : '',
          experienceYears: form.experienceYears ? Number(form.experienceYears.replace(/\D/g, '')) : 0,
          areas: form.areas.split(',').map((a) => a.trim()).filter(Boolean),
          city: form.city.trim() || 'Bengaluru',
          termsAccepted: form.consentTerms && form.consentPrivacy && form.consentAccuracy,
          marketingConsent: form.consentMarketing,
          location: captured
            ? {
                latitude: captured.latitude,
                longitude: captured.longitude,
                accuracyMeters: captured.accuracyMeters,
                capturedAt: captured.capturedAt,
                resolvedAddress: captured.resolvedAddress,
                status: captured.status,
              }
            : null,
        },
        user ? {} : { isPublic: true },
      );
      setDone({
        commissionPercent: Number(result.commissionPercent ?? (form.partnerType === 'Owner' ? 1 : 50)),
        status: String(result.status ?? 'pending'),
        partnerCode: String(result.partnerCode ?? ''),
        fullName: form.fullName.trim(),
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-[#F8F9FB]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" />
        <p className="mt-4 text-xs text-[#667085]">Checking your partnership…</p>
      </div>
    );
  }

  if (done) {
    return <SuccessScreen
      partnerType={form.partnerType}
      status={done.status}
      partnerCode={done.partnerCode}
      fullName={done.fullName}
    />;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F8F9FB] md:min-h-[calc(100vh-3.5rem)]">
      {/* Pad below the fixed global header (3rem mobile / 3.5rem md+, shared layout var). */}
      <div className="pt-[calc(var(--vjr-header-h)+0.25rem)]">
      <div className="mx-auto w-full max-w-[1160px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {requestedInfo && (
          <div className="mb-6 max-w-2xl rounded-xl border border-sky-200 bg-sky-50 p-4 sm:p-5" role="status">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-sky-700">Information requested</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-sky-900">
              The review team has asked you to provide the following before your application can be approved. Update
              your details below and resubmit — your application returns to the review queue automatically.
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[13px] font-medium text-sky-900">{requestedInfo}</p>
          </div>
        )}
        {/* ── A. Introduction ─────────────────────────────────────────── */}
        <header className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
            VJR Estate Partner Network
          </p>
          <h1 className="mt-2 font-serif text-[28px] font-bold leading-tight tracking-tight text-[#101828] sm:text-[36px]">
            Become a VJR Estate Partner
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#475467]">
            List properties. Connect with buyers. Grow your real-estate business across Bangalore.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Partner benefits">
            {['Zero listing fees', 'Bangalore-focused reach', 'Partner dashboard'].map((b) => (
              <li key={b} className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#475467]">
                <CheckCircle size={13} weight="fill" className="text-emerald-600" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </header>

        {/* ── B. Registration workspace: form 2/3 + sidebar 1/3 on desktop ── */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            {/* Progress — desktop: full labels, connector, check icons (never truncates);
                mobile: "Step X of 4" + bar, no squeezed row. */}
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-4 sm:p-5" aria-live="polite">
              {/* Mobile stepper */}
              <div className="sm:hidden">
                <p className="text-[12px] font-semibold text-[#101828]">
                  Step {step + 1} of {STEPS.length} <span className="font-normal text-[#667085]">· {STEP_SHORT[step]}</span>
                </p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#E4E7EC]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: GOLD }}
                  />
                </div>
              </div>
              {/* Desktop stepper */}
              <ol className="hidden items-center sm:flex">
                {STEPS.map((labelText, i) => {
                  const active = i === step;
                  const doneStep = i < step;
                  return (
                    <li key={labelText} className="flex min-w-0 items-center">
                      <span className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            active ? 'text-[#0A1628]' : doneStep ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F2F4F7] text-[#98A2B3]'
                          }`}
                          style={active ? { background: GOLD } : undefined}
                        >
                          {doneStep ? <CheckCircle size={16} weight="fill" /> : i + 1}
                        </span>
                        <span
                          className={`whitespace-nowrap text-[12px] font-semibold tracking-wide ${
                            active ? 'text-[#101828]' : doneStep ? 'text-[#475467]' : 'text-[#98A2B3]'
                          }`}
                        >
                          {labelText}
                        </span>
                      </span>
                      {i < STEPS.length - 1 && (
                        <span className={`mx-3 h-px min-w-[24px] flex-1 ${doneStep ? 'bg-[#C9A84C]' : 'bg-[#E4E7EC]'}`} aria-hidden="true" />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
              {/* ── Step 1 — Partner type ── */}
              {step === 0 && (
                <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 sm:p-6">
                  <h2 className="text-[17px] font-semibold text-[#101828]">Choose your partner type</h2>
                  <p className="mt-1 text-[13px] text-[#667085]">
                    Select the category that best describes how you will list properties on VJR Estate.
                  </p>
                  <fieldset className="mt-5">
                    <legend className="sr-only">Partner type</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {PARTNER_CARDS.map(({ value, icon: TypeIcon, title, commercial: cLine }) => {
                        const active = form.partnerType === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => { update('partnerType', value); setErrors({}); setApiError(''); }}
                            className={`cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] ${
                              active
                                ? 'border-[#0A1628] bg-white ring-2 ring-[#0A1628]/90'
                                : 'border-[#E4E7EC] bg-white hover:border-[#C9A84C]'
                            }`}
                            aria-pressed={active}
                          >
                            <span className="flex items-start justify-between">
                              <span
                                className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? 'text-[#0A1628]' : 'bg-[#F2F4F7] text-[#475467]'}`}
                                style={active ? { background: GOLD } : undefined}
                                title={title}
                              >
                                <TypeIcon size={20} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
                              </span>
                              {active && <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a6d1f]">Selected</span>}
                            </span>
                            <span className="mt-3 block text-[14px] font-semibold text-[#101828]">{title}</span>
                            <span className="mt-2 block text-[11px] font-semibold leading-snug text-[#475467]">{cLine}</span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </section>
              )}

              {/* ── Step 2 — Your details ── */}
              {step === 1 && (
                <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 sm:p-6">
                  <h2 className="text-[17px] font-semibold text-[#101828]">Your details</h2>
                  <p className="mt-1 text-[13px] text-[#667085]">Tell us how to contact you about your partnership.</p>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pr-name" className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                      <input
                        id="pr-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Your full name"
                        value={form.fullName}
                        onChange={(e) => update('fullName', e.target.value)}
                        className={`${inputCls} ${errors.fullName ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                        aria-invalid={!!errors.fullName}
                        aria-describedby={errors.fullName ? 'pr-name-err' : undefined}
                      />
                      {errors.fullName && <p id="pr-name-err" className="mt-1.5 text-[11.5px] font-medium text-red-600">{errors.fullName}</p>}
                    </div>
                    <div>
                      <label htmlFor="pr-mobile" className={labelCls}>Mobile Number <span className="text-red-500">*</span></label>
                      <input
                        id="pr-mobile"
                        type="tel"
                        autoComplete="tel-national"
                        inputMode="numeric"
                        placeholder="10-digit mobile number"
                        value={form.mobile}
                        onChange={(e) => update('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className={`${inputCls} ${errors.mobile ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                        aria-invalid={!!errors.mobile}
                        aria-describedby={errors.mobile ? 'pr-mobile-err' : undefined}
                      />
                      {errors.mobile && <p id="pr-mobile-err" className="mt-1.5 text-[11.5px] font-medium text-red-600">{errors.mobile}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="pr-email" className={labelCls}>
                        Email Address {user ? <span className="text-emerald-600">(verified — from your Google account)</span> : <><span className="text-red-500">*</span></>}
                      </label>
                      <input
                        id="pr-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        disabled={!!user}
                        className={`${inputCls} disabled:cursor-not-allowed ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'pr-email-err' : undefined}
                      />
                      {errors.email && <p id="pr-email-err" className="mt-1.5 text-[11.5px] font-medium text-red-600">{errors.email}</p>}
                      {user && <p className="mt-1.5 text-[11px] text-[#667085]">Verified through your Google account. To use a different email, sign in with that account.</p>}
                    </div>
                  </div>
                </section>
              )}

              {/* ── Step 3 — About you (conditional per type) ── */}
              {step === 2 && (
                <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 sm:p-6">
                  <h2 className="text-[17px] font-semibold text-[#101828]">About you</h2>
                  <p className="mt-1 text-[13px] text-[#667085]">
                    {needsRera
                      ? 'Optional at registration — firm and RERA details, where provided, build buyer trust and can be independently verified. You can add them later.'
                      : 'All optional — helps us match your property with the right buyers. Owners listing their own property do not need RERA or business details.'}
                  </p>
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {needsRera && (
                      <div>
                        <label htmlFor="pr-rera" className={labelCls}>RERA Registration Number <span className="text-[#98A2B3]">(optional)</span></label>
                        <input
                          id="pr-rera"
                          type="text"
                          placeholder="e.g. PRM/KA/RERA/1251/…"
                          value={form.reraNumber}
                          onChange={(e) => update('reraNumber', e.target.value.toUpperCase())}
                          className={`${inputCls} font-mono text-[13px] ${errors.reraNumber ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                          aria-invalid={!!errors.reraNumber}
                          aria-describedby={errors.reraNumber ? 'pr-rera-err' : undefined}
                        />
                        {errors.reraNumber && <p id="pr-rera-err" className="mt-1.5 text-[11.5px] font-medium text-red-600">{errors.reraNumber}</p>}
                        <p className="mt-1.5 text-[11px] text-[#98A2B3]">Verify registrations at karnataka.rera.gov.in</p>
                      </div>
                    )}
                    {needsRera && (
                      <div>
                        <label htmlFor="pr-company" className={labelCls}>
                          {form.partnerType === 'Builder' ? 'Company / Firm Name' : 'Firm / Company Name'} <span className="text-[#98A2B3]">(optional)</span>
                        </label>
                        <input
                          id="pr-company"
                          type="text"
                          autoComplete="organization"
                          placeholder={form.partnerType === 'Builder' ? 'e.g. Sunrise Builders Pvt Ltd' : 'e.g. Sunrise Realty'}
                          value={form.companyName}
                          onChange={(e) => update('companyName', e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    )}
                    <div>
                      <label htmlFor="pr-exp" className={labelCls}>Experience in Real Estate <span className="text-[#98A2B3]">(optional)</span></label>
                      <select id="pr-exp" value={form.experienceYears} onChange={(e) => update('experienceYears', e.target.value)} className={selectCls}>
                        <option value="">Select experience</option>
                        {EXPERIENCE_OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="pr-areas" className={labelCls}>Operating Areas in Bangalore <span className="text-[#98A2B3]">(optional)</span></label>
                      <input
                        id="pr-areas"
                        type="text"
                        placeholder="e.g. Whitefield, Sarjapur, Hebbal"
                        value={form.areas}
                        onChange={(e) => update('areas', e.target.value)}
                        className={inputCls}
                      />
                      <p className="mt-1.5 text-[11px] text-[#98A2B3]">Comma-separated Bangalore localities</p>
                    </div>
                  </div>
                </section>
              )}

              {/* ── Step 4 — Review, commercial terms & declarations ── */}
              {step === 3 && (
                <>
                  <section className="rounded-xl border border-[#C9A84C]/40 bg-[#FCF9EF] p-5 sm:p-6">
                    <h2 className="text-[15px] font-semibold text-[#101828]">{commercial.heading}</h2>
                    <dl className="mt-3 space-y-2">
                      {commercial.lines.map(({ k, v }) => (
                        <div key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                          <dt className="w-full shrink-0 text-[12px] font-semibold text-[#475467] sm:w-40">{k}</dt>
                          <dd className="text-[12.5px] leading-relaxed text-[#101828]">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-3 text-[12px] leading-relaxed text-[#667085]">
                      Full details: <Link to="/partner-terms" target="_blank" className="font-semibold text-[#101828] underline underline-offset-2">Partner Terms &amp; Conditions</Link>.
                    </p>
                  </section>

                  <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 sm:p-6">
                    <h2 className="text-[15px] font-semibold text-[#101828]">Platform disclaimer</h2>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-[#667085]">
                      VJR Estate provides property listing, marketing, lead-generation and facilitation
                      services, and does not guarantee enquiries, transactions or investment returns.
                      Property information is provided by partners and should be independently verified
                      before any transaction.
                    </p>
                  </section>

                  <section className="rounded-xl border border-[#E4E7EC] bg-white p-5 sm:p-6">
                    <h2 className="text-[15px] font-semibold text-[#101828]">Declarations &amp; Consents</h2>
                    <div className="mt-4 space-y-4">
                      <label htmlFor="pr-c-terms" className="flex min-h-[44px] cursor-pointer items-start gap-3">
                        <input id="pr-c-terms" type="checkbox" checked={form.consentTerms} onChange={(e) => { update('consentTerms', e.target.checked); if (e.target.checked) clearErr('consentTerms'); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A1628]" aria-invalid={!!errors.consentTerms} aria-describedby={errors.consentTerms ? 'pr-c-terms-err' : undefined} />
                        <span className="mt-0.5 text-[12.5px] leading-relaxed text-[#475467]">
                          I have read and agree to the{' '}
                          <Link to="/partner-terms" className="font-medium text-[#101828] underline underline-offset-2" target="_blank">Partner Terms &amp; Conditions</Link>.
                        </span>
                      </label>
                      {errors.consentTerms && <p id="pr-c-terms-err" className="-mt-2 ml-7 text-[11.5px] font-medium text-red-600">{errors.consentTerms}</p>}
                      <label htmlFor="pr-c-privacy" className="flex min-h-[44px] cursor-pointer items-start gap-3">
                        <input id="pr-c-privacy" type="checkbox" checked={form.consentPrivacy} onChange={(e) => { update('consentPrivacy', e.target.checked); if (e.target.checked) clearErr('consentPrivacy'); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A1628]" aria-invalid={!!errors.consentPrivacy} aria-describedby={errors.consentPrivacy ? 'pr-c-privacy-err' : undefined} />
                        <span className="text-[12.5px] leading-relaxed text-[#475467]">
                          I acknowledge the{' '}
                          <Link to="/partner-privacy" className="font-medium text-[#101828] underline underline-offset-2" target="_blank">Partner Privacy Policy</Link>{' '}
                          and consent to the processing of my personal data for account creation, verification,
                          listing management, enquiries and partnership administration.
                        </span>
                      </label>
                      {errors.consentPrivacy && <p id="pr-c-privacy-err" className="-mt-3 ml-7 text-[11.5px] font-medium text-red-600">{errors.consentPrivacy}</p>}
                      <label htmlFor="pr-c-accuracy" className="flex min-h-[44px] cursor-pointer items-start gap-3">
                        <input id="pr-c-accuracy" type="checkbox" checked={form.consentAccuracy} onChange={(e) => { update('consentAccuracy', e.target.checked); if (e.target.checked) clearErr('consentAccuracy'); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A1628]" aria-invalid={!!errors.consentAccuracy} aria-describedby={errors.consentAccuracy ? 'pr-c-accuracy-err' : undefined} />
                        <span className="mt-0.5 text-[12.5px] leading-relaxed text-[#475467]">
                          {form.partnerType === 'Owner'
                            ? 'I confirm that I am the owner of the property or have valid authority/mandate from the owner to advertise and facilitate the property transaction, and that the information provided by me is accurate.'
                            : 'I confirm that I hold a valid mandate or lawful authority to market the properties I list, and that the information provided by me is accurate.'}
                        </span>
                      </label>
                      {errors.consentAccuracy && <p id="pr-c-accuracy-err" className="-mt-3 ml-7 text-[11.5px] font-medium text-red-600">{errors.consentAccuracy}</p>}
                      <label htmlFor="pr-c-marketing" className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg bg-[#F8F9FB] p-3 ring-1 ring-[#E4E7EC]">
                        <input id="pr-c-marketing" type="checkbox" checked={form.consentMarketing} onChange={(e) => update('consentMarketing', e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A1628]" />
                        <span className="text-[12.5px] leading-relaxed text-[#667085]">
                          I agree to receive promotional and marketing communications from VJR Estate.{' '}
                          <span className="font-medium">(Optional)</span>
                        </span>
                      </label>
                    </div>
                  </section>
                </>
              )}

              {savedLocationSummary && (
                <div role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-medium text-emerald-800">
                  Location captured (±{Math.round(savedLocationSummary.accuracyMeters ?? 0)} m reported accuracy) and saved with your registration.
                </div>
              )}
              {locationNotice && (
                <div role="status" aria-live="polite" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-medium text-amber-800">
                  {locationNotice}
                </div>
              )}

              {apiError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] font-medium text-red-700">
                  {apiError}
                </div>
              )}

              {/* ── Wizard footer ── */}
              <div className="flex items-center gap-3 pb-4">
                {step > 0 ? (
                  <button type="button" onClick={goBack} disabled={saving} className="admin-btn-secondary min-h-[48px] shrink-0 !px-5 disabled:opacity-60">
                    <CaretLeft size={14} weight="bold" aria-hidden="true" />
                    Back
                  </button>
                ) : (
                  <Link to="/list-property" className="admin-btn-secondary no-underline min-h-[48px] shrink-0 !px-5">
                    Cancel
                  </Link>
                )}
                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={goNext} disabled={saving} className="admin-btn-primary min-h-[48px] flex-1 gap-1.5 disabled:opacity-60">
                    Continue
                    <CaretRight size={14} weight="bold" aria-hidden="true" />
                  </button>
                ) : (
                  <button type="submit" disabled={saving || authLoading} className="admin-btn-primary min-h-[48px] flex-1 disabled:opacity-60">
                    {saving ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                        Registering…
                      </span>
                    ) : (
                      'Register as Partner'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ── Supporting column (desktop) — summary only, no legal wall ── */}
          <aside className="min-w-0 space-y-4 lg:col-span-4">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">Your selection</p>
              <div className="mt-2.5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2F4F7] text-[#475467]">
                  <selectedCard.icon size={18} weight="regular" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#101828]">{selectedCard.title}</p>
                  <p className="text-[11.5px] text-[#667085]">{selectedCard.commercial}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">Registration progress</p>
              <ol className="mt-3 space-y-2.5">
                {STEPS.map((labelText, i) => {
                  const doneStep = i < step;
                  const active = i === step;
                  return (
                    <li key={labelText} className="flex items-center gap-2.5 text-[12px]">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                          doneStep ? 'bg-emerald-50 text-emerald-700' : active ? 'text-[#0A1628]' : 'bg-[#F2F4F7] text-[#98A2B3]'
                        }`}
                        style={active ? { background: GOLD } : undefined}
                      >
                        {doneStep ? '✓' : i + 1}
                      </span>
                      <span className={active ? 'font-semibold text-[#101828]' : doneStep ? 'text-[#475467]' : 'text-[#98A2B3]'}>
                        {label(labelText)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="rounded-xl border border-[#E4E7EC] bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">Your data</p>
              <p className="mt-2 text-[12px] leading-relaxed text-[#667085]">
                Your details are used only to create and administer your partnership, as set out in the{' '}
                <Link to="/partner-privacy" target="_blank" className="font-medium text-[#101828] underline underline-offset-2">Partner Privacy Policy</Link>.
                Consent choices are recorded with their document versions.
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-[#667085]">
                Questions? <Link to="/contact" className="font-medium text-[#101828] underline underline-offset-2">Contact us</Link>.
              </p>
            </div>
          </aside>
        </div>
      </div>
      </div>
    </div>
  );
}

function SuccessScreen({
  partnerType, status, partnerCode, fullName,
}: {
  partnerType: PartnerType;
  status: string;
  partnerCode: string;
  fullName: string;
}) {
  // Status comes straight from the backend response — never assumed.
  // partner.register returns 'pending' for new registrations (CRM review);
  // 'active' only when an already-approved partner re-registers.
  const pending = status !== 'active';
  const card = PARTNER_CARDS.find((c) => c.value === partnerType)!;
  const commercial = COMMERCIAL_BY_TYPE[partnerType];
  const announce = pending
    ? 'Registration submitted. Your partnership application is pending review.'
    : 'Welcome to VJR Estate Partners. Your partnership is active.';
  const nextSteps = pending
    ? [
        { icon: Clock, title: 'Application under review', desc: 'The VJR Estate team reviews and verifies new partnerships. Approval unlocks property listing.' },
        { icon: ShieldCheck, title: 'Verification', desc: 'Provide any requested ownership, mandate or business documents when contacted to complete verification.' },
        { icon: ListPlus, title: 'After approval', desc: 'Once approved, list your first eligible property from your partner dashboard.' },
      ]
    : [
        { icon: SquaresFour, title: 'Open your partner dashboard', desc: 'Manage your account, listings and enquiries.' },
        { icon: ListPlus, title: 'List your first property', desc: `Add an eligible ${partnerType === 'Owner' ? 'property' : 'project or listing'} — permitted for active partners.` },
      ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F8F9FB]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-xl border border-[#E4E7EC] bg-white p-6 text-center sm:p-10" role="status" aria-live="polite">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${pending ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-emerald-100'}`}>
            {pending
              ? <Clock size={28} className="text-amber-500" aria-hidden="true" />
              : <CheckCircle size={28} weight="fill" className="text-emerald-600" aria-hidden="true" />}
          </div>
          <h1 className="mt-5 font-serif text-2xl font-bold tracking-tight text-[#101828] sm:text-3xl">
            {pending ? 'Registration submitted' : 'Welcome to VJR Estate Partners'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-[#667085]">
            {pending
              ? 'Your partner application has been received. Continue to your partner dashboard to track your account while it is under review.'
              : 'Your partnership is active. Continue to your partner dashboard to manage your account and get started.'}
          </p>
          <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] ring-1 ${
            pending ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          }`}>
            {pending ? 'Pending review' : 'Active'}
          </span>
          <span className="sr-only">{announce}</span>

          {/* Account summary — only fields the backend actually returned */}
          <dl className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-x-8 gap-y-3 rounded-xl border border-[#E4E7EC] bg-[#F8F9FB] p-5 text-left sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">Partner type</dt>
              <dd className="mt-1 flex items-center gap-2 text-[13.5px] font-semibold text-[#101828]">
                <card.icon size={16} weight="regular" aria-hidden="true" /> {card.title}
              </dd>
            </div>
            {fullName && (
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">Name</dt>
                <dd className="mt-1 text-[13.5px] font-semibold text-[#101828]">{fullName}</dd>
              </div>
            )}
            {partnerCode && (
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">Partner ID</dt>
                <dd className="mt-1 font-mono text-[13px] font-semibold text-[#101828]">{partnerCode}</dd>
              </div>
            )}
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">Status</dt>
              <dd className={`mt-1 text-[13.5px] font-semibold ${pending ? 'text-amber-700' : 'text-emerald-700'}`}>
                {pending ? 'Pending review' : 'Active'}
              </dd>
            </div>
          </dl>

          {/* Commercial model — same single source of truth as the form */}
          <div className="mx-auto mt-5 max-w-2xl rounded-xl border border-[#C9A84C]/40 bg-[#FCF9EF] p-5 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6d1f]">{commercial.heading}</p>
            <dl className="mt-3 space-y-2">
              {commercial.lines.map(({ k, v }) => (
                <div key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                  <dt className="w-full shrink-0 text-[11.5px] font-semibold text-[#475467] sm:w-36">{k}</dt>
                  <dd className="text-[12px] leading-relaxed text-[#101828]">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11.5px] text-[#667085]">
              Subject to the <Link to="/partner-terms" target="_blank" className="font-semibold text-[#101828] underline underline-offset-2">Partner Terms &amp; Conditions</Link>.
            </p>
          </div>
        </div>

        {/* Next steps — only what this partner can actually do now */}
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-[#E4E7EC] bg-white p-6 text-left sm:p-8">
          <h2 className="text-[15px] font-bold text-[#101828]">Your next steps</h2>
          <ol className="mt-4 space-y-4">
            {nextSteps.map(({ icon: StepIcon, title, desc }, i) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F2F4F7] text-[#475467]">
                  <StepIcon size={17} weight="regular" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[#101828]">{i + 1}. {title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#667085]">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

          {/* CTA hierarchy: primary dashboard, secondary listing (route itself
              still enforces the active-partner gate), tertiary home */}
        <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            to="/partner-dashboard"
            className="admin-btn-primary no-underline min-h-[48px] flex-1 items-center justify-center gap-2"
          >
            Open Your Dashboard <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </Link>
          <Link to="/list-property" className="admin-btn-secondary no-underline min-h-[48px] flex-1 items-center justify-center">List Your First Property</Link>
          <Link to="/" className="text-[12px] font-semibold text-[#667085] underline underline-offset-4 hover:text-[#101828]">Back to VJR Estate Home</Link>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-[11.5px] text-[#98A2B3]">
          Questions about your application? <Link to="/contact" className="font-medium text-[#101828] underline underline-offset-2">Contact us</Link>.
        </p>
      </div>
    </div>
  );
}
