import { useState, useEffect, type ReactNode } from 'react';

export default function FadeIn({
  children,
  delay = 0,
  duration = 1000,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ${show ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
