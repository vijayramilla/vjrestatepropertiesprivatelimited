import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Calculator } from 'lucide-react';

function formatIndian(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const l = amount / 100000;
    return `₹${l % 1 === 0 ? l : l.toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatIndianFull(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function calcEMI(P: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0) return P / tenureMonths;
  const r = annualRate / 12 / 100;
  const factor = (1 + r) ** tenureMonths;
  return (P * r * factor) / (factor - 1);
}

interface AmortRow {
  year: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
}

function calcAmortization(
  P: number,
  annualRate: number,
  tenureMonths: number,
  emi: number,
): AmortRow[] {
  if (annualRate === 0) {
    return [{ year: 1, principalPaid: P, interestPaid: 0, balance: 0 }];
  }
  const r = annualRate / 12 / 100;
  let balance = P;
  const rows: AmortRow[] = [];
  let yearPrincipal = 0;
  let yearInterest = 0;

  for (let m = 1; m <= tenureMonths; m++) {
    const interest = balance * r;
    const principal = emi - interest;
    yearPrincipal += principal;
    yearInterest += interest;
    balance -= principal;

    if (m % 12 === 0 || m === tenureMonths) {
      rows.push({
        year: Math.ceil(m / 12),
        principalPaid: Math.round(yearPrincipal),
        interestPaid: Math.round(yearInterest),
        balance: Math.round(Math.max(balance, 0)),
      });
      yearPrincipal = 0;
      yearInterest = 0;
    }
  }
  return rows;
}

export default function EmiCalculator() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(5000000);
  const [rate, setRate] = useState(9.5);
  const [tenure, setTenure] = useState(15);

  const tenureMonths = tenure * 12;

  const { emi, totalPayment, totalInterest, amortization, principalPct, interestPct } = useMemo(() => {
    if (amount <= 0 || tenureMonths <= 0) {
      return { emi: 0, totalPayment: 0, totalInterest: 0, amortization: [] as AmortRow[], principalPct: 50, interestPct: 50 };
    }
    const e = calcEMI(amount, rate, tenureMonths);
    const total = e * tenureMonths;
    const interest = total - amount;
    const amort = calcAmortization(amount, rate, tenureMonths, e);
    const iPct = total > 0 ? (interest / total) * 100 : 0;
    return {
      emi: Math.round(e),
      totalPayment: Math.round(total),
      totalInterest: Math.round(interest),
      amortization: amort,
      principalPct: 100 - iPct,
      interestPct: iPct,
    };
  }, [amount, rate, tenureMonths]);

  const handleAmountInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    setAmount(v ? Number(v) : 0);
  }, []);

  const handleRateInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setRate(Math.min(24, Math.max(1, v)));
  }, []);

  const handleTenureInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v)) setTenure(Math.min(30, Math.max(1, v)));
  }, []);

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-medium text-black py-2 group"
      >
        <span className="flex items-center gap-2">
          <Calculator size={15} className="text-gray-500" />
          EMI Calculator
        </span>
        {open ? <ChevronUp size={15} className="text-gray-400 group-hover:text-black transition-colors" /> : <ChevronDown size={15} className="text-gray-400 group-hover:text-black transition-colors" />}
      </button>

      {open && (
        <div className="mt-3 space-y-5 text-sm">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Loan Amount</label>
                <span className="text-sm font-bold text-black">{formatIndian(amount)}</span>
              </div>
              <input
                type="range"
                min={100000}
                max={100000000}
                step={100000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="emi-slider w-full"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>₹1 L</span>
                <span>₹10 Cr</span>
              </div>
              <input
                type="text"
                value={amount || ''}
                onChange={handleAmountInput}
                placeholder="Enter loan amount"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Interest Rate</label>
                <span className="text-sm font-bold text-black">{rate}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="emi-slider w-full"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1%</span>
                <span>24%</span>
              </div>
              <input
                type="text"
                value={rate}
                onChange={handleRateInput}
                placeholder="Rate %"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tenure</label>
                <span className="text-sm font-bold text-black">{tenure} {tenure === 1 ? 'Year' : 'Years'}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={tenure}
                onChange={(e) => setTenure(Number(e.target.value))}
                className="emi-slider w-full"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1 Year</span>
                <span>30 Years</span>
              </div>
              <input
                type="text"
                value={tenure}
                onChange={handleTenureInput}
                placeholder="Years"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 outline-none focus:border-black focus:bg-white transition-colors"
              />
            </div>
          </div>

          {amount > 0 && tenureMonths > 0 && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Monthly EMI</p>
                <p className="text-[26px] font-black text-black tracking-tight mt-0.5">{formatIndianFull(emi)}</p>
                <p className="text-[11px] text-gray-400">for {tenureMonths} months @ {rate}% p.a.</p>
              </div>

              <div className="pt-3 border-t border-gray-200 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Principal Amount</span>
                  <span className="font-semibold text-gray-900">{formatIndianFull(amount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total Interest</span>
                  <span className="font-semibold text-gray-900">{formatIndianFull(totalInterest)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Total Payment</span>
                  <span className="font-bold text-black">{formatIndianFull(totalPayment)}</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-200">
                  <div
                    className="bg-black transition-all duration-300"
                    style={{ width: `${Math.max(principalPct, 5)}%` }}
                  />
                  <div
                    className="bg-gray-500 transition-all duration-300"
                    style={{ width: `${Math.max(interestPct, 5)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] mt-1.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-black inline-block" />
                    Principal: {principalPct.toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
                    Interest: {interestPct.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {amount > 0 && amortization.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-black transition-colors list-none [&::-webkit-details-marker]:hidden">
                <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
                Yearly Breakup
              </summary>
              <div className="mt-2 max-h-48 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left py-1.5 font-medium">Year</th>
                      <th className="text-right py-1.5 font-medium">Principal</th>
                      <th className="text-right py-1.5 font-medium">Interest</th>
                      <th className="text-right py-1.5 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortization.map((row) => (
                      <tr key={row.year} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-1.5 text-gray-500">{row.year}</td>
                        <td className="py-1.5 text-right font-medium text-gray-800">{formatIndianFull(row.principalPaid)}</td>
                        <td className="py-1.5 text-right text-gray-600">{formatIndianFull(row.interestPaid)}</td>
                        <td className="py-1.5 text-right text-gray-500">{formatIndianFull(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <p className="text-[9px] text-gray-400 leading-relaxed">
            *Calculations are for reference only. Actual EMI may vary based on lender terms, processing fees, and applicable interest rate changes.
          </p>
        </div>
      )}
    </div>
  );
}
