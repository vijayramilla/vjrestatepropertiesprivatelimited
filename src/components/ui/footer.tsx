import { Link } from 'react-router-dom';
import { ArrowUpRight, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Youtube } from 'lucide-react';
import { siteContact } from '@/data/siteContact';

const SERIF = "'Instrument Serif', Georgia, serif";

const columns = [
  {
    title: 'Properties',
    links: [
      { label: 'All Properties', to: '/properties' },
      { label: 'PG Buildings', to: '/properties?type=PG%20Buildings' },
      { label: 'Residential Rentals', to: '/properties?type=Residential%20Rental%20Income' },
      { label: 'Commercial Income', to: '/properties?type=Commercial%20Properties' },
      { label: 'Your Shortlist', to: '/shortlist' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About VJR Estate', to: '/about' },
      { label: 'Submit Requirement', to: '/submit-requirement' },
      { label: 'Active Requirements', to: '/requirements' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Careers', to: '/careers' },
      { label: 'Blog', to: '/blog' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'EMI Calculator', to: '/emi-calculator' },
      { label: 'Browse Bangalore Areas', to: '/properties' },
      { label: 'Investment Guide', to: '/about' },
    ],
  },
];

const socials = [
  { icon: MessageCircle, href: siteContact.whatsappUrl, label: 'WhatsApp' },
  { icon: Instagram, href: siteContact.social.instagram, label: 'Instagram' },
  { icon: Linkedin, href: siteContact.social.linkedin, label: 'LinkedIn' },
  { icon: Youtube, href: siteContact.social.youtube, label: 'YouTube' },
];

export default function Footer() {
  const c = siteContact;

  return (
    <footer className="w-full bg-[#0A1628] text-white">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
        {/* Top: brand + navigation */}
        <div className="grid grid-cols-1 gap-12 border-b border-white/10 py-14 md:grid-cols-12 md:gap-8 lg:py-16">
          {/* Brand */}
          <div className="md:col-span-5">
            <Link to="/" className="inline-block">
              <span className="font-display text-[26px] font-semibold tracking-tight text-white">
                VJR Estate
              </span>
            </Link>
            <p className="mt-2 text-[13px] uppercase tracking-[0.24em] text-[#C9A84C]">
              Your Rental Income Expert · Bengaluru
            </p>
            <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-white/55">
              VJR Estate specialises in PG buildings and rental-yielding real estate across
              Bangalore — income-first assets, curated for you, and supported
              through acquisition and beyond.
            </p>

            <div className="mt-6 space-y-2.5 text-[13px] text-white/60">
              <a
                href={c.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 transition-colors hover:text-white"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#C9A84C]" />
                {c.address}
              </a>
              <a
                href={`tel:${c.phoneTel}`}
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <Phone size={14} className="shrink-0 text-[#C9A84C]" />
                {c.phoneDisplay} · {c.hoursLabel}
              </a>
              <a
                href={`mailto:${c.email}`}
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <Mail size={14} className="shrink-0 text-[#C9A84C]" />
                {c.email}
              </a>
            </div>

            <div className="mt-7 flex items-center gap-3">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-all duration-200 hover:border-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#0A1628]"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-5">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="group inline-flex items-center gap-1 text-[13.5px] text-white/65 transition-colors hover:text-white"
                      >
                        {link.label}
                        <ArrowUpRight
                          size={11}
                          className="text-[#C9A84C] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="md:col-span-2">
            <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                  Start Investing
                </p>
                <p
                  className="mt-2 text-[22px] leading-tight text-white"
                  style={{ fontFamily: SERIF }}
                >
                  Find your next rental income asset.
                </p>
              </div>
              <div className="space-y-2">
                <a
                  href={c.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A1628] transition-all hover:bg-[#E4C877]"
                >
                  <MessageCircle size={14} />
                  WhatsApp Us
                </a>
                <Link
                  to="/submit-requirement"
                  className="flex w-full items-center justify-center gap-1 rounded-xl border border-white/20 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-all hover:border-[#C9A84C] hover:text-[#C9A84C]"
                >
                  Share Requirement
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 py-7 md:flex-row md:items-center md:justify-between">
          <p className="text-[11.5px] text-white/35">
            © {new Date().getFullYear()} VJR Estate Properties Private Limited. All rights reserved.
            <span className="mx-2 hidden text-white/15 sm:inline">|</span>
            <span className="block sm:inline">CIN: U68100KA2025PTC209772</span>
          </p>
          <div className="flex items-center gap-5 text-[11.5px]">
            <a
              href={c.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/45 transition-colors hover:text-[#C9A84C]"
            >
              Privacy Policy
            </a>
            <a
              href={c.termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/45 transition-colors hover:text-[#C9A84C]"
            >
              Terms &amp; Conditions
            </a>
            <Link to="/properties" className="text-white/45 transition-colors hover:text-[#C9A84C]">
              Properties
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
