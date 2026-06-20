import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronDown, CheckCircle } from 'lucide-react';
import { BANGALORE_AREAS, PROPERTY_TYPES } from '../data/properties';
import { Button } from '@/components/ui/liquid-glass-button';

const budgetRanges = ['Under ₹50L', '₹50L – ₹1Cr', '₹1Cr – ₹2Cr', '₹2Cr – ₹5Cr', 'Above ₹5Cr'];
const rentalExpectations = ['Under ₹25K', '₹25K – ₹50K', '₹50K – ₹1L', '₹1L – ₹2L', 'Above ₹2L'];

export default function SubmitRequirementPage() {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', propertyType: '', preferredAreas: [] as string[], budgetRange: '', expectedRental: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');

  const toggleArea = (area: string) => {
    setFormData((prev) => ({ ...prev, preferredAreas: prev.preferredAreas.includes(area) ? prev.preferredAreas.filter((a) => a !== area) : [...prev.preferredAreas, area] }));
  };

  const removeArea = (area: string) => {
    setFormData((prev) => ({ ...prev, preferredAreas: prev.preferredAreas.filter((a) => a !== area) }));
  };

  const filteredAreas = BANGALORE_AREAS.filter((area) => area.toLowerCase().includes(areaSearch.toLowerCase()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-white min-h-screen pt-[72px]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-black py-10 md:py-14 px-4 md:px-8 lg:px-16">
        <div className="max-w-[1440px] mx-auto">
          <p className="text-gray-400 text-xs md:text-sm uppercase tracking-[0.15em] mb-3">INVESTMENT REQUIREMENTS</p>
          <h1 className="font-display text-white text-3xl md:text-5xl lg:text-6xl leading-tight">Submit Your Requirement</h1>
        </div>
      </motion.div>
      <div className="max-w-[680px] mx-auto px-4 md:px-8 py-10 md:py-16 lg:py-24">
        {!submitted ? (
          <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} onSubmit={handleSubmit} className="space-y-6">
            <p className="text-gray-600 text-[16px] mb-[34px]">Tell us what you're looking for. Our team will match you with rental income properties in Bangalore.</p>
            <div className="floating-input">
              <input type="text" id="name" required placeholder=" " value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="peer" />
              <label htmlFor="name">Full Name</label>
            </div>
            <div className="floating-input">
              <input type="tel" id="phone" required placeholder=" " value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="peer" />
              <label htmlFor="phone">Phone Number</label>
            </div>
            <div className="floating-input">
              <input type="email" id="email" required placeholder=" " value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="peer" />
              <label htmlFor="email">Email</label>
            </div>
            <div className="relative">
              <select value={formData.propertyType} onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })} className="w-full px-0 py-3 border-0 border-b border-black bg-transparent text-[16px] focus:outline-none appearance-none cursor-pointer">
                <option value="" disabled>Property Type</option>
                {PROPERTY_TYPES.map((type) => (<option key={type} value={type} className="bg-white text-black">{type}</option>))}
              </select>
              <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <label className="text-gray-400 text-[11px] uppercase tracking-[0.15em] block mb-3">Preferred Areas in Bangalore</label>
              {formData.preferredAreas.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.preferredAreas.map((area) => (
                    <span key={area} className="tag">{area}<button type="button" onClick={() => removeArea(area)} className="tag-remove hover:text-black"><X size={12} /></button></span>
                  ))}
                </div>
              )}
              <input type="text" placeholder="Search and select areas..." value={areaSearch} onChange={(e) => setAreaSearch(e.target.value)} onFocus={() => setAreaDropdownOpen(true)} className="w-full px-0 py-3 border-0 border-b border-black bg-transparent text-[16px] focus:outline-none" />
              {areaDropdownOpen && (
                <div className="dropdown-menu mt-2">
                  <div className="max-h-[250px] overflow-y-auto">
                    {filteredAreas.map((area) => (
                      <div key={area} onClick={() => toggleArea(area)} className={`dropdown-item ${formData.preferredAreas.includes(area) ? 'bg-gray-100' : ''}`}>
                        <span className="flex items-center justify-between">{area}{formData.preferredAreas.includes(area) && <CheckCircle size={14} className="text-black" />}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <select value={formData.budgetRange} onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })} className="w-full px-0 py-3 border-0 border-b border-black bg-transparent text-[16px] focus:outline-none appearance-none cursor-pointer">
                <option value="" disabled>Budget Range</option>
                {budgetRanges.map((range) => (<option key={range} value={range} className="bg-white text-black">{range}</option>))}
              </select>
              <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={formData.expectedRental} onChange={(e) => setFormData({ ...formData, expectedRental: e.target.value })} className="w-full px-0 py-3 border-0 border-b border-black bg-transparent text-[16px] focus:outline-none appearance-none cursor-pointer">
                <option value="" disabled>Expected Monthly Rental Income</option>
                {rentalExpectations.map((exp) => (<option key={exp} value={exp} className="bg-white text-black">{exp}</option>))}
              </select>
              <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="floating-input">
              <textarea id="notes" rows={4} placeholder=" " value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="peer resize-none" />
              <label htmlFor="notes">Additional Notes</label>
            </div>
            <Button type="submit" variant="cool" className="w-full py-4 h-auto text-[13px] uppercase tracking-[0.1em] mt-[21px]">
              Submit Requirement
            </Button>
          </motion.form>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="text-center py-[89px]">
            <div className="w-16 h-16 mx-auto mb-[34px] border-2 border-black rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-black" />
            </div>
            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-black mb-5 leading-tight">Requirement Received</h2>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-md mx-auto">Thank you for submitting your requirement. Our team will review your preferences and reach out within 24 hours with matching properties.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
