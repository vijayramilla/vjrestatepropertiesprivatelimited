import { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { SparklesCore } from '@/components/ui/sparkles';

export default function HomeVjrSparkles() {
  return (
    <section className="relative flex h-[32rem] w-full flex-col items-center justify-center overflow-hidden bg-black md:h-[40rem]">
      <h2 className="relative z-20 font-serif text-4xl font-normal tracking-[-0.02em] text-white md:text-7xl lg:text-8xl">
        VJR ESTATE
      </h2>

      <ParticlesProvider init={loadSlim}>
        <div className="relative isolate mt-2 h-40 w-full max-w-[40rem]">
          <div className="absolute inset-x-20 top-0 h-[2px] w-3/4 bg-gradient-to-r from-transparent via-white/60 to-transparent blur-sm" />
          <div className="absolute inset-x-20 top-0 h-px w-3/4 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <div className="absolute inset-x-60 top-0 h-[5px] w-1/4 bg-gradient-to-r from-transparent via-neutral-400 to-transparent blur-sm" />
          <div className="absolute inset-x-60 top-0 h-px w-1/4 bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />

          <SparklesCore
            id="vjr-sparkles"
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={80}
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            particleColor="#FFFFFF"
          />

          <div className="pointer-events-none absolute inset-0 z-[11] h-full w-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" />
        </div>
      </ParticlesProvider>

      <p className="relative z-20 mt-6 font-sans text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        Rental income properties · Bangalore
      </p>
    </section>
  );
}
