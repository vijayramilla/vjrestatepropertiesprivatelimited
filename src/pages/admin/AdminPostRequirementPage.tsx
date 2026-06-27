import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, X, Copy, Check, Lock } from 'lucide-react';
import { BANGALORE_AREAS } from '@/data/properties';
import { formatINR } from '@/lib/formatPrice';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/AdminUi';
import {
  createRequirement,
  REQUIREMENT_PROPERTY_TYPES,
  REQUIREMENT_PURPOSES,
  REQUIREMENT_TIMELINES,
  PAYMENT_MODES,
  type RequirementPurpose,
  type RequirementTimeline,
  type PaymentMode,
} from '@/lib/requirements';

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            value === opt
              ? 'bg-black text-white'
              : 'border border-gray-200 bg-white text-gray-800 hover:border-gray-400'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function AdminPostRequirementPage() {
  const navigate = useNavigate();
  const [purpose, setPurpose] = useState<RequirementPurpose | ''>('');
  const [purposeOther, setPurposeOther] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyTypeOther, setPropertyTypeOther] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>('');
  const [timeline, setTimeline] = useState<RequirementTimeline | ''>('');
  const [notes, setNotes] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ reqId: string; phone: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredLocations = BANGALORE_AREAS.filter((a) =>
    a.toLowerCase().includes(locationSearch.toLowerCase()),
  );

  const toggleLocation = (loc: string) => {
    setLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc],
    );
  };

  const addCustomLocation = () => {
    const trimmed = customLocation.trim();
    if (!trimmed) return;
    if (!locations.includes(trimmed)) {
      setLocations((prev) => [...prev, trimmed]);
    }
    setCustomLocation('');
  };

  const minNum = Number(budgetMin.replace(/\D/g, '')) || 0;
  const maxNum = Number(budgetMax.replace(/\D/g, '')) || 0;

  const validate = (): string | null => {
    if (!purpose) return 'Please select a purpose';
    if (purpose === 'Other' && !purposeOther.trim()) return 'Please describe the purpose';
    if (!propertyType) return 'Please select a property type';
    if (propertyType === 'Other' && !propertyTypeOther.trim()) return 'Please specify property type';
    if (locations.length === 0) return 'Select or add at least one location';
    if (!minNum || !maxNum) return 'Enter budget min and max';
    if (minNum > maxNum) return 'Budget min cannot exceed max';
    if (!paymentMode) return 'Select payment mode';
    if (!timeline) return 'Select timeline';
    if (!buyerName.trim()) return 'Buyer name is required';
    const phoneDigits = buyerPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) return 'Enter a valid 10-digit phone number';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { reqId } = await createRequirement({
        purpose: purpose as RequirementPurpose,
        purposeOther: purpose === 'Other' ? purposeOther.trim() : '',
        propertyType,
        propertyTypeOther: propertyType === 'Other' ? propertyTypeOther.trim() : '',
        locations,
        budgetMin: minNum,
        budgetMax: maxNum,
        timeline: timeline as RequirementTimeline,
        notes: notes.trim().slice(0, 300),
        paymentMode: paymentMode as PaymentMode,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.replace(/\D/g, ''),
      });
      setSuccess({ reqId, phone: buyerPhone.replace(/\D/g, '') });
    } catch (err) {
      console.error(err);
      setError('Could not post requirement. Check Firestore rules and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyReqId = async () => {
    if (!success?.reqId) return;
    await navigator.clipboard.writeText(success.reqId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (success) {
    return (
      <AdminLayout title="Post Requirement">
        <AdminPageShell>
          <div className="mx-auto max-w-lg py-8 text-center">
            <div className="admin-card p-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="admin-heading text-2xl font-medium">Requirement Posted!</h2>
              <p className="mt-2 text-sm text-gray-500">Reference ID (visible on public board):</p>
              <button
                type="button"
                onClick={copyReqId}
                className="mt-2 inline-flex items-center gap-2 font-mono text-xl font-bold text-black"
              >
                {success.reqId}
                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-gray-400" />}
              </button>
              <p className="mt-4 text-sm text-gray-600">
                This requirement is now live on the public requirements board. Buyer contact ends in ****
                {success.phone.slice(-4)}.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate('/admin/requirements')}
                  className="admin-btn-primary flex-1"
                >
                  View in Admin
                </button>
                <Link to="/requirements" className="admin-btn-secondary flex-1 text-center">
                  Preview Public Board
                </Link>
              </div>
            </div>
          </div>
        </AdminPageShell>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Post Requirement">
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Requirements"
          title="Post Requirement"
          description="Create a buyer requirement for the public board. Only admins can post — buyers use Submit Requirement (Google Form) separately."
        />

        <form onSubmit={handleSubmit} className="admin-card mx-auto max-w-3xl space-y-8 p-5 sm:p-8">
          <section>
            <label className="mb-3 block text-sm font-medium text-gray-900">
              Purpose <span className="text-red-500">*</span>
            </label>
            <ChipGroup options={REQUIREMENT_PURPOSES} value={purpose} onChange={setPurpose} />
            {purpose === 'Other' && (
              <input
                type="text"
                value={purposeOther}
                onChange={(e) => setPurposeOther(e.target.value)}
                placeholder="Specify purpose"
                className="admin-input mt-3 w-full"
              />
            )}
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-gray-900">
              Property Type <span className="text-red-500">*</span>
            </label>
            <ChipGroup
              options={REQUIREMENT_PROPERTY_TYPES}
              value={propertyType}
              onChange={setPropertyType}
            />
            {propertyType === 'Other' && (
              <input
                type="text"
                value={propertyTypeOther}
                onChange={(e) => setPropertyTypeOther(e.target.value)}
                placeholder="Specify type"
                className="admin-input mt-3 w-full"
              />
            )}
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-gray-900">
              Locations <span className="text-red-500">*</span>
            </label>
            {locations.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800"
                  >
                    {loc}
                    <button type="button" onClick={() => toggleLocation(loc)} aria-label={`Remove ${loc}`}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              From locality list
            </p>
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search localities…"
              className="admin-input w-full"
            />
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-gray-100">
              {filteredLocations.slice(0, 40).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => toggleLocation(loc)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                    locations.includes(loc) ? 'bg-gray-50 font-medium' : ''
                  }`}
                >
                  {loc}
                  {locations.includes(loc) && <CheckCircle size={14} />}
                </button>
              ))}
            </div>

            <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
              Custom location
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomLocation();
                  }
                }}
                placeholder="e.g. Near Metro, Outer Ring Road…"
                className="admin-input flex-1"
              />
              <button
                type="button"
                onClick={addCustomLocation}
                className="admin-btn-secondary shrink-0 px-4"
              >
                Add
              </button>
            </div>
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-gray-900">
              ₹ Budget <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Min ₹"
                  className="admin-input w-full"
                />
                {minNum > 0 && <p className="mt-1 text-xs text-gray-500">{formatINR(minNum)}</p>}
              </div>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ''))}
                  placeholder="Max ₹"
                  className="admin-input w-full"
                />
                {maxNum > 0 && <p className="mt-1 text-xs text-gray-500">{formatINR(maxNum)}</p>}
              </div>
            </div>
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-gray-900">
              Payment Mode <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-gray-500">(private — not on public board)</span>
            </label>
            <ChipGroup options={PAYMENT_MODES} value={paymentMode} onChange={setPaymentMode} />
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-gray-900">
              Timeline <span className="text-red-500">*</span>
            </label>
            <ChipGroup options={REQUIREMENT_TIMELINES} value={timeline} onChange={setTimeline} />
          </section>

          <section>
            <label className="mb-3 block text-sm font-medium text-gray-900">Notes (public on card)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 300))}
              rows={4}
              maxLength={300}
              placeholder="E.g. A Khata only, corner plot, G+3 minimum…"
              className="admin-input w-full resize-none"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{notes.length}/300</p>
          </section>

        <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
          <Lock size={14} className="mt-0.5 shrink-0 text-gray-400" />
          <span>
            Buyer name, phone, and payment mode are stored privately and never shown on the public board.
          </span>
        </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Buyer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Buyer Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="admin-input w-full"
              />
            </div>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/admin/requirements')}
              className="admin-btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="admin-btn-primary flex-1 disabled:opacity-60"
            >
              {submitting ? 'Posting…' : 'Post to Public Board'}
            </button>
          </div>
        </form>
      </AdminPageShell>
    </AdminLayout>
  );
}
