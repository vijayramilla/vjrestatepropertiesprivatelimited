import { siteContact } from '@/data/siteContact';

interface Section {
  title: string;
  blocks: Block[];
}

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] };

const sections: Section[] = [
  {
    title: '1. About These Terms',
    blocks: [
      {
        type: 'paragraph',
        text: "These Terms and Conditions ('Terms') govern your access to and use of this website, operated by VJR Estate Properties Private Limited ('VJR Estate', 'we', 'us', 'our'), a private limited company registered in Bengaluru, Karnataka (CIN: U68100KA2025PTC209772). By browsing this website, viewing any property listing, using any tool or feature, submitting an enquiry or requirement, or contacting us through any channel, you ('user', 'buyer', 'tenant', 'visitor') agree to be bound by these Terms. If you do not agree, please stop using the website.",
      },
    ],
  },
  {
    title: '2. Our Services',
    blocks: [
      {
        type: 'paragraph',
        text: 'VJR Estate provides property listing, marketing, and facilitation services focused on rental-income real estate in Bengaluru, including PG buildings, residential rental properties, and commercial income properties. Through this website we:',
      },
      {
        type: 'bullets',
        items: [
          'Display property listings and their details for informational purposes',
          'Collect buyer and tenant requirements through the Submit Requirement feature and match them against available properties',
          'Coordinate site visits and introductions between prospective buyers/tenants and property owners/landlords',
          'Provide informational tools such as the EMI calculator and market guides on our blog',
        ],
      },
      {
        type: 'paragraph',
        text: 'VJR Estate is not the owner, builder, developer, or promoter of any property listed, does not participate in the negotiation or execution of any agreement, and does not handle payments between parties. Our full role and its limitations are described in our Disclaimer, which forms part of these Terms.',
      },
    ],
  },
  {
    title: '3. Property Listings and Availability',
    blocks: [
      {
        type: 'paragraph',
        text: 'All listings are based on information provided by property owners, landlords, developers, or their authorized representatives, and are subject to change or withdrawal at any time without prior notice. Display of a property on this website does not guarantee its availability, price, rental yield, or continued listing. Prices, areas, and other details shown are indicative and must be independently confirmed at the time of any visit or negotiation.',
      },
    ],
  },
  {
    title: '4. Enquiries and Requirements',
    blocks: [
      {
        type: 'paragraph',
        text: 'When you submit an enquiry, requirement, or application through this website or any of our channels, you confirm that the information you provide is accurate, current, and relates to a genuine interest in buying, renting, or leasing property. Submitting a requirement does not create any obligation on VJR Estate to find, reserve, or guarantee any property, and does not create a broker-client or advisory relationship unless separately agreed in writing.',
      },
    ],
  },
  {
    title: '5. Acceptable Use',
    blocks: [
      {
        type: 'paragraph',
        text: 'When using this website, you agree that you will not:',
      },
      {
        type: 'bullets',
        items: [
          'Submit false, misleading, fraudulent, or automated/spam enquiries',
          'Use the website for any unlawful purpose or in violation of any applicable law or regulation',
          'Attempt to gain unauthorized access to any part of the website, our admin or CRM systems, or related infrastructure',
          'Scrape, copy, reproduce, or redistribute website content, listings, images, or data without our prior written consent',
          'Interfere with or disrupt the website, its servers, or other users\u2019 access',
          'Impersonate any person or entity or misrepresent your affiliation with any party',
        ],
      },
      {
        type: 'paragraph',
        text: 'We reserve the right to refuse service, block access, or cancel enquiries from any user who violates these Terms, without prior notice.',
      },
    ],
  },
  {
    title: '6. Shortlist and Local Storage',
    blocks: [
      {
        type: 'paragraph',
        text: 'The shortlist feature stores your selected properties in your own browser on your device. It is not an account, booking, reservation, or expression of contractual interest, and we make no commitment that shortlisted properties will remain available. Clearing your browser data will remove your shortlist.',
      },
    ],
  },
  {
    title: '7. EMI Calculator and Other Tools',
    blocks: [
      {
        type: 'paragraph',
        text: 'The EMI calculator and any other tools on this website are provided for convenience and illustration only. Results are indicative estimates based on the inputs you provide and do not constitute an offer of finance, a loan sanction, or financial advice. Actual loan terms, interest rates, and eligibility are determined solely by your lender, and you should verify all figures independently before relying on them.',
      },
    ],
  },
  {
    title: '8. Fees and Payments',
    blocks: [
      {
        type: 'paragraph',
        text: 'This website does not process property payments, deposits, or brokerage fees. Any service fee, brokerage, or commission payable to VJR Estate arises only under a separate written agreement between you and VJR Estate, and its terms — not these website Terms — govern that engagement. You are solely responsible for all payments made to property owners, landlords, lenders, or any third party in connection with a transaction.',
      },
    ],
  },
  {
    title: '9. Intellectual Property',
    blocks: [
      {
        type: 'paragraph',
        text: 'All content on this website — including text, property descriptions, images, graphics, logos, design, and code — is owned by or licensed to VJR Estate Properties Private Limited and protected by applicable intellectual property laws. You may view content and share page links for personal, non-commercial purposes. Any other reproduction, distribution, modification, or commercial use requires our prior written consent.',
      },
    ],
  },
  {
    title: '10. Third-Party Content and Links',
    blocks: [
      {
        type: 'paragraph',
        text: 'This website may embed or link to third-party services such as maps, analytics, WhatsApp, and social media platforms, and may reference government portals for convenience. We do not control and are not responsible for the content, accuracy, or availability of third-party services, and your use of them is governed by their own terms and policies.',
      },
    ],
  },
  {
    title: '11. Website Availability and Changes',
    blocks: [
      {
        type: 'paragraph',
        text: 'We aim to keep the website available and accurate but do not guarantee uninterrupted access, error-free operation, or freedom from technical faults. We may add, change, suspend, or remove any feature, listing, or content, or discontinue the website in whole or in part, at any time without prior notice.',
      },
    ],
  },
  {
    title: '12. Limitation of Liability',
    blocks: [
      {
        type: 'paragraph',
        text: "To the fullest extent permitted by law, VJR Estate, its owners, directors, employees, agents, and representatives shall not be liable for any direct, indirect, incidental, consequential, or special loss or damage arising from your use of, or inability to use, this website, or from reliance on any information displayed or communicated by us — including discrepancies in property details, disputes between buyers/tenants and owners/landlords, and any regulatory or legal action affecting a property. Any property dispute is strictly between the buyer/tenant and the owner/landlord; see our Disclaimer for full details.",
      },
    ],
  },
  {
    title: '13. Indemnity',
    blocks: [
      {
        type: 'paragraph',
        text: 'You agree to indemnify and hold harmless VJR Estate, its owners, directors, employees, and representatives from any claims, losses, liabilities, and expenses (including reasonable legal fees) arising from your breach of these Terms, your misuse of the website, or any information you submit that is false, misleading, or infringes any third party\u2019s rights.',
      },
    ],
  },
  {
    title: '14. Governing Law and Jurisdiction',
    blocks: [
      {
        type: 'paragraph',
        text: 'These Terms are governed by the laws of India. Any dispute arising from or in connection with these Terms or your use of this website shall be subject to the exclusive jurisdiction of the courts at Bengaluru, Karnataka.',
      },
    ],
  },
  {
    title: '15. Changes to These Terms',
    blocks: [
      {
        type: 'paragraph',
        text: 'We may modify these Terms at any time without prior notice. The updated Terms take effect as soon as they are published on this website, and continued use of the website constitutes acceptance of the updated Terms.',
      },
    ],
  },
  {
    title: '16. Contact',
    blocks: [
      {
        type: 'paragraph',
        text: `For any questions about these Terms, contact us at ${siteContact.phoneDisplay} or ${siteContact.email}, or visit us at ${siteContact.address}.`,
      },
    ],
  },
];

export default function TermsPage() {
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
              Terms &amp; Conditions
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
              Legal Entity: VJR Estate Properties Private Limited · Last updated: September 2026
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200/70 bg-white shadow-sm p-8 sm:p-10 space-y-8">
            <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white px-5 py-4">
              <p className="text-xs font-semibold text-amber-800">⚠ Important</p>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                Please read these Terms carefully before using this website. They govern your use of the website and
                its features. How we handle property information is covered in our{' '}
                <a href="/disclaimer" className="font-semibold text-amber-900 underline underline-offset-2">
                  Disclaimer
                </a>
                , and how we handle your personal information is covered in our{' '}
                <a href="/privacy" className="font-semibold text-amber-900 underline underline-offset-2">
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            {sections.map((s) => (
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

            <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-5 py-4">
              <p className="text-[11px] italic leading-relaxed text-gray-500">
                This document is provided as general content for website use and does not constitute legal advice. VJR
                Estate is strongly advised to have these Terms reviewed and finalized by a qualified lawyer licensed in
                India before publishing, to ensure full compliance with applicable laws.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
