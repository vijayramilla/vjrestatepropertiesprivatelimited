import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BadgePercent, Landmark, Receipt } from 'lucide-react';
import type { TaxBreakdown, TaxConfig, LoanInput } from './types';
import { calcTaxBenefits, calcAmortization, calcEMI, formatIndianFull } from './calculations';
import TiltCard from './TiltCard';

interface Props {
  loan: LoanInput;
  tenureMonths: number;
}

const TAX_SLABS = [
  { value: 0, label: '0% (No Tax)' },
  { value: 5, label: '5%' },
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
  { value: 20, label: '20%' },
  { value: 25, label: '25%' },
  { value: 30, label: '30%' },
];

export default function TaxBenefits({ loan, tenureMonths }: Props) {
  const [config, setConfig] = useState<TaxConfig>({
    regime: 'old',
    propertyType: 'self-occupied',
    taxSlab: 20,
    firstTimeBuyer: false,
    jointLoan: false,
    other80CInvestments: 50000,
    annualIncome: 1200000,
  });

  const emi = calcEMI(loan.amount, loan.rate, tenureMonths);
  const amort = calcAmortization(loan.amount, loan.rate, tenureMonths, emi);

  const annualInterest = amort.length > 0 ? amort[0].interestPaid : 0;
  const annualPrincipal = amort.length > 0 ? amort[0].principalPaid : 0;

  const taxBreakdown = useMemo<TaxBreakdown>(
    () => calcTaxBenefits(annualInterest, annualPrincipal, config),
    [annualInterest, annualPrincipal, config],
  );

  return (
    <TiltCard intensity={4}>
      <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl md:p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600">
            <Landmark size={14} className="text-white" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
            Tax Benefits (India)
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setConfig({ ...config, regime: 'old' })}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                config.regime === 'old'
                  ? 'bg-black text-white shadow-lg'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Old Regime
            </button>
            <button
              onClick={() => setConfig({ ...config, regime: 'new' })}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                config.regime === 'new'
                  ? 'bg-black text-white shadow-lg'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              New Regime
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setConfig({ ...config, propertyType: 'self-occupied' })}
              className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all ${
                config.propertyType === 'self-occupied'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              Self-Occupied
            </button>
            <button
              onClick={() => setConfig({ ...config, propertyType: 'rented' })}
              className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all ${
                config.propertyType === 'rented'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              Let Out
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Tax Slab</label>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {TAX_SLABS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setConfig({ ...config, taxSlab: s.value })}
                  className={`rounded-lg py-1.5 text-[11px] font-medium transition-all ${
                    config.taxSlab === s.value
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={config.firstTimeBuyer}
                onChange={(e) => setConfig({ ...config, firstTimeBuyer: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              First-time Buyer (Sec 80EE)
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={config.jointLoan}
                onChange={(e) => setConfig({ ...config, jointLoan: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              Joint Loan
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">
              Other 80C Investments (₹): {formatIndianFull(config.other80CInvestments)}
            </label>
            <input
              type="range"
              min={0}
              max={150000}
              step={5000}
              value={config.other80CInvestments}
              onChange={(e) => setConfig({ ...config, other80CInvestments: Number(e.target.value) })}
              className="premium-slider w-full mt-1"
            />
          </div>
        </div>

        {config.regime === 'old' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-2 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50 p-4"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-violet-700">
                <BadgePercent size={14} />
                Sec 24(b) Interest Deduction
              </span>
              <span className="font-bold text-violet-700">{formatIndianFull(taxBreakdown.section24bDeduction)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-violet-700">
                <Receipt size={14} />
                Sec 80C Principal Deduction
              </span>
              <span className="font-bold text-violet-700">{formatIndianFull(taxBreakdown.section80CDeduction)}</span>
            </div>
            {taxBreakdown.section80EEDeduction > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-violet-700">
                  <Receipt size={14} />
                  Sec 80EE (First-time)
                </span>
                <span className="font-bold text-violet-700">{formatIndianFull(taxBreakdown.section80EEDeduction)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-violet-200 pt-2 text-sm font-semibold">
              <span className="text-violet-800">Annual Tax Saving</span>
              <span className="font-black text-violet-800">{formatIndianFull(taxBreakdown.taxSaving)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-violet-700">Effective Monthly EMI</span>
              <span className="font-bold text-violet-700">{formatIndianFull(taxBreakdown.effectiveEMI)}</span>
            </div>
          </motion.div>
        )}

        {config.regime === 'new' && (
          <p className="mt-3 text-xs text-gray-400 italic">
            Home loan deductions (80C, 24b) are not available under the New Tax Regime.
            {config.propertyType === 'rented' && ' Interest on let-out property can still be claimed.'}
          </p>
        )}
      </div>
    </TiltCard>
  );
}
