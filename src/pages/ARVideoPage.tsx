import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, type Variants, AnimatePresence } from 'framer-motion';
import {
  AirplaneTilt,
  Anchor,
  Building,
  Buildings,
  Compass,
  Cube,
  Desktop,
  DeviceRotate,
  Eye,
  FileVideo,
  Globe,
  HandWaving,
  Image,
  MapPin,
  NavigationArrow,
  Play,
  PuzzlePiece,
  Rocket,
  ShoppingBagOpen,
  Stack,
  Storefront,
  Swatches,
  TreeStructure,
  UserRectangle,
  Video,
  X,
  type Icon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import ThreeDScene from '@/components/ar/ThreeDScene';
import { useARMedia } from '@/lib/arMedia';
import type { ARMediaItem } from '@/lib/arMedia';

const fontHeading = { fontFamily: "'Libre Baskerville', Georgia, serif" };
const fontBody = { fontFamily: "'Inter', system-ui, sans-serif" };

const slideUp: Variants = {
  hidden: { opacity: 0, y: 56 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#666]" style={fontBody}>
      {children}
    </p>
  );
}

function FadeInSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-8% 0px -8% 0px' });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={slideUp}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function DarkIconBox({ icon: IconComponent }: { icon: Icon }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
      <IconComponent size={24} weight="duotone" className="text-white" />
    </div>
  );
}

const products = [
  { icon: Stack, name: 'Spatial Lite' },
  { icon: Globe, name: 'Spatial World' },
  { icon: TreeStructure, name: 'Spatial Twin' },
  { icon: NavigationArrow, name: 'Spatial Guide' },
  { icon: Buildings, name: 'Spatial Cities' },
  { icon: FileVideo, name: 'Spatial Stream' },
  { icon: Stack, name: 'Spatial Agent' },
  { icon: DeviceRotate, name: 'Spatial Holo' },
  { icon: UserRectangle, name: 'Spatial Avatar' },
  { icon: HandWaving, name: 'Spatial Touch' },
  { icon: Desktop, name: 'Spatial Cave' },
  { icon: MapPin, name: 'Spatial Table' },
  { icon: Compass, name: 'Spatial Map' },
  { icon: NavigationArrow, name: 'Spatial Drive' },
  { icon: Eye, name: 'Spatial Lens' },
  { icon: Building, name: 'Spatial Tour' },
];

const industries = [
  { icon: Building, name: 'Real Estate' },
  { icon: Buildings, name: 'Government & Smart Cities' },
  { icon: Anchor, name: 'Maritime' },
  { icon: AirplaneTilt, name: 'Aviation' },
  { icon: Storefront, name: 'Hospitality' },
  { icon: ShoppingBagOpen, name: 'Warehouse & Data Centres' },
  { icon: Rocket, name: 'Giga Projects' },
];

const services2 = [
  { icon: Swatches, name: '3D Rendering & Visualization', desc: 'Photorealistic architectural renders' },
  { icon: Video, name: 'Animation & Walkthrough Videos', desc: 'Cinematic project walkthroughs' },
  { icon: Image, name: '360° Panoramic Imaging', desc: 'Immersive 360 VR content' },
  { icon: PuzzlePiece, name: 'XR Content Creation', desc: 'AR/VR/MR interactive experiences' },
  { icon: Cube, name: '3D Reality Capture', desc: 'LiDAR scanning & photogrammetry' },
];

const processSteps = [
  { num: '01', title: 'Discovery & Consultation', desc: 'Understanding your goals' },
  { num: '02', title: 'Strategy & Planning', desc: 'Design and roadmap' },
  { num: '03', title: 'Build & Optimize', desc: 'Development and testing' },
  { num: '04', title: 'Deploy & Support', desc: 'Launch and maintenance' },
];

const testimonials = [
  {
    quote: 'Partnering with PROPVR on Spatial Cave was seamless from concept to commissioning, and the result speaks for itself in our launch numbers.',
    author: 'Dhruba Ghosh',
    role: 'Marketing President, Puravankara',
  },
  {
    quote: 'The Spatial Twin has become a cornerstone of how we showcase Prestige developments online; PROPVR delivered with precision and a deep respect for our brand standards.',
    author: 'Prithwish Kotian',
    role: 'Corporate Communications, Prestige',
  },
  {
    quote: 'Spatial Tour has measurably lifted engagement across Brigade\'s digital touchpoints; it\'s now a standard part of how we launch inventory.',
    author: 'Sunil Khubchandani',
    role: 'Head of Marketing, Brigade',
  },
];

const featuredProjects = [
  { name: 'Thee Erth', desc: 'Designing a Pioneering Digital Cityscape for a Multi-Tower Development' },
  { name: 'Northern Lights', desc: 'Crafting Photorealistic 3D Renders for a Nature-Inspired Residential Community' },
  { name: 'Danube Diamondz', desc: 'Crafting First Impressions Through Immersive Storytelling' },
  { name: 'La Mazzoni', desc: 'Seamless Remote Discovery Through a Signature Digital Twin' },
];

function VideoModal({ item, onClose }: { item: ARMediaItem; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <div className="aspect-video w-full">
            <iframe
              src={item.videoUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={item.title}
            />
          </div>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            <p className="mt-1 text-sm text-[#888]">{item.description}</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ARVideoPage() {
  const [selectedVideo, setSelectedVideo] = useState<ARMediaItem | null>(null);
  const { items: arMedia } = useARMedia();

  return (
    <div className="bg-black text-white min-h-screen overflow-hidden">

      {/* ── HERO ── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-5 text-center">
        <ThreeDScene />
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-4xl"
        >
          <span className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-[#999]">
            Immersive Real Estate Technology
          </span>
          <h1
            className="mt-8 text-white"
            style={{
              ...fontHeading,
              fontSize: 'clamp(2.5rem, 7vw, 5rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            VJR Estate delivers Digital Twins, 3D Walkthroughs & Experience Centres
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-[#888] sm:text-[16px]" style={fontBody}>
            Immersive solutions for real estate, smart cities, and enterprise clients across India, UAE, and Saudi Arabia.
          </p>
          <Button
            asChild
            className="mt-10 h-auto rounded-xl bg-white px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-black hover:bg-gray-100"
          >
            <Link to="/contact">Start Your Project</Link>
          </Button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mt-16 flex flex-wrap justify-center gap-8 sm:gap-14"
        >
          {[
            { stat: '4000+', label: 'Projects Delivered' },
            { stat: '500+', label: 'Clients Served' },
            { stat: '6+', label: 'International Patents' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[1.75rem] font-bold text-white sm:text-[2rem]">{item.stat}</p>
              <p className="mt-1 text-[12px] text-[#666]">{item.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── ECOSYSTEM ── */}
      <FadeInSection className="border-y border-white/5 bg-white/[0.02] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <SectionLabel>The PROPVR Spatial Ecosystem</SectionLabel>
            <p className="mt-4 text-[15px] leading-relaxed text-[#888]" style={fontBody}>
              One immersive stack for real estate developers, smart-city authorities, and enterprise clients, from web-based virtual tours to life-sized holograms and bespoke 3D content production.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Desktop, title: 'Interactive Software Platforms', desc: 'Web-based tours, digital replicas, virtual worlds & smart city planning' },
              { icon: DeviceRotate, title: 'Immersive Experience Solutions', desc: 'Holographic displays, experience rooms, VR journeys, interactive surfaces & motion rides' },
              { icon: PuzzlePiece, title: 'Professional Creative Services', desc: '3D rendering, animation, VR production, reality capture & XR content creation' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
                <DarkIconBox icon={item.icon} />
                <h3 className="mt-5 text-[17px] font-semibold text-white sm:text-[18px]" style={fontHeading}>
                  {item.title}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-[#777]" style={fontBody}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── PRODUCTS ── */}
      <FadeInSection className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <SectionLabel>Spatial OS Ecosystem</SectionLabel>
            <h2
              className="mt-3 text-white"
              style={{
                ...fontHeading,
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Products
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8">
            {products.map((p) => (
              <div
                key={p.name}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-5 text-center transition-colors hover:border-white/20"
              >
                <p.icon size={22} weight="duotone" className="text-white/70" />
                <span className="text-[11px] font-medium text-[#aaa]">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── SOLUTIONS ── */}
      <FadeInSection className="border-y border-white/5 bg-white/[0.02] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <SectionLabel>What We Deliver</SectionLabel>
            <h2
              className="mt-3 text-white"
              style={{
                ...fontHeading,
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Solutions
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Rocket, title: 'Project Launches', desc: 'Immersive project launch experiences with virtual walkthroughs and digital twins' },
              { icon: Eye, title: 'Reality Capture', desc: 'LiDAR scanning and photogrammetry for accurate 3D digital replicas' },
              { icon: TreeStructure, title: 'Digital Twins', desc: 'Interactive digital replicas with real-time navigation and data layers' },
              { icon: PuzzlePiece, title: 'Gaming Experiences', desc: 'Branded gaming environments and interactive campaign experiences' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <DarkIconBox icon={item.icon} />
                <h3 className="mt-5 text-[16px] font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#777]" style={fontBody}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── INDUSTRIES ── */}
      <FadeInSection className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <SectionLabel>Industries We Power</SectionLabel>
            <p className="mt-4 text-[15px] leading-relaxed text-[#888]" style={fontBody}>
              One Spatial platform trusted by real estate, smart cities, maritime, airports, and giga projects across India, UAE, and Saudi Arabia.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-7">
            {industries.map((ind) => (
              <div
                key={ind.name}
                className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-6 text-center transition-colors hover:border-white/20"
              >
                <ind.icon size={28} weight="duotone" className="text-white/60" />
                <span className="text-[12px] font-medium leading-tight text-[#aaa]">{ind.name}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── CREATIVE SERVICES ── */}
      <FadeInSection className="border-y border-white/5 bg-white/[0.02] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <SectionLabel>Creative Production Services</SectionLabel>
            <h2
              className="mt-3 text-white"
              style={{
                ...fontHeading,
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Immersive Content Production
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {services2.map((s) => (
              <div
                key={s.name}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center transition-colors hover:border-white/20"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
                  <s.icon size={24} weight="duotone" className="text-white" />
                </div>
                <h3 className="mt-4 text-[14px] font-semibold text-white">{s.name}</h3>
                <p className="mt-1 text-[12px] text-[#666]" style={fontBody}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── PROCESS ── */}
      <FadeInSection className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="mb-14 text-center">
            <SectionLabel>How PROPVR Delivers</SectionLabel>
            <p className="mt-4 text-[15px] leading-relaxed text-[#888]" style={fontBody}>
              Every Spatial OS deployment, from a single virtual tour to a full Experience Centre, runs through the same 4-phase process.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-4">
            {processSteps.map((step) => (
              <div key={step.num} className="text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[20px] font-bold text-white">
                  {step.num}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{step.title}</h3>
                <p className="mt-1 text-[13px] text-[#666]" style={fontBody}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── POWERED BY ── */}
      <FadeInSection className="border-y border-white/5 bg-white/[0.02] py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <SectionLabel>Powered by Industry Leaders</SectionLabel>
          <p className="mt-3 text-[14px] text-[#777]" style={fontBody}>
            Enterprise-Grade Technology Stack for Maximum Performance
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-4 text-[13px] text-[#555]">
            {['Unreal Engine', 'Cesium', 'Microsoft Azure', 'Meta', 'AWS', 'Fortnite', 'ElevenLabs'].map((t) => (
              <span key={t} className="font-medium uppercase tracking-[0.08em]">{t}</span>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── FEATURED PROJECTS ── */}
      <FadeInSection className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <SectionLabel>Featured Projects</SectionLabel>
            <h2
              className="mt-3 text-white"
              style={{
                ...fontHeading,
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Immersive Solutions Delivering Real Results
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProjects.map((p) => (
              <div
                key={p.name}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20"
              >
                <div className="mb-4 aspect-[4/3] rounded-xl bg-white/[0.04]" />
                <h3 className="text-[16px] font-semibold text-white">{p.name}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[#777]" style={fontBody}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── TESTIMONIALS ── */}
      <FadeInSection className="border-y border-white/5 bg-white/[0.02] py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <SectionLabel>What Our Clients Say</SectionLabel>
            <p className="mt-3 text-[15px] text-[#888]" style={fontBody}>
              Real Results & Real Impact from Industry Leaders
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.author}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <p className="text-[13px] leading-relaxed text-[#999]" style={fontBody}>
                  "{t.quote}"
                </p>
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-[13px] font-semibold text-white">{t.author}</p>
                  <p className="text-[11px] text-[#666]" style={fontBody}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── AR MEDIA SHOWCASE ── */}
      <FadeInSection className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <SectionLabel>AR/VR/3D Showcase</SectionLabel>
            <h2
              className="mt-3 text-white"
              style={{
                ...fontHeading,
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Immersive Experiences in Action
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {arMedia.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:border-[#0f766e]/50"
                onClick={() => setSelectedVideo(item)}
              >
                <div className="relative aspect-video overflow-hidden bg-white/[0.04]">
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-black/40 backdrop-blur-sm transition-transform group-hover:scale-110">
                      <Play size={28} weight="fill" className="ml-1 text-white" />
                    </div>
                  </div>
                  <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[#aaa] backdrop-blur-sm">
                    {item.category}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#777]">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/5 bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-[#555]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </FadeInSection>

      {/* ── Video Modal ── */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoModal item={selectedVideo} onClose={() => setSelectedVideo(null)} />
        )}
      </AnimatePresence>

      {/* ── CTA ── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <SectionLabel>Get Started</SectionLabel>
            <h2
              className="mt-4 text-white"
              style={{
                ...fontHeading,
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              Ready to Transform Your Property Marketing?
            </h2>
            <p
              className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-[#888] sm:text-[16px]"
              style={fontBody}
            >
              From a single 3D render to a full digital twin, our immersive solutions deliver results that close deals faster.
            </p>
            <Button
              asChild
              className="mt-10 h-auto rounded-xl bg-white px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-black hover:bg-gray-100"
            >
              <Link to="/contact">Start Your Project</Link>
            </Button>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
