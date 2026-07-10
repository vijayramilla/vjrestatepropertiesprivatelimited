import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, type PanInfo } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Navigation,
  Share2,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { CATEGORY_CONFIG, formatMapINR } from '@/data/mapConfig';
import { siteContact } from '@/data/siteContact';
import GlassCard from '@/components/ui/glass-card';
import LazyImage from '@/components/common/LazyImage';
import { useShortlist } from '@/context/ShortlistContext';

export interface MapPopupProperty {
  id: string;
  title: string;
  locality: string;
  propertyType: keyof typeof CATEGORY_CONFIG;
  price: number;
  pricePerSqft: number;
  image: string | null;
  images: string[];
  areaLabel: string;
  dimensions: string;
  khata: string;
  facing: string;
  dcConversion?: string;
  color: string;
  lat: number;
  lng: number;
  listed_by?: string;
}

interface MapPropertyPopupProps {
  property: MapPopupProperty;
  onClose: () => void;
  sidebarOpen?: boolean;
  onAIAnalyze?: () => void;
  isAnalyzing?: boolean;
  analysisResult?: string | null;
  onViewDetails?: (id: string) => void;
}

const SECTION_HEADERS = [
  'INVESTMENT SCORE',
  'LOCATION ADVANTAGE',
  'CONNECTIVITY',
  'NEARBY HIGHLIGHTS',
  'MARKET PRICE ANALYSIS',
  'TOP ADVANTAGES',
  'RISK TO WATCH',
  'VJR VERDICT',
] as const;

type SectionHeader = (typeof SECTION_HEADERS)[number];

interface AnalysisSection {
  header: SectionHeader;
  content: string;
}

function parseSections(text: string): AnalysisSection[] {
  const sections: AnalysisSection[] = [];
  const pattern = SECTION_HEADERS.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`\\*\\*(${pattern})\\*\\*`, 'g');
  let lastIndex = 0;
  let lastHeader: SectionHeader | '' = '';

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (lastHeader) {
      const content = text.slice(lastIndex, match.index).trim();
      if (content) sections.push({ header: lastHeader, content });
    }
    lastHeader = match[1] as SectionHeader;
    lastIndex = regex.lastIndex;
  }

  if (lastHeader) {
    const content = text.slice(lastIndex).trim();
    if (content) sections.push({ header: lastHeader, content });
  }

  return sections;
}

function extractScore(content: string): string | null {
  const m = content.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  return m ? m[1] : null;
}

function extractVerdictType(content: string): 'buy' | 'negotiate' | 'wait' | null {
  if (/\bBUY NOW\b/i.test(content)) return 'buy';
  if (/\bNEGOTIATE\b/i.test(content)) return 'negotiate';
  if (/\bWAIT\b/i.test(content)) return 'wait';
  return null;
}

const sectionIcon: Record<SectionHeader, ReactNode> = {
  'INVESTMENT SCORE': <TrendingUp size={14} />,
  'LOCATION ADVANTAGE': <MapPin size={14} />,
  'CONNECTIVITY': <Navigation size={14} />,
  'NEARBY HIGHLIGHTS': <MapPin size={14} />,
  'MARKET PRICE ANALYSIS': <TrendingUp size={14} />,
  'TOP ADVANTAGES': <Check size={14} />,
  'RISK TO WATCH': <AlertTriangle size={14} />,
  'VJR VERDICT': <Sparkles size={14} />,
};

function contentLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

export default function MapPropertyPopup({
  property,
  onClose,
  sidebarOpen = false,
  onAIAnalyze,
  isAnalyzing = false,
  analysisResult = null,
  onViewDetails,
}: MapPropertyPopupProps) {
  const config = CATEGORY_CONFIG[property.propertyType];
  const gallery = property.images.length
    ? property.images
    : property.image
      ? [property.image]
      : [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = gallery[photoIndex] ?? null;
  const hasMultiplePhotos = gallery.length > 1;

  const [isMobile, setIsMobile] = useState(false);
  const { toggle: toggleShortlist, isShortlisted } = useShortlist();
  const saved = isShortlisted(property.id);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleSheetDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const threshold = 100;
      if (info.offset.y > threshold || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose],
  );

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${property.lat},${property.lng}&travelmode=driving`;
  const shareLocationUrl = `https://www.google.com/maps?q=${property.lat},${property.lng}`;
  const propertyUrl = `${siteContact.siteUrl}/properties/${property.id}`;
const whatsAppText = encodeURIComponent(
    `Hi VJR Estate, I'm interested in this property:\n${property.title || `${config.label} for Sale`}\n${property.propertyType} · ${property.locality}, Bangalore\nPrice: ${formatMapINR(property.price)}\n\n${propertyUrl}`,
  );

  const handleShareLocation = async () => {
    const shareData = {
      title: property.title || config.label,
      text: `${property.title || config.label} — ${property.locality}`,
      url: shareLocationUrl,
    };
if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch {
          // ignore
        }
      }
    window.open(shareLocationUrl, '_blank', 'noopener,noreferrer');
  };

  const sections = analysisResult ? parseSections(analysisResult) : [];
  const scoreSection = sections.find((s) => s.header === 'INVESTMENT SCORE');
  const score = scoreSection ? extractScore(scoreSection.content) : null;
  const verdictSection = sections.find((s) => s.header === 'VJR VERDICT');
  const verdictType = verdictSection ? extractVerdictType(verdictSection.content) : null;

  const verdictColors: Record<string, { bg: string; text: string; border: string }> = {
    buy: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    negotiate: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    wait: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  };

  function renderScoreBadge() {
    if (!score) return null;
    return (
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 px-4 py-3">
        <div className="flex items-baseline gap-0.5">
          <span className="text-3xl font-black text-cyan-300 tracking-tight">{score}</span>
          <span className="text-xs font-semibold text-cyan-500/70">/10</span>
        </div>
        <div className="h-8 w-px bg-cyan-500/20" />
        <p className="text-xs text-gray-400 leading-relaxed flex-1">
          {scoreSection!.content.replace(/\d+(?:\.\d+)?\s*\/\s*10\s*[—–-]\s*/, '').trim()}
        </p>
      </div>
    );
  }

  function renderAdvantagesList(content: string): ReactNode {
    const lines = contentLines(content);
    return (
      <ul className="space-y-1.5">
        {lines.map((line, i) => {
          const text = line.replace(/^\[\+\]\s*/, '').trim();
          if (!text) return null;
          return (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                <Check size={10} className="text-emerald-400" />
              </span>
              {text}
            </li>
          );
        })}
      </ul>
    );
  }

  function renderRiskBlock(content: string): ReactNode {
    const lines = contentLines(content);
    const first = lines[0]?.replace(/^\[!\]\s*/, '').trim() || content;
    return (
      <div className="flex items-start gap-2 rounded-xl bg-amber-500/8 border border-amber-500/15 px-3.5 py-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle size={12} className="text-amber-400" />
        </span>
        <p className="text-xs text-gray-400 leading-relaxed">{first}</p>
      </div>
    );
  }

  function renderVerdictBlock(content: string): ReactNode {
    const colors = verdictType ? verdictColors[verdictType] : verdictColors.wait;
    const lines = contentLines(content);
    const verdictLabel = lines[0]?.replace(/^\[(.*?)\]/, '$1').trim() || '';
    const closing = lines.slice(1).join(' ').trim();
    return (
      <div className="space-y-2">
        <span
          className={`inline-block rounded-full px-3.5 py-1 text-xs font-bold tracking-wider uppercase ${colors.bg} ${colors.text} ${colors.border} border`}
        >
          {verdictLabel}
        </span>
        {closing && <p className="text-xs text-gray-400 leading-relaxed">{closing}</p>}
      </div>
    );
  }

  function renderGenericSection(section: AnalysisSection): ReactNode {
    const lines = contentLines(section.content);
    const isHighlights = section.header === 'NEARBY HIGHLIGHTS';
    return (
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          if (isHighlights) {
            return (
              <p key={i} className="text-xs text-gray-400 leading-relaxed flex items-start gap-1.5">
                <span className="text-gray-600 mt-0.5 shrink-0">&bull;</span>
                {line}
              </p>
            );
          }
          return (
            <p key={i} className="text-xs text-gray-400 leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  }

  function renderSection(section: AnalysisSection): ReactNode {
    const icon = sectionIcon[section.header];
    switch (section.header) {
      case 'INVESTMENT SCORE':
        return null;
      case 'TOP ADVANTAGES':
        return (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-emerald-400">{icon}</span>
              <span className="text-[11px] font-bold tracking-wide text-gray-300 uppercase">
                {section.header.replace(/_/g, ' ')}
              </span>
            </div>
            {renderAdvantagesList(section.content)}
          </div>
        );
      case 'RISK TO WATCH':
        return (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-amber-400">{icon}</span>
              <span className="text-[11px] font-bold tracking-wide text-gray-300 uppercase">
                {section.header.replace(/_/g, ' ')}
              </span>
            </div>
            {renderRiskBlock(section.content)}
          </div>
        );
      case 'VJR VERDICT':
        return (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-cyan-400">{icon}</span>
              <span className="text-[11px] font-bold tracking-wide text-gray-300 uppercase">
                {section.header.replace(/_/g, ' ')}
              </span>
            </div>
            {renderVerdictBlock(section.content)}
          </div>
        );
      default:
        return (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-cyan-400">{icon}</span>
              <span className="text-[11px] font-bold tracking-wide text-gray-300 uppercase">
                {section.header.replace(/_/g, ' ')}
              </span>
            </div>
            {renderGenericSection(section)}
          </div>
        );
    }
  }

  const showAnalysisContent = sections.length > 0;
  const showLoading = isAnalyzing && !analysisResult;

  const photoNavButtons = hasMultiplePhotos && (
    <>
      <button
        type="button"
        onClick={() =>
          setPhotoIndex((i) => (i === 0 ? gallery.length - 1 : i - 1))
        }
        className="absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-gray-800 backdrop-blur-sm shadow-lg transition-all duration-200 hover:bg-white hover:scale-105 active:scale-95"
        aria-label="Previous photo"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() =>
          setPhotoIndex((i) => (i === gallery.length - 1 ? 0 : i + 1))
        }
        className="absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-gray-800 backdrop-blur-sm shadow-lg transition-all duration-200 hover:bg-white hover:scale-105 active:scale-95"
        aria-label="Next photo"
      >
        <ChevronRight size={18} />
      </button>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {gallery.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setPhotoIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === photoIndex ? 'w-5 bg-white shadow-md' : 'w-1.5 bg-white/50 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
      <div className="absolute top-3 right-3 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white">
        {photoIndex + 1}/{gallery.length}
      </div>
    </>
  );

  const imageSection = (
    <div className="relative shrink-0 overflow-hidden">
      {photo ? (
        <div className="relative overflow-hidden">
          {hasMultiplePhotos ? (
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.15, right: 0.15 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -40) {
                  setPhotoIndex((i) => (i === gallery.length - 1 ? 0 : i + 1));
                } else if (info.offset.x > 40) {
                  setPhotoIndex((i) => (i === 0 ? gallery.length - 1 : i - 1));
                }
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <LazyImage
                src={photo}
                alt={property.title}
                className="h-44 w-full object-cover sm:h-40 pointer-events-none"
              />
            </motion.div>
          ) : (
            <LazyImage
              src={photo}
              alt={property.title}
              className="h-44 w-full object-cover sm:h-40"
            />
          )}
          {photoNavButtons}
        </div>
      ) : (
        <div
          className="flex h-36 items-center justify-center text-sm font-semibold text-white sm:h-36"
          style={{ backgroundColor: property.color }}
        >
          {config.label}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all duration-200 hover:bg-black/65 hover:scale-105 active:scale-95"
        aria-label="Close"
      >
        <X size={16} />
      </button>

      <button
        type="button"
        onClick={onAIAnalyze}
        disabled={isAnalyzing}
        className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-800 backdrop-blur-sm shadow-lg transition-all duration-200 hover:bg-white hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="AI Analyze"
      >
        <Sparkles size={16} className={isAnalyzing ? 'animate-spin text-cyan-500' : 'text-cyan-600'} />
      </button>

      <span
        className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-md"
        style={{ backgroundColor: property.color }}
      >
        {config.label}
      </span>
    </div>
  );

  const infoContent = (
    <>
      <div className="px-4 pt-3 sm:px-5 sm:pt-4">
        <div>
          <h3 className="line-clamp-2 text-base font-bold text-gray-900 sm:text-lg">
            {property.title || `${config.label} for Sale`}
          </h3>

          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 sm:text-sm">
            <MapPin size={13} className="shrink-0 text-gray-400" />
            {property.locality}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-block rounded-full bg-black px-2.5 py-0.5 text-[10px] font-medium text-white">
              General Property
            </span>
            <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-medium text-amber-800">
              Listed by {property.listed_by || 'VJR Estate'}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xl font-black text-gray-900 sm:text-2xl tracking-tight">
              {formatMapINR(property.price)}
            </p>
            {property.pricePerSqft > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                ₹{property.pricePerSqft.toLocaleString('en-IN')}/sq.ft
              </p>
            )}
          </div>
          <p className="text-right text-xs font-medium text-gray-600">{property.areaLabel}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <GlassCard compact>
            <p className="text-[10px] tracking-wide text-gray-400 uppercase font-semibold">Dimensions</p>
            <p className="font-semibold text-gray-900 mt-0.5">{property.dimensions && property.dimensions !== '—' ? property.dimensions : '—'}</p>
          </GlassCard>
          <GlassCard compact>
            <p className="text-[10px] tracking-wide text-gray-400 uppercase font-semibold">Facing</p>
            <p className="font-semibold text-gray-900 mt-0.5">{property.facing && property.facing !== '—' ? property.facing : '—'}</p>
          </GlassCard>
          <GlassCard compact>
            <p className="text-[10px] tracking-wide text-gray-400 uppercase font-semibold">Khata</p>
            <p className="font-semibold text-gray-900 mt-0.5">{property.khata && property.khata !== '—' ? property.khata : '—'}</p>
          </GlassCard>
          {property.propertyType === 'Agriculture Land' ? (
            <GlassCard compact>
              <p className="text-[10px] tracking-wide text-gray-400 uppercase font-semibold">DC Conversion</p>
              <p className="font-semibold text-gray-900 mt-0.5">{property.dcConversion ? 'Done' : 'Pending'}</p>
            </GlassCard>
          ) : (
            <GlassCard compact>
              <p className="text-[10px] tracking-wide text-gray-400 uppercase font-semibold">Area</p>
              <p className="font-semibold text-gray-900 mt-0.5">{property.areaLabel || '—'}</p>
            </GlassCard>
          )}
        </div>

        {showLoading && (
          <div className="mt-3">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-cyan-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wide text-cyan-400 uppercase animate-pulse">
                  Analysing property...
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="h-3 w-3/4 rounded bg-gradient-to-r from-cyan-500/10 via-cyan-500/20 to-cyan-500/10 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-gradient-to-r from-cyan-500/10 via-cyan-500/20 to-cyan-500/10 animate-pulse" />
                <div className="h-3 w-5/6 rounded bg-gradient-to-r from-cyan-500/10 via-cyan-500/20 to-cyan-500/10 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-gradient-to-r from-cyan-500/10 via-cyan-500/20 to-cyan-500/10 animate-pulse" />
                <div className="h-3 w-4/6 rounded bg-gradient-to-r from-cyan-500/10 via-cyan-500/20 to-cyan-500/10 animate-pulse" />
              </div>
            </GlassCard>
          </div>
        )}

        {showAnalysisContent && (
          <div className="mt-3">
            <GlassCard>
              <div className="space-y-4">
                {score && renderScoreBadge()}
                {sections
                  .filter((s) => s.header !== 'INVESTMENT SCORE')
                  .map((section, idx) => (
                    <div key={idx}>{renderSection(section)}</div>
                  ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom,0.5rem))] sm:px-5 sm:pb-6">
        <div className="mt-3 grid grid-cols-2 gap-2">
          <GlassCard interactive as="a" href={directionsUrl}>
            <div className="flex items-center justify-center gap-1.5 py-0.5">
              <Navigation size={14} className="text-blue-600" />
              <span className="text-xs font-bold text-gray-800">Directions</span>
            </div>
          </GlassCard>
          <GlassCard interactive as="button" onClick={handleShareLocation}>
            <div className="flex items-center justify-center gap-1.5 py-0.5">
              <Share2 size={14} className="text-gray-600" />
              <span className="text-xs font-bold text-gray-800">Share Location</span>
            </div>
          </GlassCard>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 pb-1">
          <GlassCard interactive as="button" onClick={() => toggleShortlist(property.id)}>
            <div className={`flex items-center justify-center gap-1.5 py-0.5 text-xs font-bold ${saved ? 'text-red-500' : 'text-gray-800'}`}>
              <Heart size={14} className={saved ? 'fill-current' : ''} />
              {saved ? 'Shortlisted' : 'Shortlist'}
            </div>
          </GlassCard>
          <GlassCard interactive as="a" href={`${siteContact.whatsappUrl}?text=${whatsAppText}`}>
            <div className="flex items-center justify-center gap-1.5 py-0.5">
              <WhatsappLogo size={14} weight="fill" className="text-[#25D366]" />
              <span className="text-xs font-bold text-gray-800">WhatsApp</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[200] bg-black/15 backdrop-blur-sm"
        aria-label="Close property card"
        onClick={onClose}
      />

      {isMobile ? (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 300 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleSheetDragEnd}
          className="fixed bottom-0 left-0 right-0 z-[210] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_-4px_60px_rgba(15,23,42,0.15),0_0_80px_-20px_rgba(59,130,246,0.08)]"
          role="dialog"
          aria-label="Property details"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="h-1.5 w-10 rounded-full bg-gray-300" />
          </div>

          {imageSection}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {infoContent}
          </div>
        </motion.div>
      ) : (
        <div
          data-sidebar-open={sidebarOpen ? 'true' : 'false'}
          className="map-property-popup fixed z-[210] flex max-h-[min(82dvh,560px)] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.15),0_0_80px_-20px_rgba(59,130,246,0.08)] sm:max-h-[min(85dvh,580px)] md:max-w-[380px] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent before:pointer-events-none"
          style={{
            left: 'max(0.75rem, env(safe-area-inset-left))',
            right: 'max(0.75rem, env(safe-area-inset-right))',
            bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            width: 'auto',
            maxWidth: '380px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
          role="dialog"
          aria-label="Property details"
          onClick={(e) => e.stopPropagation()}
        >
          {imageSection}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {infoContent}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
