import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function VastuScoreGauge({ score, label }: { score: number; label: string }) {
  const [count, setCount] = useState(0);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (count / 100) * circumference;

  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const step = 16;
    const totalSteps = duration / step;
    const increment = score / totalSteps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setCount(score);
        clearInterval(timer);
      } else {
        setCount(Math.round(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [score]);

  const color = score >= 80 ? '#059669' : score >= 60 ? '#EA580C' : '#DC2626';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <motion.circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <span className="absolute text-3xl font-bold text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {count}%
        </span>
      </div>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}
