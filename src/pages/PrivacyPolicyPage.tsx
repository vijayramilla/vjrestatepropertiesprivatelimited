import { Link } from 'react-router-dom';
import { siteContact } from '@/data/siteContact';

interface Section {
  title: string;
  blocks: Block[];
}

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] };

const termsSections: Section[] = [
  {
    title: '1. About VJR Estate',
    blocks: [
      {
        type: 'paragraph',
        text: "VJR Estate Properties Private Limited ('VJR Estate', 'we', 'us', 'our') operates this website. VJR Estate is a real estate listing, marketing, and facilitation company based in Bengaluru, Karnataka, that connects property owners and landlords with prospective buyers and tenants, with a focus on PG buildings and rental-income properties. VJR Estate is not the owner, builder, developer, or promoter of any property displayed on this website, and we are not a party to any sale, lease, rental, or other agreement executed between a buyer/tenant and an owner/landlord.",
      },
    ],
  },
  {
    title: '2. Acceptance of Terms',
    blocks: [
      {
        type: 'paragraph',
        text: "By accessing or browsing this website, viewing any listing, submitting an enquiry or requirement, or contacting us through any channel (website form, WhatsApp, phone, email, or in person), you ('user', 'buyer', 'tenant', 'visitor') acknowledge that you have read, understood, and agreed to these Terms of Use and the Privacy Policy below. If you do not agree with any part of these terms, please do not use this website.",
      },
    ],
  },
  {
    title: '3. Property Information and Listings',
    blocks: [
      {
        type: 'paragraph',
        text: 'All property details displayed on this website — including price, location, area/measurements, layout, amenities, ownership status, rental income, tenant details, occupancy status, and legal status — are provided to us by the property owner, landlord, developer, or their authorized representative. VJR Estate has not independently inspected, audited, surveyed, or verified this information, does not guarantee its accuracy or completeness, and listings may change or be withdrawn without prior notice. Please refer to our Disclaimer for the full terms governing property information.',
      },
    ],
  },
  {
    title: '4. Our Role and Limitations',
    blocks: [
      {
        type: 'paragraph',
        text: 'VJR Estate facilitates introductions, site visits, and communication between property owners/landlords and prospective buyers/tenants. We do not participate in the negotiation or execution of agreements, do not handle or transfer payments between parties, and do not provide legal, financial, or valuation advice. VJR Estate is not registered as a real estate agent under the Real Estate (Regulation and Development) Act, 2016 (RERA), and no service offered through this website should be construed as being offered under, or covered by, RERA registration.',
      },
    ],
  },
  {
    title: '5. Your Responsibilities',
    blocks: [
      {
        type: 'paragraph',
        text: 'When using this website and engaging with VJR Estate, you agree that you will:',
      },
      {
        type: 'bullets',
        items: [
          'Provide accurate, current, and complete information in any enquiry, requirement, or application you submit',
          'Use the website only for lawful purposes and not to submit fraudulent, misleading, or repeated spam enquiries',
          'Conduct your own due diligence — including legal, financial, and physical verification of any property — before making any payment or signing any agreement',
          'Not copy, reproduce, scrape, or redistribute any content from this website without our prior written consent',
        ],
      },
    ],
  },
  {
    title: '6. Intellectual Property',
    blocks: [
      {
        type: 'paragraph',
        text: 'All content on this website — including text, property descriptions, images, graphics, logos, design, and code — is owned by or licensed to VJR Estate Properties Private Limited and is protected by applicable intellectual property laws. You may view and download content for your personal, non-commercial use only. Any other reproduction, distribution, or use requires our prior written consent.',
      },
    ],
  },
  {
    title: '7. Limitation of Liability',
    blocks: [
      {
        type: 'paragraph',
        text: "To the fullest extent permitted by law, VJR Estate, its owners, directors, employees, agents, and representatives shall not be liable for any discrepancy in property details, any dispute between a buyer/tenant and an owner/landlord, any regulatory or legal action affecting a property, or any direct, indirect, incidental, or consequential loss or damage arising from your use of this website or reliance on any information provided by us. Any dispute regarding a property is strictly a matter between the buyer/tenant and the owner/landlord. See our Disclaimer for full details.",
      },
    ],
  },
  {
    title: '8. Governing Law and Jurisdiction',
    blocks: [
      {
        type: 'paragraph',
        text: 'These Terms of Use and any dispute arising from the use of this website or our services shall be governed by the laws of India, and shall be subject to the exclusive jurisdiction of the courts at Bengaluru, Karnataka.',
      },
    ],
  },
];

const privacySections: Section[] = [
  {
    title: '9. Information We Collect',
    blocks: [
      {
        type: 'paragraph',
        text: 'We collect the following information when you use this website or engage with us:',
      },
      {
        type: 'bullets',
        items: [
          'Enquiry and requirement details you submit through our forms or share over WhatsApp, phone, or email — such as your name, phone number, email address, budget, preferred locations, and property preferences',
          'Property details and ownership information you provide if you list a property with us',
          'Job application details — name, contact information, and résumé — if you apply for a position through our careers page',
          'Records of your interactions with our team, stored in our internal customer relationship management (CRM) systems',
          'Usage data such as pages visited, enquiries viewed, and general browsing behaviour, collected through cookies and similar technologies',
        ],
      },
    ],
  },
  {
    title: '10. How We Use Your Information',
    blocks: [
      {
        type: 'paragraph',
        text: 'We use the information we collect to:',
      },
      {
        type: 'bullets',
        items: [
          'Respond to your enquiries and share property options that match your requirements',
          'Arrange site visits and coordinate communication between you and property owners/landlords',
          'Follow up with you by phone, WhatsApp, or email regarding your requirement (you may opt out at any time)',
          'Process job applications and communicate with you about them',
          'Maintain internal records of leads, clients, and properties in our CRM',
          'Improve our website, listings, and services, and comply with applicable legal obligations',
        ],
      },
    ],
  },
  {
    title: '11. How We Share Your Information',
    blocks: [
      {
        type: 'paragraph',
        text: 'We share your information only as needed to operate our services:',
      },
      {
        type: 'bullets',
        items: [
          'With property owners/landlords — basic contact details may be shared to arrange property viewings or facilitate communication',
          'With our employees and authorized representatives who handle your enquiry or requirement',
          'With service providers who help us operate the website and our business (such as hosting, database, analytics, maps, and communication tools), under appropriate confidentiality obligations',
          'When required by law, court order, or government regulation',
        ],
      },
    ],
  },
  {
    title: '12. Cookies and Tracking',
    blocks: [
      {
        type: 'paragraph',
        text: 'This website uses cookies and similar technologies to enable core functionality, remember your preferences (such as your shortlisted properties), and understand how the website is used. Third-party services such as Google Analytics and Google Maps may also set cookies. You can control or disable cookies through your browser settings, though some parts of the website may not function correctly without them.',
      },
    ],
  },
  {
    title: '13. Data Security and Retention',
    blocks: [
      {
        type: 'paragraph',
        text: 'We implement reasonable technical and organizational safeguards — including access controls and encrypted connections — to protect your information. Your data is stored with reputable infrastructure providers. We retain your information only as long as necessary for the purposes described above, to comply with legal obligations, or to resolve disputes, after which it is deleted or anonymized.',
      },
    ],
  },
  {
    title: '14. Your Rights',
    blocks: [
      {
        type: 'paragraph',
        text: 'You may ask us to access, correct, update, or delete the personal information we hold about you, or withdraw your consent to further communication, at any time by writing to info@vjrestate.com or calling +91 8088905957. We will respond to your request within a reasonable timeframe, subject to any legal retention requirements.',
      },
    ],
  },
  {
    title: '15. Acceptance and Changes',
    blocks: [
      {
        type: 'paragraph',
        text: 'By using this website or engaging with VJR Estate in any capacity, you consent to the collection and use of your information as described in this policy. We may update these Terms and this Privacy Policy at any time without prior notice, and continued use of the website constitutes acceptance of the updated terms.',
      },
    ],
  },
];

const parts: { label: string; sections: Section[] }[] = [
  { label: 'Part A — Terms of Use', sections: termsSections },
  { label: 'Part B — Privacy Policy', sections: privacySections },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white">
      <div className="pt-14 md:pt-16">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Legal
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Privacy Policy &amp; Terms
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
              Legal Entity: VJR Estate Properties Private Limited · Last updated: September 2026
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200/70 bg-white shadow-sm p-8 sm:p-10 space-y-8">
            <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white px-5 py-4">
              <p className="text-xs font-semibold text-amber-800">⚠ Important</p>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                Please read these Terms of Use and this Privacy Policy carefully before using this website or sharing
                any information with us. By browsing, enquiring, or submitting your requirement, you accept both. How
                we handle property information is covered separately in our{' '}
                <Link to="/disclaimer" className="font-semibold text-amber-900 underline underline-offset-2">
                  Disclaimer
                </Link>
                .
              </p>
            </div>

            {parts.map((part) => (
              <div key={part.label} className="space-y-8">
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  {part.label}
                </p>
                {part.sections.map((s) => (
                  <div key={s.title}>
                    <h2 className="text-sm font-semibold text-gray-900">{s.title}</h2>
                    {s.blocks.map((b, i) =>
                      b.type === 'paragraph' ? (
                        <p key={i} className="mt-2 text-xs leading-relaxed text-gray-600">
                          {b.text}
                        </p>
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
              </div>
            ))}

            <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-5 py-4">
              <p className="text-xs font-medium text-gray-900">Contact Us</p>
              <p className="mt-1 text-xs text-gray-500">
                For any questions about these Terms or this Privacy Policy, contact us at{' '}
                <a
                  href={`tel:${siteContact.phoneTel}`}
                  className="font-medium text-gray-900 underline underline-offset-2"
                >
                  {siteContact.phoneDisplay}
                </a>{' '}
                or{' '}
                <a
                  href={`mailto:${siteContact.email}`}
                  className="font-medium text-gray-900 underline underline-offset-2"
                >
                  {siteContact.email}
                </a>
                .
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-5 py-4">
              <p className="text-[11px] italic leading-relaxed text-gray-500">
                This document is provided as general content for website use and does not constitute legal advice. VJR
                Estate is strongly advised to have these documents reviewed and finalized by a qualified lawyer
                licensed in India before publishing, to ensure full compliance with applicable real estate, consumer
                protection, data protection, and RERA regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
