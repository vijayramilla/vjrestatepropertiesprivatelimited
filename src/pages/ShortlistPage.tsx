import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from '@phosphor-icons/react';
import { useShortlist } from '../context/ShortlistContext';
import { mapFirestoreToListing } from '@/lib/firestoreProperties';
import { subscribeProperties } from '@/lib/firestoreHelpers';
import PropertyListingCard from '../components/PropertyListingCard';
import type { ListingProperty } from '../data/listingProperties';

export default function ShortlistPage() {
  const { shortlistedIds, clearAll } = useShortlist();
  const [allProperties, setAllProperties] = useState<ListingProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeProperties((docs) => {
      setAllProperties(docs.map(({ id, data }) => mapFirestoreToListing(id, data)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const saved = allProperties.filter((p) => shortlistedIds.includes(p.id));

  const handleClearAll = () => {
    if (window.confirm('Remove all saved properties from your shortlist?')) {
      clearAll();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-14 md:pt-[72px]">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#ebebeb] pb-6 mb-8">
          <div>
            <p className="font-sans text-[11px] text-[#888] uppercase tracking-[0.2em]">Saved Properties</p>
            <h1 className="font-serif text-[38px] text-black font-normal mt-1">Your Shortlist</h1>
          </div>
          <p className="font-sans text-sm text-[#aaa]">{saved.length} properties saved</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#ebebeb]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white aspect-square animate-pulse" />
            ))}
          </div>
        ) : saved.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={56} weight="thin" color="#ddd" className="mx-auto" />
            <h2 className="font-serif text-[28px] text-black mt-5">No properties saved yet</h2>
            <p className="font-sans text-sm text-[#aaa] mt-2">
              Browse listings and tap the heart icon to save properties
            </p>
            <Link
              to="/properties"
              className="inline-block mt-8 font-sans text-xs text-black border border-black px-7 py-2.5 hover:bg-black hover:text-white transition-colors"
            >
              Browse Properties
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {saved.map((property, index) => (
                <PropertyListingCard key={property.id} property={property} index={index} />
              ))}
            </div>
            <div className="text-center mt-10">
              <button
                type="button"
                onClick={handleClearAll}
                className="font-sans text-xs text-[#888] border border-[#e5e5e5] px-6 py-2.5 hover:border-black hover:text-black transition-colors"
              >
                Clear All Saved
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
