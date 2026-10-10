import { Link } from 'react-router-dom';
import { siteContact } from '@/data/siteContact';

/**
 * Partner Privacy Policy (v2026-10) — governs personal data of Partner
 * Programme participants (Owners, Builders/Developers, Agents/Brokers).
 * Separate from the website-wide Privacy Policy at /privacy. Drafted to align
 * with India's Digital Personal Data Protection Act, 2023 and applicable rules.
 */

interface Section {
  title: string;
  blocks: Block[];
}

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] };

const sections: Section[] = [
  {
    title: '1. About This Policy',
    blocks: [
      { type: 'paragraph', text: "This Partner Privacy Policy ('Policy') explains how VJR Estate Properties Private Limited ('VJR Estate', 'we', 'us', 'our'), a private limited company registered in Bengaluru, Karnataka (CIN: U68100KA2025PTC209772), collects, uses, shares and protects personal data of participants in the VJR Estate Partner Programme ('Partners'). It applies to Owners, Builders/Developers and Agents/Brokers who register through the partner registration flow, use the partner dashboard, or submit listings and documents. It is separate from our website Privacy Policy, which governs visitors, buyers and tenants browsing vjrestate.com." },
      { type: 'paragraph', text: 'This Policy is drafted to align with the Digital Personal Data Protection Act, 2023 (DPDP Act) and applicable rules made under it. We collect only such personal data as is reasonably necessary for the purposes described below.' },
    ],
  },
  {
    title: '2. Personal Data We Collect',
    blocks: [
      { type: 'bullets', items: [
        'Registration and account data: full name, Google-authenticated email address, and account identifiers',
        'Contact data: mobile number and, where provided, office address and company website',
        'Partner profile data: partner type, firm/company name, years of experience, operating areas and city',
        'RERA information: RERA project or agent registration numbers and related verification status, where provided',
        'Property information: listings you submit, including descriptions, images, video, pricing, location and related details',
        'Enquiry and lead data: enquiries generated through your listings, lead identifiers, source, status and activity history',
        'Transaction data: closure reports, transaction value or fee basis, and related statements, where applicable',
        'Consent and acceptance records: terms and privacy versions accepted, timestamps and related metadata, including IP address and device/log metadata where appropriate',
        'Security data: device, log and access information used to secure accounts and detect abuse',
      ] },
      { type: 'paragraph', text: 'We do not collect Aadhaar numbers or other government identity numbers through the partner registration flow. Where a genuine legal or business requirement for identity documentation arises (for example, mandate verification), we will request the minimum necessary document, explain the requirement, and store it under access controls.' },
    ],
  },
  {
    title: '3. Purposes of Processing',
    blocks: [
      { type: 'bullets', items: [
        'Account creation, authentication and partner account management',
        'Verification of partner identity, authority, mandates and RERA details, where provided',
        'Publication and management of your property listings',
        'Lead generation, enquiry routing and partnership administration',
        'Communication with you regarding enquiries, listings, verification and programme updates',
        'Computation of service charges and revenue shares, and issuance of statements and invoices',
        'Fraud prevention, abuse detection, moderation and platform security',
        'Compliance with applicable law and responses to lawful requests from authorities',
        'Marketing communications, only where you have separately opted in',
      ] },
    ],
  },
  {
    title: '4. Consent and Legal Basis',
    blocks: [
      { type: 'paragraph', text: 'At registration you provide separate consents: agreement to the Partner Terms; acknowledgement of this Policy and consent to processing for account creation, verification, listing management, enquiries and partnership administration; and a declaration of ownership, authority or mandate and accuracy of information. Marketing communications are sent only if you provide the separate optional marketing consent, which you may withdraw at any time without affecting your partnership. We also process data where necessary for compliance with legal obligations or for legitimate uses recognised under the DPDP Act.' },
    ],
  },
  {
    title: '5. Data Sharing and Service Providers',
    blocks: [
      { type: 'paragraph', text: 'We share personal data only as needed to operate the Partner Programme:', },
      { type: 'bullets', items: [
        'Infrastructure and service providers, such as cloud hosting, database, email and communication services, bound by contractual confidentiality and security obligations',
        'Authentication providers, such as Google, solely for sign-in and email verification',
        'Payment and accounting providers, where applicable to statements and invoices',
        'Authorities, where disclosure is required by law, court order or lawful request',
      ] },
      { type: 'paragraph', text: 'We do not sell partner personal data. Buyer or tenant enquiry contact details are shared with a Partner only for the purpose of that enquiry, and partner personal data is not disclosed to other partners.' },
    ],
  },
  {
    title: '6. Public Property Information and Private Data',
    blocks: [
      { type: 'paragraph', text: 'Published listings — including property details, images, listed price or rent, and the partner attribution you choose to display — are public. Information that is not appropriate for public disclosure, such as identity documents, mandates, private documents, internal communications, verification records and commercial terms, remains private and is protected by access controls. Private documents, where stored, are served through authenticated or signed short-lived URLs rather than public links.' },
    ],
  },
  {
    title: '7. Data Retention',
    blocks: [
      { type: 'paragraph', text: 'We retain partner account and consent records for as long as the partnership is active and for a reasonable period thereafter to meet legal, accounting and dispute-resolution needs. Lead and attribution records are retained for the attribution period plus a reasonable historical period. Verification documents are retained only as long as necessary for verification and compliance, and are deleted or anonymised when no longer required. Listing content is removed from public display when a listing is withdrawn or the partnership ends.' },
    ],
  },
  {
    title: '8. Security',
    blocks: [
      { type: 'paragraph', text: 'We implement security measures appropriate to the sensitivity of the data, including encryption of data in transit, server-side authorisation and role-based access control, separation of Owner, Builder and Agent data, rate limiting and OTP abuse prevention where OTP verification is enabled, audit logging of administrative and partner account actions, and access controls on documents. No method of storage or transmission is completely secure, and we cannot guarantee absolute security.' },
    ],
  },
  {
    title: '9. Your Rights',
    blocks: [
      { type: 'paragraph', text: 'Subject to the DPDP Act and applicable rules, you have the right to:', },
      { type: 'bullets', items: [
        'access a summary of the personal data we hold about you and the processing activities',
        'request correction of inaccurate or incomplete personal data',
        'request erasure of your personal data, subject to our legal and business retention obligations',
        'nominate another individual to exercise your rights in specified circumstances',
        'withdraw consent for processing based on consent, as described below',
      ] },
    ],
  },
  {
    title: '10. Consent Withdrawal',
    blocks: [
      { type: 'paragraph', text: 'You may withdraw a consent at any time by contacting us using the details below. Withdrawal of the marketing consent stops promotional communications without affecting your partnership. Withdrawal of the core processing consent will prevent continued operation of your partner account, since account management, verification, listing management and enquiry handling depend on that processing; we will explain the consequences before acting on such a request. Withdrawal does not affect processing already carried out.' },
    ],
  },
  {
    title: '11. Grievance Redressal and Contact',
    blocks: [
      { type: 'paragraph', text: `If you have questions about this Policy, wish to exercise your rights, or wish to raise a grievance regarding the processing of your personal data, contact VJR Estate Properties Private Limited at ${siteContact.phoneDisplay} or ${siteContact.email}, or visit us at ${siteContact.address}. We will acknowledge grievances and respond within a reasonable period as required under applicable law.` },
    ],
  },
  {
    title: '12. Updates to This Policy',
    blocks: [
      { type: 'paragraph', text: 'We may update this Policy to reflect changes in the Partner Programme, our processing or applicable law. The updated version will be published on this page with a revised version identifier. Where a change materially affects partners, we will notify partners through the partner dashboard or by email, and where required we will seek fresh consent.' },
    ],
  },
];

export default function PartnerPrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white">
      <div className="pt-14 md:pt-16">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9A84C]" />
              Partner Programme
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Partner Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
              VJR Estate Properties Private Limited · Version 2026-10 · This policy governs partner personal
              data and is separate from the{' '}
              <Link to="/privacy" className="font-medium text-gray-700 underline underline-offset-2">website Privacy Policy</Link>.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200/70 bg-white shadow-sm p-8 sm:p-10 space-y-8">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-sm font-semibold text-gray-900">{s.title}</h2>
                {s.blocks.map((b, i) =>
                  b.type === 'paragraph' ? (
                    <p key={i} className="mt-2 text-xs leading-relaxed text-gray-600">{b.text}</p>
                  ) : (
                    <ul key={i} className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-gray-600">
                      {b.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            ))}

            <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-5 py-4">
              <p className="text-[11px] italic leading-relaxed text-gray-500">
                This document is provided as general content and does not constitute legal advice, nor does it by
                itself guarantee compliance with the Digital Personal Data Protection Act, 2023, the rules made
                under it, or other applicable law. VJR Estate is strongly advised to have this Policy reviewed and
                finalised by a qualified Indian advocate or privacy lawyer before production use, including the
                appointment and publication of a grievance officer where required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
