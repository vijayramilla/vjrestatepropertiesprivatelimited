import { useRef, useCallback, useState } from 'react';

export default function NorthDial({
  value,
  onChange,
}: {
  value: number;
  onChange: (deg: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const angleToDeg = (cx: number, cy: number, mx: number, my: number) => {
    const dx = mx - cx;
    const dy = my - cy;
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  };

  const handlePointer = useCallback(
    (e: React.PointerEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const deg = angleToDeg(cx, cy, e.clientX, e.clientY);
      onChange(deg);
    },
    [onChange]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      (e.target as Element).setPointerCapture?.(e.pointerId);
      handlePointer(e);
    },
    [handlePointer]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      handlePointer(e);
    },
    [dragging, handlePointer]
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const needleRotation = value;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        ref={svgRef}
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <circle cx="100" cy="100" r="95" fill="#fff" stroke="#EA580C" strokeWidth="2" />
        <circle cx="100" cy="100" r="85" fill="none" stroke="#fde68a" strokeWidth="1" />
        <circle cx="100" cy="100" r="75" fill="none" stroke="#fde68a" strokeWidth="0.5" />

        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const rad = (a * Math.PI) / 180;
          const x1 = 100 + Math.sin(rad) * 70;
          const y1 = 100 - Math.cos(rad) * 70;
          const x2 = 100 + Math.sin(rad) * 80;
          const y2 = 100 - Math.cos(rad) * 80;
          const labels: Record<number, string> = {
            0: 'N', 45: 'NE', 90: 'E', 135: 'SE',
            180: 'S', 225: 'SW', 270: 'W', 315: 'NW',
          };
          const lx = 100 + Math.sin(rad) * 60;
          const ly = 100 - Math.cos(rad) * 60;
          return (
            <g key={a}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d1d5db" strokeWidth="1.5" />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fontWeight="600"
                fill="#6b7280"
              >
                {labels[a]}
              </text>
            </g>
          );
        })}

        {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((a) => {
          const rad = (a * Math.PI) / 180;
          const x1 = 100 + Math.sin(rad) * 75;
          const y1 = 100 - Math.cos(rad) * 75;
          const x2 = 100 + Math.sin(rad) * 80;
          const y2 = 100 - Math.cos(rad) * 80;
          return (
            <line
              key={a}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#e5e7eb"
              strokeWidth="0.8"
            />
          );
        })}

        <g transform={`rotate(${needleRotation} 100 100)`}>
          <polygon points="100,25 95,80 100,70 105,80" fill="#EA580C" />
          <polygon points="100,175 95,120 100,130 105,120" fill="#9ca3af" />
        </g>

        <circle cx="100" cy="100" r="5" fill="#EA580C" />
      </svg>

      <span className="text-xs font-semibold text-gray-500">
        North: {value}°
      </span>
    </div>
  );
}
