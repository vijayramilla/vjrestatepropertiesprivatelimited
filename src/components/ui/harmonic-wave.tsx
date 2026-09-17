// Harmonic Wave — scroll-driven card choreography, rethemed for VJR Estate
// PG building storytelling (navy/gold, ROI copy, PG building exteriors only).
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

// Bangalore PG building exteriors only — mid rise rental blocks, balconied
// letting floors, corner plots. No interiors, no skylines.
const IMG = {
  towerDusk:
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80&auto=format&fit=crop",
  pgBlock:
    "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=1200&q=80&auto=format&fit=crop",
  cornerEntry:
    "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200&q=80&auto=format&fit=crop",
  corridorBlock:
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80&auto=format&fit=crop",
  stuccoBlock:
    "https://images.unsplash.com/photo-1494891848038-7bd202a2afeb?w=1200&q=80&auto=format&fit=crop",
  managedBlock:
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1200&q=80&auto=format&fit=crop",
  lettingBlock:
    "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&q=80&auto=format&fit=crop",
  apartmentTower:
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&q=80&auto=format&fit=crop",
} as const;

const SCALE: Partial<Record<number, number>> = {
  1: 0.88,
  2: 0.78,
  3: 0.88,
  4: 0.78,
  5: 0.78,
  6: 0.88,
  7: 0.88,
  8: 0.68,
};

const s = (i: number) => SCALE[i] ?? 1;

export interface StackSpreadItem {
  src: string;
  alt?: string;
}

export interface StackSpreadTarget {
  x: number;
  y: number;
  rotate: number;
  scale?: number;
  w: number;
  h: number;
}

export interface StackSpreadCard {
  item: StackSpreadItem;
  target: StackSpreadTarget;
  targetSm?: { x: number; y: number };
  waveRotate?: number;
  waveOffset?: { x: number; y: number };
  z?: number;
}

// Initial positions mapped along a sine wave, scattering into a cinematic
// spread as the section scrolls.
const CARDS: StackSpreadCard[] = [
  {
    item: { src: IMG.towerDusk, alt: "PG building at dusk in Whitefield, Bangalore" },
    waveOffset: { x: -36, y: -12 },
    waveRotate: -6,
    // Desktop spread keeps three clear bands (top row, far sides, bottom row)
    // so the centre headline never sits on top of a photo.
    target: { x: -24, y: -40, rotate: -4, scale: s(8), w: 16, h: 21 },
    targetSm: { x: -23, y: -42 },
    z: 2,
  },
  {
    item: { src: IMG.pgBlock, alt: "Purpose built PG block in HSR Layout, Bangalore" },
    waveOffset: { x: -26, y: 12 },
    waveRotate: -3,
    target: { x: -6, y: -44, rotate: -3, scale: s(7), w: 17, h: 30 },
    targetSm: { x: 23, y: -36 },
    z: 3,
  },
  {
    item: { src: IMG.cornerEntry, alt: "High occupancy PG building on Sarjapur Road" },
    waveOffset: { x: -16, y: -16 },
    waveRotate: 0,
    target: { x: 8, y: -42, rotate: 2, scale: s(6), w: 24, h: 28 },
    targetSm: { x: -23, y: -36 },
    z: 4,
  },
  {
    item: { src: IMG.corridorBlock, alt: "Modern PG block near Bangalore's Electronic City tech corridor" },
    waveOffset: { x: -6, y: 14 },
    waveRotate: 3,
    target: { x: 28, y: -40, rotate: 4, scale: s(5), w: 17, h: 30 },
    targetSm: { x: 23, y: -42 },
    z: 5,
  },
  {
    item: { src: IMG.stuccoBlock, alt: "Rental income building on Outer Ring Road, Bangalore" },
    waveOffset: { x: 4, y: -14 },
    waveRotate: -3,
    target: { x: -40, y: -6, rotate: -3, scale: s(4), w: 14, h: 30 },
    targetSm: { x: -23, y: 36 },
    z: 6,
  },
  {
    item: { src: IMG.managedBlock, alt: "Managed PG building in Marathahalli, Bangalore" },
    waveOffset: { x: 14, y: 16 },
    waveRotate: 2,
    target: { x: 40, y: 8, rotate: 3, scale: s(3), w: 17, h: 30 },
    targetSm: { x: 23, y: 42 },
    z: 7,
  },
  {
    item: { src: IMG.lettingBlock, alt: "Full occupancy PG building in Bellandur, Bangalore" },
    waveOffset: { x: 24, y: -12 },
    waveRotate: 5,
    target: { x: -28, y: 38, rotate: -2, scale: s(2), w: 19, h: 25 },
    targetSm: { x: -23, y: 42 },
    z: 8,
  },
  {
    item: { src: IMG.apartmentTower, alt: "PG investment building in Yelahanka, Bangalore" },
    waveOffset: { x: 34, y: 10 },
    waveRotate: 7,
    target: { x: 26, y: 38, rotate: 2, scale: s(1), w: 15, h: 19 },
    targetSm: { x: 23, y: 36 },
    z: 9,
  },
];

const SCATTER_START = 0.12;
const SCATTER_END = 0.85;
const PARALLAX_INTENSITY = 3.0;
const SPRING_CONFIG = { stiffness: 75, damping: 20, mass: 0.8 };
const PROGRESS_SPRING = { stiffness: 90, damping: 30, restDelta: 0.0001 };

const GOLD = "#E4C877";
const SERIF = "'Instrument Serif', Georgia, serif";

// Copy in VJR's voice. Numbers come from our own PG investment research:
// 0.8 to 1.2 percent of property value per month, 90 percent plus occupancy
// near Whitefield, Electronic City, HSR Layout and Marathahalli tech corridors.
// Wording follows Bangalore PG market research: lakhs of tech migrations a
// year, 0.8 to 1.2 percent of building value earned monthly, 90 percent plus
// occupancy near Whitefield, ORR, Electronic City and Sarjapur Road, and 18
// to 25 percent net annual returns for well managed blocks.
const KICKER = "Bangalore PG Building Investments";
const HEADLINE_TOP = "PG Buildings.";
const HEADLINE_ACCENT = "Returns, floor after floor.";
const SUB =
  "Lakhs of professionals move to Bangalore's tech corridors every year. A well located PG building converts that demand into steady monthly rental income.";

const STATS = [
  { value: "0.8%+", label: "Monthly return on building value" },
  { value: "90%+", label: "Occupancy near IT parks" },
  { value: "18 to 25%", label: "Net annual PG returns" },
];

const RESPONSIVE = {
  desktop: {
    scale: null as number | null,
    small: false,
    colX: null as number | null,
    card: null as { w: number; h: number } | null,
  },
  small: {
    scale: 0.72,
    small: true,
    // null keeps the raw per-card x so rows can stagger cleanly.
    colX: null,
    card: { w: 42, h: 20 },
  },
};

function useResponsive() {
  const [r, setR] = useState(RESPONSIVE.desktop);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const read = () => setR(mq.matches ? RESPONSIVE.small : RESPONSIVE.desktop);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return r;
}

function useNarrowViewport() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const read = () => setNarrow(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return narrow;
}

function usePointerParallax(active: boolean, enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING_CONFIG);
  const y = useSpring(rawY, SPRING_CONFIG);

  useEffect(() => {
    if (!enabled) return;
    if (!active) {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    const onMove = (event: PointerEvent) => {
      rawX.set((event.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((event.clientY / window.innerHeight - 0.5) * 2);
    };
    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [active, enabled, rawX, rawY]);

  return { x, y };
}

function Card({
  card,
  progress,
  reduce,
  scaleMul,
  isSmall,
  colX,
  fixedCard,
  stackScale,
  cardRadius,
  pointer,
  index,
  total,
  isSpreadActive,
}: {
  card: StackSpreadCard;
  progress: MotionValue<number>;
  reduce: boolean | null;
  scaleMul: number | null;
  isSmall: boolean;
  colX: number | null;
  fixedCard: { w: number; h: number } | null;
  stackScale: number;
  cardRadius: number;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  index: number;
  total: number;
  isSpreadActive: boolean;
}) {
  const { item, target } = card;

  const flat = reduce === true;
  const waveRotate = flat ? 0 : card.waveRotate ?? 0;
  const waveOffset = card.waveOffset ?? { x: 0, y: 0 };
  const restScale = scaleMul ?? target.scale ?? 1;

  const sm = isSmall && card.targetSm ? card.targetSm : null;
  const endX = sm ? (colX != null ? Math.sign(sm.x) * colX : sm.x) : target.x;
  const endY = sm ? sm.y : target.y;
  const endRotate = flat || isSmall ? 0 : target.rotate;

  const depthFactor = 0.5 + (index / (total - 1 || 1)) * 0.7;

  const translate = useTransform(
    [progress, pointer.x, pointer.y],
    ([p, px, py]: number[]) => {
      const easeP = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      const tx = waveOffset.x + (endX - waveOffset.x) * easeP;
      const ty = waveOffset.y + (endY - waveOffset.y) * easeP;

      // Pointer parallax is desktop only; on touch devices px/py stay 0.
      const dx = tx - px * PARALLAX_INTENSITY * depthFactor * p;
      const dy = ty - py * PARALLAX_INTENSITY * depthFactor * p;
      return `calc(-50% + ${dx}vw) calc(-50% + ${dy}vh)`;
    }
  );

  const rotate = useTransform(progress, [0, 1], [waveRotate, endRotate]);
  const scale = useTransform(progress, [0, 1], [stackScale, restScale]);

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 will-change-transform cursor-pointer"
      style={{
        width: `${fixedCard ? fixedCard.w : target.w}vw`,
        height: `${fixedCard ? fixedCard.h : target.h}vh`,
        zIndex: card.z ?? 1,
        translate,
        rotate,
        scale,
      }}
      whileHover={
        isSpreadActive && !isSmall
          ? { scale: restScale * 1.06, y: -12, zIndex: 100, transition: { type: "spring", stiffness: 300, damping: 20 } }
          : undefined
      }
    >
      <div
        className="relative h-full w-full overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 transition-shadow duration-300 hover:shadow-[#C9A84C]/25 max-md:rounded-[4vw]"
        style={{ borderRadius: `${cardRadius}px` }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/10 opacity-70 pointer-events-none z-10" />
        <img
          src={item.src}
          alt={item.alt ?? ""}
          draggable={false}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
        />
      </div>
    </motion.div>
  );
}

interface StackSpreadStageProps {
  cards: StackSpreadCard[];
  scrollLength?: number;
  bgColor?: string;
  stackScale?: number;
  cardRadius?: number;
  textColor?: string;
  textFadeStart?: number;
  showScrollHint?: boolean;
}

function StackSpreadStage({
  cards,
  scrollLength = 380,
  bgColor,
  stackScale = 0.72,
  cardRadius = 14,
  textColor,
  textFadeStart = 0.28,
  showScrollHint = true,
}: StackSpreadStageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scale: scaleMul, small: isSmall, colX, card: fixedCard } = useResponsive();
  const narrow = useNarrowViewport();

  // Mobile gets a much shorter scroll runway so the story resolves quickly
  // instead of eating a third of the page scroll.
  const length = narrow ? Math.min(scrollLength, 230) : scrollLength;

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, PROGRESS_SPRING);

  const progress = useTransform(
    smoothProgress,
    [0, SCATTER_START, SCATTER_END, 1],
    [0, 0, 1, 1]
  );

  const [spread, setSpread] = useState(false);
  useMotionValueEvent(progress, "change", (p) => {
    setSpread((was) => (was ? p > 0.985 : p >= 0.999));
  });

  const parallaxEnabled = reduce !== true && !isSmall;
  const pointer = usePointerParallax(spread, parallaxEnabled);

  const noScale = reduce === true;
  const copyOpacity = useTransform(progress, [textFadeStart, textFadeStart + 0.3], [0, 1]);
  const copyScale = useTransform(progress, [textFadeStart, 0.88], [0.9, 1]);
  const hintOpacity = useTransform(progress, [0, SCATTER_START], [1, 0]);

  return (
    <section
      ref={wrapRef}
      className="relative w-full select-none bg-[#0A1628] text-white transition-colors duration-300"
      style={{ height: `${length}vh`, ...(bgColor ? { backgroundColor: bgColor } : {}) }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Ambient gold glow behind the wave — lighter and smaller on mobile
            to keep the blur layer cheap on GPUs. */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25 max-md:opacity-20 blur-[140px] max-md:blur-[90px]">
          <div className="w-[45vw] h-[45vw] rounded-full bg-[#C9A84C] mix-blend-screen max-md:w-[85vw] max-md:h-[85vw]" />
        </div>

        {/* Centre brand headline — PG ROI story */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center max-md:px-8"
          style={{
            opacity: copyOpacity,
            scale: noScale ? 1 : copyScale,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#C9A84C] max-md:text-[3vw] max-md:tracking-[0.2em]">
            {KICKER}
          </p>
          <h2
            className="mt-3 w-full whitespace-pre-line font-display text-[4.8vw] font-bold leading-[1.06] tracking-tight max-md:mt-2 max-md:text-[10vw]"
            style={textColor ? { color: textColor } : undefined}
          >
            {HEADLINE_TOP}
            <span
              className="mt-2 block font-normal italic max-md:mt-1 max-md:text-[8.5vw]"
              style={{ fontFamily: SERIF, fontWeight: 400, color: GOLD, letterSpacing: "0em" }}
            >
              {HEADLINE_ACCENT}
            </span>
          </h2>
          <p
            className="mt-[1.4vw] w-full max-w-[44ch] text-[1.1vw] font-light leading-relaxed tracking-wide text-white/60 max-md:mt-3 max-md:max-w-[28ch] max-md:text-[3.4vw]"
            style={textColor ? { color: textColor } : undefined}
          >
            {SUB}
          </p>

          {/* ROI stat strip */}
          <div className="mt-[2.4vw] flex items-start justify-center gap-[3.5vw] max-md:mt-5 max-md:gap-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <span className="font-numeric text-[1.8vw] font-bold text-[#E4C877] max-md:text-[5vw]">
                  {stat.value}
                </span>
                <span className="mt-1.5 max-w-[16ch] text-[0.7vw] font-medium uppercase tracking-[0.2em] text-white/50 max-md:mt-1 max-md:max-w-[12ch] max-md:text-[2.2vw] max-md:tracking-[0.12em]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Cards Wave Stage */}
        <div className="absolute inset-0 z-10">
          {cards.map((card, i) => (
            <Card
              key={i}
              card={card}
              progress={progress}
              reduce={reduce}
              scaleMul={scaleMul}
              isSmall={isSmall}
              colX={colX}
              fixedCard={fixedCard}
              stackScale={stackScale}
              cardRadius={cardRadius}
              pointer={pointer}
              index={i}
              total={cards.length}
              isSpreadActive={spread}
            />
          ))}
        </div>

        {/* Scroll Instruction Hint */}
        {showScrollHint && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-[4vh] z-20 flex flex-col items-center gap-[0.8vh] text-[0.75vw] font-medium uppercase tracking-[0.25em] max-md:bottom-6 max-md:gap-1 max-md:text-[2.6vw]"
            style={{
              opacity: hintOpacity,
              ...(textColor ? { color: textColor } : {}),
            }}
          >
            <span className="text-white/70">Scroll to See the Returns</span>
            <div className="w-[1px] h-6 bg-current opacity-30 relative overflow-hidden">
              <motion.div
                className="absolute inset-x-0 top-0 h-full bg-[#C9A84C]"
                animate={{ y: ["-100%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

export interface HarmonicWaveProps {
  scrollLength?: number;
  bgColor?: string;
  stackScale?: number;
  cardRadius?: number;
  textColor?: string;
  textFadeStart?: number;
  showScrollHint?: boolean;
}

export default function HarmonicWave({
  scrollLength = 380,
  bgColor,
  stackScale = 0.72,
  cardRadius = 14,
  textColor,
  textFadeStart = 0.28,
  showScrollHint = true,
}: HarmonicWaveProps = {}) {
  return (
    <StackSpreadStage
      cards={CARDS}
      scrollLength={scrollLength}
      bgColor={bgColor}
      stackScale={stackScale}
      cardRadius={cardRadius}
      textColor={textColor}
      textFadeStart={textFadeStart}
      showScrollHint={showScrollHint}
    />
  );
}
