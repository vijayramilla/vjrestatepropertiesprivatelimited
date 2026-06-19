import { SparklesCore } from '@/components/ui/sparkles';

export default function HomeVjrSparkles() {
  return (
    <section className="h-[32rem] md:h-[40rem] w-full bg-black flex flex-col items-center justify-center overflow-hidden relative">
      <h2 className="font-serif text-4xl md:text-7xl lg:text-8xl font-normal text-center text-white relative z-20 tracking-[-0.02em]">
        VJR ESTATE
      </h2>

      <div className="w-full max-w-[40rem] h-40 relative mt-2 isolate">
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-white/60 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-white/80 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-neutral-400 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-neutral-300 to-transparent h-px w-1/4" />

        <SparklesCore
          id="vjr-sparkles"
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          className="absolute inset-0 z-10 w-full h-full pointer-events-none"
          particleColor="#FFFFFF"
        />

        <div className="pointer-events-none absolute inset-0 z-[11] w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" />
      </div>

      <p className="relative z-20 font-sans text-[11px] text-neutral-500 uppercase tracking-[0.2em] mt-6">
        Rental income properties · Bangalore
      </p>
    </section>
  );
}
