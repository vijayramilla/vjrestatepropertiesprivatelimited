import { Link } from 'react-router-dom';
import { siteContact } from '@/data/siteContact';

/**
 * Partner Terms & Conditions (v2026-10) — governs the VJR Estate Partner
 * Programme (Owners, Builders/Developers, Agents/Brokers). Deliberately
 * separate from the website-wide Terms at /terms.
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
    title: '1. Definitions',
    blocks: [
      { type: 'paragraph', text: "In these Partner Terms and Conditions ('Partner Terms'): 'VJR Estate', 'we', 'us' or 'our' means VJR Estate Properties Private Limited, a private limited company registered in Bengaluru, Karnataka (CIN: U68100KA2025PTC209772). 'Partner' means an Owner, Builder/Developer or Agent/Broker accepted into the VJR Estate Partner Programme. 'Platform' means vjrestate.com and related partner tools and dashboards. 'Listing' means any property or project content submitted by a Partner for publication. 'Enquiry' or 'Lead' means a buyer, investor or tenant introduction generated through the Platform or our marketing channels. 'Successful Transaction' means a sale or lease/rental transaction facilitated through VJR Estate that is reported and confirmed in accordance with Section 19." },
      { type: 'paragraph', text: "'Transaction Value' means, for a sale, the agreed property sale consideration recorded in the transaction, excluding statutory taxes, stamp duty, registration charges and other government levies unless a written commercial agreement between the Partner and VJR Estate states otherwise. For a lease or rental transaction, the applicable fee basis is the separately defined brokerage/facilitation fee set out in the applicable Partner Commercial Terms, rather than a percentage of the lease consideration, unless expressly agreed otherwise in writing." },
      { type: 'paragraph', text: "'Net Partnership Revenue' means the agreed transaction-based commission, referral, facilitation or service revenue actually received by VJR Estate in respect of a Successful Transaction, excluding GST and other statutory taxes, unless otherwise agreed in writing." },
    ],
  },
  {
    title: '2. Eligibility',
    blocks: [
      { type: 'paragraph', text: 'Partnership is open to individuals and entities that are at least 18 years of age, are legally competent to contract, and either own the property they wish to list, are authorised by the owner to market it, or hold a valid mandate or lawful authority as a Builder/Developer or Agent/Broker. VJR Estate may decline, suspend or revoke partnership at its discretion, including where eligibility, identity or authority cannot reasonably be established.' },
    ],
  },
  {
    title: '3. Partner Registration and Account',
    blocks: [
      { type: 'paragraph', text: 'Registration involves selecting a partner type, verifying an email address through Google authentication, providing contact details, completing a partner profile, and accepting these Partner Terms and the Partner Privacy Policy. Mobile number verification by one-time password (OTP) may be introduced and required before publication of listings. You must keep your registration information accurate and current. One partner account applies per person or entity; you must not register multiple accounts to circumvent moderation or commercial terms.' },
    ],
  },
  {
    title: '4. Nature of the VJR Estate Platform',
    blocks: [
      { type: 'paragraph', text: 'VJR Estate operates a property listing, marketing, lead-generation and facilitation platform. VJR Estate is not the owner, developer, promoter or agent of record for any listed property, is not a party to any agreement executed between buyers, tenants and Partners, and does not handle transaction payments between those parties.' },
      { type: 'paragraph', text: 'VJR Estate does not guarantee enquiries, leads, sales, leases, transaction completion, returns, approvals or outcomes of any kind. Nothing on the Platform constitutes legal, title, investment or valuation advice. Registration as a Partner does not by itself constitute registration under the Real Estate (Regulation and Development) Act, 2016 (RERA) or any approval by any government or statutory authority.' },
    ],
  },
  {
    title: '5. Owner Obligations',
    blocks: [
      { type: 'paragraph', text: 'Owners listing property on the Platform confirm and undertake that they:', },
      { type: 'bullets', items: [
        'are the owner of the property or hold valid authority or mandate from the owner to advertise and facilitate the transaction',
        'provide accurate information regarding title, encumbrances, approvals, measurements, occupancy, pricing and availability',
        'will independently honour the ownership/authority declaration made at registration for every listed property',
        'will promptly update or withdraw listings that are sold, leased, withdrawn or otherwise no longer available',
        'will report Successful Transactions in accordance with Section 19 and pay the applicable Owner service charge under Section 16',
      ] },
    ],
  },
  {
    title: '6. Builder/Developer Obligations',
    blocks: [
      { type: 'paragraph', text: 'Builders and Developers listing projects or inventory on the Platform confirm and undertake that they:', },
      { type: 'bullets', items: [
        'hold valid rights to market the projects and inventory listed, and will provide the project RERA registration number where the project is required by law to be registered under RERA',
        'provide accurate project information including inventory, pricing, possession status, approvals and location',
        'will not misrepresent construction stage, approvals, amenities or delivery timelines',
        'will report Successful Transactions in accordance with Section 19 and honour the 50:50 revenue share under Section 17',
      ] },
    ],
  },
  {
    title: '7. Agent/Broker Obligations',
    blocks: [
      { type: 'paragraph', text: 'Agents and Brokers listing property on the Platform confirm and undertake that they:', },
      { type: 'bullets', items: [
        'hold a valid mandate or lawful authority from the owner or developer for every property listed',
        'hold a valid RERA agent registration where legally applicable to their activity and will provide its number and status',
        'will not list property without authority, and will promptly evidence mandates on request',
        'will report Successful Transactions in accordance with Section 19 and honour the 50:50 revenue share under Section 18',
      ] },
    ],
  },
  {
    title: '8. Listing Requirements',
    blocks: [
      { type: 'paragraph', text: 'Every Listing must include, at minimum: property type; transaction type (for sale, for rent or for lease); location and locality; address or indicative location; price or rent; description; area; and a genuine authority declaration. Where applicable, Listings must also include floor details, bedrooms/rooms, parking, amenities, images, video content, contact/lead preferences and RERA information. Listings must comply with these Partner Terms and with our listing guidelines as updated from time to time.' },
    ],
  },
  {
    title: '9. Property Information Accuracy',
    blocks: [
      { type: 'paragraph', text: 'All property information published on the Platform is provided by the Partner. The Partner is solely responsible for the accuracy, completeness and currency of the information, images and other content in its Listings. VJR Estate may independently verify selected information and may require supporting documents. Where a Listing displays a verification badge, the badge reflects only the verification status described on the Platform and is not a warranty of title, quality, legality or transaction suitability.' },
    ],
  },
  {
    title: '10. RERA Compliance',
    blocks: [
      { type: 'paragraph', text: "Where a project or activity is required under RERA to be registered, the Partner must provide the relevant RERA registration number before the applicable Listing is published. Agents must provide their RERA agent registration number where legally applicable. RERA details displayed on the Platform are provided by the Partner and their display does not imply that VJR Estate has validated or endorsed them, unless expressly stated as independently verified. Registration on the Platform does not constitute RERA registration or approval." },
    ],
  },
  {
    title: '11. Prohibited Listings',
    blocks: [
      { type: 'paragraph', text: 'You must not list or submit:', },
      { type: 'bullets', items: [
        'property for which you lack ownership, authority or a valid mandate',
        'property whose sale, marketing or development is prohibited by law or violates RERA requirements',
        'listings with false, misleading or exaggerated information, images of other properties, or manipulated media',
        'listings intended to defraud, harvest buyer data, or divert users to other platforms',
        'content that is unlawful, defamatory, infringing or otherwise objectionable',
      ] },
    ],
  },
  {
    title: '12. Verification and Moderation',
    blocks: [
      { type: 'paragraph', text: 'Listings may be subject to review before publication and periodically thereafter. Verification statuses used on the Platform include: Partner Verified (the Partner account has passed registration checks); RERA Details Verified (the stated RERA number has been checked by VJR Estate against the applicable RERA register); Owner/Authority Declared (the Partner has made the ownership/authority declaration for the Listing); Property Details Verified (selected listing details have been independently checked by VJR Estate); and Pending Verification (not yet checked). Each badge means only what its description states; no badge is a guarantee of title, legality, quality or outcome.' },
    ],
  },
  {
    title: '13. Listing Suspension and Removal',
    blocks: [
      { type: 'paragraph', text: 'VJR Estate may edit, suspend, reject or remove any Listing, with or without notice, where it breaches these Partner Terms, is the subject of a complaint or dispute, cannot be verified after reasonable attempts, or where suspension or removal is otherwise reasonably necessary to protect users or the Platform. Rejected Listings may be corrected and resubmitted where the underlying issue is resolved.' },
    ],
  },
  {
    title: '14. Lead Generation and Attribution',
    blocks: [
      { type: 'paragraph', text: 'Enquiries generated through the Platform or VJR Estate marketing channels are recorded with a lead identifier, the related property and partner, source, date and time, lead status and subsequent activity. Subject to any final executed partnership agreement, a lead introduced by VJR Estate is attributed to VJR Estate for a default attribution period of twelve (12) months from the date of introduction. Enquiries or transactions arising from that attributed lead within the attribution period, including through repeat or follow-on engagement by the same buyer or tenant, remain subject to the applicable service charge or revenue share.' },
    ],
  },
  {
    title: '15. Anti-Circumvention',
    blocks: [
      { type: 'paragraph', text: 'In respect of a lead that VJR Estate has generated, introduced or materially facilitated, the Partner must not intentionally bypass VJR Estate — including by directly contracting, diverting or re-structuring the introduction — in order to avoid the applicable service charge or revenue-share obligation during the attribution period set out in Section 14. This clause applies only to VJR Estate-generated or introduced leads and the applicable attribution period; it does not restrict Partners from sourcing, marketing or closing business independently of the Platform.' },
    ],
  },
  {
    title: '16. Owner Service Charge',
    blocks: [
      { type: 'paragraph', text: 'Listing property as an Owner is free: there is zero listing fee and zero subscription fee. For a Successful Transaction that is a sale facilitated through VJR Estate, the Owner service charge is one per cent (1%) of the applicable Transaction Value, as defined in Section 1. For lease or rental transactions, the applicable brokerage/facilitation fee is the separately defined fee set out in the applicable Partner Commercial Terms, and is not calculated as a percentage of the lease consideration unless expressly agreed otherwise in writing.' },
      { type: 'paragraph', text: 'The precise calculation of the Transaction Value, the payment trigger, the attribution period and applicable taxes for a given engagement are as stated in the Partner Commercial Terms accepted for that engagement, which form part of these Partner Terms.' },
    ],
  },
  {
    title: '17. Builder/Developer 50:50 Revenue Share',
    blocks: [
      { type: 'paragraph', text: 'For Builders and Developers, there is zero listing fee and zero subscription fee. For each applicable Successful Transaction facilitated through VJR Estate, the partnership revenue share is 50:50 — fifty per cent (50%) of the Net Partnership Revenue to VJR Estate and fifty per cent (50%) to the Builder/Developer. The 50:50 split applies to the agreed transaction-based commission, referral, facilitation or service revenue actually received by VJR Estate, and expressly does not apply to the property sale price or the gross consideration paid by the buyer.' },
    ],
  },
  {
    title: '18. Agent/Broker 50:50 Revenue Share',
    blocks: [
      { type: 'paragraph', text: 'For Agents and Brokers, there is zero listing fee and zero subscription fee. For each applicable Successful Transaction facilitated through VJR Estate, the partnership revenue share is 50:50 — fifty per cent (50%) of the Net Partnership Revenue to VJR Estate and fifty per cent (50%) to the Agent/Broker. The 50:50 split applies to the agreed transaction-based commission, referral, facilitation or service revenue actually received by VJR Estate, and expressly does not apply to the property sale price.' },
    ],
  },
  {
    title: '19. Transaction Closure Reporting',
    blocks: [
      { type: 'paragraph', text: 'The Partner must report to VJR Estate, within seven (7) days of execution, any Successful Transaction arising from a lead attributed to VJR Estate under Section 14, including the parties, the property, the Transaction Value or lease fee basis, and the execution date. VJR Estate may request reasonable supporting documents (such as the executed agreement or token/allotment confirmation) to confirm the closure and compute the applicable amount. Failure to report, or material misreporting, is a material breach of these Partner Terms.' },
    ],
  },
  {
    title: '20. Payment Terms',
    blocks: [
      { type: 'paragraph', text: 'Amounts payable by the Partner (Owner service charge or the VJR Estate share of Net Partnership Revenue) become due upon the payment trigger stated in the applicable Partner Commercial Terms and, absent such a statement, within fifteen (15) days of the earlier of invoice or written demand following confirmed closure. VJR Estate will issue a statement or invoice for each amount due. Amounts unpaid after the due date may attract interest at eighteen per cent (18%) per annum, and unpaid amounts may result in suspension of the Partner account and Listings until cleared.' },
    ],
  },
  {
    title: '21. Taxes and GST',
    blocks: [
      { type: 'paragraph', text: 'Service charges and revenue shares are stated exclusive of GST and other applicable taxes unless expressly stated otherwise. Where VJR Estate is required to charge GST on its services, such GST will be added to the applicable amount and is payable by the Partner in addition. Each party is responsible for its own tax obligations arising from transactions with buyers, tenants or third parties.' },
    ],
  },
  {
    title: '22. Partner Records and Documents',
    blocks: [
      { type: 'paragraph', text: 'VJR Estate may request and retain records reasonably necessary to operate the Partner Programme, including identity and authorisation records, mandates, RERA registrations, company information, listing content, lead and attribution records, transaction closure reports and consent records. Documents shared with VJR Estate are used for verification, moderation and compliance purposes only, are access-controlled within VJR Estate, and are not displayed publicly or shared with third parties except as described in the Partner Privacy Policy or as required by law.' },
    ],
  },
  {
    title: '23. Intellectual Property; Listing Content Licence',
    blocks: [
      { type: 'paragraph', text: 'As between the parties, the Partner retains ownership of the property images, descriptions, videos and other content it submits ("Listing Content"). The Partner grants VJR Estate a non-exclusive, worldwide, royalty-free licence to host, reproduce, adapt, publish and distribute the Listing Content on the Platform and in VJR Estate marketing channels for the purpose of operating the Platform and generating enquiries, for as long as the relevant Listing is published or, in the case of marketing materials already produced, until the Partner withdraws the Listing and reasonable propagation ceases. The Partner confirms it holds the necessary rights to grant this licence for all Listing Content. All Platform software, design, brand assets and content created by VJR Estate remain the property of VJR Estate.' },
    ],
  },
  {
    title: '24. Privacy and Data Processing',
    blocks: [
      { type: 'paragraph', text: 'Personal data collected from Partners and from enquiries is processed in accordance with the Partner Privacy Policy, which forms part of these Partner Terms, and applicable Indian law including the Digital Personal Data Protection Act, 2023. Consent records — including the terms version accepted, timestamps and related metadata — are retained as described in that policy.' },
    ],
  },
  {
    title: '25. Confidentiality',
    blocks: [
      { type: 'paragraph', text: 'Each party will keep confidential non-public information disclosed by the other in connection with the Partner Programme — including commercial terms, lead data and transaction information — and use it only for the purposes of the Programme, except where disclosure is required by law, ordered by a court or authority, or made to professional advisers under equivalent confidentiality obligations.' },
    ],
  },
  {
    title: '26. Limitation of Liability',
    blocks: [
      { type: 'paragraph', text: 'To the maximum extent permitted by law, VJR Estate is not liable for any indirect, incidental, special or consequential loss, including loss of profit, business, goodwill or data, arising from or in connection with these Partner Terms or the Platform. VJR Estate\'s total aggregate liability under these Partner Terms is limited to the net service charges and revenue shares actually received by VJR Estate from the Partner in the three (3) months preceding the event giving rise to the claim. Nothing in this section limits liability that cannot be limited by law.' },
    ],
  },
  {
    title: '27. Indemnification',
    blocks: [
      { type: 'paragraph', text: 'The Partner will indemnify and hold harmless VJR Estate, its directors, employees and agents from and against claims, demands, losses, liabilities, damages and reasonable costs (including legal costs) arising from: (a) the Partner\'s breach of these Partner Terms; (b) the inaccuracy of Listing Content or partner-provided information; (c) the Partner\'s lack of ownership, authority or mandate; (d) any violation of RERA or other applicable law by the Partner; or (e) disputes between the Partner and buyers, tenants, owners or third parties.' },
    ],
  },
  {
    title: '28. Suspension and Termination',
    blocks: [
      { type: 'paragraph', text: 'Either party may terminate the partnership at any time with written notice. VJR Estate may suspend or terminate a Partner account with immediate effect where: the Partner materially breaches these Partner Terms; verification cannot be completed; fraudulent, abusive or unlawful conduct is identified; amounts due remain unpaid after notice; or continuation would expose users or VJR Estate to legal or reputational risk.' },
    ],
  },
  {
    title: '29. Effect of Termination',
    blocks: [
      { type: 'paragraph', text: 'On termination, the Partner\'s Listings are unpublished and dashboard access ceases. Sections and obligations which by their nature survive termination — including lead attribution and anti-circumvention for the applicable attribution period, transaction closure reporting and payment obligations for transactions arising from attributed leads introduced before termination, confidentiality, intellectual property, limitation of liability, indemnification, dispute resolution and governing law — continue in force.' },
    ],
  },
  {
    title: '30. Dispute Resolution; Governing Law; Jurisdiction',
    blocks: [
      { type: 'paragraph', text: 'The parties will first attempt to resolve any dispute arising from or in connection with these Partner Terms in good faith through discussion for a period of thirty (30) days from written notice of the dispute. These Partner Terms are governed by the laws of India. Subject to that good-faith process, the courts at Bengaluru, Karnataka have exclusive jurisdiction.' },
    ],
  },
  {
    title: '31. Amendments and Versioning',
    blocks: [
      { type: 'paragraph', text: 'These Partner Terms are versioned. Material changes will be notified through the Platform or by email and take effect on the stated date. Where commercial terms change, the Partner\'s acceptance of the new version will be required before the new terms are applied to transactions occurring after acceptance; transactions already covered by an accepted version remain governed by that version.' },
    ],
  },
  {
    title: '32. Electronic Acceptance',
    blocks: [
      { type: 'paragraph', text: 'The Partner agrees that electronic acceptance — including ticking the consent controls at registration and continued use of the Partner dashboard — constitutes valid acceptance of these Partner Terms and the Partner Privacy Policy, and that acceptance records (version, timestamp and related metadata) maintained by VJR Estate are evidence of such acceptance.' },
    ],
  },
  {
    title: '33. Contact',
    blocks: [
      { type: 'paragraph', text: `For questions about these Partner Terms or the Partner Programme, contact VJR Estate Properties Private Limited at ${siteContact.phoneDisplay} or ${siteContact.email}, or visit us at ${siteContact.address}.` },
    ],
  },
];

export default function PartnerTermsPage() {
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
              Partner Terms &amp; Conditions
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
              VJR Estate Properties Private Limited · Version 2026-10 · These Partner Terms govern the VJR Estate Partner Programme and are separate from the{' '}
              <Link to="/terms" className="font-medium text-gray-700 underline underline-offset-2">website Terms &amp; Conditions</Link>.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200/70 bg-white shadow-sm p-8 sm:p-10 space-y-8">
            <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white px-5 py-4">
              <p className="text-xs font-semibold text-amber-800">Important</p>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                VJR Estate operates a property listing, marketing, lead-generation and facilitation platform.
                Property information is provided by Partners and may be subject to verification. Users should
                independently verify title, ownership, approvals, RERA status, encumbrances, measurements,
                pricing, availability and other transaction-specific information before entering into any
                transaction. How partner personal data is handled is described in the{' '}
                <Link to="/partner-privacy" className="font-semibold text-amber-900 underline underline-offset-2">Partner Privacy Policy</Link>.
              </p>
            </div>

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
                This document is provided as general contractual content and does not constitute legal advice,
                nor does it by itself guarantee compliance with the Real Estate (Regulation and Development)
                Act, 2016, the Digital Personal Data Protection Act, 2023 or other applicable law. VJR Estate is
                strongly advised to have these Partner Terms reviewed and finalised by a qualified Indian
                advocate or real-estate lawyer before production use, together with the operative Partner
                Commercial Terms for each Partner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
