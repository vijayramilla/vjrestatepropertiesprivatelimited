import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, CaretLeft, CaretRight, Crosshair } from '@phosphor-icons/react';
import GlassCard from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { PremiumButton } from '@/components/valuation/PremiumButton';
import {
  ApartmentIcon,
  HouseIcon,
  PlotIcon,
  CommercialIcon,
  PGBuildingIcon,
} from '@/components/valuation/PremiumPropertyIcons';
import { BANGALORE_AREAS, filterLocalities } from '@/data/properties';
import { cn } from '@/lib/utils';
import type { ValuationInput } from '@/utils/aiValuation';

const PROPERTY_TYPES = [
  { id: 'Apartment', icon: ApartmentIcon, label: 'Apartment' },
  { id: 'Independent House', icon: HouseIcon, label: 'Independent House' },
  { id: 'Plot / Land', icon: PlotIcon, label: 'Plot / Land' },
  { id: 'Commercial', icon: CommercialIcon, label: 'Commercial' },
  { id: 'PG Building', icon: PGBuildingIcon, label: 'PG Building' },
];

const LAND_SUBCATEGORIES = ['Residential Plot', 'Commercial Plot', 'Agriculture Land'];
const COMMERCIAL_SUBCATEGORIES = ['Office Space', 'Retail / Showroom', 'Warehouse / Godown', 'Commercial Land'];

const AGE_OPTIONS = ['New Construction', '0-5 Years', '5-10 Years', '10-20 Years', '20+ Years'];
const FACING_OPTIONS = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'];
const STATUS_OPTIONS = ['Ready to Move', 'Under Construction', 'New Launch'];
const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'];

const SUBCATEGORY_MAP: Record<string, string[]> = {
  'Plot / Land': LAND_SUBCATEGORIES,
  Commercial: COMMERCIAL_SUBCATEGORIES,
};

interface ValuationFormProps {
  onValuate: (input: ValuationInput) => void;
  loading: boolean;
}

export default function ValuationForm({ onValuate, loading }: ValuationFormProps) {
  const [step, setStep] = useState(0);
  const [propertyType, setPropertyType] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [locality, setLocality] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [age, setAge] = useState('');
  const [facing, setFacing] = useState('');
  const [floor, setFloor] = useState('');
  const [bhk, setBhk] = useState('');
  const [status, setStatus] = useState('');
  const [localityQuery, setLocalityQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const suggestions = useMemo(
    () => (localityQuery.trim().length > 0 ? filterLocalities(localityQuery, 6) : []),
    [localityQuery],
  );

  const canProceed = () => {
    if (step === 0) {
      if (!propertyType) return false;
      if (SUBCATEGORY_MAP[propertyType]) return !!subCategory;
      return true;
    }
    if (step === 1) return !!locality;
    return false;
  };

  const handleNext = () => {
    setStep((s) => Math.min(s + 1, 2));
  };

  const handlePrev = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = () => {
    if (loading) return;
    onValuate({
      propertyType: subCategory ? `${propertyType} - ${subCategory}` : propertyType,
      locality,
      areaSqft: Number(areaSqft) || 1000,
      age: age || 'New Construction',
      facing: facing || 'East',
      floor: floor || 'Ground',
      bhk: bhk || '2 BHK',
      status: status || 'Ready to Move',
    });
  };

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
          );
          const data = await res.json();
          const address = (data.display_name || '').toLowerCase();
          const match = BANGALORE_AREAS.find((a) => address.includes(a.toLowerCase()));
          if (match) {
            setLocality(match);
            setLocalityQuery(match);
          }
        } catch {
          /* fallback to manual */
        }
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { timeout: 5000 },
    );
  };

  const steps = [
    { label: 'Type', title: 'Select Property Type' },
    { label: 'Location', title: 'Choose Location' },
    { label: 'Details', title: 'Property Details' },
  ];

  return (
    <GlassCard className="w-full max-w-2xl mx-auto p-6 sm:p-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                i < step
                  ? 'bg-emerald-500 text-white'
                  : i === step
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-400',
              )}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span
              className={cn(
                'hidden sm:inline text-xs font-medium transition-colors',
                i === step ? 'text-gray-900' : 'text-gray-400',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-center text-sm font-medium text-gray-900 mb-4">{steps[0].title}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PROPERTY_TYPES.map((t) => {
                const selected = propertyType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setPropertyType(t.id);
                      setSubCategory('');
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                      selected
                        ? 'border-gray-900 bg-gray-100 text-gray-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    )}
                  >
                    <t.icon size={24} selected={selected} />
                    <span className="text-xs font-semibold">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {SUBCATEGORY_MAP[propertyType] && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-5 pt-5 border-t border-gray-100"
              >
                <p className="text-center text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">
                  Select {propertyType} Type
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUBCATEGORY_MAP[propertyType].map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => {
                        setSubCategory(sc);
                      }}
                      className={cn(
                        'rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all',
                        subCategory === sc
                          ? 'border-gray-900 bg-gray-100 text-gray-900'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                      )}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-center text-sm font-medium text-gray-900 mb-4">{steps[1].title}</p>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search Bangalore localities..."
                value={localityQuery}
                onChange={(e) => setLocalityQuery(e.target.value)}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-900 transition-colors"
              />
              <button
                type="button"
                onClick={handleLocate}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                aria-label="Detect my location"
              >
                <Crosshair size={16} />
              </button>
            </div>
            {suggestions.length > 0 && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-white p-1 max-h-48 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setLocality(s);
                      setLocalityQuery(s);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition',
                      locality === s ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <MapPin size={14} className="shrink-0 text-gray-400" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <p className="text-center text-sm font-medium text-gray-900 mb-4">{steps[2].title}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Area (sq.ft)</label>
                <Input
                  type="number"
                  placeholder="e.g. 1500"
                  value={areaSqft}
                  onChange={(e) => setAreaSqft(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">BHK</label>
                <select
                  value={bhk}
                  onChange={(e) => setBhk(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                >
                  <option value="">Select BHK</option>
                  {BHK_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Age</label>
                <select
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                >
                  <option value="">Select Age</option>
                  {AGE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Facing</label>
                <select
                  value={facing}
                  onChange={(e) => setFacing(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                >
                  <option value="">Select Facing</option>
                  {FACING_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Floor</label>
                <select
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                >
                  <option value="">Select Floor</option>
                  {['Ground', '1st', '2nd', '3rd', '4th', '5th+', 'Penthouse'].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                >
                  <option value="">Select Status</option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        {step > 0 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <CaretLeft size={14} />
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 2 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:opacity-40"
          >
            Next
            <CaretRight size={14} />
          </button>
        ) : (
          <PremiumButton
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
            className="min-w-[160px]"
          >
            Get Valuation
          </PremiumButton>
        )}
      </div>
    </GlassCard>
  );
}
