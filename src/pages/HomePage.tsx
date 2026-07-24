import { Suspense, lazy } from 'react';
import FadeIn from '../components/FadeIn';
import AnimatedHeading from '../components/AnimatedHeading';
import HomeListingsSection from '../components/home/HomeListingsSection';
import HomePropertyGrid from '../components/home/HomePropertyGrid';
import HomeSquareYardsExtra from '../components/home/HomeSquareYardsExtra';
import HomeSearchBar from '../components/home/HomeSearchBar';

const HomeVjrSparkles = lazy(() => import('../components/home/HomeVjrSparkles'));

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4';

function SectionFallback({ minHeight = '16rem' }: { minHeight?: string }) {
  return (
    <div
      className="animate-pulse bg-gray-100"
      style={{ minHeight }}
      aria-hidden
    />
  );
}

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative w-full min-h-screen overflow-hidden bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={BG_VIDEO} type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/40 z-10" />

        <div className="relative z-20 flex flex-col justify-center min-h-screen px-6 md:px-12 lg:px-16 pt-32">
          <FadeIn delay={200} duration={1000} className="mb-8 max-w-3xl">
            <AnimatedHeading
              text="Bangalore Real Estate"
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 text-white"
              initialDelay={200}
              charDelay={30}
              charDuration={500}
            />
            <p className="text-sm md:text-base text-gray-400">
              Premium investment properties across Bangalore
            </p>
          </FadeIn>

          <FadeIn delay={600} duration={1000} className="w-full max-w-3xl">
            <HomeSearchBar />
          </FadeIn>
        </div>
      </section>

      {/* Cards below hero */}
      <HomeListingsSection />
      <HomePropertyGrid />
      <HomeSquareYardsExtra />

      <Suspense fallback={<SectionFallback minHeight="32rem" />}>
        <HomeVjrSparkles />
      </Suspense>
    </div>
  );
}
