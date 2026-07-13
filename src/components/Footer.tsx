import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { siteContact } from '@/data/siteContact';

const quickLinks = [
  { name: 'Home', path: '/' },
  { name: 'Properties', path: '/properties' },
  { name: 'Blog', path: '/blog' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12" style={{ gridTemplateColumns: '38.2% 23.6% 38.2%' }}>
          <div className="space-y-6">
            <h2 className="font-display text-[28px] text-white" style={{ letterSpacing: '-0.02em' }}>VJR Estate</h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">Buy verified rental income properties in Bangalore. Investment opportunities with proven returns.</p>
            <div className="flex gap-4">
              <a href="https://wa.me/918088905957" target="_blank" rel="noopener noreferrer" className="hoverable flex items-center justify-center w-10 h-10 border border-gray-700 text-white transition-colors hover:bg-white hover:text-black">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-[11px] uppercase tracking-[0.15em] text-gray-400">Quick Links</h3>
            <div className="flex flex-col gap-3">
              {quickLinks.map((link) => (
                <Link key={link.path} to={link.path} className="hoverable text-white text-[14px] transition-colors hover:text-gray-400">{link.name}</Link>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-[11px] uppercase tracking-[0.15em] text-gray-400">Contact</h3>
            <div className="space-y-4 text-[14px] text-white">
              <p>Koramangala 7th Block<br />Bangalore, Karnataka 560095</p>
              <p>WhatsApp: <a href="https://wa.me/918088905957" target="_blank" rel="noopener noreferrer" className="hoverable transition-colors hover:text-gray-400">+91 8088905957</a></p>
              <p>Email: <a href={`mailto:${siteContact.email}`} className="hoverable transition-colors hover:text-gray-400">{siteContact.email}</a></p>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] text-gray-400">© 2025 VJR Estate Properties Private Limited</p>
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.1em]">CIN: U68100KA2025PTC209772</p>
        </div>
      </div>
    </footer>
  );
}
