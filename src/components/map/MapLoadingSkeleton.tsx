import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';

const LOADING_TEXT = 'LOADING BANGALORE';

function GridBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="mapGrid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#mapGrid)" />
    </svg>
  );
}

function PulseRing({ delay, color }: { delay: number; color: string }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full border"
      style={{ borderColor: color }}
      initial={{ scale: 0.8, opacity: 0.6 }}
      animate={{ scale: 2.5, opacity: 0 }}
      transition={{ duration: 2.5, delay, repeat: Infinity, ease: 'easeOut' }}
    />
  );
}

function OrbitingDot({
  radius,
  duration,
  delay,
  size,
  color,
}: {
  radius: number;
  duration: number;
  delay: number;
  size: number;
  color: string;
}) {
  return (
    <motion.div
      className="absolute"
      style={{ width: size, height: size, borderRadius: '50%', backgroundColor: color }}
      initial={{ x: radius, y: 0 }}
      animate={{
        x: [radius, 0, -radius, 0, radius],
        y: [0, -radius, 0, radius, 0],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export default function MapLoadingSkeleton() {
  return (
    <>
      <Navbar />
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-gray-950 h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]">
      <GridBackground />

      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 30% 35%, rgba(34,197,94,0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 70% 65%, rgba(59,130,246,0.08) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.04) 0%, transparent 70%),
            #030712
          `,
        }}
      />

      <motion.div
        className="absolute w-64 h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <PulseRing delay={0} color="rgba(34,197,94,0.15)" />
        <PulseRing delay={0.8} color="rgba(59,130,246,0.1)" />
        <PulseRing delay={1.6} color="rgba(16,185,129,0.08)" />

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <OrbitingDot radius={50} duration={3} delay={0} size={4} color="rgba(34,197,94,0.8)" />
          <OrbitingDot radius={70} duration={4} delay={0.5} size={3} color="rgba(59,130,246,0.7)" />
          <OrbitingDot radius={90} duration={5} delay={1} size={2} color="rgba(16,185,129,0.6)" />
        </motion.div>

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400/20 to-blue-500/20 backdrop-blur-sm border border-white/10"
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>

      <motion.div
        className="relative z-10 mt-8 flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <motion.h2
          className="text-lg font-bold text-white/90 tracking-tight"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          VJR Land Map
        </motion.h2>

        <div className="flex items-center gap-1.5">
          {LOADING_TEXT.split('').map((char, i) => (
            <motion.span
              key={i}
              className="font-mono text-[11px] tracking-[0.2em]"
              style={{
                color: char === ' ' ? 'transparent' : 'rgba(52,211,153,0.7)',
                textShadow: '0 0 20px rgba(52,211,153,0.15)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.04, repeat: Infinity, repeatDelay: 3, repeatType: 'reverse' }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        <motion.div
          className="mt-1 flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(52,211,153,0.5)' }}
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
            />
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none" className="opacity-40">
          <path d="M8 2L8 22" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2 8L8 2L14 8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </div>
    </>
  );
}
