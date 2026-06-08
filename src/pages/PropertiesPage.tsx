import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, ChevronDown, Search } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { properties, BANGALORE_AREAS, PROPERTY_TYPES, formatPrice } from '../data/properties';

type SortOption = 'price_asc' | 'price_desc' | 'rental_desc' | 'newest';

export default function PropertiesPage() {
  const [searchParams] = useSearchParams();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000000]);
  const [rentalRange, setRentalRange] = useState<[number, number]>([0, 500000]);
  const [plotSubtype, setPlotSubtype] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && PROPERTY_TYPES.includes(typeParam)) setSelectedTypes([typeParam]);
    const locationParam = searchParams.get('location');
    if (locationParam && BANGALORE_AREAS.includes(locationParam)) setSelectedLocations([locationParam]);
  }, [searchParams]);

  const filteredProperties = useMemo(() => {
    let filtered = [...properties];
    if (selectedTypes.length > 0) filtered = filtered.filter((p) => selectedTypes.includes(p.type));
    if (selectedTypes.includes('Residential Plot') || selectedTypes.includes('Commercial Plot')) {
      if (plotSubtype === 'Residential Plot') filtered = filtered.filter((p) => p.type === 'Residential Plot');
      else if (plotSubtype === 'Commercial Plot') filtered = filtered.filter((p) => p.type === 'Commercial Plot');
    }
    if (selectedLocations.length > 0) filtered = filtered.filter((p) => selectedLocations.includes(p.location));
    filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    filtered = filtered.filter((p) => p.monthlyRentalIncome >= rentalRange[0] && p.monthlyRentalIncome <= rentalRange[1]);
    switch (sortBy) {
      case 'price_asc': filtered.sort((a, b) => a.price - b.price); break;
      case 'price_desc': filtered.sort((a, b) => b.price - a.price); break;
      case 'rental_desc': filtered.sort((a, b) => b.monthlyRentalIncome - a.monthlyRentalIncome); break;
      case 'newest': filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
    }
    return filtered;
  }, [selectedTypes, selectedLocations, priceRange, rentalRange, plotSubtype, sortBy]);

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedLocations([]);
    setPriceRange([0, 100000000]);
    setRentalRange([0, 500000]);
    setPlotSubtype('');
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
    if ((type === 'Residential Plot' || type === 'Commercial Plot') && selectedTypes.includes(type)) setPlotSubtype('');
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) => prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location]);
  };

  const filteredLocations = BANGALORE_AREAS.filter((area) => area.toLowerCase().includes(locationSearch.toLowerCase()));
  const showPlotSubtype = selectedTypes.includes('Residential Plot') || selectedTypes.includes('Commercial Plot');

  return (
    <div className="bg-white min-h-screen pt-[72px]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-black py-[55px] px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-400 text-[11px] uppercase tracking-[0.15em] mb-3">INVESTMENT OPPORTUNITIES</p>
          <h1 className="font-display text-white" style={{ fontSize: '42px', lineHeight: '1.1' }}>All Properties in Bangalore</h1>
        </div>
      </motion.div>
      <div className="max-w-7xl mx-auto px-8 py-[55px]">
        <div className="flex flex-col lg:flex-row gap-[34px]">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="w-full lg:w-[38.2%] lg:sticky lg:top-[89px] lg:self-start">
            <div className="border border-gray-200 p-[34px]">
              <div className="flex items-center justify-between mb-[34px]">
                <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em]">FILTERS</p>
                <button onClick={clearAllFilters} className="text-gray-400 text-[13px] hover:text-black transition-colors">Clear All</button>
              </div>
              <div className="mb-[34px]">
                <h3 className="text-black text-[13px] uppercase tracking-[0.1em] mb-[21px] font-medium">Property Type</h3>
                <div className="space-y-3">
                  {PROPERTY_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} className="w-4 h-4 border border-black appearance-none checked:bg-black checked:border-black cursor-pointer transition-colors" />
                      <span className="text-[14px] text-gray-600 group-hover:text-black transition-colors">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              {showPlotSubtype && (
                <div className="mb-[34px]">
                  <h3 className="text-black text-[13px] uppercase tracking-[0.1em] mb-[21px] font-medium">Plot Sub-Type</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" name="plotSubtype" checked={plotSubtype === 'Residential Plot'} onChange={() => setPlotSubtype('Residential Plot')} className="w-4 h-4 border border-black appearance-none checked:bg-black checked:border-black cursor-pointer" />
                      <span className="text-[14px] text-gray-600 group-hover:text-black">Residential Plot</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" name="plotSubtype" checked={plotSubtype === 'Commercial Plot'} onChange={() => setPlotSubtype('Commercial Plot')} className="w-4 h-4 border border-black appearance-none checked:bg-black checked:border-black cursor-pointer" />
                      <span className="text-[14px] text-gray-600 group-hover:text-black">Commercial Plot</span>
                    </label>
                  </div>
                </div>
              )}
              <div className="mb-[34px] relative">
                <h3 className="text-black text-[13px] uppercase tracking-[0.1em] mb-[21px] font-medium">Location in Bangalore</h3>
                {selectedLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedLocations.map((loc) => (
                      <span key={loc} className="tag">{loc}<button onClick={() => toggleLocation(loc)} className="tag-remove hover:text-black"><X size={12} /></button></span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input type="text" placeholder="Search location..." value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)} onFocus={() => setLocationDropdownOpen(true)} className="w-full px-0 py-3 border-0 border-b border-black bg-transparent text-[14px] focus:outline-none" />
                  <Search size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {locationDropdownOpen && (
                  <div className="dropdown-menu mt-2">
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredLocations.map((area) => (
                        <div key={area} onClick={() => { toggleLocation(area); setLocationDropdownOpen(false); }} className={`dropdown-item ${selectedLocations.includes(area) ? 'bg-gray-100' : ''}`}>{area}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mb-[34px]">
                <h3 className="text-black text-[13px] uppercase tracking-[0.1em] mb-[21px] font-medium">Price Range</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[13px] text-gray-600">
                    <span>{formatPrice(priceRange[0])}</span>
                    <span>{formatPrice(priceRange[1])}</span>
                  </div>
                  <div className="relative space-y-2">
                    <input type="range" min="0" max="100000000" step="500000" value={priceRange[0]} onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])} className="w-full" />
                    <input type="range" min="0" max="100000000" step="500000" value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} className="w-full" />
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <h3 className="text-black text-[13px] uppercase tracking-[0.1em] mb-[21px] font-medium">Monthly Rental Income</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[13px] text-gray-600">
                    <span>₹{rentalRange[0].toLocaleString()}</span>
                    <span>₹{rentalRange[1].toLocaleString()}</span>
                  </div>
                  <div className="relative space-y-2">
                    <input type="range" min="0" max="500000" step="10000" value={rentalRange[0]} onChange={(e) => setRentalRange([Number(e.target.value), rentalRange[1]])} className="w-full" />
                    <input type="range" min="0" max="500000" step="10000" value={rentalRange[1]} onChange={(e) => setRentalRange([rentalRange[0], Number(e.target.value)])} className="w-full" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          <div className="flex-1 lg:w-[61.8%]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-[34px]">
              <p className="text-black text-[16px]">Showing <span className="font-medium">{filteredProperties.length}</span> {filteredProperties.length === 1 ? 'property' : 'properties'}</p>
              <div className="relative">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="appearance-none px-4 py-2 pr-10 border border-gray-200 bg-white text-[14px] focus:outline-none cursor-pointer">
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rental_desc">Rental Income: High to Low</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </motion.div>
            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-[21px]">
                {filteredProperties.map((property, index) => (
                  <motion.div key={property.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: index * 0.1 }}>
                    <PropertyCard property={property} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center py-[89px] border border-gray-200">
                <p className="text-gray-400 text-[18px] mb-[21px]">No properties match your filters.</p>
                <button onClick={clearAllFilters} className="hoverable px-6 py-3 bg-black text-white text-[13px] uppercase tracking-[0.1em]">Clear Filters</button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
