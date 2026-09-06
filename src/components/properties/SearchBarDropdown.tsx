import { X, MapPin, Clock, TrendingUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface SearchBarDropdownProps {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onToggle: (loc: string) => void;
  notice?: string;
  trending: string[];
  recentSearches: string[];
  onRemoveRecent: (term: string) => void;
  slotsLeft: number;
  /** Live suggestions for the typed query (static areas first, then Google extras). */
  suggestions: string[];
  onSelectExtra?: (loc: string) => void;
}

/**
 * Housing.com-structure search panel: the toolbar bar itself IS the search
 * input — this panel only renders the suggestion area directly beneath it.
 * No second search bar is ever rendered, so there is nothing to duplicate.
 * The page owns all dismissal (outside tap, Escape) via useDropdownDismiss.
 */
export default function SearchBarDropdown({
  open,
  onClose,
  selected,
  onToggle,
  notice,
  trending,
  recentSearches,
  onRemoveRecent,
  slotsLeft,
  suggestions,
  onSelectExtra,
}: SearchBarDropdownProps) {
  const isTyping = suggestions.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 top-full z-[95] overflow-hidden border-b border-gray-200/90 bg-white shadow-[0_16px_40px_rgba(10,22,40,0.12)]"
        >
          <div className="mx-auto flex max-h-[min(62dvh,520px)] w-full max-w-7xl flex-col px-3 py-3 sm:px-6 sm:py-4">
            {notice && (
              <p className="mb-2 shrink-0 rounded-lg bg-[#0A1628] px-3 py-2 text-center text-[12px] font-medium text-white">
                {notice}
              </p>
            )}

            {/* Selected localities */}
            {selected.length > 0 && (
              <div className="mb-2.5 flex shrink-0 flex-wrap items-center gap-1.5">
                {selected.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 rounded-full bg-[#0A1628] py-1 pl-3 pr-1 text-[12px] font-medium text-white"
                  >
                    {loc}
                    <button
                      type="button"
                      onClick={() => onToggle(loc)}
                      aria-label={`Remove ${loc}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/20"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <span className="text-[11px] text-gray-400">
                  {slotsLeft > 0 ? `${slotsLeft} more can be added` : 'max reached'}
                </span>
              </div>
            )}

            {/* Scrollable results / discovery content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isTyping ? (
                <>
                  {suggestions.map((loc) => {
                    const isSelected = selected.includes(loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          if (isSelected || slotsLeft > 0) {
                            // Google extras flow through onSelectExtra so the
                            // page can save them as a recent search.
                            if (onSelectExtra && !selected.includes(loc)) onSelectExtra(loc);
                            else onToggle(loc);
                          }
                        }}
                        disabled={!isSelected && slotsLeft <= 0}
                        className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSelected
                            ? 'bg-[#0A1628] font-medium text-white'
                            : 'text-gray-700 hover:bg-[#C9A84C]/10'
                        }`}
                      >
                        <MapPin
                          size={15}
                          className={`shrink-0 ${isSelected ? 'text-[#C9A84C]' : 'text-gray-300'}`}
                        />
                        <span className="min-w-0 flex-1 truncate">{loc}</span>
                        {isSelected ? (
                          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-[#E4C877]">
                            Added
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11px] font-medium text-[#C9A84C]">+ Add</span>
                        )}
                      </button>
                    );
                  })}
                </>
              ) : (
                <>
                  {/* Trending */}
                  <div className="mb-4">
                    <p className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                      <TrendingUp size={12} className="text-[#C9A84C]" />
                      Trending Searches
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {trending.map((label) => {
                        const isSelected = selected.includes(label);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => onToggle(label)}
                            disabled={!isSelected && slotsLeft <= 0}
                            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-medium transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
                              isSelected
                                ? 'border-[#0A1628] bg-[#0A1628] text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-[#C9A84C] hover:text-[#0A1628]'
                            }`}
                          >
                            <MapPin size={11} className={isSelected ? 'text-[#C9A84C]' : 'text-gray-400'} />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Recent Searches
                      </p>
                      <div className="space-y-0.5">
                        {recentSearches.map((term) => (
                          <div
                            key={term}
                            className="flex items-center justify-between rounded-xl px-1 active:bg-gray-50"
                          >
                            <button
                              type="button"
                              onClick={() => onToggle(term)}
                              className="flex min-h-[44px] flex-1 items-center gap-3 text-left text-[14px] text-gray-700"
                            >
                              <Clock size={15} className="shrink-0 text-gray-400" />
                              {term}
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveRecent(term)}
                              aria-label={`Remove ${term} from recents`}
                              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="mt-3 flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] flex-1 rounded-xl border border-gray-200 px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 sm:flex-none"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] flex-1 rounded-xl bg-[#0A1628] px-7 text-[12px] font-semibold uppercase tracking-[0.08em] text-white shadow-md shadow-[#0A1628]/20 transition-all hover:bg-[#1E3852] active:scale-[0.99] sm:flex-none"
              >
                Show Properties
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
