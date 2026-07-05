import { useCallback, useEffect, useId, useMemo } from 'react';
import Particles, { useParticlesProvider } from '@tsparticles/react';
import type { Container, ISourceOptions } from '@tsparticles/engine';
import { cn } from '@/lib/utils';
import { motion, useAnimation } from 'framer-motion';

type ParticlesProps = {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
};

export function SparklesCore({
  id,
  className,
  background = 'transparent',
  minSize = 1,
  maxSize = 3,
  speed = 4,
  particleColor = '#ffffff',
  particleDensity = 120,
}: ParticlesProps) {
  const { loaded } = useParticlesProvider();
  const controls = useAnimation();
  const generatedId = useId().replace(/:/g, '');
  const particleId = id ?? `sparkles-${generatedId}`;

  const particlesLoaded = useCallback(
    async (container?: Container) => {
      if (container) {
        await controls.start({
          opacity: 1,
          transition: { duration: 1 },
        });
      }
    },
    [controls],
  );

  useEffect(() => {
    if (!loaded) return;

    const timer = window.setTimeout(() => {
      void controls.start({
        opacity: 1,
        transition: { duration: 1 },
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loaded, controls]);

  const options = useMemo<ISourceOptions>(
    () => ({
      background: {
        color: { value: background },
      },
      fullScreen: {
        enable: false,
        zIndex: 1,
      },
      fpsLimit: 30,
      interactivity: {
        events: {
          onClick: { enable: true, mode: 'push' },
          onHover: { enable: false, mode: 'repulse' },
          resize: { enable: true },
        },
        modes: {
          push: { quantity: 4 },
          repulse: { distance: 200, duration: 0.4 },
        },
      },
      particles: {
        color: { value: particleColor },
        move: {
          enable: true,
          direction: 'none',
          outModes: { default: 'out' },
          speed: { min: 0.1, max: 1 },
        },
        number: {
          value: particleDensity,
          density: { enable: true, width: 400, height: 400 },
        },
        opacity: {
          value: { min: 0.1, max: 1 },
          animation: { enable: true, speed, sync: false },
        },
        shape: {
          type: 'circle',
        },
        size: {
          value: { min: minSize, max: maxSize },
        },
      },
      detectRetina: true,
    }),
    [background, maxSize, minSize, particleColor, particleDensity, speed],
  );

  if (!loaded) {
    return <div className={cn('h-full w-full', className)} aria-hidden />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={controls}
      className={cn('relative h-full w-full', className)}
    >
      <Particles
        id={particleId}
        className="h-full w-full"
        particlesLoaded={particlesLoaded}
        options={options}
      />
    </motion.div>
  );
}
