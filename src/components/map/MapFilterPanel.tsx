import { BUDGET_FILTERS, CATEGORY_CONFIG, LAND_TYPES, type BudgetFilter } from '@/data/mapConfig';

interface MapFilterPanelProps {
  open: boolean;
  onClose: () => void;
  activeCategories: string[];
  onToggleCategory: (name: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  activeBudget: BudgetFilter;
  onSelectBudget: (budget: BudgetFilter) => void;
  onClearAll: () => void;
  resultCount: number;
}

export default function MapFilterPanel({
  open,
  onClose,
  activeCategories,
  onToggleCategory,
  onSelectAllCategories,
  onDeselectAllCategories,
  activeBudget,
  onSelectBudget,
  onClearAll,
  resultCount,
}: MapFilterPanelProps) {
  const allSelected = activeCategories.length === LAND_TYPES.length;

  return (
    <>
      {open && (
        <div
          className="fixed inset-x-0 top-14 bottom-0 z-[90] bg-black/40 backdrop-blur-sm md:top-16"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-14 bottom-0 left-0 z-[100] flex w-[min(100vw,384px)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out md:top-16 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClearAll}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              aria-label="Close filters"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                Property Type
              </p>
              <button
                type="button"
                onClick={allSelected ? onDeselectAllCategories : onSelectAllCategories}
                className="text-xs text-blue-500"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {LAND_TYPES.map((name) => {
                const config = CATEGORY_CONFIG[name];
                const active = activeCategories.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onToggleCategory(name)}
                    className="flex items-center gap-2 rounded-xl border-2 p-3 text-left text-sm font-medium transition-all"
                    style={
                      active
                        ? {
                            backgroundColor: `${config.color}22`,
                            borderColor: config.color,
                            color: config.color,
                          }
                        : {
                            backgroundColor: '#f9fafb',
                            borderColor: '#e5e7eb',
                            color: '#6b7280',
                          }
                    }
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-xs leading-tight">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              Budget
            </p>
            <div className="flex flex-wrap gap-2">
              {BUDGET_FILTERS.map((budget) => (
                <button
                  key={budget.label}
                  type="button"
                  onClick={() => onSelectBudget(budget)}
                  className={`rounded-xl border-2 px-3 py-2 text-xs font-medium transition-all ${
                    activeBudget.label === budget.label
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  {budget.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClearAll}
            className="h-12 rounded-xl border-2 border-gray-200 px-6 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-xl bg-black text-sm font-medium text-white hover:bg-gray-800"
          >
            Show {resultCount} {resultCount === 1 ? 'Property' : 'Properties'}
          </button>
        </div>
      </div>
    </>
  );
}
