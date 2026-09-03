import FadeIn from '../components/FadeIn';
import AnimatedHeading from '../components/AnimatedHeading';
import HomeListingsSection from '../components/home/HomeListingsSection';
import HomePropertyGrid from '../components/home/HomePropertyGrid';
import HomeSquareYardsExtra from '../components/home/HomeSquareYardsExtra';
import HomeSearchBar from '../components/home/HomeSearchBar';
import HomeCategoryGrid from '../components/home/HomeCategoryGrid';
import HomeHowItWorks from '../components/home/HomeHowItWorks';
import HomeInsights from '../components/home/HomeInsights';
import HomeContactCta from '../components/home/HomeContactCta';
import VJRAIButton from '../components/ai/VJRAIButton';

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4';

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden bg-[#0A1628] md:min-h-screen">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={BG_VIDEO} type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/70 via-transparent to-[#0A1628]/50 z-10" />

        <div className="relative z-20 flex w-full flex-col justify-center px-4 pb-10 pt-28 sm:px-6 md:min-h-screen md:px-12 md:pb-0 md:pt-32 lg:px-16">
          <FadeIn delay={200} duration={1000} className="mb-8 w-full max-w-3xl">
            <p className="mb-4 flex max-w-full items-start gap-2 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-[#C9A84C] sm:text-[11px] sm:tracking-[0.24em]">
              <span className="mt-[0.55em] inline-block h-px w-6 shrink-0 bg-[#C9A84C] sm:w-10" />
              <span>VJR Estate</span>
            </p>
            <AnimatedHeading
              text="Rental Income Properties"
              className="mb-3 max-w-4xl text-4xl font-bold leading-[1.05] text-white sm:text-5xl md:text-6xl"
              initialDelay={200}
              charDelay={30}
              charDuration={500}
            />
            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-[#C9A84C] sm:text-base">
              Own property that pays you back.
            </p>
          </FadeIn>

          <FadeIn delay={600} duration={1000} className="w-full max-w-3xl">
            <HomeSearchBar />
          </FadeIn>
        </div>
      </section>

      {/* Cards below hero */}
      <HomeCategoryGrid />
      <HomeListingsSection />
      <HomePropertyGrid />
      <HomeSquareYardsExtra />
      <HomeHowItWorks />
      <HomeInsights />
      <HomeContactCta />

      <VJRAIButton userRole="public" />
    </div>
  );
}
