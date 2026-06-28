import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ContactFloatingOrbProps {
  delay?: number;
  className?: string;
  children?: ReactNode;
}

export default function ContactFloatingOrb({
  delay = 0,
  className = '',
  children,
}: ContactFloatingOrbProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 0.05, y: 0 }}
      transition={{
        duration: 2.4,
        delay,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
