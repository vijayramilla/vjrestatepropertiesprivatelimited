import { motion } from 'framer-motion';
import { MapPin, MessageCircle, Mail, Clock, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/liquid-glass-button';
import { siteContact } from '@/data/siteContact';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white pt-[72px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-black px-4 py-10 md:px-8 md:py-14 lg:px-16"
      >
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16">
          <p className="mb-3 text-xs uppercase tracking-[0.15em] text-gray-400 md:text-sm">
            GET IN TOUCH
          </p>
          <h1 className="font-display text-3xl leading-tight text-white md:text-5xl lg:text-6xl">
            Contact Us
          </h1>
        </div>
      </motion.div>

      <div className="w-full px-4 py-10 md:px-8 md:py-16 lg:px-12 xl:px-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl"
        >
          <h2 className="font-display text-3xl leading-tight tracking-[-0.03em] text-black md:text-5xl lg:text-6xl">
            Let&apos;s Talk
          </h2>
          <div className="mt-[34px] space-y-6">
            <div className="flex items-start gap-4">
              <MapPin size={20} className="mt-1 flex-shrink-0 text-black" />
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.15em] text-gray-400">Office</p>
                <p className="text-[16px] leading-relaxed text-black">{siteContact.address}</p>
                <a
                  href={siteContact.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hoverable mt-2 inline-block text-[14px] text-gray-600 underline underline-offset-2 transition-colors hover:text-black"
                >
                  View on Google Maps →
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone size={20} className="mt-1 flex-shrink-0 text-black" />
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.15em] text-gray-400">Call Us</p>
                <a
                  href={`tel:${siteContact.phoneTel}`}
                  className="hoverable text-[16px] text-black transition-colors hover:text-gray-600"
                >
                  {siteContact.phoneDisplay}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MessageCircle size={20} className="mt-1 flex-shrink-0 text-black" />
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.15em] text-gray-400">WhatsApp</p>
                <a
                  href={siteContact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hoverable text-[16px] text-black transition-colors hover:text-gray-600"
                >
                  {siteContact.phoneDisplay}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Mail size={20} className="mt-1 flex-shrink-0 text-black" />
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.15em] text-gray-400">Email Us</p>
                <a
                  href={`mailto:${siteContact.email}`}
                  className="hoverable text-[16px] text-black transition-colors hover:text-gray-600"
                >
                  {siteContact.email}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock size={20} className="mt-1 flex-shrink-0 text-black" />
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.15em] text-gray-400">Office Hours</p>
                <p className="text-[16px] text-black">{siteContact.hoursLabel}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <section className="bg-black py-[55px]">
        <div className="w-full px-4 text-center md:px-8 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-6 text-[18px] text-white">
              Looking to sell your property? We connect sellers with serious buyers.
            </p>
            <Button
              asChild
              variant="outline"
              className="h-auto border-white bg-transparent px-8 py-3 text-[13px] uppercase tracking-[0.1em] text-white hover:bg-white hover:text-black"
            >
              <Link to="/submit-requirement">Submit Your Property</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
