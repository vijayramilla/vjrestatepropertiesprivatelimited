import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  MapPin,
  Clock,
  Briefcase,
  CurrencyCircleDollar,
  ArrowRight,
  X,
  CheckCircle,
  UploadSimple,
  FilePdf,
  SealCheck,
  UsersThree,
  TrendUp,
  Gift,
  ArrowsClockwise,
  Globe,
  Heartbeat,
  Handshake,
  Eye,
  Lightbulb,
  UserCircle,
  Rocket,
  Sparkle,
  CaretRight,
  Star,
  PaperPlaneTilt,
  ShareNetwork,
  Check,
} from '@phosphor-icons/react';
import {
  subscribeToJobs,
  submitJobApplication,
  shareJob,
  formatSalary,
  type JobOpening,
  type Department,
} from '@/lib/careers';
import { useAuth } from '@/context/AuthContext';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { setDefaultSiteMeta, setJobShareMeta } from '@/lib/siteMeta';

const EASE = [0.22, 1, 0.36, 1] as const;

// ── Section content ─────────────────────────────────────────────────────

const DEPARTMENTS: Department[] = [
  'Sales',
  'Technology',
  'Marketing',
  'Customer Relations',
  'HR',
  'Operations',
];

const STATS = [
  { value: '6+', label: 'Departments' },
  { value: '10+', label: 'Open Roles' },
  { value: '₹2.5L+', label: 'Starting CTC' },
  { value: 'Bangalore', label: 'HQ' },
];

const BENEFITS = [
  { icon: SealCheck, title: 'Highly Competitive Compensation' },
  { icon: Rocket, title: 'Supersonic Growth' },
  { icon: Gift, title: 'Best Incentive Structure' },
  { icon: ArrowsClockwise, title: 'Bi-Annual Appraisals' },
  { icon: Globe, title: 'Global Movement' },
  { icon: Heartbeat, title: 'Healthcare & Insurance' },
  { icon: TrendUp, title: 'Employee Stock Options' },
  { icon: Sparkle, title: 'Fun, Dynamic Environment' },
];

const VALUES = [
  {
    icon: Handshake,
    title: 'Integrity',
    desc: 'Integrity is our GPS for success — no detours, no shortcuts, just excellence at every doorstep.',
  },
  {
    icon: UsersThree,
    title: 'Teamwork',
    desc: "Teamwork isn't a bonus feature; it's the foundation for constructing dreams together.",
  },
  {
    icon: Eye,
    title: 'Transparency',
    desc: 'Transparency is the key that unlocks customer trust and a brighter future.',
  },
  {
    icon: Lightbulb,
    title: 'Innovativeness',
    desc: "With today's imagination, we build tomorrow's real estate solutions.",
  },
  {
    icon: UserCircle,
    title: 'User Centric',
    desc: 'For us, the customer reigns supreme — now and always.',
  },
  {
    icon: ArrowsClockwise,
    title: 'Dynamic',
    desc: "In the dynamic world of real estate, life isn't just a journey — it's a vibrant adventure.",
  },
];

const LIFESTYLE_IMAGES = [
  { label: 'Team Offsites', icon: UsersThree },
  { label: 'Growth Workshops', icon: TrendUp },
  { label: 'Celebrations', icon: Gift },
  { label: 'Client Success', icon: Handshake },
];

// ── Small building blocks ───────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  title,
  desc,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  dark?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mx-auto mb-10 max-w-2xl text-center lg:mb-14"
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
          dark ? 'text-[#C9A84C]' : 'text-[#C9A84C]'
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.75rem] ${
          dark ? 'text-white' : 'text-[#0A1628]'
        }`}
        style={{ letterSpacing: '-0.02em' }}
      >
        {title}
      </h2>
      {desc && (
        <p className={`mt-4 text-[15px] leading-relaxed sm:text-base ${dark ? 'text-[#94a3b8]' : 'text-[#5b6b7c]'}`}>
          {desc}
        </p>
      )}
    </motion.div>
  );
}

function IconTile({ icon: Icon }: { icon: typeof MapPin }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#C9A84C]/25 bg-[#C9A84C]/10 text-[#B8953A]">
      <Icon size={20} weight="duotone" />
    </div>
  );
}

// ── Confetti (pure CSS, honours reduced-motion) ─────────────────────────

const CONFETTI_COLORS = ['#C9A84C', '#D6B85D', '#FFFFFF', '#8CA0BE', '#F6EDD3', '#335069'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 2.4 + Math.random() * 1.8,
        size: 6 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.5,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Share button ────────────────────────────────────────────────────────

function ShareJobButton({ job, variant = 'card' }: { job: JobOpening; variant?: 'card' | 'modal' }) {
  const [feedback, setFeedback] = useState<'idle' | 'copied'>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const result = await shareJob(job);
    if (result === 'copied') {
      setFeedback('copied');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setFeedback('idle'), 2000);
    }
  };

  if (variant === 'modal') {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={`Share ${job.title}`}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[#e3e7ee] px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#44566b] transition-all hover:border-[#0A1628] hover:text-[#0A1628]"
      >
        {feedback === 'copied' ? (
          <Check size={14} weight="bold" className="text-emerald-600" />
        ) : (
          <ShareNetwork size={14} weight="bold" />
        )}
        {feedback === 'copied' ? 'Copied' : 'Share'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Share ${job.title}`}
      title="Share this job"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
        feedback === 'copied'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : 'border-[#e3e7ee] bg-white text-[#7c8a9a] hover:border-[#C9A84C] hover:bg-[#C9A84C]/5 hover:text-[#B8953A]'
      }`}
    >
      {feedback === 'copied' ? <Check size={15} weight="bold" /> : <ShareNetwork size={15} weight="bold" />}
    </button>
  );
}

// ── Job card ────────────────────────────────────────────────────────────

function JobCard({ job, onOpen }: { job: JobOpening; onOpen: () => void }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="job-card group flex cursor-pointer flex-col rounded-2xl border border-[#e6e9ee] bg-white p-6 shadow-[0_1px_2px_rgba(10,22,40,0.04)] transition-all duration-300 hover:border-[#C9A84C]/50 sm:p-7"
      onClick={onOpen}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: job.department_color }} />
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8a9a]">
            {job.department}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ShareJobButton job={job} />
          {job.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0A1628] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#C9A84C]">
              <Star size={10} weight="fill" />
              Featured
            </span>
          )}
        </div>
      </div>

      <h3 className="mt-4 text-xl font-semibold text-[#0A1628] transition-colors group-hover:text-[#0A1628]/80 sm:text-[22px]" style={{ letterSpacing: '-0.01em' }}>
        {job.title}
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px] text-[#44566b]">
        <span className="flex items-center gap-2">
          <MapPin size={15} className="shrink-0 text-[#C9A84C]" weight="bold" />
          {job.location}
        </span>
        <span className="flex items-center gap-2">
          <Clock size={15} className="shrink-0 text-[#C9A84C]" weight="bold" />
          {job.type}
        </span>
        <span className="flex items-center gap-2">
          <Briefcase size={15} className="shrink-0 text-[#C9A84C]" weight="bold" />
          {job.experience}
        </span>
        <span className="flex items-center gap-2">
          <CurrencyCircleDollar size={15} className="shrink-0 text-[#C9A84C]" weight="bold" />
          {formatSalary(job.salary)}
        </span>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[#5b6b7c]">{job.description}</p>

      <div className="mt-5 flex items-center justify-between border-t border-[#f0f2f5] pt-5">
        <span className="text-[12px] text-[#8a97a8]">
          {job.totalApplications} applicant{job.totalApplications === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0A1628] transition-colors group-hover:text-[#B8953A]">
          View Details &amp; Apply
          <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </motion.article>
  );
}

// ── Apply form validation ───────────────────────────────────────────────

const EXPERIENCE_OPTIONS = ['Fresher', '1-2 Years', '2-4 Years', '4-6 Years', '6+ Years'];
const NOTICE_OPTIONS = ['Immediate', '15 Days', '1 Month', '2 Months', '3 Months'];

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  pinCode: string;
  currentCompany: string;
  currentRole: string;
  totalExperience: string;
  expectedSalary: string;
  noticePeriod: string;
  linkedinUrl: string;
  whyVJR: string;
  coverLetter: string;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  phone: '',
  currentLocation: '',
  pinCode: '',
  currentCompany: '',
  currentRole: '',
  totalExperience: '',
  expectedSalary: '',
  noticePeriod: '',
  linkedinUrl: '',
  whyVJR: '',
  coverLetter: '',
};

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#44566b]">
        {label} {required && <span className="text-[#C9A84C]">*</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-[12px] font-medium text-red-600" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

const inputClass =
  'min-h-[46px] w-full rounded-xl border border-[#dfe3ea] bg-white px-3.5 text-[15px] text-[#0A1628] outline-none transition-all placeholder:text-[#a5b0be] focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20';

function LoginGate({
  jobTitle,
  onLogin,
  authError,
  authLoading,
}: {
  jobTitle: string;
  onLogin: () => Promise<void>;
  authError: string | null;
  authLoading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e6e9ee] bg-[#fafbfc] p-6 text-center sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0A1628]">
        <UserCircle size={28} weight="duotone" className="text-[#C9A84C]" />
      </div>
      <h4 className="mt-4 text-xl font-semibold text-[#0A1628]">Login to apply</h4>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#5b6b7c]">
        Sign in with Google to apply for <span className="font-medium text-[#0A1628]">{jobTitle}</span>.
        Your application is linked to your account so you can track its status.
      </p>
      {authLoading ? (
        <div className="mt-6 flex justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0A1628] border-t-transparent" />
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-xs">
          <GoogleSignInButton onClick={onLogin} />
        </div>
      )}
      {authError && (
        <p className="mt-4 text-[12px] font-medium text-red-600" role="alert">
          {authError}
        </p>
      )}
      <p className="mt-5 text-[11px] leading-relaxed text-[#8a97a8]">
        We also capture your exact PIN location with your application so the
        team can verify where you&apos;re applying from.
      </p>
    </div>
  );
}

// ── Job detail + apply modal ────────────────────────────────────────────

function ApplyModal({
  job,
  onClose,
}: {
  job: JobOpening | null;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { user, loading: authLoading, error: authError, signInWithGoogle, clearError } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setForm(EMPTY_FORM);
    setErrors({});
    setResume(null);
    setResumeError('');
    setReferenceId('');
    setSubmitError('');
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [job?.id]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const handleLogin = async () => {
    clearError();
    try {
      await signInWithGoogle();
    } catch {
      // error surfaced via authError
    }
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) next.fullName = 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) next.phone = 'Enter a 10-digit Indian mobile number';
    if (!/^[1-9]\d{5}$/.test(form.pinCode.trim())) next.pinCode = 'Enter a valid 6-digit PIN code';
    if (!resume) {
      setResumeError('Resume is required');
    } else {
      const okType = /\.(pdf|doc|docx)$/i.test(resume.name);
      if (!okType) setResumeError('Resume must be PDF or DOC');
      else if (resume.size > 5 * 1024 * 1024) setResumeError('Resume must be under 5MB');
      else setResumeError('');
    }
    if (!form.totalExperience) next.totalExperience = 'Select your experience';
    if (!form.noticePeriod) next.noticePeriod = 'Select your notice period';
    const whyLen = form.whyVJR.trim().length;
    // maxLength={500} on the textarea already caps the upper bound.
    if (whyLen < 200) next.whyVJR = `Please write at least 200 characters (${whyLen}/200)`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      handleLogin();
      return;
    }
    if (!validate() || !resume || !job) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const refId = await submitJobApplication(
        {
          jobId: job.id,
          jobTitle: job.title,
          department: job.department,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          currentLocation: form.currentLocation.trim(),
          pinCode: form.pinCode.trim(),
          currentCompany: form.currentCompany.trim(),
          currentRole: form.currentRole.trim(),
          totalExperience: form.totalExperience,
          expectedSalary: form.expectedSalary.trim(),
          noticePeriod: form.noticePeriod,
          linkedinUrl: form.linkedinUrl.trim(),
          resumeUrl: '',
          resumeFileName: resume.name,
          coverLetter: form.coverLetter.trim(),
          whyVJR: form.whyVJR.trim(),
        },
        resume,
        { uid: user.uid, email: user.email ?? '' },
      );
      setReferenceId(refId);
    } catch (err) {
      console.error('Submit application error:', err);
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {job && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[120] bg-[#0A1628]/70 backdrop-blur-sm"
          onClick={() => !submitting && onClose()}
        />
      )}
      {job && (
        <motion.div
          key="panel"
          initial={reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.6 }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.6 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="fixed inset-x-0 bottom-0 z-[130] flex h-[92dvh] max-h-[100dvh] flex-col rounded-t-3xl bg-white shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:h-auto md:max-h-[100dvh] md:w-[640px] md:rounded-none"
          role="dialog"
          aria-modal="true"
          aria-label={`${job.title} — apply`}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#eef0f4] px-5 py-5 sm:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: job.department_color }} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c8a9a]">
                  {job.department}
                </span>
                {job.isFeatured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#0A1628] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#C9A84C]">
                    <Star size={9} weight="fill" /> Featured
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 truncate text-xl font-semibold text-[#0A1628] sm:text-2xl">{job.title}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[#5b6b7c]">
                <span className="flex items-center gap-1.5"><MapPin size={13} weight="bold" className="text-[#C9A84C]" />{job.location}</span>
                <span className="flex items-center gap-1.5"><Clock size={13} weight="bold" className="text-[#C9A84C]" />{job.type}</span>
                <span className="flex items-center gap-1.5"><Briefcase size={13} weight="bold" className="text-[#C9A84C]" />{job.experience}</span>
                <span className="flex items-center gap-1.5"><CurrencyCircleDollar size={13} weight="bold" className="text-[#C9A84C]" />{formatSalary(job.salary)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ShareJobButton job={job} variant="modal" />
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e3e7ee] text-[#44566b] transition-all hover:border-[#0A1628] hover:text-[#0A1628] disabled:opacity-40"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            {referenceId ? (
              <div className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#C9A84C]/30 bg-gradient-to-b from-[#0A1628] to-[#1a2f4e] px-6 py-14 text-center">
                <Confetti />
                <div className="relative z-10">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.5)]"
                  >
                    <CheckCircle size={34} weight="fill" className="text-white" />
                  </motion.div>
                  <h3 className="mt-6 text-2xl font-semibold text-white">Application Submitted!</h3>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#c3cede]">
                    We&apos;ll review your application and get back to you within 5 business days.
                  </p>
                  <p className="mt-6 inline-block rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-5 py-2 text-sm font-semibold tracking-wide text-[#D6B85D]">
                    Reference: {referenceId}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-8 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-6 text-[12px] font-bold uppercase tracking-[0.12em] text-[#0A1628] transition-all hover:bg-[#D6B85D]"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* About the role */}
                <section>
                  <p className="text-sm leading-relaxed text-[#44566b]">{job.description}</p>
                  <h4 className="mt-6 flex items-center gap-2 text-[15px] font-semibold text-[#0A1628]">
                    <SealCheck size={17} weight="fill" className="text-[#C9A84C]" />
                    Responsibilities
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {job.responsibilities.map((r) => (
                      <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-[#5b6b7c]">
                        <CaretRight size={15} weight="fill" className="mt-0.5 shrink-0 text-[#C9A84C]" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <h4 className="mt-6 flex items-center gap-2 text-[15px] font-semibold text-[#0A1628]">
                    <Briefcase size={17} weight="fill" className="text-[#C9A84C]" />
                    Requirements
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {job.requirements.map((r) => (
                      <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-[#5b6b7c]">
                        <CaretRight size={15} weight="fill" className="mt-0.5 shrink-0 text-[#C9A84C]" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  {job.niceToHave.length > 0 && (
                    <>
                      <h4 className="mt-6 flex items-center gap-2 text-[15px] font-semibold text-[#0A1628]">
                        <Sparkle size={17} weight="fill" className="text-[#C9A84C]" />
                        Nice to Have
                      </h4>
                      <ul className="mt-3 space-y-2">
                        {job.niceToHave.map((r) => (
                          <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-[#5b6b7c]">
                            <CaretRight size={15} weight="fill" className="mt-0.5 shrink-0 text-[#C9A84C]" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>

                {!user ? (
                  <LoginGate
                    jobTitle={job.title}
                    onLogin={handleLogin}
                    authError={authError}
                    authLoading={authLoading}
                  />
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="space-y-7">
                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                    {submitError}
                  </div>
                )}
                {/* Application form */}
                <section className="rounded-2xl border border-[#e6e9ee] bg-[#fafbfc] p-5 sm:p-6">
                  <h4 className="text-lg font-semibold text-[#0A1628]">Apply for this role</h4>
                  <p className="mt-1 text-[13px] text-[#7c8a9a]">Fields marked * are required.</p>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full Name" required error={errors.fullName}>
                      <input className={inputClass} value={form.fullName} onChange={set('fullName')} placeholder="Rahul Kumar" autoComplete="name" />
                    </Field>
                    <Field label="Email" required error={errors.email}>
                      <input type="email" className={inputClass} value={form.email} onChange={set('email')} placeholder="you@email.com" autoComplete="email" />
                    </Field>
                    <Field label="Phone" required error={errors.phone}>
                      <input type="tel" inputMode="numeric" className={inputClass} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" autoComplete="tel" />
                    </Field>
                    <Field label="Current Location">
                      <input className={inputClass} value={form.currentLocation} onChange={set('currentLocation')} placeholder="City" />
                    </Field>
                    <Field label="PIN Code" required error={errors.pinCode}>
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        className={inputClass}
                        value={form.pinCode}
                        onChange={set('pinCode')}
                        placeholder="6-digit PIN"
                        autoComplete="postal-code"
                      />
                    </Field>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Current Company">
                      <input className={inputClass} value={form.currentCompany} onChange={set('currentCompany')} placeholder="Company" />
                    </Field>
                    <Field label="Current Role">
                      <input className={inputClass} value={form.currentRole} onChange={set('currentRole')} placeholder="Designation" />
                    </Field>
                    <Field label="Total Experience" required error={errors.totalExperience}>
                      <select className={inputClass} value={form.totalExperience} onChange={set('totalExperience')}>
                        <option value="">Select experience</option>
                        {EXPERIENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </Field>
                    <Field label="Expected Monthly Salary">
                      <input className={inputClass} value={form.expectedSalary} onChange={set('expectedSalary')} placeholder="e.g. ₹50K per month" />
                    </Field>
                    <Field label="Notice Period" required error={errors.noticePeriod}>
                      <select className={inputClass} value={form.noticePeriod} onChange={set('noticePeriod')}>
                        <option value="">Select notice period</option>
                        {NOTICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </Field>
                  </div>                  <div className="mt-5">
                    <Field label="LinkedIn Profile">
                      <input type="url" className={inputClass} value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
                    </Field>
                  </div>

                  {/* Resume upload */}
                  <div className="mt-5">
                    <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#44566b]">
                      Resume <span className="text-[#C9A84C]">*</span>
                    </span>
                    <label
                      className={`flex min-h-[64px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all ${
                        resumeError
                          ? 'border-red-300 bg-red-50/50'
                          : 'border-[#d5dbe4] bg-white hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5'
                      }`}
                    >
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setResume(f);
                          setResumeError('');
                        }}
                      />
                      {resume ? (
                        <span className="flex items-center gap-2.5 text-sm font-medium text-[#0A1628]">
                          <FilePdf size={20} weight="fill" className="text-[#C9A84C]" />
                          {resume.name}
                          <span className="text-[12px] text-[#8a97a8]">
                            ({(resume.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-sm text-[#5b6b7c]">
                          <UploadSimple size={18} weight="bold" className="text-[#C9A84C]" />
                          Click to upload — PDF / DOC, max 5MB
                        </span>
                      )}
                    </label>
                    {resumeError && (
                      <span className="mt-1.5 block text-[12px] font-medium text-red-600" role="alert">
                        {resumeError}
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <Field label="Why do you want to join VJR Estate?" required error={errors.whyVJR}>
                      <textarea
                        rows={4}
                        maxLength={500}
                        className={`${inputClass} resize-none`}
                        value={form.whyVJR}
                        onChange={set('whyVJR')}
                        placeholder="Tell us what excites you about VJR Estate and this role…"
                      />
                    </Field>
                    <p
                      className={`mt-1 text-right text-[11px] tabular-nums ${
                        form.whyVJR.trim().length >= 200 && form.whyVJR.trim().length <= 500
                          ? 'text-emerald-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {form.whyVJR.trim().length}/200 min · 500 max
                    </p>
                  </div>
                  <div className="mt-5">
                    <Field label="Cover Letter (optional)">
                      <textarea
                        rows={3}
                        className={`${inputClass} resize-none`}
                        value={form.coverLetter}
                        onChange={set('coverLetter')}
                        placeholder="Anything else you'd like to add…"
                      />
                    </Field>
                  </div>
                </section>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#C9A84C] text-[13px] font-bold uppercase tracking-[0.14em] text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.35)] transition-all hover:bg-[#D6B85D] hover:shadow-[0_10px_30px_rgba(201,168,76,0.45)] active:scale-[0.99] disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A1628] border-t-transparent" />
                      Uploading &amp; Submitting…
                    </>
                  ) : (
                    <>
                      <PaperPlaneTilt size={17} weight="bold" />
                      Submit Application
                    </>
                  )}
                </button>
                  </form>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main page ───────────────────────────────────────────────────────────

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState<'All' | Department>('All');
  const [openJob, setOpenJob] = useState<JobOpening | null>(null);
  const jobsRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  // ponytail: seeding is admin-gated by Firestore rules (job_openings writes
  // require isAdmin), so it runs on the admin dashboard mount instead — the
  // public page only subscribes to whatever jobs already exist.
  useEffect(() => {
    const unsub = subscribeToJobs((list) => {
      setJobs(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Deep link: /careers?job=<id> auto-opens that job's apply modal so shared
  // links land straight on the application form.
  useEffect(() => {
    if (jobs.length === 0) return;
    const jobId = new URLSearchParams(window.location.search).get('job');
    if (!jobId) return;
    const match = jobs.find((j) => j.id === jobId);
    if (match) {
      setOpenJob(match);
      // Clean the query so a refresh doesn't re-open the modal.
      const url = new URL(window.location.href);
      url.searchParams.delete('job');
      window.history.replaceState({}, '', url.toString());
    }
  }, [jobs]);

  // Keep social meta (title + OG image) in sync with the open job so shared
  // links and in-app previews show the right card; reset when the modal closes.
  useEffect(() => {
    if (openJob) {
      setJobShareMeta({
        id: openJob.id,
        title: openJob.title,
        department: openJob.department,
        salary: formatSalary(openJob.salary),
        location: openJob.location,
        type: openJob.type,
        experience: openJob.experience,
      });
    } else {
      setDefaultSiteMeta();
    }
  }, [openJob]);

  const visibleJobs = useMemo(() => {
    const list = activeDept === 'All' ? jobs : jobs.filter((j) => j.department === activeDept);
    return list
      .filter((j) => j.isActive)
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }, [jobs, activeDept]);

  const scrollTo = useCallback((el: HTMLDivElement | null) => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ── HERO ── */}
      <header className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1a2f4e 100%)' }}>
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#C9A84C]" />
        {/* ambient glow */}
        <div className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-[#C9A84C]/15 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#335069]/40 blur-[140px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pb-20 pt-32 text-center sm:px-8 sm:pt-36 lg:pb-28 lg:pt-44">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C9A84C] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C9A84C]" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D6B85D]">
              We Are Hiring
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-[3.6rem]"
            style={{ letterSpacing: '-0.025em' }}
          >
            Build Your Career at{' '}
            <span className="text-[#C9A84C]">VJR Estate</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#c3cede] sm:text-base"
          >
            Join Bangalore&apos;s fastest-growing real estate platform. Shape the future of
            property investment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-white backdrop-blur-sm">
              <UsersThree size={14} weight="bold" className="mr-1.5 inline -mt-0.5 text-[#C9A84C]" />
              50+ Team Members
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-white backdrop-blur-sm">
              <CurrencyCircleDollar size={14} weight="bold" className="mr-1.5 inline -mt-0.5 text-[#C9A84C]" />
              ₹500Cr+ Transactions
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.32 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={() => scrollTo(jobsRef.current)}
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0A1628] shadow-[0_10px_30px_rgba(201,168,76,0.35)] transition-all hover:bg-[#D6B85D] hover:shadow-[0_12px_36px_rgba(201,168,76,0.45)] active:scale-[0.98]"
            >
              View Open Positions
              <ArrowRight size={15} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo(teamRef.current)}
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm transition-all hover:border-[#C9A84C]/60 hover:bg-white/10 active:scale-[0.98]"
            >
              Meet Our Team
            </button>
          </motion.div>
        </div>
      </header>

      {/* ── STATS BAR ── */}
      <section className="border-b border-[#eef0f4] bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-5 py-10 sm:px-8 lg:grid-cols-4 lg:py-12">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: EASE }}
              className="flex flex-col items-center text-center"
            >
              <span className="text-3xl font-semibold text-[#0A1628] sm:text-4xl">{s.value}</span>
              <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a97a8]">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── WHY VJR ESTATE ── */}
      <section className="bg-[#fafbfc] py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="Why VJR Estate"
            title="Rewards that match your ambition"
            desc="We believe our employees are the driving force behind our success — and we reward them for it."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-6% 0px' }}
                  transition={{ duration: 0.45, delay: (i % 4) * 0.06, ease: EASE }}
                  className="group rounded-2xl border border-[#e6e9ee] bg-white p-6 shadow-[0_1px_2px_rgba(10,22,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:shadow-[0_18px_40px_rgba(10,22,40,0.08)]"
                >
                  <IconTile icon={Icon} />
                  <h3 className="mt-4 text-[15px] font-semibold leading-snug text-[#0A1628]">{b.title}</h3>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LIFE AT VJR ESTATE ── */}
      <section className="bg-white py-16 sm:py-20 lg:py-24" ref={teamRef}>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9A84C]">
              Life at VJR Estate
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#0A1628] sm:text-4xl" style={{ letterSpacing: '-0.02em' }}>
              Where work feels like purpose
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-[#5b6b7c] sm:text-base">
              Surrounded by the vibrant energy of Bangalore, our team is fuelled by an unwavering
              commitment to steering success consistently. We empower our people with absolute
              autonomy, holistic support, and a culture of transparency and openness.
            </p>
            <p className="mt-4 border-l-2 border-[#C9A84C] pl-5 text-[15px] font-medium leading-relaxed text-[#0A1628] sm:text-base">
              Here at VJR Estate, our pursuit goes beyond the ordinary — we seek that pivotal
              moment for a continuous journey of growth and progress.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.65, ease: EASE }}
            className="grid grid-cols-2 gap-4"
          >
            {LIFESTYLE_IMAGES.map((img, i) => {
              const Icon = img.icon;
              return (
                <div
                  key={img.label}
                  className={`group relative flex h-36 flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#e6e9ee] bg-gradient-to-br p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(10,22,40,0.12)] sm:h-44 ${
                    i % 2 === 0
                      ? 'from-[#0A1628] to-[#1a2f4e]'
                      : 'from-[#faf3e0] to-[#f5ead0]'
                  }`}
                >
                  <Icon
                    size={30}
                    weight="duotone"
                    className={i % 2 === 0 ? 'text-[#C9A84C]' : 'text-[#B8953A]'}
                  />
                  <span className={`mt-3 text-[12px] font-semibold ${i % 2 === 0 ? 'text-white' : 'text-[#0A1628]'}`}>
                    {img.label}
                  </span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── OUR VALUES ── */}
      <section className="bg-[#0A1628] py-16 sm:py-20 lg:py-24" style={{ backgroundImage: 'linear-gradient(135deg, #0A1628 0%, #14263A 100%)' }}>
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHeading
            dark
            eyebrow="Our Values"
            title="The principles we build on"
            desc="Every deal, every client, every day — these values guide how we work."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-6% 0px' }}
                  transition={{ duration: 0.45, delay: (i % 3) * 0.07, ease: EASE }}
                  className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:bg-white/[0.07]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#D6B85D] transition-transform duration-300 group-hover:scale-110">
                    <Icon size={20} weight="duotone" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold text-white">{v.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#9fb0c4]">{v.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── JOB LISTINGS ── */}
      <section className="bg-white py-16 sm:py-20 lg:py-24" id="open-positions">
        <div className="mx-auto max-w-6xl px-5 sm:px-8" ref={jobsRef}>
          <SectionHeading
            eyebrow="Open Positions"
            title="Find your next role"
            desc="Explore opportunities across departments. Click any role to see the full description and apply."
          />

          {/* Department filter */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: EASE }}
            className="mb-8 flex flex-wrap justify-center gap-2"
          >
            {(['All', ...DEPARTMENTS] as const).map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setActiveDept(dept)}
                className={`min-h-[42px] rounded-full px-4 text-[12px] font-semibold uppercase tracking-[0.1em] transition-all duration-200 ${
                  activeDept === dept
                    ? 'bg-[#0A1628] text-[#C9A84C] shadow-md'
                    : 'border border-[#e3e7ee] bg-white text-[#5b6b7c] hover:border-[#C9A84C]/60 hover:text-[#0A1628]'
                }`}
              >
                {dept}
              </button>
            ))}
          </motion.div>

          {/* Job grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-[#f2f4f7]" />
              ))}
            </div>
          ) : visibleJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d5dbe4] bg-[#fafbfc] px-6 py-14 text-center">
              <Briefcase size={36} weight="thin" className="mx-auto text-[#a5b0be]" />
              <p className="mt-4 text-lg font-semibold text-[#0A1628]">No open roles right now</p>
              <p className="mt-2 text-sm text-[#7c8a9a]">
                Send your resume to{' '}
                <a href="mailto:careers@vjrestate.com" className="font-semibold text-[#0A1628] underline underline-offset-2 hover:text-[#B8953A]">
                  careers@vjrestate.com
                </a>{' '}
                — we&apos;ll reach out when a role opens.
              </p>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visibleJobs.map((job) => (
                  <JobCard key={job.id} job={job} onOpen={() => setOpenJob(job)} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          <p className="mt-12 text-center text-sm text-[#8a97a8]">
            Don&apos;t see the right fit? Email us at{' '}
            <a href="mailto:careers@vjrestate.com" className="font-semibold text-[#0A1628] underline underline-offset-2 hover:text-[#B8953A]">
              careers@vjrestate.com
            </a>
          </p>
        </div>
      </section>

      {/* ── Apply modal ── */}
      <ApplyModal job={openJob} onClose={() => setOpenJob(null)} />
    </div>
  );
}
