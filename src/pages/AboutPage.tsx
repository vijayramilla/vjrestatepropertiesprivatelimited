import { motion } from 'framer-motion';
import { Building2, Home, Store, Leaf } from 'lucide-react';

const leadership = [
  { initials: 'VR', name: 'Vijay Ram Illa', role: 'Founder & Managing Director', bio: 'Visionary leader with expertise in real estate investment and rental income portfolio management. A first-year college student in 2022 who transformed curiosity into a thriving enterprise.' },
  { initials: 'DR', name: 'Devendr Reddy', role: 'Co-Founder & Director', bio: 'Strategic partner with expertise in property evaluation and client relationship management. Brings deep knowledge of Bangalore\'s evolving real estate landscape.' },
];

const dealCategories = [
  { numeral: 'I', name: 'PG Buildings', icon: Building2 },
  { numeral: 'II', name: 'Residential Rental Income', icon: Home },
  { numeral: 'III', name: 'Commercial Properties', icon: Store },
  { numeral: 'IV', name: 'Plot & Agriculture Land', icon: Leaf },
];

export default function AboutPage() {
  const headlineWords = "About VJR Estate".split(' ');

  return (
    <div className="bg-white min-h-screen pt-[72px]">
      <section className="bg-black py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-gray-400 text-[11px] uppercase tracking-[0.2em] mb-8">BANGALORE · EST. 2025</motion.p>
          <h1 className="font-display text-white overflow-hidden">
            {headlineWords.map((word, i) => (
              <motion.span key={i} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: 'easeOut' }} className="inline-block mr-[0.3em]" style={{ fontSize: 'clamp(48px, 8vw, 110px)', lineHeight: '1.1', letterSpacing: '-0.03em' }}>{word}</motion.span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="text-gray-300 text-[18px] max-w-[560px] mx-auto mt-[34px] leading-relaxed">Bangalore's Most Trusted Rental Income Property Company</motion.p>
        </div>
      </section>
      <section className="py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col lg:flex-row gap-[55px]">
            <div className="flex-1 lg:w-[61.8%] relative">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                <span className="quote-mark absolute -top-[80px] -left-[20px]">"</span>
                <h2 className="font-display text-black relative z-10" style={{ fontSize: '68px', lineHeight: '1.1', letterSpacing: '-0.03em' }}>Born from a<br />Simple Question.</h2>
              </motion.div>
            </div>
            <div className="lg:w-[38.2%]">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }} className="text-gray-600 text-[16px] leading-[1.618]">
                <p className="mb-6">In 2022, Vijay Ram Illa, then a first-year college student, asked a simple question: "If people invest so much in property, how do they earn from it every month?"</p>
                <p className="mb-6">That curiosity became conviction. He spent years studying Bangalore's rental market, identifying it as India's strongest hub for rental income properties. With millions of students, IT professionals, and entrepreneurs seeking accommodation, the city presented an unprecedented opportunity.</p>
                <p className="mb-6">VJR Estate was formally incorporated on 15 October 2025 as VJR Estate Properties Private Limited (CIN: U68100KA2025PTC209772), Koramangala 7th Block, Bangalore.</p>
                <p className="mb-6">Today, VJR Estate connects serious investors with verified, income-producing properties backed by transparent due diligence. Every property listed has been personally verified for legal clarity and rental income accuracy.</p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-black py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-[89px]">
            <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] mb-3">LEADERSHIP</p>
            <h2 className="font-display text-white" style={{ fontSize: '68px', lineHeight: '1.1', letterSpacing: '-0.03em' }}>The People Behind<br />VJR Estate</h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[34px]">
            {leadership.map((leader, index) => (
              <motion.div key={leader.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.2 }} className="border border-gray-800 p-[55px]_[34px]">
                <span className="font-display text-gray-700 block mb-[21px]" style={{ fontSize: '68px', lineHeight: '1' }}>{leader.initials}</span>
                <h3 className="font-display text-white" style={{ fontSize: '26px', lineHeight: '1.2' }}>{leader.name}</h3>
                <p className="text-gray-400 text-[12px] uppercase tracking-[0.15em] mt-2 mb-[21px]">{leader.role}</p>
                <p className="text-gray-300 text-[16px] leading-relaxed">{leader.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-[89px] lg:py-[144px]">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-[89px]">
            <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] mb-3">OUR PORTFOLIO</p>
            <h2 className="font-display text-black" style={{ fontSize: '68px', lineHeight: '1.1', letterSpacing: '-0.03em' }}>What We Deal In</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[21px]">
            {dealCategories.map((cat, index) => (
              <motion.div key={cat.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }} className="bg-black p-[34px] text-center">
                <span className="font-display text-gray-800 block mb-[13px]" style={{ fontSize: '68px', lineHeight: '1' }}>{cat.numeral}</span>
                <cat.icon size={24} className="mx-auto mb-[21px] text-white" />
                <h3 className="font-display text-white" style={{ fontSize: '22px', lineHeight: '1.2' }}>{cat.name}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-gray-50 py-[55px]">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="border border-gray-200 p-[34px] text-center">
            <p className="text-gray-600 text-[16px] leading-relaxed max-w-[800px] mx-auto">We deal exclusively in Bangalore. We list only verified, income-generating properties. We do not deal in vacant land or non-rental properties without income documentation.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
