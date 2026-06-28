import { useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

interface Contact3DCardProps {
  icon: ReactNode;
  title: string;
  content: string;
  link?: string;
  external?: boolean;
  delay?: number;
  footer?: ReactNode;
}

export default function Contact3DCard({
  icon,
  title,
  content,
  link,
  external = false,
  delay = 0,
  footer,
}: Contact3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateX(((y - centerY) / centerY) * -10);
    setRotateY(((x - centerX) / centerX) * 10);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const cardContent = (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: 'transform 0.1s ease-out',
      }}
      className="group relative h-full"
    >
      <div className="relative h-full rounded-2xl border border-black/10 bg-[#fafafa] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-black/20 hover:bg-white hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-black/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative z-10 flex h-full flex-col">
          <div className="mb-6 text-black">{icon}</div>
          <h3
            className="mb-3 text-xl font-medium tracking-wide text-black"
            style={{ fontFamily: DM_SANS }}
          >
            {title}
          </h3>
          <p
            className="whitespace-pre-line text-base leading-relaxed text-black/65"
            style={{ fontFamily: DM_SANS }}
          >
            {content}
          </p>
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      </div>
    </motion.div>
  );

  if (link) {
    return (
      <a
        href={link}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="hoverable block h-full"
      >
        {cardContent}
      </a>
    );
  }

  return cardContent;
}
