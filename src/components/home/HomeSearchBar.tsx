import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { BANGALORE_AREAS } from '@/data/properties';

const TYPE_CATEGORIES = [
  { label: 'PG Buildings', values: ['PG Buildings'] },
  { label: 'Residential', values: ['Residential Rental Income', 'Residential Plot'] },
  { label: 'Commercial', values: ['Commercial Properties'] },
  { label: 'Plots', values: ['Residential Plot', 'Commercial Plot', 'JD Land'] },
  { label: 'Lands', values: ['Commercial Plot', 'JD Land'] },
];

const BUY_BUDGET_LABELS = [
  'Under ₹50L',
  '₹50L – ₹1Cr',
  '₹1Cr – ₹2Cr',
  '₹2Cr – ₹3Cr',
  '₹3Cr – ₹5Cr',
  'Above ₹5Cr',
];

const TABS = ['Buy', 'Plots & Land', 'Commercial', 'PG Buildings', 'List Property'];

const TAB_TYPE_MAP: Record<string, string> = {
  'Plots & Land': 'Plots',
  'Commercial': 'Commercial',
  'PG Buildings': 'PG Buildings',
};

export default function HomeSearchBar() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Buy');
  const [location, setLocation] = useState('');
  const [showLocations, setShowLocations] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');

  const filteredAreas = location
    ? BANGALORE_AREAS.filter((a) =>
        a.toLowerCase().includes(location.toLowerCase()),
      ).slice(0, 8)
    : [];

  const handleTabClick = (tab: string) => {
    if (tab === 'List Property') {
      navigate('/list-property');
      return;
    }
    setActiveTab(tab);
    const type = TAB_TYPE_MAP[tab];
    setSelectedType(type ?? '');
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (selectedType) {
      const cat = TYPE_CATEGORIES.find((c) => c.label === selectedType);
      if (cat) params.set('type', cat.values.join(','));
    }
    if (selectedBudget) params.set('budget', selectedBudget);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div className="w-full">
      <div className="flex gap-1 overflow-x-auto pb-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`px-4 sm:px-5 py-2.5 rounded-t-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white/20 text-white'
                : 'bg-black/50 text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab === 'List Property' ? (
              <span>
                List Property{' '}
                <span className="bg-green-500 text-white text-[9px] px-1 py-0.5 rounded ml-1 font-bold">
                  FREE
                </span>
              </span>
            ) : (
              tab
            )}
          </button>
        ))}
      </div>

      <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-r-2xl rounded-b-2xl p-3 sm:p-4 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder='Search by "Locality"'
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setShowLocations(true);
              }}
              onFocus={() => setShowLocations(true)}
              onBlur={() => setTimeout(() => setShowLocations(false), 200)}
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white/40"
            />
            {showLocations && filteredAreas.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-lg overflow-hidden z-20">
                {filteredAreas.map((area) => (
                  <button
                    key={area}
                    onMouseDown={() => {
                      setLocation(area);
                      setShowLocations(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-white/10 transition-colors"
                  >
                    {area}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Search size={16} />
            Search
          </button>
        </div>

<div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider mr-1">
            BUDGET
          </span>
          {BUY_BUDGET_LABELS.map((label) => (
            <button
              key={label}
              onClick={() => setSelectedBudget(selectedBudget === label ? '' : label)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedBudget === label
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
