import { useState, useEffect } from 'react';

export default function AnimatedHeading({
  text,
  className = '',
  initialDelay = 200,
  charDelay = 30,
  charDuration = 500,
}: {
  text: string;
  className?: string;
  initialDelay?: number;
  charDelay?: number;
  charDuration?: number;
}) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), initialDelay);
    return () => clearTimeout(t);
  }, [initialDelay]);

  const lines = text.split('\n');

  return (
    <h1 className={className}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split('').map((ch, ci) => {
            const delay = (li * line.length + ci) * charDelay;
            return (
              <span
                key={ci}
                className="inline-block transition-all"
                style={{
                  opacity: started ? 1 : 0,
                  transform: started ? 'translateX(0)' : 'translateX(-18px)',
                  transitionDuration: `${charDuration}ms`,
                  transitionDelay: `${delay}ms`,
                  transitionTimingFunction: 'ease-out',
                  whiteSpace: 'pre',
                }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
