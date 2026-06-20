import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, MessageCircle, Mail, Clock, Phone, ChevronDown, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/liquid-glass-button';
import { siteContact } from '@/data/siteContact';

const propertyTypes = ['PG Building', 'Residential Rental Income', 'Commercial Properties', 'Plot - Residential', 'Plot - Commercial'];

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', propertyType: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-white min-h-screen pt-[72px]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-black py-10 md:py-14 px-4 md:px-8 lg:px-16">
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16">
          <p className="text-gray-400 text-xs md:text-sm uppercase tracking-[0.15em] mb-3">GET IN TOUCH</p>
          <h1 className="font-display text-white text-3xl md:text-5xl lg:text-6xl leading-tight">Contact Us</h1>
        </div>
      </motion.div>
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 py-10 md:py-16 lg:py-24">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="lg:w-[61.8%]">
            <h2 className="font-display text-black text-3xl md:text-5xl lg:text-6xl leading-tight tracking-[-0.03em]">Let's Talk</h2>
            <div className="mt-[34px] space-y-6">
              <div className="flex items-start gap-4">
                <MapPin size={20} className="text-black mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-[11px] uppercase tracking-[0.15em] mb-1">Office</p>
                  <p className="text-black text-[16px] leading-relaxed">{siteContact.address}</p>
                  <a
                    href={siteContact.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hoverable mt-2 inline-block text-[14px] text-gray-600 underline underline-offset-2 hover:text-black transition-colors"
                  >
                    View on Google Maps →
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone size={20} className="text-black mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-[11px] uppercase tracking-[0.15em] mb-1">Call Us</p>
                  <a href={`tel:${siteContact.phoneTel}`} className="hoverable text-black text-[16px] hover:text-gray-600 transition-colors">
                    {siteContact.phoneDisplay}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MessageCircle size={20} className="text-black mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-[11px] uppercase tracking-[0.15em] mb-1">WhatsApp</p>
                  <a
                    href={siteContact.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hoverable text-black text-[16px] hover:text-gray-600 transition-colors"
                  >
                    {siteContact.phoneDisplay}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail size={20} className="text-black mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-[11px] uppercase tracking-[0.15em] mb-1">Email Us</p>
                  <a href={`mailto:${siteContact.email}`} className="hoverable text-black text-[16px] hover:text-gray-600 transition-colors">
                    {siteContact.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock size={20} className="text-black mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-[11px] uppercase tracking-[0.15em] mb-1">Office Hours</p>
                  <p className="text-black text-[16px]">{siteContact.hoursLabel}</p>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="lg:w-[38.2%]">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-gray-400 text-[11px] uppercase tracking-[0.15em] mb-6">Send a Message</h3>
                <div className="floating-input">
                  <input type="text" id="name" required placeholder=" " value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="peer" />
                  <label htmlFor="name">Full Name</label>
                </div>
                <div className="floating-input">
                  <input type="tel" id="phone" required placeholder=" " value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="peer" />
                  <label htmlFor="phone">Phone Number</label>
                </div>
                <div className="floating-input">
                  <input type="email" id="email" required placeholder=" " value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="peer" />
                  <label htmlFor="email">Email</label>
                </div>
                <div className="relative">
                  <select value={formData.propertyType} onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })} className="w-full px-0 py-3 border-0 border-b-1 border-black bg-transparent text-[16px] focus:outline-none appearance-none cursor-pointer">
                    <option value="" disabled>Property Interested In</option>
                    {propertyTypes.map((type) => (<option key={type} value={type} className="bg-white text-black">{type}</option>))}
                  </select>
                  <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="floating-input">
                  <textarea id="message" rows={4} placeholder=" " value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="peer resize-none" />
                  <label htmlFor="message">Message</label>
                </div>
                <Button type="submit" variant="cool" className="w-full py-4 h-auto text-[13px] uppercase tracking-[0.1em]">
                  Submit
                </Button>
              </form>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="text-center py-[55px]">
                <div className="w-16 h-16 mx-auto mb-[34px] border-2 border-black rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-black" />
                </div>
                <h3 className="font-display text-[26px] text-black mb-[13px]">Thank You!</h3>
                <p className="text-gray-600 text-[16px] leading-relaxed">Our team will contact you within 24 hours.</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
      <section className="bg-black py-[55px]">
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-white text-[18px] mb-6">Looking to sell your property? We connect sellers with serious buyers.</p>
            <Button asChild variant="outline" className="px-8 py-3 h-auto text-[13px] uppercase tracking-[0.1em] border-white text-white hover:bg-white hover:text-black bg-transparent">
              <Link to="/submit-requirement">Submit Your Property</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
