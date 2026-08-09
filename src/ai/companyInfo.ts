import { siteContact } from '@/data/siteContact';

// ─────────────────────────────────────────────────────────────────────────────
// NEXA COMPANY KNOWLEDGE BASE
// Centralizes VJR Estate's public identity (contact, location, company story,
// mission, vision, journey, founder) so Nexa can answer company questions with
// real, sourced information. Contact details are pulled from siteContact.ts —
// the single source of truth used across the site.
// ─────────────────────────────────────────────────────────────────────────────

export interface FounderInfo {
  name: string;
  role: string;
  bio: string;
  quote: string;
  linkedin: string;
}

export interface CompanyKnowledge {
  legalName: string;
  tagline: string;
  hq: string;
  focus: string[];
  services: string[];
  mission: string;
  vision: string;
  journey: string[];
  founder: FounderInfo;
  phone: string;
  email: string;
  address: string;
  addressShort: string;
  mapsUrl: string;
  hours: string;
  siteUrl: string;
  social: { instagram: string; linkedin: string; youtube: string };
}

export const companyInfo: CompanyKnowledge = {
  legalName: 'VJR Estate Properties Private Limited',
  tagline: "Bangalore's Specialist Real Estate Investment Advisors",
  hq: 'Bangalore, Karnataka',
  focus: ['PG buildings', 'commercial properties', 'residential plots', 'commercial plots', 'JD land'],
  services: [
    'Investment advisory for Bangalore real estate',
    'Asset identification and evaluation',
    'Transaction structuring for buyers and sellers',
    'Due diligence and asset quality assessment',
    'Property management (being built as the advisory practice matures)',
  ],
  mission:
    'To enable investors to make the right real estate investment decisions, exclusively in Bangalore, across both rental-income properties and high-potential land opportunities.',
  vision:
    "To become Bangalore's most trusted name in real estate investment advisory: a single, dependable destination where capital, opportunity, and expertise meet, covering every stage of the investment journey, from acquisition to long-term portfolio management.",
  journey: [
    'VJR Estate began as a personal pursuit, not a business plan.',
    'While still in college, Vijay Ram Illa became fascinated by Bangalore\'s real estate market: how the city was growing, where value was forming, and why so many property decisions were made on instinct rather than insight. What started as curiosity turned into independent study — researching property cycles, rental yields, legal processes, and the patterns behind Bangalore\'s most successful real estate investments.',
    'That early groundwork became the foundation for VJR Estate, a firm built on the belief that real estate investment in Bangalore deserves the same rigor, structure, and discipline as any serious asset class.',
    'VJR Estate has grown into a dedicated advisory practice with a singular focus: helping investors navigate Bangalore\'s property market with clarity and confidence.',
  ],
  founder: {
    name: 'Mr. Vijay Ram Illa',
    role: 'Founder & CEO',
    bio: 'Vijay Ram Illa is the Founder & CEO of VJR Estate Properties Private Limited, leading its rise as one of Bangalore\'s most trusted authorities in real estate investment advisory. His command of Bangalore\'s property cycles, rental yields, and capital appreciation trends, built through independent, rigorous study, forms the foundation of VJR Estate\'s investment philosophy, positioning the company as a market authority that shapes opportunity rather than responding to it. As Founder & CEO, Vijay sets the vision, strategy, and direction across the business, leading asset selection with institutional discipline, governing investor relationships with a long-term partnership mindset, and steering growth across Bangalore\'s most competitive real estate corridors.',
    quote: 'A market authority that shapes opportunity rather than responding to it.',
    linkedin: 'https://www.linkedin.com/in/vijay-ram-illa/',
  },
  phone: siteContact.phoneDisplay,
  email: siteContact.email,
  address: siteContact.address,
  addressShort: siteContact.addressShort,
  mapsUrl: siteContact.mapsUrl,
  hours: siteContact.hoursLabel,
  siteUrl: siteContact.siteUrl,
  social: siteContact.social,
};

/** Compact plain-text profile for Nexa's system context. */
export function formatCompanyContext(): string {
  const c = companyInfo;
  const lines = [
    `COMPANY PROFILE:`,
    `Legal name: ${c.legalName}`,
    `Tagline: ${c.tagline}`,
    `Headquarters: ${c.hq}`,
    `Focus areas: ${c.focus.join(', ')}`,
    `Services: ${c.services.join('; ')}`,
    ``,
    `MISSION:`,
    c.mission,
    ``,
    `VISION:`,
    c.vision,
    ``,
    `JOURNEY:`,
    ...c.journey.map((j) => `- ${j}`),
    ``,
    `FOUNDER:`,
    `Name: ${c.founder.name}`,
    `Role: ${c.founder.role}`,
    `Bio: ${c.founder.bio}`,
    `Quote: "${c.founder.quote}"`,
    `LinkedIn: ${c.founder.linkedin}`,
    ``,
    `CONTACT & LOCATION:`,
    `Phone: ${c.phone}`,
    `Email: ${c.email}`,
    `Office address: ${c.address}`,
    `Map link: ${c.mapsUrl}`,
    `Hours: ${c.hours}`,
    `Website: ${c.siteUrl}`,
    `Social: Instagram ${c.social.instagram} | LinkedIn ${c.social.linkedin} | YouTube ${c.social.youtube}`,
  ];
  return lines.join('\n');
}
