import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, MessageCircle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Contact3DCard from '@/components/contact/Contact3DCard';
import Navbar from '@/components/Navbar';
import ContactFloatingOrb from '@/components/contact/ContactFloatingOrb';
import { siteContact } from '@/data/siteContact';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

export default function ContactPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.55], [1, 0.94]);
  const heroY = useTransform(scrollYProgress, [0, 0.55], [0, 80]);

  const contactCards = [
    {
      icon: <Phone size={32} strokeWidth={1.25} className="text-black" />,
      title: 'Call Us',
      content: siteContact.phoneDisplay,
      link: `tel:${siteContact.phoneTel}`,
      delay: 0.1,
    },
    {
      icon: <Mail size={32} strokeWidth={1.25} className="text-black" />,
      title: 'Email Us',
      content: siteContact.email,
      link: `mailto:${siteContact.email}`,
      delay: 0.2,
    },
    {
      icon: <MessageCircle size={32} strokeWidth={1.25} className="text-black" />,
      title: 'WhatsApp',
      content: siteContact.phoneDisplay,
      link: siteContact.whatsappUrl,
      external: true,
      delay: 0.3,
    },
    {
      icon: <MapPin size={32} strokeWidth={1.25} className="text-black" />,
      title: 'Office',
      content: siteContact.address,
      delay: 0.4,
      footer: (
        <a
          href={siteContact.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hoverable inline-flex items-center gap-1.5 text-sm text-black/55 underline-offset-4 transition-colors hover:text-black hover:underline"
          style={{ fontFamily: DM_SANS }}
          onClick={(e) => e.stopPropagation()}
        >
          View on Google Maps
          <ArrowUpRight size={14} />
        </a>
      ),
    },
    {
      icon: <Clock size={32} strokeWidth={1.25} className="text-black" />,
      title: 'Office Hours',
      content: siteContact.hoursLabel,
      delay: 0.5,
    },
  ];

  return (
    <div className="contact-page min-h-screen overflow-hidden bg-white pt-[72px] text-black">
      <Navbar />
      <div className="pointer-events-none fixed inset-0">
        <ContactFloatingOrb
          delay={0}
          className="absolute left-10 top-28 h-64 w-64 rounded-full bg-black blur-3xl"
        />
        <ContactFloatingOrb
          delay={0.5}
          className="absolute right-16 top-44 h-96 w-96 rounded-full bg-black blur-3xl"
        />
        <ContactFloatingOrb
          delay={1}
          className="absolute bottom-24 left-1/3 h-80 w-80 rounded-full bg-black blur-3xl"
        />
      </div>

      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative flex min-h-[calc(100dvh-72px)] items-center justify-center px-4 sm:px-6 md:px-8"
      >
        <div className="mx-auto max-w-7xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.8 }}
              className="mb-6 text-[10px] font-medium uppercase tracking-[0.3em] text-black/45 md:text-xs"
              style={{ fontFamily: DM_SANS }}
            >
              VJR Estate · Get In Touch
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.8 }}
              className="font-display mb-8 text-5xl font-light leading-[1.05] tracking-tight text-black md:text-7xl lg:text-8xl"
            >
              Let&apos;s Talk
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.8 }}
              className="mx-auto max-w-2xl text-base leading-relaxed text-black/55 md:text-lg"
              style={{ fontFamily: DM_SANS }}
            >
              Connect with our Bangalore real estate team for rental income assets, commercial
              properties, plots, and premium investment opportunities.
            </motion.p>
          </motion.div>
        </div>
      </motion.section>

      <section className="relative px-4 py-24 sm:px-6 md:px-8 md:py-32 lg:px-12 xl:px-16">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center md:mb-20"
          >
            <h2 className="font-display mb-5 text-4xl font-light text-black md:text-5xl">
              Contact Us
            </h2>
            <p
              className="mx-auto max-w-2xl text-base text-black/55 md:text-lg"
              style={{ fontFamily: DM_SANS }}
            >
              Reach us by phone, WhatsApp, or email — we respond quickly to every enquiry.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {contactCards.map((card) => (
              <Contact3DCard key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-black/8 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <p
                className="mb-4 text-[10px] font-medium uppercase tracking-[0.22em] text-black/45"
                style={{ fontFamily: DM_SANS }}
              >
                Why VJR Estate
              </p>
              <h3 className="font-display mb-6 text-3xl font-light text-black md:text-4xl">
                Trusted advisors across Bangalore
              </h3>
              <p
                className="mb-6 text-base leading-relaxed text-black/55 md:text-lg"
                style={{ fontFamily: DM_SANS }}
              >
                We specialise in connecting investors and buyers with verified rental buildings,
                commercial assets, residential plots, and agriculture land across Bengaluru.
              </p>
              <p
                className="text-base leading-relaxed text-black/55 md:text-lg"
                style={{ fontFamily: DM_SANS }}
              >
                Whether you are buying, selling, or exploring investment options, our team guides you
                through every step with transparent pricing and on-ground expertise.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: -8 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ perspective: 1200 }}
              className="group relative h-80 overflow-hidden rounded-2xl md:h-96"
            >
              <div className="absolute inset-0 border border-black/10 bg-gradient-to-br from-[#fafafa] via-white to-[#f5f5f5] shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-transform duration-500 group-hover:scale-[1.02]" />
              <div className="relative z-10 flex h-full flex-col justify-between p-8 md:p-10">
                <div>
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-[#fafafa]">
                    <MapPin size={28} strokeWidth={1.25} className="text-black" />
                  </div>
                  <p
                    className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-black/45"
                    style={{ fontFamily: DM_SANS }}
                  >
                    Visit our office
                  </p>
                  <p
                    className="text-lg leading-relaxed text-black md:text-xl"
                    style={{ fontFamily: DM_SANS }}
                  >
                    {siteContact.addressShort}
                  </p>
                  <p
                    className="mt-3 text-sm leading-relaxed text-black/55"
                    style={{ fontFamily: DM_SANS }}
                  >
                    {siteContact.address}
                  </p>
                </div>
                <a
                  href={siteContact.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hoverable inline-flex w-fit items-center gap-2 border border-black/25 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-black transition-colors hover:border-black hover:bg-black hover:text-white"
                  style={{ fontFamily: DM_SANS }}
                >
                  Open in Maps
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-black/8 bg-white px-4 py-24 sm:px-6 md:px-8 md:py-32 lg:px-12 xl:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-display mb-6 text-4xl font-light tracking-tight text-black md:text-6xl lg:text-7xl">
              Ready to begin?
            </h2>
            <p
              className="mb-10 text-lg leading-relaxed text-black/55 md:text-xl"
              style={{ fontFamily: DM_SANS }}
            >
              Looking to sell your property? We connect sellers with serious buyers across
              Bangalore.
            </p>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5"
            >
              <a
                href={`tel:${siteContact.phoneTel}`}
                className="hoverable inline-flex items-center gap-3 rounded-full bg-black px-10 py-4 text-sm font-medium uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#222]"
                style={{ fontFamily: DM_SANS }}
              >
                <Phone size={18} />
                Call Us Now
              </a>
              <a
                href={`mailto:${siteContact.email}`}
                className="hoverable inline-flex items-center gap-3 rounded-full border-2 border-black bg-transparent px-10 py-4 text-sm font-medium uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white"
                style={{ fontFamily: DM_SANS }}
              >
                <Mail size={18} />
                Send Email
              </a>
              <Link
                to="/submit-requirement"
                className="hoverable inline-flex items-center gap-3 rounded-full border-2 border-black/20 bg-[#f5f5f5] px-10 py-4 text-sm font-medium uppercase tracking-[0.12em] text-black transition-colors hover:border-black hover:bg-white"
                style={{ fontFamily: DM_SANS }}
              >
                Submit Your Property
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
