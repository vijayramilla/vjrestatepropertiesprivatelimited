import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Sparkles } from 'lucide-react';
import type { PrepaymentConfig, PrepaymentResult, LoanInput } from './types';
import { applyPrepayment, formatIndianFull, calcEMI } from './calculations';
import TiltCard from './TiltCard';

interface Props {
  loan: LoanInput;
  tenureMonths: number;
}

export default function PrepaymentPanel({ loan, tenureMonths }: Props) {
  const [config, setConfig] = useState<PrepaymentConfig>({
    monthlyExtra: 0,
    yearlyExtra: 0,
    oneTimeExtra: 0,
    oneTimeMonth: 1,
    mode: 'reduce-tenure',
  });

  const result = useMemo<PrepaymentResult>(
    () => applyPrepayment(loan.amount, loan.rate, tenureMonths, config),
    [loan.amount, loan.rate, tenureMonths, config],
  );

  const origEMI = calcEMI(loan.amount, loan.rate, tenureMonths);

  return (
    <TiltCard intensity={4}>
      <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl md:p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
            <Sparkles size={14} className="text-white" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
            Prepayment Simulator
          </h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Monthly Extra (₹)</label>
            <input
              type="range"
              min={0}
              max={Math.round(origEMI * 2)}
              step={1000}
              value={config.monthlyExtra}
              onChange={(e) => setConfig({ ...config, monthlyExtra: Number(e.target.value) })}
              className="premium-slider w-full mt-1"
            />
            <span className="text-sm font-bold text-black">{formatIndianFull(config.monthlyExtra)}</span>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Yearly Bonus Prepayment (₹)</label>
            <input
              type="range"
              min={0}
              max={loan.amount * 0.5}
              step={10000}
              value={config.yearlyExtra}
              onChange={(e) => setConfig({ ...config, yearlyExtra: Number(e.target.value) })}
              className="premium-slider w-full mt-1"
            />
            <span className="text-sm font-bold text-black">{formatIndianFull(config.yearlyExtra)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setConfig({ ...config, mode: 'reduce-tenure' })}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                config.mode === 'reduce-tenure'
                  ? 'bg-black text-white shadow-lg'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Reduce Tenure
            </button>
            <button
              onClick={() => setConfig({ ...config, mode: 'reduce-emi' })}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                config.mode === 'reduce-emi'
                  ? 'bg-black text-white shadow-lg'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              Reduce EMI
            </button>
          </div>
        </div>

        {result.interestSaved > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-2 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Sparkles size={14} />
                Interest Saved
              </span>
              <span className="font-bold text-emerald-700">{formatIndianFull(result.interestSaved)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Clock size={14} />
                Tenure Reduced
              </span>
              <span className="font-bold text-emerald-700">
                {result.tenureReductionMonths >= 12
                  ? `${Math.floor(result.tenureReductionMonths / 12)}y ${result.tenureReductionMonths % 12}m`
                  : `${result.tenureReductionMonths} months`}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <TrendingUp size={14} />
                New Monthly
              </span>
              <span className="font-bold text-emerald-700">
                {formatIndianFull(result.newEMI)} {config.mode === 'reduce-emi' ? '(reduced)' : ''}
              </span>
            </div>
          </motion.div>
        )}

        {result.interestSaved === 0 && config.monthlyExtra === 0 && config.yearlyExtra === 0 && (
          <p className="mt-3 text-xs text-gray-400 italic">
            Adjust the sliders to see your potential savings from prepayments.
          </p>
        )}
      </div>
    </TiltCard>
  );
}
