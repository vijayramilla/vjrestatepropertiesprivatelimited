import { Link } from 'react-router-dom';
import { Instagram, Linkedin, MessageCircle, Youtube } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { siteContact } from '@/data/siteContact';


const footerConfig = {
  description:
    'VJR Estate connects investors with rental income properties across Bangalore — PG buildings, residential blocks, commercial assets, and plots with documented monthly returns.',
  contact: siteContact,
  socials: [
    { icon: MessageCircle, href: siteContact.whatsappUrl, label: 'WhatsApp' },
    { icon: Instagram, href: siteContact.social.instagram, label: 'Instagram' },
    { icon: Linkedin, href: siteContact.social.linkedin, label: 'LinkedIn' },
    { icon: Youtube, href: siteContact.social.youtube, label: 'YouTube' },
  ],
  columns: [
    {
      title: 'Company',
      links: [
        { label: 'About Us', to: '/about' },
        { label: 'Blog', to: '/blog' },
        { label: 'Contact', to: '/contact' },
        { label: 'Submit Requirement', to: '/submit-requirement' },
        { label: 'Requirements', to: '/requirements' },
        { label: 'Careers', to: '/careers' },
        { label: 'Our Team', to: '/about' },
      ],
    },
    {
      title: 'Properties',
      links: [
        { label: 'All Properties', to: '/properties' },
        { label: 'PG Buildings', to: '/properties?type=PG%20Buildings' },
        { label: 'Residential', to: '/properties?type=Residential%20Rental%20Income' },
        { label: 'Commercial', to: '/properties?type=Commercial%20Properties' },
        { label: 'Plots', to: '/properties?type=Residential%20Plot' },
      ],
    },
    {
      title: 'Explore',
      links: [
        { label: 'Shortlist', to: '/shortlist' },
        { label: 'Latest Listings', to: '/properties' },
        { label: 'Investment Guide', to: '/about' },
        { label: 'Bangalore Land Investment Guide', to: '/bangalore-land-investment-guide' },
        { label: 'Bangalore Areas', to: '/properties' },
        // { label: 'AR Video', to: '/ar-video' },
      ],
    },
    {
      title: 'Tools & Resources',
      links: [
        { label: 'AI Property Valuation', to: '/property-valuation' },
        { label: 'Vastu Calculator', to: '/vastu-calculator' },
        { label: 'EMI Calculator', to: '/emi-calculator' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'WhatsApp Enquiry', href: siteContact.whatsappUrl },
        { label: 'Call Us', href: `tel:${siteContact.phoneTel}` },
        { label: 'Email Us', href: `mailto:${siteContact.email}` },
        { label: 'Office Location', href: siteContact.mapsUrl },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: siteContact.privacyUrl },
        { label: 'Terms & Conditions', href: siteContact.termsUrl },
        { label: 'CIN Disclosure', to: '/about' },
      ],
    },
  ],
  quickLinks: [
    { label: 'Blog', to: '/blog' },
    { label: 'Browse Properties', to: '/properties' },
    { label: 'Submit Requirement', to: '/submit-requirement' },
    { label: 'Requirements', to: '/requirements' },
    { label: 'About VJR Estate', to: '/about' },
    { label: 'Careers', to: '/careers' },
    { label: 'Contact Team', to: '/contact' },
    { label: 'Your Shortlist', to: '/shortlist' },
  ],
};

type FooterLink = { label: string; to?: string; href?: string };

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className =
    'text-[0.85rem] text-gray-600 hover:text-black transition-colors';

  if (link.href) {
    return (
      <a
        href={link.href}
        target={link.href.startsWith('http') ? '_blank' : undefined}
        rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={className}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link to={link.to ?? '/'} className={className}>
      {link.label}
    </Link>
  );
}

export default function Footer() {
  const { contact } = footerConfig;

  return (
    <footer className="w-full bg-white text-black px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-14 border-t border-gray-200">
      <div className="w-full">
        <div className="mb-12">
          <Link to="/" className="inline-block mb-6">
            <span className="font-serif text-[28px] text-black tracking-[-0.02em]">VJR Estate</span>
          </Link>
          <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">{footerConfig.description}</p>
          <a
            href={contact.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-sm text-gray-500 hover:text-black transition-colors"
          >
            {contact.address}
          </a>
          <p className="mt-1 text-sm text-gray-400">{contact.hoursLabel}</p>
        </div>

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-12">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-8 flex-1">
            {footerConfig.columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-medium mb-3 text-black">{col.title}</h3>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <FooterLinkItem link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="lg:w-1/4">
            <Card className="shadow-none border-none bg-transparent text-black mb-4">
              <CardContent className="p-0 space-y-3">
                <p className="text-sm font-medium text-black">For Investors & Sellers</p>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-gray-300 bg-gray-100 text-gray-700 hover:bg-black hover:text-white hover:border-black"
                >
                  <Link to="/contact">Get In Touch</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-none border-none bg-transparent text-black mb-4">
              <CardContent className="p-0">
                <p className="text-sm font-medium mb-3 text-black">Quick Links</p>
                <div className="space-y-2">
                  {footerConfig.quickLinks.map((link) => (
                    <Link
                      key={link.label}
                      to={link.to}
                      className="block text-sm text-gray-600 hover:text-black transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium mb-2 text-black">Follow Us</p>
                  <div className="flex gap-3">
                    {footerConfig.socials.map(({ icon: Icon, href, label }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="text-gray-500 hover:text-black transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-sm text-gray-500">
                  <a href={`mailto:${contact.email}`} className="block hover:text-black transition-colors">
                    {contact.email}
                  </a>
                  <a href={`tel:${contact.phoneTel}`} className="block hover:text-black transition-colors">
                    {contact.phoneDisplay}
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-12 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-4 border-t border-gray-200">
          <p>© {new Date().getFullYear()} VJR Estate Properties Private Limited. All rights reserved.</p>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <span className="uppercase tracking-[0.1em]">CIN: U68100KA2025PTC209772</span>
            <div className="flex gap-6">
              <a
                href={contact.privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-black transition-colors"
              >
                Privacy
              </a>
              <a
                href={contact.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-black transition-colors"
              >
                Terms
              </a>
              <Link to="/properties" className="hover:text-black transition-colors">
                Properties
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
