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
    title: '1. Nature of Information Provided',
    blocks: [
      {
        type: 'paragraph',
        text: 'All property details displayed on this website — including but not limited to price, location, area/measurements, layout, amenities, ownership status, rental income, tenant details, occupancy status, legal status, and any other specification — are provided to VJR Estate by the property owner, landlord, developer, or their authorized representative.',
      },
      {
        type: 'paragraph',
        text: 'VJR Estate has not independently inspected, audited, surveyed, or verified any of this information. We do not guarantee, warrant, or certify the accuracy, completeness, currency, or authenticity of any detail published on this website or shared through any brochure, WhatsApp message, email, call, or in-person conversation with our representatives.',
      },
      {
        type: 'paragraph',
        text: 'Property details are subject to change without prior notice and may vary from what is displayed at the time of actual visit, negotiation, or transaction.',
      },
    ],
  },
  {
    title: '2. Role of VJR Estate',
    blocks: [
      {
        type: 'paragraph',
        text: 'VJR Estate operates strictly as a listing, marketing, and facilitation intermediary connecting property owners/landlords with prospective buyers/tenants. VJR Estate:',
      },
      {
        type: 'bullets',
        items: [
          'Is not the owner, co-owner, builder, developer, promoter, or operator of any property listed on this website.',
          'Does not hold any legal, financial, or beneficial interest in the properties listed, unless explicitly stated otherwise in writing.',
          'Does not act as a legal advisor, structural engineer, chartered accountant, or valuation expert, and no communication from us should be treated as professional advice of this nature.',
          'Merely facilitates introductions, site visits, and communication between parties and is not a party to any sale, lease, rental, or other agreement executed between the buyer/tenant and the owner/landlord.',
          'Is not registered as a real estate agent under the Real Estate (Regulation and Development) Act, 2016 (RERA) with any State Real Estate Regulatory Authority. VJR Estate does not hold itself out as a RERA-registered agent or broker, and no communication, listing, or service provided by VJR Estate should be construed as being offered under, or covered by, RERA registration. Buyers/tenants dealing in any property that requires RERA registration (of the project, promoter, or agent) under applicable law are solely responsible for verifying such registration and compliance independently before proceeding.',
        ],
      },
    ],
  },
  {
    title: '3. Buyer/Tenant Responsibility — Mandatory Independent Verification',
    blocks: [
      {
        type: 'paragraph',
        text: 'It is the sole and absolute responsibility of the buyer or tenant to independently verify all aspects of a property before making any payment, signing any agreement, or entering into any transaction, including but not limited to:',
      },
      {
        type: 'bullets',
        items: [
          'Title deed, ownership documents, encumbrance certificate, and chain of title',
          'BBMP/municipal registration, khata, property tax records, and applicable licenses',
          'Building plan sanction and approval from competent authorities',
          'Occupancy Certificate (OC) and Completion Certificate (CC)',
          'Fire safety No Objection Certificate (NOC) and other statutory/regulatory clearances',
          'RERA registration status (where applicable)',
          'Actual measurements, carpet area, built-up area, and boundaries (via physical site inspection and/or a licensed surveyor)',
          'Rental figures, lease terms, tenant agreements, security deposits, and existing tenancy status',
          'Loan status, mortgage, litigation, dues, or any encumbrance on the property',
          'Zoning, land use classification, and legality of construction',
          'Any other legal, financial, structural, or regulatory aspect relevant to the transaction',
        ],
      },
      {
        type: 'paragraph',
        text: "Buyers/tenants are strongly advised to engage their own independent lawyer, chartered accountant, surveyor, and/or other qualified professionals to conduct thorough due diligence before proceeding with any transaction. VJR Estate does not undertake this verification on the buyer's/tenant's behalf and makes no representation that such verification has been done.",
      },
    ],
  },
  {
    title: '4. No Warranty on Legality, Safety, or Compliance',
    blocks: [
      {
        type: 'paragraph',
        text: 'VJR Estate makes no representation, guarantee, or warranty, express or implied, regarding:',
      },
      {
        type: 'bullets',
        items: [
          'The legality, safety, structural soundness, or regulatory compliance of any property listed',
          'The validity or authenticity of any document, approval, license, or certificate relating to the property',
          'The accuracy of rental income, tenancy status, or financial projections shared for any property',
          'The fitness of the property for any particular purpose',
        ],
      },
      {
        type: 'paragraph',
        text: "Any decision to proceed with viewing, negotiating, renting, leasing, or purchasing a property is made entirely at the buyer's/tenant's own discretion and risk.",
      },
    ],
  },
  {
    title: '5. Limitation of Liability',
    blocks: [
      {
        type: 'paragraph',
        text: 'To the fullest extent permitted by law, VJR Estate, its owners, employees, agents, and representatives shall not be held liable or responsible for:',
      },
      {
        type: 'bullets',
        items: [
          'Any discrepancy, inaccuracy, or misrepresentation in property details provided by the owner/landlord',
          'Any dispute arising between the buyer/tenant and the owner/landlord, including disputes over title, price, possession, tenancy, deposits, or agreement terms',
          'Any regulatory action, government notice, demolition, sealing, closure, penalty, fine, or legal proceeding initiated against the property or its owner, whether before, during, or after the transaction',
          "Any defect, structural issue, safety hazard, or non-compliance discovered in the property after the transaction — such matters rest solely with the property owner/builder and are outside VJR Estate's control or responsibility",
          'Any direct, indirect, incidental, consequential, or special loss or damage (financial or otherwise) suffered by any party arising out of or in connection with reliance on information provided on this website or by our representatives',
        ],
      },
      {
        type: 'paragraph',
        text: "Any dispute regarding the property, its condition, its documentation, or the transaction itself is strictly a matter between the buyer/tenant and the property owner/landlord, and VJR Estate shall not be made a party to, nor bear responsibility for, resolving such disputes.",
      },
    ],
  },
  {
    title: '6. Images and Visual Representations',
    blocks: [
      {
        type: 'paragraph',
        text: 'Images, photographs, floor plans, and visual representations used on this website and in marketing material may be AI-generated, digitally created, or representative/indicative visuals, and may not depict the actual, current condition of the property.',
      },
      {
        type: 'paragraph',
        text: 'These visuals are used solely for marketing and illustrative purposes and to protect the privacy of the property owner, occupants, tenants, and other individuals associated with the property. Buyers/tenants must not rely on these images as an accurate depiction of the property and are advised to conduct a physical site visit before forming any opinion or making any decision.',
      },
    ],
  },
  {
    title: '7. No Broker-Client Fiduciary Guarantee',
    blocks: [
      {
        type: 'paragraph',
        text: 'Engagement with VJR Estate does not create any fiduciary, agency (beyond facilitation), or advisory relationship obligating VJR Estate to act in the exclusive interest of either the buyer/tenant or the owner/landlord, unless separately agreed in writing.',
      },
    ],
  },
  {
    title: '8. Third-Party Links and Communication',
    blocks: [
      {
        type: 'paragraph',
        text: 'This website may reference or link to third-party services, government portals, or documents for informational convenience only. VJR Estate is not responsible for the accuracy or availability of such third-party content.',
      },
    ],
  },
  {
    title: '9. Changes to This Disclaimer',
    blocks: [
      {
        type: 'paragraph',
        text: 'VJR Estate reserves the right to modify, update, or amend this disclaimer at any time without prior notice. Continued use of this website constitutes acceptance of the updated terms.',
      },
    ],
  },
  {
    title: '10. Governing Law and Jurisdiction',
    blocks: [
      {
        type: 'paragraph',
        text: 'This disclaimer shall be governed by the laws of India, and any disputes arising in connection with the use of this website or services offered by VJR Estate Properties Private Limited shall be subject to the exclusive jurisdiction of the courts at Bengaluru, Karnataka.',
      },
    ],
  },
  {
    title: '11. Acknowledgment',
    blocks: [
      {
        type: 'paragraph',
        text: 'By using this website or engaging with VJR Estate in any capacity, you acknowledge that:',
      },
      {
        type: 'bullets',
        items: [
          'You have read and understood this disclaimer in full',
          'You accept full responsibility for conducting your own due diligence before any transaction',
          "You agree that VJR Estate acts only as a marketing/listing intermediary and bears no liability for the property's legal status, condition, or any dispute arising from it",
        ],
      },
    ],
  },
];

export default function DisclaimerPage() {
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
              Disclaimer
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
              Legal Entity: VJR Estate Properties Private Limited · Last updated: 07-09-2026
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200/70 bg-white shadow-sm p-8 sm:p-10 space-y-8">
            <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white px-5 py-4">
              <p className="text-xs font-semibold text-amber-800">⚠ Important</p>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                Please read this disclaimer carefully before using this website or acting on any property listing,
                information, or communication provided by VJR Estate ("we," "us," "our," "VJR Estate," "the Company").
                By browsing this website, viewing any listing, or contacting us regarding any property, you ("user,"
                "buyer," "tenant," "visitor") acknowledge that you have read, understood, and agreed to the terms of
                this disclaimer.
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
              <p className="text-xs font-medium text-gray-900">Contact Us</p>
              <p className="mt-1 text-xs text-gray-500">
                For any queries regarding this disclaimer, please contact us at{' '}
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
                This disclaimer is provided as general content for website use and does not constitute legal advice.
                VJR Estate is strongly advised to have this document reviewed and finalized by a qualified lawyer
                licensed in India before publishing, to ensure it fully complies with applicable real estate, consumer
                protection, and RERA regulations in your state.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
