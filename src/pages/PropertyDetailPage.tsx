import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, MessageCircle, Shield, CheckCircle, Building2, TrendingUp, Users, Phone } from 'lucide-react';
import { properties, formatPrice } from '../data/properties';

const features = [
  { icon: Shield, label: 'BBMP Approved' },
  { icon: CheckCircle, label: 'Legal Clear' },
  { icon: Building2, label: 'Bank Loan Eligible' },
  { icon: TrendingUp, label: 'High Rental Yield' },
  { icon: Users, label: 'Stable Tenants' },
  { icon: Phone, label: 'High Occupancy' },
];

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const property = properties.find((p) => p.id === id);

  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-[72px]">
        <div className="text-center">
          <h1 className="font-display text-[42px] mb-4">Property Not Found</h1>
          <Link to="/properties" className="hoverable inline-flex items-center justify-center px-6 py-3 bg-black text-white text-[13px] uppercase tracking-[0.1em]">Back to Properties</Link>
        </div>
      </div>
    );
  }

  const annualIncome = property.monthlyRentalIncome * 12;
  const grossYield = property.price > 0 ? (annualIncome / property.price) * 100 : 0;

  return (
    <div className="bg-white min-h-screen pt-[72px]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-gray-50 py-6 px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-gray-400 text-[12px] uppercase tracking-[0.1em]">
            <Link to="/" className="hoverable hover:text-black transition-colors">Home</Link>
            <span>/</span>
            <Link to="/properties" className="hoverable hover:text-black transition-colors">Properties</Link>
            <span>/</span>
            <span className="text-black truncate max-w-[200px]">{property.name}</span>
          </nav>
        </div>
      </motion.div>
      <div className="max-w-7xl mx-auto px-8 py-[55px]">
        <div className="flex flex-col lg:flex-row gap-[34px]">
          <div className="flex-1 lg:w-[61.8%]">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="aspect-[4/3] image-placeholder overflow-hidden">
                <div className="w-full h-full flex items-center justify-center"><span className="text-gray-400 text-sm uppercase tracking-[0.15em]">{property.type}</span></div>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[4/3] image-placeholder">
                    <div className="w-full h-full flex items-center justify-center"><span className="text-gray-300 text-[10px] uppercase tracking-[0.1em]">Image {i}</span></div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-[34px]">
              <h1 className="font-display text-black" style={{ fontSize: '68px', lineHeight: '1.1', letterSpacing: '-0.03em' }}>{property.name}</h1>
              <div className="flex items-center gap-4 mt-[21px]">
                <div className="flex items-center gap-2 text-gray-400 text-[14px] uppercase tracking-[0.12em]">
                  <MapPin size={16} /><span>{property.location}, Bangalore</span>
                </div>
                <span className="type-badge">{property.type}</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="mt-[55px]">
              <h3 className="font-display text-[26px] text-black mb-[21px]">Description</h3>
              <p className="text-gray-600 text-[16px] leading-[1.618]">{property.description}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-[55px]">
              <h3 className="font-display text-[26px] text-black mb-[34px]">Features & Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-[21px]">
                {features.map((feature) => (
                  <div key={feature.label} className="border border-black p-[21px] text-center">
                    <feature.icon size={24} className="mx-auto mb-3 text-black" />
                    <span className="text-[13px] uppercase tracking-[0.1em] text-black">{feature.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            {property.monthlyRentalIncome > 0 && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-[55px] overflow-x-auto">
                <h3 className="font-display text-[26px] text-black mb-[34px]">Rental Income Details</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-4 text-gray-400 text-[11px] uppercase tracking-[0.15em]">Monthly Rent</th>
                      <th className="text-left py-4 text-gray-400 text-[11px] uppercase tracking-[0.15em]">Annual Income</th>
                      <th className="text-left py-4 text-gray-400 text-[11px] uppercase tracking-[0.15em]">Gross Yield</th>
                      <th className="text-left py-4 text-gray-400 text-[11px] uppercase tracking-[0.15em]">Occupancy Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-4 text-[16px] text-black">₹{property.monthlyRentalIncome.toLocaleString('en-IN')}</td>
                      <td className="py-4 text-[16px] text-black">₹{annualIncome.toLocaleString('en-IN')}</td>
                      <td className="py-4 text-[16px] text-black">{grossYield.toFixed(2)}%</td>
                      <td className="py-4 text-[16px] text-black">{property.occupancyPercent}%</td>
                    </tr>
                  </tbody>
                </table>
              </motion.div>
            )}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-[55px] bg-black p-[34px] text-center">
              <p className="text-white text-[18px] mb-[21px]">Interested in this property? Submit your requirement.</p>
              <Link to="/contact" className="hoverable inline-flex items-center justify-center px-8 py-4 bg-white text-black text-[13px] uppercase tracking-[0.1em] font-medium">Contact Us</Link>
            </motion.div>
          </div>
          <div className="w-full lg:w-[38.2%]">
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="lg:sticky lg:top-[89px] border border-gray-200 p-[34px]">
              <p className="text-gray-400 text-[11px] uppercase tracking-[0.2em] mb-[21px]">INVESTMENT SUMMARY</p>
              <p className="text-black font-display" style={{ fontSize: '42px', lineHeight: '1' }}>{formatPrice(property.price)}</p>
              <div className="border-b border-gray-100 pb-[21px] mb-[21px]" />
              {property.monthlyRentalIncome > 0 && (
                <div className="bg-black p-[21px] mb-[34px]">
                  <p className="text-gray-300 text-[11px] uppercase tracking-[0.15em] mb-2">Monthly Rental Income</p>
                  <p className="text-white font-display" style={{ fontSize: '26px', lineHeight: '1' }}>₹{property.monthlyRentalIncome.toLocaleString('en-IN')}<span className="text-sm font-body">/month</span></p>
                </div>
              )}
              <div className="space-y-[13px] text-[14px]">
                <div className="flex justify-between border-b border-gray-50 pb-[13px]"><span className="text-gray-400 uppercase tracking-[0.1em] text-[11px]">Type</span><span className="text-black">{property.type}</span></div>
                {property.plotSizeSqFt > 0 && <div className="flex justify-between border-b border-gray-50 pb-[13px]"><span className="text-gray-400 uppercase tracking-[0.1em] text-[11px]">Plot Size</span><span className="text-black">{property.plotSizeSqFt.toLocaleString()} sq ft</span></div>}
                {property.builtUpAreaSqFt > 0 && <div className="flex justify-between border-b border-gray-50 pb-[13px]"><span className="text-gray-400 uppercase tracking-[0.1em] text-[11px]">Built-up Area</span><span className="text-black">{property.builtUpAreaSqFt.toLocaleString()} sq ft</span></div>}
                {property.floors > 0 && <div className="flex justify-between border-b border-gray-50 pb-[13px]"><span className="text-gray-400 uppercase tracking-[0.1em] text-[11px]">Floors</span><span className="text-black">{property.floors}</span></div>}
                {property.tenants > 0 && <div className="flex justify-between border-b border-gray-50 pb-[13px]"><span className="text-gray-400 uppercase tracking-[0.1em] text-[11px]">Tenants</span><span className="text-black">{property.tenants}</span></div>}
                {property.occupancyPercent > 0 && <div className="flex justify-between border-b border-gray-50 pb-[13px]"><span className="text-gray-400 uppercase tracking-[0.1em] text-[11px]">Occupancy</span><span className="text-black">{property.occupancyPercent}%</span></div>}
                <div className="flex justify-between"><span className="text-gray-400 uppercase tracking-[0.1em] text-[11px]">BBMP Approved</span><span className="text-black">{property.bbmpApproved ? 'Yes' : 'No'}</span></div>
              </div>
              <Link to="/contact" className="hoverable w-full mt-[21px] py-4 bg-black text-white text-[13px] uppercase tracking-[0.1em] block text-center transition-colors hover:bg-gray-900">Enquire Now</Link>
              <a href="https://wa.me/918088905957" target="_blank" rel="noopener noreferrer" className="hoverable w-full mt-[13px] py-3 bg-white text-black text-[13px] uppercase tracking-[0.1em] border border-black block text-center transition-colors hover:bg-gray-100">
                <span className="flex items-center justify-center gap-2"><MessageCircle size={16} />WhatsApp Us</span>
              </a>
              <div className="mt-[21px] flex items-center justify-center gap-2 text-gray-400 text-[11px]">
                <Shield size={12} /><span>BBMP Verified Property</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
