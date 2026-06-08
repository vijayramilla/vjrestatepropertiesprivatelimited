import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Property, formatPrice, formatMonthlyIncome } from '../data/properties';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.6, ease: 'easeOut' }} className="group bg-white border border-gray-200 overflow-hidden card-lift hoverable">
      <div className="relative aspect-[16/9] overflow-hidden image-placeholder">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-400 text-sm uppercase tracking-[0.15em]">{property.type}</span>
        </div>
      </div>
      <div className="p-[34px]">
        <p className="text-gray-400 text-[11px] uppercase tracking-[0.15em] mb-2">{property.location}</p>
        <h3 className="font-display text-[22px] text-black mb-[13px] leading-tight">{property.name}</h3>
        <p className="text-[20px] text-black mb-2 font-medium">{formatPrice(property.price)}</p>
        {property.monthlyRentalIncome > 0 && (
          <span className="inline-block bg-black text-white text-[12px] px-3 py-1">{formatMonthlyIncome(property.monthlyRentalIncome)}</span>
        )}
        <Link to={`/properties/${property.id}`} className="hoverable inline-flex items-center gap-2 mt-[21px] text-[13px] uppercase tracking-[0.1em] text-black border-b border-black transition-all duration-300 group-hover:tracking-[0.15em]">
          View Details <span className="transform transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>
      <div className="border-t border-gray-100 px-[34px] py-4">
        <p className="text-gray-400 text-[11px] uppercase tracking-[0.1em]">{property.type}</p>
      </div>
    </motion.div>
  );
}
