import { motion, type Variants } from 'framer-motion';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = 'from-white/[0.08]',
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn('absolute', className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-gradient-to-r to-transparent',
            gradient,
            'border-2 border-white/[0.12] backdrop-blur-[2px]',
            'shadow-[0_8px_32px_0_rgba(255,255,255,0.06)]',
            'after:absolute after:inset-0 after:rounded-full',
            'after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.14),transparent_70%)]',
          )}
        />
      </motion.div>
    </motion.div>
  );
}

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 1,
      delay: 0.5 + i * 0.2,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
};

export function HeroGeometric({
  badge = 'Bangalore · Real Estate Investment Advisory',
  title1 = 'ABOUT',
  title2 = 'VJR ESTATE',
  subtitle,
  className,
  compact = false,
}: {
  badge?: string;
  title1?: string;
  title2?: string;
  subtitle?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex w-full items-center justify-center overflow-hidden bg-[#030303]',
        compact ? 'min-h-[420px] sm:min-h-[480px] lg:min-h-[540px]' : 'min-h-screen',
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.03] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-white/[0.14]"
          className="left-[-10%] top-[15%] md:left-[-5%] md:top-[20%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-white/[0.10]"
          className="right-[-5%] top-[70%] md:right-[0%] md:top-[75%]"
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-white/[0.08]"
          className="bottom-[5%] left-[5%] md:bottom-[10%] md:left-[10%]"
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-white/[0.12]"
          className="right-[15%] top-[10%] md:right-[20%] md:top-[15%]"
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-white/[0.06]"
          className="left-[20%] top-[5%] md:left-[25%] md:top-[10%]"
        />
      </div>

      <div className="relative z-10 w-full px-4 md:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 md:mb-10"
          >
            <Circle className="h-2 w-2 fill-white/70" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/55 sm:text-[11px]">
              {badge}
            </span>
          </motion.div>

          <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
            <h1
              className="mb-4 font-display tracking-tight md:mb-6"
              style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
            >
              <span className="block bg-gradient-to-b from-white to-white/75 bg-clip-text text-4xl text-transparent sm:text-5xl md:text-7xl lg:text-8xl">
                {title1}
              </span>
              <span className="mt-1 block bg-gradient-to-r from-white/90 via-white to-white/70 bg-clip-text text-4xl text-transparent sm:text-5xl md:text-7xl lg:text-8xl">
                {title2}
              </span>
            </h1>
          </motion.div>

          {subtitle && (
            <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
              <p className="mx-auto max-w-xl px-4 text-sm font-light leading-relaxed tracking-wide text-white/40 sm:text-base md:text-lg">
                {subtitle}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80" />
    </div>
  );
}

export default HeroGeometric;
