import Navbar from '@/components/Navbar';

const sections = [
  {
    title: '1. Platform Role',
    content:
      'VJR Estate is a marketplace platform that connects property sellers with potential buyers. We do not own, manage, control, inspect, or endorse any property listed on our platform. Our role is strictly limited to providing an online venue where users can list and discover properties. We are not a real estate broker, agent, or advisor.',
  },
  {
    title: '2. No Involvement in Transactions',
    content:
      'VJR Estate is not a party to any transaction, negotiation, agreement, or exchange between property sellers and buyers. All financial transactions, legal documentation, due diligence, property inspections, and negotiations are conducted solely between the parties involved. VJR Estate does not collect commissions, process payments, or facilitate any monetary transfers related to property transactions.',
  },
  {
    title: '3. No Liability for Listings or Content',
    content:
      'All property listings, descriptions, photographs, pricing, and other content are provided directly by the users who list them. VJR Estate does not verify the accuracy, completeness, legality, or authenticity of any listing or user-provided content. We expressly disclaim any and all liability for inaccurate, misleading, fraudulent, or incomplete information in any listing. Buyers and sellers are solely responsible for conducting their own due diligence.',
  },
  {
    title: '4. No Liability for Disputes, Fraud, or Damages',
    content:
      'To the maximum extent permitted by law, VJR Estate, its owners, employees, affiliates, and partners shall not be held liable for any disputes, claims, losses, damages (direct, indirect, incidental, or consequential), fraud, misrepresentation, personal injury, property damage, or financial loss arising from or related to: (a) any property listed on the platform, (b) any communication or interaction between users, (c) any transaction or attempted transaction, (d) any third-party conduct, or (e) your use of the platform.',
  },
  {
    title: '5. User Responsibility',
    content:
      'By listing a property on VJR Estate, you expressly acknowledge and agree that: (a) you are solely responsible for the accuracy and legality of your listing, (b) you are solely responsible for all commitments, representations, and promises made to potential buyers, (c) you are responsible for complying with all applicable laws, regulations, and disclosure requirements, (d) any dispute with a buyer is solely between you and the buyer, and (e) VJR Estate has no obligation to intervene in or resolve any dispute.',
  },
  {
    title: '6. Indemnification',
    content:
      'You agree to indemnify, defend, and hold harmless VJR Estate, its owners, directors, employees, agents, and affiliates from and against any and all claims, damages, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to: (a) your property listing or content, (b) your use of the platform, (c) your violation of these terms, (d) your violation of any law or third-party right, or (e) any dispute between you and another user.',
  },
  {
    title: '7. Information We Collect',
    content:
      'When you use VJR Estate, we may collect the following information: (a) account information — name, email address, phone number, and profile details when you sign in with Google, (b) listing information — property details, photos, location data, pricing, and descriptions you provide, (c) enquiry information — when you contact a seller, we collect your name, phone number, and any message you send, (d) location data — with your permission, we may collect your precise geolocation to improve search results and enable location-based features, (e) usage data — pages visited, interactions, and browsing behavior on our platform.',
  },
  {
    title: '8. How We Use Your Information',
    content:
      'We use the information we collect to: (a) display your property listings on the platform, (b) connect buyers with sellers by sharing contact details when an enquiry is made, (c) improve and personalize the platform experience, (d) communicate with you about your listings, enquiries, and platform updates, (e) analyze usage patterns to improve our services, (f) comply with legal obligations and enforce our terms.',
  },
  {
    title: '9. Information Sharing',
    content:
      'We may share your information in the following circumstances: (a) with potential buyers — when a buyer enquires about your property, we share your contact name and phone number to enable direct communication, (b) with service providers — we may share data with third-party service providers who help us operate the platform (e.g., hosting, analytics, map services), (c) legal compliance — we may disclose information if required by law, court order, or government regulation, (d) business transfers — in the event of a merger, acquisition, or sale of assets, user information may be transferred.',
  },
  {
    title: '10. Cookies & Tracking',
    content:
      'VJR Estate uses cookies and similar tracking technologies to improve platform functionality, analyze usage, and personalize your experience. You can control cookie preferences through your browser settings. Third-party services such as Google Analytics and Google Maps may also set cookies. By using the platform, you consent to the use of cookies in accordance with this policy.',
  },
  {
    title: '11. Data Security',
    content:
      'We implement reasonable security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security of your data.',
  },
  {
    title: '12. Your Rights',
    content:
      'You have the right to: (a) access, update, or delete your personal information, (b) withdraw consent at any time where we rely on your consent to process your data, (c) object to the processing of your data for marketing purposes, (d) request a copy of the data we hold about you. To exercise these rights, contact us at info@vjrestate.com.',
  },
  {
    title: '13. Acceptance of Terms',
    content:
      'By listing a property on VJR Estate, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy and all terms stated herein. You expressly accept that VJR Estate is a platform only and bears no responsibility for any property, transaction, dispute, or loss. If you do not agree with any part of this policy, you must not use the platform or list any property.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white">
      <Navbar />
      <div className="pt-14 md:pt-16">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Legal
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Privacy Policy & Terms
            </h1>
            <p className="mt-3 text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
              Last updated: July 2026
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-gray-200/70 bg-white shadow-sm p-8 sm:p-10 space-y-8">
            <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white px-5 py-4">
              <p className="text-xs font-semibold text-amber-800">⚠ Important Disclaimer</p>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                VJR Estate is strictly a platform for listing and discovering properties. We are not involved in any
                transaction, do not verify any listing, and are not responsible for any disputes, fraud, or loss.
                By using this platform, you accept all terms stated in this policy.
              </p>
            </div>

            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="text-sm font-semibold text-gray-900">{s.title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">{s.content}</p>
              </div>
            ))}

            <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-5 py-4">
              <p className="text-xs font-medium text-gray-900">Contact Us</p>
              <p className="mt-1 text-xs text-gray-500">
                For questions about this policy, contact us at{' '}
                <a href="mailto:info@vjrestate.com" className="font-medium text-gray-900 underline underline-offset-2">
                  info@vjrestate.com
                </a>
                {' '}or visit{' '}
                <a href="https://vjrestate.com/contact" className="font-medium text-gray-900 underline underline-offset-2">
                  vjrestate.com/contact
                </a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
