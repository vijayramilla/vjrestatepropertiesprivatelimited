import {
  motion,
  type PanInfo,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  Cards,
  ClockCounterClockwise,
  Eye,
  Heart,
  MapPin,
  X,
} from '@phosphor-icons/react';
import SupabaseImage from '@/components/common/SupabaseImage';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

// Tune the deck look and feel here — no need to touch the logic below.
const defaultSettings = {
  width: 340, // card width in px (desktop/base size)
  height: 460, // card height in px (desktop/base size)
  radius: 18, // corner roundness in px
  swipeThreshold: 120, // drag distance before the card flies to the back
  stackRotation: 3.5, // degrees each card behind the front one tilts
  stackScale: 0.045, // how much smaller each card behind the front one gets
  tiltStrength: 16, // 3D tilt while dragging
  springStiffness: 300, // snap of the drag/return animation
  springDamping: 30, // how quickly the bounce settles
  maxVisible: 5, // cards rendered in the pile at once
  // Below this viewport width cards shrink by mobileScale so the deck
  // always fits small phones with breathing room. Narrow phones clamp
  // further so card + padding never overflow (see useResponsiveScale).
  mobileBreakpoint: 640,
  mobileScale: 0.8,
};

export type SwipeCardsSettings = typeof defaultSettings;

export interface SwipeCardItem {
  id: string;
  img: string;
  title: string;
  location: string;
  price: string;
  /** Formatted monthly rental, e.g. "₹85,000" or "—" when not applicable. */
  rentalIncome: string;
  khata: string;
  photoCount?: number;
}

interface SwipeCardProps {
  item: SwipeCardItem;
  isFront: boolean;
  zIndex: number;
  index: number;
  onAdvance: (id: string) => void;
  onDetails?: (id: string) => void;
  saved: boolean;
  settings: SwipeCardsSettings;
}

function SwipeCard({
  item,
  isFront,
  zIndex,
  index,
  onAdvance,
  onDetails,
  saved,
  settings,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Drag distance becomes a 3D tilt plus the classic horizontal lean.
  const rotateX = useTransform(
    y,
    [-200, 200],
    [settings.tiltStrength, -settings.tiltStrength],
  );
  const rotateY = useTransform(
    x,
    [-200, 200],
    [-settings.tiltStrength, settings.tiltStrength],
  );
  const rotate = useTransform(x, [-200, 200], [-10, 10]);

  function handleDragEnd(
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    dragOffsetRef.current = { x: info.offset.x, y: info.offset.y };
    const draggedFarEnough =
      Math.abs(info.offset.x) > settings.swipeThreshold ||
      Math.abs(info.offset.y) > settings.swipeThreshold;

    if (draggedFarEnough) onAdvance(item.id);
    // dragSnapToOrigin springs the card back / resets after reorder.
  }

  const handleCardClick = () => {
    if (!isFront || !onDetails) return;
    const { x: dx, y: dy } = dragOffsetRef.current;
    dragOffsetRef.current = { x: 0, y: 0 };
    // Ignore clicks that were really the tail end of a drag.
    if (Math.hypot(dx, dy) > 10) return;
    onDetails(item.id);
  };

  const hasIncome = item.rentalIncome && item.rentalIncome !== '—';

  return (
    <motion.div
      className="absolute cursor-grab select-none active:cursor-grabbing"
      style={{
        width: settings.width,
        height: settings.height,
        x: isFront ? x : 0,
        y: isFront ? y : 0,
        rotateX: isFront ? rotateX : 0,
        rotateY: isFront ? rotateY : 0,
        rotate: isFront ? rotate : 0,
        zIndex,
      }}
      // Horizontal-only drag: the browser keeps vertical panning, so users
      // can still scroll the page from anywhere on the card on touch devices.
      drag={isFront ? 'x' : false}
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.5}
      dragSnapToOrigin
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      whileHover={isFront ? { scale: 1.02 } : {}}
      transition={{
        type: 'spring',
        stiffness: settings.springStiffness,
        damping: settings.springDamping,
      }}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden bg-white shadow-[0_18px_44px_rgba(10,22,40,0.16)]"
        style={{ borderRadius: settings.radius }}
        animate={{
          rotateZ: index * settings.stackRotation,
          scale: 1 - index * settings.stackScale,
          transformOrigin: '85% 85%',
        }}
        initial={false}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        {/* Photo */}
        <div className="relative w-full overflow-hidden bg-gray-100" style={{ height: '56%' }}>
          {item.img ? (
            <SupabaseImage
              src={item.img}
              alt={item.title}
              priority={isFront}
              preset="card"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-950">
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              />
              <Cards size={36} weight="thin" className="text-white/15" />
              <span className="mt-2 text-[9px] font-medium uppercase tracking-[0.18em] text-white/20">
                Image Coming Soon
              </span>
            </div>
          )}

          {item.photoCount != null && item.photoCount > 0 && (
            <span
              className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-[4px]"
              style={{ fontFamily: DM_SANS }}
            >
              {item.photoCount} {item.photoCount === 1 ? 'Photo' : 'Photos'}
            </span>
          )}

          {saved && (
            <span
              className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-[#0A1628] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white"
              style={{ fontFamily: DM_SANS }}
            >
              <Heart size={9} weight="fill" color="#C9A84C" />
              Saved
            </span>
          )}
        </div>

        {/* Details */}
        <div
          className="flex flex-1 flex-col p-3.5 sm:p-4"
          style={{ fontFamily: DM_SANS, height: '44%' }}
        >
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-gray-900">
            {item.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-[12px] text-gray-500">
            <MapPin size={12} weight="regular" color="#9ca3af" className="shrink-0" />
            <span className="truncate">{item.location}</span>
          </p>

          <div className="mt-auto border-t border-[#F3F4F6] pt-2.5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-gray-400">
                  Asking Price
                </p>
                <p className="font-numeric mt-0.5 truncate text-[21px] font-extrabold leading-none tracking-tight text-gray-900">
                  {item.price}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-gray-400">
                  Monthly Income
                </p>
                <p
                  className={`font-numeric mt-0.5 truncate text-[15px] font-bold leading-tight ${
                    hasIncome ? 'text-[#22C26E]' : 'text-gray-400'
                  }`}
                >
                  {item.rentalIncome}
                  {hasIncome && (
                    <span className="text-[10px] font-semibold text-[#22C26E]/70">/mo</span>
                  )}
                </p>
              </div>
            </div>
            <p className="mt-2.5 text-[10.5px] text-gray-500">
              <span className="font-bold uppercase tracking-[0.08em] text-gray-400">Khata</span>
              <span className="ml-1.5 font-semibold text-gray-900">{item.khata}</span>
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface SwipeCardsProps {
  cards?: SwipeCardItem[];
  settings?: Partial<SwipeCardsSettings>;
  className?: string;
  /** Called when the front card is tapped (without dragging). */
  onDetails?: (id: string) => void;
  /** Toggles the front card's shortlist state (heart button). */
  onToggleSave?: (id: string) => void;
  isSaved?: (id: string) => boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
}

function useResponsiveScale(breakpoint: number, mobileScale: number, baseWidth: number) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      // Desktop keeps full size. Below the breakpoint the card shrinks to
      // mobileScale, clamped so card + surrounding page/deck padding (48px)
      // always fits narrow phones like the 320px iPhone SE.
      if (window.innerWidth > breakpoint) {
        setScale(1);
        return;
      }
      const fit = (window.innerWidth - 48) / baseWidth;
      setScale(Math.min(mobileScale, fit));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [breakpoint, mobileScale, baseWidth]);

  return scale;
}

export function SwipeCards({
  cards = [],
  settings,
  className = '',
  onDetails,
  onToggleSave,
  isSaved,
  emptyTitle = 'That is every pick',
  emptySubtitle = 'You have flipped through the whole deck. Start over or browse the full listings.',
}: SwipeCardsProps) {
  const baseConfig = { ...defaultSettings, ...settings };
  const scale = useResponsiveScale(
    baseConfig.mobileBreakpoint,
    baseConfig.mobileScale,
    baseConfig.width,
  );
  const config = {
    ...baseConfig,
    width: Math.round(baseConfig.width * scale),
    height: Math.round(baseConfig.height * scale),
  };

  const [cardList, setCardList] = useState(cards);

  // The deck resets whenever the page feeds a new set of cards
  // (category chip change, fresh listings load).
  const cardsKey = cards.map((c) => c.id).join('|');
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  useEffect(() => {
    setCardList(cardsRef.current);
  }, [cardsKey]);

  const moveToBack = (id: string) => {
    setCardList((prev) => {
      const updated = [...prev];
      const cardIndex = updated.findIndex((card) => card.id === id);
      if (cardIndex !== -1) {
        const [movedCard] = updated.splice(cardIndex, 1);
        updated.push(movedCard);
      }
      return updated;
    });
  };

  // A swipe (or the × button) only cycles to the next card; shortlisting
  // happens through the heart button so a casual swipe never saves anything.
  const handleAdvance = (id: string) => {
    moveToBack(id);
  };

  const front = cardList[0];
  const frontSaved = !!front && !!isSaved?.(front.id);

  return (
    <div className={`flex select-none flex-col items-center gap-5 p-3 sm:p-6 ${className}`}>
      <div
        className="relative mx-auto"
        style={{
          width: config.width,
          height: config.height,
          perspective: 1200,
        }}
      >
        {cardList.slice(0, config.maxVisible).map((card, index) => (
          <SwipeCard
            key={card.id}
            item={card}
            isFront={index === 0}
            zIndex={cardList.length - index}
            index={index}
            settings={config}
            saved={isSaved ? isSaved(card.id) : false}
            onDetails={onDetails}
            onAdvance={handleAdvance}
          />
        ))}

        {cardList.length === 0 && (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 text-center"
            style={{ width: config.width, height: config.height, fontFamily: DM_SANS }}
          >
            {cardsRef.current.length > 0 ? (
              <>
                <Cards size={34} weight="thin" className="text-gray-300" />
                <p className="mt-3 text-[15px] font-bold text-gray-900">{emptyTitle}</p>
                <p className="mt-1 max-w-[28ch] text-[12px] leading-relaxed text-gray-500">
                  {emptySubtitle}
                </p>
                <button
                  type="button"
                  onClick={() => setCardList(cardsRef.current)}
                  className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#C9A84C] px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#D6B85D] active:scale-[0.98]"
                >
                  <ClockCounterClockwise size={13} weight="bold" />
                  Start Over
                </button>
              </>
            ) : (
              <>
                <Cards size={34} weight="thin" className="text-gray-300" />
                <p className="mt-3 text-[14px] font-semibold text-gray-500">
                  No picks to show yet
                </p>
                <p className="mt-1 max-w-[26ch] text-[11.5px] leading-relaxed text-gray-400">
                  New listings appear here the moment they go live.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {cardList.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Skip property"
            onClick={() => handleAdvance(front.id)}
            className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-gray-200 bg-white text-gray-700 shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all hover:bg-gray-50 active:scale-[0.96]"
          >
            <X size={17} weight="bold" />
          </button>

          {onDetails && (
            <button
              type="button"
              onClick={() => onDetails(front.id)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#C9A84C] px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#D6B85D] active:scale-[0.98]"
              style={{ fontFamily: DM_SANS }}
            >
              <Eye size={14} weight="bold" />
              View Details
            </button>
          )}

          {onToggleSave && (
            <button
              type="button"
              aria-label={frontSaved ? 'Remove from shortlist' : 'Save to shortlist'}
              onClick={() => onToggleSave(front.id)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-all active:scale-[0.96] ${
                frontSaved
                  ? 'border-transparent bg-[#0A1628] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Heart
                size={17}
                weight={frontSaved ? 'fill' : 'bold'}
                color={frontSaved ? '#C9A84C' : undefined}
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SwipeCards;
