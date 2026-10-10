import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  HouseLine,
  Buildings,
  Briefcase,
  CheckCircle,
  ShieldCheck,
  ListPlus,
  Handshake,
  SealCheck,
  MagnifyingGlass,
  CalendarCheck,
  UsersThree,
  ArrowsOutSimple,
  Desk,
  CaretDown,
  ArrowRight,
  ArrowDown,
  Tag,
} from '@phosphor-icons/react';
// Eye icon removed after unused import crashed the page (runtime error caught in live DOM check).
import { setPageMeta } from '@/lib/siteMeta';

/**
 * "How VJR Estate Partnership Works" landing page -> the approved 10-section
 * structure: hero, partnership cards, six-stage timeline, verified-buyer-lead
 * explainer, platform comparison, shared-communication section, Partner
 * Workspace features, eligibility & trust, FAQ, final CTA.
 *
 * CTAs route to the existing wizard at /partner-register. ?type=Owner|Builder|Agent
 * is passed through and preselects the card in the wizard's first step. Signed-in
 * registered partners are sent to their dashboard by the wizard itself
 * (partner.check redirect), which also covers "Become a Partner" from here.
 * Commercial terms are stated in the partner cards; no guaranteed approvals,
 * leads, sales or earnings are claimed anywhere.
 */

const REGISTER = '/partner-register';
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const PARTNER_TYPES = [
  {
    icon: HouseLine,
    title: 'Property Owner',
    cta: 'Register as Owner',
    type: 'Owner',
    tagline: 'For individuals listing property they own or are legally authorized to market.',
    description:
      'Showcase your eligible property and let VJR Estate help coordinate buyer enquiries, communication, and property visits.',
    terms: [
      'Zero listing fee',
      '1% service charge on qualifying successful sale transactions, according to the agreed terms',
      'Dedicated listing and activity tracking',
    ],
  },
  {
    icon: Buildings,
    title: 'Builder / Developer',
    cta: 'Register as Builder',
    type: 'Builder',
    tagline: 'For businesses showcasing eligible projects and property inventory.',
    description:
      'Present your eligible projects and available inventory to interested buyers through the VJR Estate network.',
    terms: [
      'Zero listing fee',
      '50:50 sharing of agreed net partnership revenue actually received, where applicable under the signed agreement',
      'Centralized property and enquiry management',
    ],
  },
  {
    icon: Briefcase,
    title: 'Agent / Broker',
    cta: 'Register as Agent',
    type: 'Agent',
    tagline: 'For professionals with valid authority to market property opportunities.',
    description:
      'Bring eligible, client-authorized properties to VJR Estate and collaborate with our team on buyer enquiries, visits, and transactions.',
    terms: [
      'Zero listing fee',
      '50:50 sharing of agreed net partnership revenue actually received, where applicable under the signed agreement',
      'A dedicated workspace for listings and partnership updates',
    ],
  },
];

const STEPS = [
  {
    icon: SealCheck,
    title: 'Register as a Partner',
    text: "Choose Property Owner, Builder / Developer, or Agent / Broker. Complete the registration form using accurate personal, business, and property-related information.",
  },
  {
    icon: ShieldCheck,
    title: 'Complete Partner Onboarding',
    text: 'Review the applicable commercial terms and partnership agreement. Complete any required document verification, consent, or administrative review under the relevant onboarding workflow. Registration alone does not mean verification or approval is complete. Your dashboard will show the applicable status and next steps.',
  },
  {
    icon: ListPlus,
    title: 'Submit Your Property',
    text: 'Once eligible to list, submit your property details, location, pricing, highlights, amenities, description, and photographs. Keep all information accurate and current. Listings may be reviewed before publication.',
  },
  {
    icon: MagnifyingGlass,
    title: 'Buyer Enquiry and Review',
    text: "When a potential buyer expresses interest, our team reviews the enquiry and contacts the buyer to assess their interest and requirements. Where the enquiry meets our sharing criteria, we introduce the buyer to the relevant partner. Our checks improve the quality of introductions but cannot guarantee a buyer's financial capacity or eventual purchase.",
  },
  {
    icon: CalendarCheck,
    title: 'Coordinated Communication and Property Visits',
    text: "We help coordinate communication between you, the interested buyer, and the VJR Estate team. Where appropriate and with the parties' agreement, we establish a shared communication group to keep discussions organized. We also help coordinate property visits at mutually agreed dates and times.",
  },
  {
    icon: Handshake,
    title: 'Transaction Progress and Settlement',
    text: 'If the buyer chooses to proceed, the relevant parties work towards completing the transaction. VJR Estate helps coordinate communication and tracks applicable updates. Any service charge or revenue share is calculated and settled according to the signed partnership agreement.',
  },
];

const LEAD_CHECKS = [
  {
    title: 'Buyer intent',
    text: 'Does the person express genuine interest in purchasing or renting a property?',
  },
  {
    title: 'Property requirements',
    text: "Does the buyer's stated requirement match the type of property being offered?",
  },
  {
    title: 'Budget and preferences',
    text: "Are the buyer's stated budget, location, and other relevant requirements reasonably aligned?",
  },
  {
    title: 'Contactability',
    text: 'Can the buyer be reached and engaged by our team?',
  },
  {
    title: 'Next steps',
    text: 'Is there a reasonable basis to introduce the buyer and coordinate a discussion or visit?',
  },
];

const COMPARISON: { feature: string; ours: string; typical: string }[] = [
  { feature: 'Buyer enquiry review', ours: 'Team reviews every lead before sharing', typical: 'Review practices vary by platform' },
  { feature: 'Direct buyer connection', ours: 'Designed to connect partners directly with interested buyers', typical: 'Contact may be direct or mediated, depending on the platform' },
  { feature: 'Third-party agent handoff', ours: 'No intermediary agent handoff by VJR Estate as part of the buyer introduction process', typical: 'Practices vary' },
  { feature: 'Human coordination', ours: 'Team assists with enquiries and property visits', typical: 'Level of assistance varies' },
  { feature: 'Shared communication', ours: 'Coordinated shared group where appropriate and agreed', typical: 'Depends on the platform and parties' },
  { feature: 'Partner updates', ours: 'Partner Workspace for listing and partnership updates', typical: 'Tools and tracking vary' },
  { feature: 'Listing fees', ours: 'Zero listing fee', typical: 'Fees and plans vary; some offer paid listing options' },
  { feature: 'Listing duration', ours: 'Unlimited lifetime listings under the stated free-listing policy, subject to platform terms', typical: 'Limits and plans vary' },
  { feature: 'Support', ours: '24/7 support and live chat, subject to actual service availability', typical: 'Support channels and hours vary' },
];

const DIFFERENTIATORS = [
  {
    title: 'Reviewed before sharing.',
    text: 'Our team contacts and assesses buyer enquiries before introducing them to the relevant partner.',
  },
  {
    title: 'Direct connections.',
    text: 'We do not use VJR Estate to route your buyer introduction through another intermediary agent. This does not prevent agents and brokers from registering as VJR Estate partners.',
  },
  {
    title: 'Coordination throughout the journey.',
    text: 'Our team helps organize discussions, property visits, and next steps rather than leaving every coordination task to the partner.',
  },
  {
    title: 'Updates in one workspace.',
    text: 'Important listing, enquiry, booking, and partnership updates are made available through your Partner Workspace as they are recorded.',
  },
  {
    title: 'No listing subscription fee.',
    text: 'You can list eligible properties without a listing fee under our stated policy. Applicable transaction or partnership charges still follow your signed agreement.',
  },
];

const FAQS = [
  {
    q: 'Who can become a VJR Estate Partner?',
    a: 'Property owners, builders/developers, and agents/brokers who own property or have lawful authority to market eligible properties. Accurate information and relevant supporting documents may be required.',
  },
  {
    q: 'Is there a property listing fee?',
    a: "VJR Estate's stated policy is zero listing fees for eligible partner listings, with unlimited lifetime listings subject to the applicable platform terms. Qualifying successful transactions may still attract the charges specified in your signed partnership agreement.",
  },
  {
    q: 'What does the 1% Owner service charge apply to?',
    a: 'It applies to qualifying successful sale transactions under the agreed Owner partnership terms. The applicable calculation, conditions, and settlement terms should be clearly specified in your signed agreement. It is not a general fee on every listing or enquiry.',
  },
  {
    q: 'How does the 50:50 revenue-sharing arrangement work?',
    a: "For applicable Builder/Developer and Agent/Broker partnerships, agreed net partnership revenue actually received is shared 50:50 under the signed agreement. This does not mean 50% of the property's sale price. The agreement defines the applicable revenue, deductions, and settlement process.",
  },
  {
    q: 'What does a verified buyer lead mean?',
    a: "Our team contacts and reviews the buyer enquiry against the property's requirements before sharing it with the relevant partner. The review may consider buyer intent, stated requirements, budget, contactability, and next steps. It is not a guarantee of financial capacity or a completed transaction.",
  },
  {
    q: 'Will VJR Estate connect me with other agents instead of buyers?',
    a: 'Our buyer introduction process is designed to connect the relevant partner directly with the interested buyer, without an intermediary agent handoff by VJR Estate. Agents and brokers can still join VJR Estate as partners under the applicable terms.',
  },
  {
    q: 'Who coordinates property visits?',
    a: 'The VJR Estate team helps coordinate visits between the partner and interested buyer, subject to availability and mutual agreement on the date and time.',
  },
  {
    q: 'How does the shared communication group work?',
    a: "Where appropriate and with the parties' agreement, we create a shared group involving the buyer, the partner, and VJR Estate to coordinate questions, visit arrangements, and next steps.",
  },
  {
    q: 'Where can I track my listings and enquiries?',
    a: 'Use your Partner Dashboard and the relevant My Properties, Enquiries & Bookings, and Activity sections. Updates are available as they are recorded in the system.',
  },
  {
    q: 'When can I start listing properties?',
    a: 'You can start when your registration is complete and your account meets the applicable onboarding and listing requirements. Your workspace should display any pending steps or restrictions.',
  },
  {
    q: 'Do I need to complete verification or sign an agreement?',
    a: 'Depending on the applicable workflow, you may need to review and accept partnership terms, sign an agreement, provide documents, or complete verification before certain features or listing permissions are activated.',
  },
  {
    q: 'Is support available 24/7?',
    a: 'VJR Estate intends to provide 24/7 support and live chat. Availability and response times should follow the actual support service displayed on the website.',
  },
  {
    q: 'Are sales, leads, or earnings guaranteed?',
    a: 'No. VJR Estate reviews enquiries and assists with coordination, but buyer decisions, transaction completion, lead volume, and earnings cannot be guaranteed.',
  },
  {
    q: 'Where can I read the complete commercial terms?',
    a: 'Review the Partner Terms & Conditions and the applicable signed partnership agreement before proceeding.',
  },
];

/* ── Reveal-on-scroll: transform/opacity only; disabled under reduced motion ── */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-56px' }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Section heading: eyebrow + title + description ── */
function SectionHeading({ eyebrow, title, description, dark = false, center = true }: { eyebrow: string; title: string; description?: string; dark?: boolean; center?: boolean }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className={`text-[10.5px] font-semibold uppercase tracking-[0.24em] ${dark ? 'text-gold-300' : 'text-gold-700'}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${dark ? 'text-white' : 'text-navy-800'}`}>{title}</h2>
      {description && <p className={`mt-3 text-[15px] leading-relaxed ${dark ? 'text-navy-100' : 'text-gray-500'}`}>{description}</p>}
    </div>
  );
}

/* ── FAQ accordion row: native button + region, keyboard accessible ── */
function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const panelId = `faq-panel-${q.length}-${q.charCodeAt(0)}`;
  return (
    <div className="border-b border-[#E4E7EC] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors duration-200 hover:text-gold-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500"
      >
        <span className="text-[15px] font-semibold text-navy-800">{q}</span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
            open ? 'rotate-180 border-gold-300 bg-gold-50' : 'border-[#E4E7EC] bg-white'
          }`}
          aria-hidden="true"
        >
          <CaretDown size={14} weight="bold" className="text-navy-800" />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={q}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="pb-5 pr-10 text-[13.5px] leading-relaxed text-gray-500">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function PartnerHowItWorksPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    setPageMeta(
      'VJR Estate Partnership — How It Works for Owners, Builders & Agents',
      'Partner with VJR Estate: list eligible properties, connect with reviewed buyers, and coordinate transactions across Bangalore. Zero listing fee for Owners, Builders and Agents.',
    );
  }, []);

  // scroll-margin-top keeps anchored sections clear of the fixed global
  // header (3rem mobile / 3.5rem md+ per --vjr-header-h).
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const registerTo = (type?: string) => (type ? `${REGISTER}?type=${type}` : REGISTER);

  return (
    <div className="bg-[#FBFBF9]">
      {/* ══ 1 · Hero ══ */}
      <section className="relative overflow-hidden bg-navy-800 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{ background: 'radial-gradient(1000px 460px at 82% -10%, rgba(201,168,76,0.13), transparent 62%)' }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        {/* pt uses the shared --vjr-header-h var so the hero never slides
            under the fixed header on ANY viewport width. */}
        <div className="relative mx-auto max-w-4xl px-4 pb-24 sm:px-6 sm:pb-28" style={{ paddingTop: 'calc(var(--vjr-header-h) + 3.25rem)' }}>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }}>
            <p className="text-center text-[10.5px] font-semibold uppercase tracking-[0.3em] text-gold-300">
              VJR Estate Partnership Program
            </p>
            <h1 className="mt-5 text-center text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
              Your Properties. Our Network.
              <span className="mt-2 block text-gold-300">Shared Success.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-center text-[15px] leading-relaxed text-navy-100 sm:text-base">
              Partner with VJR Estate to showcase eligible properties across Bangalore, connect directly with interested
              buyers, and receive dedicated support throughout the transaction journey.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-center text-[13.5px] leading-relaxed text-navy-200">
              We review buyer enquiries before introducing them, coordinate communication and property visits, and keep
              important partnership updates accessible through your Partner Workspace.
            </p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to={registerTo()}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-gold-500 px-8 text-[14px] font-semibold text-navy-800 no-underline shadow-lg shadow-navy-900/40 transition-colors duration-200 hover:bg-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
              >
                Become a Partner
                <ArrowRight size={15} weight="bold" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => scrollTo('process')}
                className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/25 px-8 text-[14px] font-semibold text-white transition-colors duration-200 hover:border-gold-300 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
              >
                Explore How It Works
                <ArrowDown size={15} weight="bold" aria-hidden="true" />
              </button>
            </div>
            <ul className="mx-auto mt-10 grid max-w-xl grid-cols-1 gap-x-7 gap-y-2.5 text-[12.5px] text-navy-100 sm:grid-cols-2 sm:flex sm:flex-wrap sm:justify-center">
              {['Zero listing fee', 'Bangalore-focused property network', 'Team-reviewed buyer enquiries', 'Dedicated Partner Workspace'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle size={14} weight="fill" className="text-gold-400" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-center text-[11px] text-navy-200">*No sale, lead volume, or earnings are guaranteed.</p>
          </motion.div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold-500/70 to-transparent" aria-hidden="true" />
      </section>

      {/* ══ 2 · Partnership types ══ */}
      <section id="partner-types" className="mx-auto max-w-6xl scroll-mt-[4.5rem] px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Find Your Partnership"
            title="Choose How You Work With Us"
            description="Whether you own a property, represent a development project, or work as a property agent, choose the partnership category that fits your role."
          />
          <p className="mx-auto mt-4 max-w-2xl text-center text-[13px] leading-relaxed text-gray-500">
            Every category starts with zero listing fees. Applicable commercial terms are agreed in advance and governed by
            your signed partnership agreement.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PARTNER_TYPES.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.08}>
              <article className="group flex h-full flex-col rounded-2xl border border-[#E4E7EC] bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gold-300 hover:shadow-lg focus-within:border-gold-300">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 transition-colors duration-200 group-hover:bg-gold-50 group-hover:text-gold-700">
                  <card.icon size={22} weight="regular" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-navy-800">{card.title}</h3>
                <p className="mt-1 text-[11.5px] font-medium text-gold-700">{card.tagline}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{card.description}</p>
                <ul className="mt-5 space-y-2.5 border-t border-[#E4E7EC] pt-4">
                  {card.terms.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-navy-700">
                      <Tag size={12} weight="bold" className="mt-1 shrink-0 text-gold-600" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link
                  to={registerTo(card.type)}
                  className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-navy-800 text-[13px] font-semibold text-navy-800 no-underline transition-colors duration-200 hover:bg-navy-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
                >
                  {card.cta}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-gold-200/70 bg-gold-50/50 p-6">
            <h3 className="text-[14px] font-bold text-navy-800">Transparent Commercial Terms</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-gray-600">
              The 50:50 arrangement applies to the agreed net partnership revenue actually received — not 50% of the
              property's sale price. The Owner's 1% service charge applies only to qualifying successful sale transactions
              under the agreed terms. Rental and lease facilitation charges, if applicable, are separately defined and
              agreed in writing.
            </p>
            <p className="mt-3 text-[12px] text-gray-600">
              See the full{' '}
              <Link to="/partner-terms" className="font-semibold text-navy-800 underline underline-offset-2">Partner Terms &amp; Conditions</Link>{' '}
              before registering.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ══ 3 · Six-stage process ══ */}
      <section id="process" className="bg-white scroll-mt-[4.5rem] py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="The Partnership Journey"
              title="Six Stages. One Clear Process."
              description="From registration to transaction settlement, VJR Estate helps coordinate the journey and keeps important updates accessible to you."
            />
          </Reveal>

          <ol className="relative mt-14 space-y-10 sm:space-y-12 md:space-y-14">
            <div
              className="absolute top-2 bottom-2 left-[23px] w-px bg-gradient-to-b from-gold-200 via-[#E4E7EC] to-gold-200 md:left-1/2 md:-translate-x-1/2"
              aria-hidden="true"
            />
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className={`relative flex gap-5 pl-0 md:items-center ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                <span
                  className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold-200 bg-white font-bold text-gold-700 shadow-sm md:absolute md:left-1/2 md:-translate-x-1/2"
                  aria-hidden="true"
                >
                  <Icon size={20} weight="regular" />
                </span>
                <Reveal className="min-w-0 flex-1 md:w-[calc(50%-3.5rem)] md:flex-none" delay={i * 0.05}>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-gold-600">
                    Stage {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-navy-800">{title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-gray-500">{text}</p>
                </Reveal>
                <div className="hidden flex-1 md:block" aria-hidden="true" />
              </li>
            ))}
          </ol>
          <Reveal>
            <p className="mx-auto mt-12 max-w-2xl text-center text-[11.5px] leading-relaxed text-gray-500">
              *The timeline depends on the parties, property, buyer requirements, and applicable processes. Successful
              closure is not guaranteed.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ 4 · Verified buyer lead ══ */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Our Lead Review Process"
            title="Not Just an Enquiry. A Buyer We Have Personally Reviewed."
            description="A form submission alone is not enough for us to treat an enquiry as ready to share with a partner. Before introducing a buyer, the VJR Estate team aims to contact the buyer and assess the enquiry against the property's requirements."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEAD_CHECKS.map(({ title, text }, i) => (
            <Reveal key={title} delay={(i % 3) * 0.05}>
              <div className="flex h-full items-start gap-4 rounded-xl border border-[#E4E7EC] bg-white p-5 transition-colors duration-200 hover:border-gold-300">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                  <CheckCircle size={18} weight="regular" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[14px] font-bold text-navy-800">{title}</h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-gray-500">{text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-[#E4E7EC] bg-white p-6">
            <h3 className="text-[14px] font-bold text-navy-800">What Happens Next?</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-gray-600">
              If the enquiry meets our review criteria, we introduce the buyer to the relevant partner and help coordinate
              the next steps.
            </p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-navy-700">
              <span className="font-semibold">Our commitment:</span> We aim to review every lead we share before
              introduction. This is a human review of available information — not a guarantee of the buyer's identity,
              financial capacity, final intent, or successful transaction.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ══ 5 · Comparison ══ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="A Different Partnership Experience"
              title="VJR Estate vs. Typical Property Listing Platforms"
              description="VJR Estate is designed around reviewed buyer introductions, direct partner communication, and ongoing coordination — not simply publishing a listing and leaving you to manage every enquiry alone."
            />
          </Reveal>
          <Reveal>
            <div className="mt-12 overflow-x-auto rounded-2xl border border-[#E4E7EC] shadow-sm">
              {/* Scrollable comparison table on mobile (min-width keeps
                  columns legible); a scroll hint is shown on narrow screens. */}
              <p className="flex items-center justify-end gap-1.5 border-b border-[#E4E7EC] bg-[#F8F9FB] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#98A2B3] sm:hidden">
                Swipe to compare <ArrowRight size={11} weight="bold" aria-hidden="true" />
              </p>
              <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                <caption className="sr-only">VJR Estate compared with typical listing platforms</caption>
                <thead>
                  <tr className="bg-navy-800 text-white">
                    <th scope="col" className="px-5 py-4 font-semibold">Feature</th>
                    <th scope="col" className="px-5 py-4 font-semibold text-gold-300">VJR Estate</th>
                    <th scope="col" className="px-5 py-4 font-semibold">Typical Listing Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? 'bg-[#FBFBF9]' : 'bg-white'}>
                      <th scope="row" className="px-5 py-4 align-top text-[13px] font-semibold text-navy-800">{row.feature}</th>
                      <td className="px-5 py-4 align-top text-[12.5px] leading-relaxed text-navy-700">{row.ours}</td>
                      <td className="px-5 py-4 align-top text-[12.5px] leading-relaxed text-gray-500">{row.typical}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <Reveal>
            <h3 className="mt-12 text-center text-xl font-bold text-navy-800">What Makes Our Approach Different?</h3>
            <div className="mx-auto mt-6 max-w-2xl space-y-4">
              {DIFFERENTIATORS.map(({ title, text }) => (
                <div key={title} className="rounded-xl border border-[#E4E7EC] bg-[#FBFBF9] p-5">
                  <p className="text-[13px] leading-relaxed text-gray-600">
                    <span className="font-semibold text-navy-800">{title}</span> {text}
                  </p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-8 max-w-3xl text-center text-[11px] leading-relaxed text-gray-500">
              *This comparison describes VJR Estate's intended service model and general differences in platform
              approaches. Features and policies of other platforms vary. Unlimited lifetime listings remain subject to the
              published platform terms, eligibility rules, and any applicable compliance requirements.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ 6 · Shared communication ══ */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="No More Chasing Updates"
            title="You, the Buyer, and VJR Estate — Working Together"
            description="When a buyer is introduced to you, our team helps coordinate the communication so the next steps are clear to everyone involved."
          />
          <p className="mx-auto mt-4 max-w-2xl text-center text-[13px] leading-relaxed text-gray-500">
            Where appropriate and with the parties' agreement, we create a shared communication group involving you, the
            buyer, and VJR Estate.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: UsersThree, title: 'Direct communication', text: 'The relevant parties can discuss requirements, questions, and property visits together.' },
            { icon: CalendarCheck, title: 'Better coordination', text: 'Our team can help organize viewing schedules and follow-up discussions.' },
            { icon: ArrowsOutSimple, title: 'Clearer next steps', text: 'Important discussions and actions can be coordinated without unnecessary back-and-forth.' },
            { icon: UsersThree, title: 'Greater transparency', text: 'The process is designed to reduce missed messages, confusion, and uncertainty about who is handling the next step.' },
          ].map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 4) * 0.05}>
              <div className="h-full rounded-xl border border-[#E4E7EC] bg-white p-5 transition-colors duration-200 hover:border-gold-300">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-800">
                  <Icon size={18} weight="regular" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[14px] font-bold text-navy-800">{title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-gold-200/70 bg-gold-50/50 p-6">
            <h3 className="text-[14px] font-bold text-navy-800">Communication Does Not Stop at the Group</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-gray-600">
              Your Partner Workspace is the central place to check important partnership updates recorded by VJR Estate.
              Listing statuses, enquiry updates, booking or visit information, agreement statuses, and other applicable
              activity are made available through the workspace as they are recorded.
            </p>
            <p className="mt-3 text-[12.5px] font-semibold text-navy-800">
              One coordinated process. Clearer communication. Better visibility.
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
              *The shared group is a coordination channel, not a substitute for formal agreements or transaction
              documents. The workspace displays recorded updates; it does not automatically capture every external
              conversation.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ══ 7 · Partner Workspace ══ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="Your Partnership, Organized"
              title="Everything Important, in One Place."
              description="Once your partner registration is completed and your account is eligible for workspace access, your Partner Dashboard becomes the central place to manage your partnership with VJR Estate."
            />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Desk, title: 'Dashboard Overview', text: 'See your partner status, property listing summaries, and important pending actions.' },
              { icon: HouseLine, title: 'My Properties', text: 'Create and manage eligible property listings, review their statuses, and update available property information.' },
              { icon: UsersThree, title: 'Enquiries & Bookings', text: 'Access the enquiry and booking records available to your account, including relevant coordination updates.' },
              { icon: MagnifyingGlass, title: 'Activity', text: 'Review recorded updates related to listings, enquiries, visits, agreements, and your partner account.' },
              { icon: SealCheck, title: 'Documents & Agreements', text: 'Access available partnership documents and review applicable agreement or verification statuses.' },
              { icon: Handshake, title: 'Support & Assistance', text: 'Contact the VJR Estate team through the support channels actually available to you.' },
            ].map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 3) * 0.05}>
                <div className="h-full rounded-xl border border-[#E4E7EC] bg-[#FBFBF9] p-5 transition-colors duration-200 hover:border-gold-300">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                    <Icon size={18} weight="regular" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-[14px] font-bold text-navy-800">{title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-10 text-center">
              <Link
                to={registerTo()}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-gold-500 px-8 text-[14px] font-semibold text-navy-800 no-underline transition-colors duration-200 hover:bg-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
              >
                Become a Partner
                <ArrowRight size={15} weight="bold" aria-hidden="true" />
              </Link>
              <p className="mt-4 text-[11.5px] text-gray-500">
                *Workspace access, listing permissions, and individual features depend on your registration status,
                applicable onboarding requirements, and account permissions.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ 8 · Eligibility & Trust ══ */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Built on Transparency"
            title="A Partnership Based on Clear Expectations"
          />
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: HouseLine, title: 'Property Owners', text: 'Individuals who own a property or are legally authorized to market it.' },
            { icon: Buildings, title: 'Builders / Developers', text: 'Businesses or authorized representatives with eligible projects or available inventory.' },
            { icon: Briefcase, title: 'Agents / Brokers', text: 'Property professionals with valid client mandates or other lawful authority to market the relevant property.' },
          ].map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.06}>
              <div className="h-full rounded-xl border border-[#E4E7EC] bg-white p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-800">
                  <Icon size={18} weight="regular" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[14px] font-bold text-navy-800">{title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                  <ShieldCheck size={18} weight="regular" aria-hidden="true" />
                </span>
                <h3 className="text-[14px] font-bold text-navy-800">What May Be Reviewed?</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {[
                  'Partner registration information',
                  'Property details and supporting documents',
                  'Authority to market a property, where relevant',
                  'Buyer enquiries and suitability for introduction',
                  'Applicable partnership terms and onboarding requirements',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-gray-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11.5px] leading-relaxed text-gray-500">
                Verification follows the relevant workflow and available evidence. Listing review and buyer enquiry review
                are separate processes.
              </p>
            </div>
            <div className="rounded-xl border border-gold-200/70 bg-gold-50/50 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gold-700">
                  <SealCheck size={18} weight="regular" aria-hidden="true" />
                </span>
                <h3 className="text-[14px] font-bold text-navy-800">What We Do Not Promise</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {[
                  'Guaranteed property sales or rental transactions',
                  'Guaranteed lead volumes or earnings',
                  'Guaranteed buyer finances or purchasing capacity',
                  'Automatic approval of every partner or listing',
                  'Independent title verification for every property unless specifically contracted and completed',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-navy-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy-800" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11.5px] leading-relaxed text-navy-600">
                Our objective is a structured, transparent coordination process with clear commercial terms and recorded
                updates. Full terms: <Link to="/partner-terms" className="font-medium text-navy-800 underline underline-offset-2">Partner Terms</Link> and{' '}
                <Link to="/partner-privacy" className="font-medium text-navy-800 underline underline-offset-2">Partner Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ 9 · FAQ ══ */}
      <section id="faq" className="bg-white scroll-mt-[4.5rem] py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="FAQ"
              title="Frequently Asked Questions"
              description="The essentials about the partnership, the process and the commercials."
            />
          </Reveal>
          <Reveal>
            <div className="mt-10 rounded-2xl border border-[#E4E7EC] bg-[#FBFBF9] px-6 shadow-sm sm:px-8">
              {FAQS.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ 10 · Final CTA ══ */}
      <section className="relative overflow-hidden bg-navy-800 py-20 text-white sm:py-24">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{ background: 'radial-gradient(900px 420px at 50% 120%, rgba(201,168,76,0.15), transparent 65%)' }}
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.3em] text-gold-300">Start Your Partnership</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Your Property Deserves a Clearer Path to Buyers.</h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-navy-100">
              Join the VJR Estate network to showcase eligible properties, receive reviewed buyer introductions, coordinate
              next steps with our team, and track recorded updates through your Partner Workspace.
            </p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to={registerTo()}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-gold-500 px-8 text-[14px] font-semibold text-navy-800 no-underline transition-colors duration-200 hover:bg-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
              >
                Become a Partner
                <ArrowRight size={15} weight="bold" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => scrollTo('partner-types')}
                className="inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-lg border border-white/25 px-8 text-[14px] font-semibold text-white transition-colors duration-200 hover:border-gold-300 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
              >
                Explore Partnership Types
              </button>
            </div>
            <p className="mt-8 text-[12.5px] font-medium text-gold-300">
              Zero listing fee. Clear commercial terms. A coordinated property journey.
            </p>
            <p className="mt-6 text-[11px] text-navy-200">
              *Successful sales, buyer enquiries, and earnings are not guaranteed.{' '}
              <Link to="/partner-terms" className="underline underline-offset-2">Partner Terms</Link> ·{' '}
              <Link to="/partner-privacy" className="underline underline-offset-2">Partner Privacy Policy</Link>
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
