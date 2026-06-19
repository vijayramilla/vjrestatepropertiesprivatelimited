import { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';

export interface CountryMarker {
  id: string;
  name: string;
  location: [number, number];
  size?: number;
}

interface GlobeAnalyticsProps {
  markers?: CountryMarker[];
  className?: string;
  speed?: number;
  hubLocation?: [number, number];
}

const BANGALORE: [number, number] = [12.97, 77.59];

export const globalInvestorMarkers: CountryMarker[] = [
  { id: 'bangalore', name: 'Bangalore', location: BANGALORE, size: 0.07 },
  { id: 'usa', name: 'United States', location: [40.71, -74.01] },
  { id: 'uk', name: 'United Kingdom', location: [51.51, -0.13] },
  { id: 'uae', name: 'UAE', location: [25.2, 55.27] },
  { id: 'singapore', name: 'Singapore', location: [1.35, 103.82] },
  { id: 'australia', name: 'Australia', location: [-33.87, 151.21] },
  { id: 'germany', name: 'Germany', location: [52.52, 13.41] },
  { id: 'canada', name: 'Canada', location: [43.65, -79.38] },
  { id: 'japan', name: 'Japan', location: [35.68, 139.65] },
];

export function GlobeAnalytics({
  markers = globalInvestorMarkers,
  className = '',
  speed = 0.003,
  hubLocation = BANGALORE,
}: GlobeAnalyticsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0);
  const isPausedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    isPausedRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi;
      thetaOffsetRef.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
    }
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        };
      }
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let animationId: number;
    let phi = 0;

    const arcs = markers
      .filter((m) => m.id !== 'bangalore')
      .map((m) => ({
        from: m.location,
        to: hubLocation,
        id: `arc-${m.id}`,
      }));

    function init() {
      const width = canvas.offsetWidth;
      if (width === 0 || globe) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: [1, 1, 1],
        markerColor: [0.1, 0.1, 0.1],
        glowColor: [0.94, 0.93, 0.91],
        markerElevation: 0,
        markers: markers.map((m) => ({
          location: m.location,
          size: m.size ?? 0.04,
          id: m.id,
          color: m.id === 'bangalore' ? [0.05, 0.05, 0.05] : undefined,
        })),
        arcs,
        arcColor: [0.2, 0.2, 0.2],
        arcWidth: 0.4,
        arcHeight: 0.22,
        opacity: 0.85,
      });

      function animate() {
        if (!isPausedRef.current) phi += speed;
        globe!.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        });
        animationId = requestAnimationFrame(animate);
      }
      animate();
      setTimeout(() => {
        if (canvas) canvas.style.opacity = '1';
      }, 100);
    }

    if (canvas.offsetWidth > 0) {
      init();
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect();
          init();
        }
      });
      ro.observe(canvas);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (globe) globe.destroy();
    };
  }, [markers, speed, hubLocation]);

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1.2s ease',
          borderRadius: '50%',
          touchAction: 'none',
        }}
      />
      {markers.map((m) => (
        <div
          key={m.id}
          style={{
            position: 'absolute',
            // @ts-expect-error CSS Anchor Positioning
            positionAnchor: `--cobe-${m.id}`,
            bottom: 'anchor(top)',
            left: 'anchor(center)',
            translate: '-50% 0',
            marginBottom: 6,
            padding: '0.3rem 0.55rem',
            background: m.id === 'bangalore' ? 'rgba(0,0,0,0.92)' : 'rgba(255,255,255,0.95)',
            border: m.id === 'bangalore' ? 'none' : '1px solid rgba(0,0,0,0.12)',
            borderRadius: 4,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            opacity: `var(--cobe-visible-${m.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
            transition: 'opacity 0.3s, filter 0.3s',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: m.id === 'bangalore' ? '0.75rem' : '0.65rem',
              fontWeight: m.id === 'bangalore' ? 600 : 500,
              color: m.id === 'bangalore' ? '#fff' : '#111',
              letterSpacing: '0.02em',
            }}
          >
            {m.name}
          </span>
        </div>
      ))}
    </div>
  );
}
