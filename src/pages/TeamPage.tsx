import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Users,
  UsersThree,
  ArrowRight,
  Briefcase,
  UserCircle,
} from '@phosphor-icons/react';
import { subscribeToTeamMembers, type TeamMember } from '@/lib/team';
import { setPageMeta } from '@/lib/siteMeta';

const EASE = [0.22, 1, 0.36, 1] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

function MemberCard({ member, index }: { member: TeamMember; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-6% 0px' }}
      transition={{ duration: 0.45, delay: (index % 4) * 0.06, ease: EASE }}
      className="group flex flex-col items-center rounded-2xl border border-[#e6e9ee] bg-white p-6 text-center shadow-[0_1px_2px_rgba(10,22,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]/50 hover:shadow-[0_18px_40px_rgba(10,22,40,0.08)] sm:p-7"
    >
      <div className="relative">
        <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-[#C9A84C]/40 bg-[#faf3e0] sm:h-28 sm:w-28">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-2xl font-semibold text-[#B8953A] sm:text-3xl">
                {initials(member.name) || <UserCircle size={44} weight="duotone" />}
              </span>
            </div>
          )}
        </div>
        <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-[#C9A84C]" />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-[#0A1628] sm:text-xl" style={{ letterSpacing: '-0.01em' }}>
        {member.name}
      </h3>
      <p className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#B8953A]">
        {member.title}
      </p>
    </motion.div>
  );
}

export default function TeamPage() {
  const reduceMotion = useReducedMotion();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageMeta(
      'Our Team | VJR Estate — Meet the People Behind Bangalore\'s Rental Income Specialists',
      'Meet the VJR Estate team — the sales, technology and operations people behind Bangalore\'s only dedicated rental income property platform.',
    );
    const unsub = subscribeToTeamMembers((list) => {
      setMembers(list.filter((m) => m.isActive));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const scrollTo = (el: HTMLDivElement | null) => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const heroStats = useMemo(
    () => [
      { value: `${members.length || '…'}`, label: 'Team Members' },
      { value: 'Bangalore', label: 'HQ' },
      { value: '₹500Cr+', label: 'Transactions' },
    ],
    [members.length],
  );

  return (
    <div className="min-h-screen bg-white">
      {/* ── HERO ── */}
      <header className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1a2f4e 100%)' }}>
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#C9A84C]" />
        <div className="pointer-events-none absolute -left-32 top-24 h-80 w-80 rounded-full bg-[#C9A84C]/15 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#335069]/40 blur-[140px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pb-20 pt-32 text-center sm:px-8 sm:pt-36 lg:pb-28 lg:pt-44">
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-1.5"
          >
            <UsersThree size={14} weight="bold" className="text-[#C9A84C]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D6B85D]">
              Meet The Team
            </span>
          </motion.div>

          <motion.h1
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-[3.6rem]"
            style={{ letterSpacing: '-0.025em' }}
          >
            The People Behind <span className="text-[#C9A84C]">VJR Estate</span>
          </motion.h1>

          <motion.p
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#c3cede] sm:text-base"
          >
            A team of specialists obsessed with one thing — helping you buy
            rental income property in Bangalore with total confidence.
          </motion.p>

          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            {heroStats.map((s) => (
              <span
                key={s.label}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-white backdrop-blur-sm"
              >
                <span className="font-semibold text-[#C9A84C]">{s.value}</span> {s.label}
              </span>
            ))}
          </motion.div>

          <motion.button
            type="button"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.32 }}
            onClick={() => scrollTo(gridRef.current)}
            className="mt-9 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0A1628] shadow-[0_10px_30px_rgba(201,168,76,0.35)] transition-all hover:bg-[#D6B85D] active:scale-[0.98]"
          >
            Meet Our Team
            <ArrowRight size={15} weight="bold" />
          </motion.button>
        </div>
      </header>

      {/* ── MEMBERS GRID ── */}
      <section className="bg-[#fafbfc] py-16 sm:py-20 lg:py-24" ref={gridRef}>
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center lg:mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9A84C]">
              Our Team
            </p>
            <h2
              className="mt-3 text-3xl font-semibold leading-tight text-[#0A1628] sm:text-4xl lg:text-[2.75rem]"
              style={{ letterSpacing: '-0.02em' }}
            >
              The specialists you work with
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#5b6b7c] sm:text-base">
              Every member of our team is here to make your property journey
              simpler, faster and more rewarding.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex flex-col items-center rounded-2xl border border-[#e6e9ee] bg-white p-7">
                  <div className="h-24 w-24 animate-pulse rounded-full bg-gray-100 sm:h-28 sm:w-28" />
                  <div className="mt-5 h-4 w-28 animate-pulse rounded bg-gray-100" />
                  <div className="mt-2.5 h-3 w-20 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-[#e6e9ee] bg-white px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A84C]/10 text-[#B8953A]">
                <Users size={30} weight="duotone" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[#0A1628]">Team coming soon</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5b6b7c]">
                We&apos;re putting the finishing touches on this page. Check back shortly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {members.map((m, i) => (
                <MemberCard key={m.id} member={m} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── JOIN CTA ── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16"
            style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1a2f4e 100%)' }}
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#C9A84C]/15 blur-[80px]" />
            <h2 className="text-2xl font-semibold text-white sm:text-3xl" style={{ letterSpacing: '-0.02em' }}>
              Want to work alongside this team?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-[#c3cede]">
              We&apos;re always looking for driven people to join Bangalore&apos;s
              fastest-growing real estate platform.
            </p>
            <a
              href="/careers"
              className="mt-8 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0A1628] shadow-[0_10px_30px_rgba(201,168,76,0.35)] transition-all hover:bg-[#D6B85D] active:scale-[0.98]"
            >
              <Briefcase size={15} weight="bold" />
              View Open Positions
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
