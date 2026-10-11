import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Plus, Minus } from 'lucide-react';
import {
  Couch,
  WashingMachine,
  ForkKnife,
  Fan,
  Lightbulb,
  Television,
  Bed,
  Shower,
  GasPump,
  Fire,
  Drop,
  ChefHat,
  Buildings,
  Tree,
  Waves,
  Camera,
  SpeakerHigh,
  Basketball,
  Flower,
  Lock,
  Handshake,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

/**
 * Residential-only furnishing & society-amenity selector.
 * Housing.com-style grid inside a Radix Dialog (project's existing dialog
 * primitive is @radix-ui/react-dialog directly — src/components/ui/dialog
 * wraps exactly this and adds animation classes; here we use the wrapper's
 * primitives via the same pattern so focus trap, Escape key, scroll lock,
 * and aria behaviour all come from Radix for free).
 */

/* ── Flat furnishings (18) — the 7 COUNTABLE ones use the −qty+ control ── */
type FurnishingKind = 'toggle' | 'count';

interface Furnishing {
  label: string;
  kind: FurnishingKind;
  icon: Icon;
  /** extra_details key when stored */
  key: string;
}

const FLAT_FURNISHINGS: Furnishing[] = [
  { label: 'Dining Table', kind: 'toggle', icon: ForkKnife as unknown as Icon, key: 'Dining Table' },
  { label: 'Washing Machine', kind: 'toggle', icon: WashingMachine as unknown as Icon, key: 'Washing Machine' },
  { label: 'Cupboard', kind: 'toggle', icon: Handshake as unknown as Icon, key: 'Cupboard' },
  { label: 'Sofa', kind: 'toggle', icon: Couch as unknown as Icon, key: 'Sofa' },
  { label: 'Microwave', kind: 'toggle', icon: ForkKnife as unknown as Icon, key: 'Microwave' },
  { label: 'Stove', kind: 'toggle', icon: Fire as unknown as Icon, key: 'Stove' },
  { label: 'Fridge', kind: 'toggle', icon: Drop as unknown as Icon, key: 'Fridge' },
  { label: 'Water Purifier', kind: 'toggle', icon: Drop as unknown as Icon, key: 'Water Purifier' },
  { label: 'Gas Pipeline', kind: 'toggle', icon: GasPump as unknown as Icon, key: 'Gas Pipeline' },
  { label: 'Chimney', kind: 'toggle', icon: Fire as unknown as Icon, key: 'Chimney' },
  { label: 'Modular Kitchen', kind: 'toggle', icon: ChefHat as unknown as Icon, key: 'Modular Kitchen' },
  { label: 'Fan', kind: 'count', icon: Fan as unknown as Icon, key: 'Fan' },
  { label: 'Light', kind: 'count', icon: Lightbulb as unknown as Icon, key: 'Light' },
  { label: 'AC', kind: 'count', icon: Waves as unknown as Icon, key: 'AC' },
  { label: 'Wardrobe', kind: 'count', icon: Buildings as unknown as Icon, key: 'Wardrobe' },
  { label: 'TV', kind: 'count', icon: Television as unknown as Icon, key: 'TV' },
  { label: 'Bed', kind: 'count', icon: Bed as unknown as Icon, key: 'Bed' },
  { label: 'Geyser', kind: 'count', icon: Shower as unknown as Icon, key: 'Geyser' },
];

const COUNTABLE: string[] = ['Fan', 'Light', 'AC', 'Wardrobe', 'TV', 'Bed', 'Geyser'];
/** Sensible ceiling per countable item — prevents accidental absurd values. */
const QTY_MAX = 20;

/* ── Society amenities (17) ── */
interface Amenity {
  label: string;
  icon: Icon;
}

const SOCIETY_AMENITIES: Amenity[] = [
  { label: 'Power Backup', icon: Lightbulb as unknown as Icon },
  { label: 'AC', icon: Waves as unknown as Icon },
  { label: 'TV', icon: Television as unknown as Icon },
  { label: 'Geyser', icon: Shower as unknown as Icon },
  { label: 'Swimming Pool', icon: Waves as unknown as Icon },
  { label: 'Lift', icon: Buildings as unknown as Icon },
  { label: 'Gym', icon: Basketball as unknown as Icon },
  { label: 'Intercom', icon: SpeakerHigh as unknown as Icon },
  { label: 'Garden', icon: Tree as unknown as Icon },
  { label: 'Sports', icon: Basketball as unknown as Icon },
  { label: 'Kids Area', icon: Flower as unknown as Icon },
  { label: 'CCTV', icon: Camera as unknown as Icon },
  { label: 'Gated Community', icon: Lock as unknown as Icon },
  { label: 'Club House', icon: Buildings as unknown as Icon },
  { label: 'Community Hall', icon: Buildings as unknown as Icon },
  { label: 'Regular Water Supply', icon: Drop as unknown as Icon },
  { label: 'Attached Balcony', icon: Fan as unknown as Icon },
];

/* ── Shape of saved/returned data ───────────────────────────────────────── */

export interface FurnishingSelection {
  /** Furnishing name → quantity (countable) or 'yes' (toggle). */
  items: Record<string, number | 'yes'>;
  /** Society amenity selection — flat list of selected labels. */
  societyAmenities: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: FurnishingSelection;
  onSave: (sel: FurnishingSelection) => void | Promise<void>;
  /** Parent save error, if any — keeps the modal open on failure. */
  saveError?: string;
}

const CARD_BASE =
  'flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/60';
const CARD_UNSELECTED =
  'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#c7d2fe] hover:bg-[#f8faff]';
const CARD_SELECTED =
  'border-[#4338ca] bg-[#eef2ff] text-[#312e81] shadow-[inset_0_0_0_1px_rgba(67,56,202,0.35)]';

const COUNT_CTRL =
  'flex h-7 min-w-[26px] cursor-pointer items-center justify-center rounded-md border border-[#c7d2fe] bg-white text-[#4338ca] transition-colors hover:bg-[#eef2ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/60 disabled:cursor-not-allowed disabled:opacity-40';

export default function FurnishingAmenitiesModal({ open, onOpenChange, initial, onSave, saveError }: Props) {
  // Draft local state — the parent's saved values are not touched until Save,
  // so closing with unsaved changes never corrupts existing data (and this
  // state re-initialises from `initial` every time the dialog re-mounts).
  const [items, setItems] = useState<Record<string, number | 'yes'>>(initial.items);
  const [amenities, setAmenities] = useState<string[]>(initial.societyAmenities);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(initial.items);
      setAmenities(initial.societyAmenities);
      setSaving(false);
    }
    // Re-seed from the parent's committed state every time the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleCount = (name: string, dir: 1 | -1) => {
    setItems((prev) => {
      const maxSize = dir === 1 ? QTY_MAX : 0;
      const cur = typeof prev[name] === 'number' ? (prev[name] as number) : 0;
      const next = Math.min(Math.max(cur + dir, 0), maxSize);
      return { ...prev, [name]: next };
    });
  };

  const toggleItem = (name: string) => {
    setItems((prev) => {
      const next = { ...prev };
      if (next[name] === 'yes') delete next[name];
      else next[name] = 'yes';
      return next;
    });
  };

  const toggleAmenity = (name: string) =>
    setAmenities((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));

  const selectedCount = (list: string[]): number =>
    list.filter((label) => {
      const f = FLAT_FURNISHINGS.find((ff) => ff.key === label);
      const val = items[label];
      if (f?.kind === 'count') return typeof val === 'number' && val > 0;
      return val === 'yes';
    }).length;

  const flatCount = selectedCount(FLAT_FURNISHINGS.map((f) => f.key));
  const societyCount = amenities.length;

  const handleSave = async () => {
    if (saving) return; // duplicate-save guard
    try {
      setSaving(true);
      const cleaned: Record<string, number | 'yes'> = {};
      for (const [k, v] of Object.entries(items)) {
        if (v === 'yes') cleaned[k] = 'yes';
        else if (typeof v === 'number' && v > 0) cleaned[k] = v;
        // zero-valued countables are intentionally dropped — they mean unselected
      }
      await onSave({ items: cleaned, societyAmenities: amenities.filter(Boolean) });
      // Parent decides when to close — on success it closes via onOpenChange.
    } catch {
      setSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-[820px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:w-[92vw] md:w-full"
          aria-describedby={undefined}
        >
          {/* sticky header — title + close, always accessible while content scrolls */}
          <div className="flex items-start justify-between gap-3 border-b border-[#eef2f7] px-5 pb-4 pt-5 sm:px-6">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-[16px] font-semibold leading-snug text-[#101828] sm:text-[17px]">
                Add property furnishings and amenities
              </DialogPrimitive.Title>
              <p className="mt-0.5 text-[11.5px] text-[#667085]">Residential Building · what's installed and what the society offers</p>
            </div>
            <DialogPrimitive.Close
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#475467] transition-colors hover:bg-[#f8fafc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/60"
              aria-label="Close"
            >
              <X size={16} />
            </DialogPrimitive.Close>
          </div>

          {/* scrollable content — single scroll area, no nested traps */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {/* 1. Flat Furnishings */}
            <section aria-labelledby="fa-flat-heading">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id="fa-flat-heading" className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#101828]">Flat Furnishings</h3>
                <p aria-live="polite" className="text-[11.5px] font-semibold text-[#4338ca]">{flatCount} selected</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {FLAT_FURNISHINGS.map(({ label, kind, icon: FIcon, key }) => {
                  const val = items[key];
                  const isSelected = kind === 'count' ? typeof val === 'number' && val > 0 : val === 'yes';
                  const qty = typeof val === 'number' ? val : 0;
                  return (
                    <div
                      key={key}
                      className={`${CARD_BASE} ${isSelected ? CARD_SELECTED : CARD_UNSELECTED}`}
                      role={kind === 'toggle' ? 'button' : 'group'}
                      aria-pressed={kind === 'toggle' ? isSelected : undefined}
                      tabIndex={kind === 'toggle' ? 0 : undefined}
                      onClick={kind === 'toggle' ? () => toggleItem(key) : undefined}
                      onKeyDown={kind === 'toggle' ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(key); } } : undefined}
                    >
                      <FIcon size={22} weight={isSelected ? 'fill' : 'duotone'} aria-hidden="true" />
                      <span className="text-[12px] font-semibold leading-tight">{label}</span>
                      {kind === 'count' && (
                        <span className="mt-0.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className={COUNT_CTRL} aria-label={`Decrease ${label} count`} onClick={() => toggleCount(key, -1)} disabled={qty <= 0}>
                            <Minus size={12} />
                          </button>
                          <span aria-live="polite" className="min-w-[18px] text-center text-[13px] font-bold tabular-nums text-[#101828]">{qty}</span>
                          <button type="button" className={COUNT_CTRL} aria-label={`Increase ${label} count`} onClick={() => toggleCount(key, 1)} disabled={qty >= QTY_MAX}>
                            <Plus size={12} />
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Society Amenities */}
            <section aria-labelledby="fa-society-heading" className="mt-7">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id="fa-society-heading" className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#101828]">Society Amenities</h3>
                <p aria-live="polite" className="text-[11.5px] font-semibold text-[#4338ca]">{societyCount} selected</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {SOCIETY_AMENITIES.map(({ label, icon: AIcon }) => {
                  const isSelected = amenities.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleAmenity(label)}
                      className={`${CARD_BASE} ${isSelected ? CARD_SELECTED : CARD_UNSELECTED}`}
                    >
                      <AIcon size={22} weight={isSelected ? 'fill' : 'duotone'} aria-hidden="true" />
                      <span className="text-[12px] font-semibold leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {saveError && (
              <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] font-medium text-red-700">
                {saveError}
              </div>
            )}
          </div>

          {/* sticky footer — Save always reachable */}
          <div className="border-t border-[#eef2f7] px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 sm:px-6" style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}>
            {saveError ? (
              <button type="button" onClick={handleSave} disabled={saving} className="min-h-[46px] w-full rounded-xl bg-[#4338ca] text-[14px] font-semibold text-white transition-colors hover:bg-[#372fa8] disabled:opacity-60">
                {saving ? 'Saving…' : 'Try again'}
              </button>
            ) : (
              <button type="button" onClick={handleSave} disabled={saving} className="min-h-[46px] w-full rounded-xl bg-[#4338ca] text-[14px] font-semibold text-white transition-colors hover:bg-[#372fa8] disabled:opacity-60">
                {saving ? 'Saving…' : `Save (${flatCount + societyCount} selected)`}
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { COUNTABLE, FLAT_FURNISHINGS, SOCIETY_AMENITIES, QTY_MAX };
