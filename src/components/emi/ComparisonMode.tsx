import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, GitCompare, ArrowRight } from 'lucide-react';
import type { ComparisonLoan, EMISnapshot } from './types';
import { computeSnapshot, formatIndianFull } from './calculations';
import TiltCard from './TiltCard';

const defaultLoans: ComparisonLoan[] = [
  { id: 'a', label: 'Bank A', amount: 5000000, rate: 8.5, tenure: 20 },
  { id: 'b', label: 'Bank B', amount: 5000000, rate: 9.0, tenure: 15 },
];

function ComparisonCard({ loan, snapshot, onRemove }: { loan: ComparisonLoan; snapshot: EMISnapshot; onRemove?: () => void }) {
  return (
    <div className="relative rounded-xl border border-gray-200/80 bg-white/60 p-4 backdrop-blur-sm transition-all hover:border-gray-300/80 hover:shadow-md">
      {onRemove && (
        <button onClick={onRemove} className="absolute right-2 top-2 text-gray-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      )}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{loan.label}</span>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-gray-500">
          @ {loan.rate}% / {loan.tenure}y
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Monthly EMI</span>
          <span className="font-bold text-black">{formatIndianFull(snapshot.emi)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Total Interest</span>
          <span className="font-medium text-gray-600">{formatIndianFull(snapshot.totalInterest)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Total Payment</span>
          <span className="font-medium text-gray-600">{formatIndianFull(snapshot.totalPayment)}</span>
        </div>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div className="bg-black transition-all" style={{ width: `${snapshot.principalPct}%` }} />
          <div className="bg-amber-500 transition-all" style={{ width: `${snapshot.interestPct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function ComparisonMode() {
  const [loans, setLoans] = useState<ComparisonLoan[]>(defaultLoans);
  const [showForm, setShowForm] = useState(false);
  const [newLoan, setNewLoan] = useState<ComparisonLoan>({
    id: 'c', label: 'Bank C', amount: 5000000, rate: 8.0, tenure: 25,
  });

  const snapshots = useMemo(() => {
    return loans.map((loan) => ({
      ...computeSnapshot(loan.amount, loan.rate, loan.tenure * 12),
      id: loan.id,
    }));
  }, [loans]);

  const addLoan = () => {
    if (loans.length >= 4) return;
    const id = String.fromCharCode(97 + loans.length);
    setLoans([...loans, { ...newLoan, id }]);
    setShowForm(false);
  };

  const removeLoan = (id: string) => {
    setLoans(loans.filter((l) => l.id !== id));
  };

  const bestValue = useMemo(() => {
    if (snapshots.length < 2) return null;
    return snapshots.reduce((best, curr) =>
      curr.totalPayment < best.totalPayment ? curr : best,
    );
  }, [snapshots]);

  return (
    <TiltCard intensity={4}>
      <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl md:p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
            <GitCompare size={14} className="text-white" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
            Loan Comparison
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {loans.map((loan, i) => {
            const snap = snapshots[i];
            return (
              <ComparisonCard
                key={loan.id}
                loan={loan}
                snapshot={snap}
                onRemove={loans.length > 1 ? () => removeLoan(loan.id) : undefined}
              />
            );
          })}

          {loans.length < 4 && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition-all hover:border-gray-400 hover:text-gray-600"
            >
              <Plus size={20} />
              <span className="text-xs font-medium">Add Loan</span>
            </button>
          )}
        </div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-2 overflow-hidden rounded-xl bg-gray-50 p-4"
          >
            <input
              placeholder="Label (e.g. SBI)"
              value={newLoan.label}
              onChange={(e) => setNewLoan({ ...newLoan, label: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-500">Amount (₹)</label>
                <input
                  type="number"
                  value={newLoan.amount}
                  onChange={(e) => setNewLoan({ ...newLoan, amount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newLoan.rate}
                  onChange={(e) => setNewLoan({ ...newLoan, rate: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Tenure (yrs)</label>
                <input
                  type="number"
                  value={newLoan.tenure}
                  onChange={(e) => setNewLoan({ ...newLoan, tenure: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-black"
                />
              </div>
            </div>
            <button
              onClick={addLoan}
              className="w-full rounded-lg bg-black py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800"
            >
              <div className="flex items-center justify-center gap-2">
                <Plus size={14} />
                Add to Comparison
              </div>
            </button>
          </motion.div>
        )}

        {bestValue && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <ArrowRight size={12} />
            Best value: Loan paying <strong>{formatIndianFull(bestValue.emi)}/mo</strong> with total {formatIndianFull(bestValue.totalPayment)}
          </div>
        )}
      </div>
    </TiltCard>
  );
}
