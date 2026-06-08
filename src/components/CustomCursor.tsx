import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [ringPosition, setRingPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    const lerpRing = () => {
      setRingPosition((prev) => ({
        x: prev.x + (position.x - prev.x) * 0.15,
        y: prev.y + (position.y - prev.y) * 0.15,
      }));
    };
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button') || target.classList.contains('hoverable')) {
        setIsHovering(true);
      }
    };
    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button') || target.classList.contains('hoverable')) {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mousemove', lerpRing);
    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mousemove', lerpRing);
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [position]);

  return (
    <div className={`${isHovering ? 'cursor-hover' : ''}`}>
      <div className="cursor-dot hidden lg:block" style={{ left: `${position.x}px`, top: `${position.y}px` }} />
      <div className="cursor-ring hidden lg:block" style={{ left: `${ringPosition.x}px`, top: `${ringPosition.y}px` }} />
    </div>
  );
}
