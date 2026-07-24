import { useEffect, useRef } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4';

const FADE_DURATION = 0.5;
const REWIND_DELAY = 100;

function useVideoLoop(ref: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    let rafId: number;

    function loop() {
      if (!video) return;

      const { currentTime, duration } = video;

      // fade in at start
      if (currentTime < FADE_DURATION) {
        video.style.opacity = String(currentTime / FADE_DURATION);
      } else if (currentTime > duration - FADE_DURATION) {
        // fade out near end
        video.style.opacity = String((duration - currentTime) / FADE_DURATION);
      } else {
        video.style.opacity = '1';
      }

      rafId = requestAnimationFrame(loop);
    }

    function onEnded() {
      if (!video) return;
      video.style.opacity = '0';
      setTimeout(() => {
        if (!video) return;
        video.currentTime = 0;
        video.play().catch(() => {});
      }, REWIND_DELAY);
    }

    video.addEventListener('ended', onEnded);
    rafId = requestAnimationFrame(loop);

    return () => {
      video.removeEventListener('ended', onEnded);
      cancelAnimationFrame(rafId);
    };
  }, [ref]);
}

export default function BangaloreLandInvestmentGuide() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useVideoLoop(videoRef);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* Video Background - z-0 */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute z-0 w-auto min-w-full min-h-full max-w-none object-cover"
        style={{ top: '300px', inset: 'auto 0 0 0' }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* ponytail: single dark overlay, no white bands */}
      <div className="absolute inset-0 z-[1] bg-black/40" />

      {/* Hero Section - z-10 */}
      <section
        className="relative z-10 flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: '8rem', paddingBottom: '10rem' }}
      >
        {/* Headline */}
        <h1
          className="max-w-7xl text-5xl font-normal sm:text-7xl md:text-8xl text-white animate-fade-rise"
          style={{
            fontFamily: "'Instrument Serif', serif",
            lineHeight: 0.95,
            letterSpacing: '-2.46px',
          }}
        >
          Your complete guide to{' '}
          <span className="italic text-white/60">
            land investment
          </span>{' '}
          in{' '}
          <span className="italic text-white/60">
            Bangalore.
          </span>
        </h1>

        {/* Description */}
        <p
          className="mt-8 max-w-2xl text-base leading-relaxed sm:text-lg text-white/60 animate-fade-rise-delay"
        >
          From RERA-approved layouts to agricultural land conversion, from price
          trends to legal due diligence — everything you need to make informed
          land investment decisions in India's Silicon Valley.
        </p>

        {/* CTA */}
        <button
          className="mt-12 rounded-full px-14 py-5 text-base text-white transition-transform hover:scale-105 animate-fade-rise-delay-2"
          style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
        >
          Start Your Research
        </button>
      </section>
    </div>
  );
}
