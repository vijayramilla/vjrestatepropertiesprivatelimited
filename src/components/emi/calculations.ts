import type {
  AmortRow,
  EMISnapshot,
  PrepaymentConfig,
  PrepaymentResult,
  TaxBreakdown,
  TaxConfig,
} from './types';

export function calcEMI(P: number, annualRate: number, tenureMonths: number): number {
  if (annualRate === 0) return P / tenureMonths;
  const r = annualRate / 12 / 100;
  const factor = (1 + r) ** tenureMonths;
  return (P * r * factor) / (factor - 1);
}

export function calcAmortization(
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

export function calcAmortizationMonthly(
  P: number,
  annualRate: number,
  tenureMonths: number,
  emi: number,
): { month: number; principal: number; interest: number; balance: number }[] {
  if (annualRate === 0) {
    return [{ month: 1, principal: P, interest: 0, balance: 0 }];
  }
  const r = annualRate / 12 / 100;
  let balance = P;
  const rows: { month: number; principal: number; interest: number; balance: number }[] = [];

  for (let m = 1; m <= tenureMonths; m++) {
    const interest = balance * r;
    const principal = emi - interest;
    balance -= principal;
    rows.push({
      month: m,
      principal: Math.round(principal),
      interest: Math.round(interest),
      balance: Math.round(Math.max(balance, 0)),
    });
  }
  return rows;
}

export function computeSnapshot(
  amount: number,
  rate: number,
  tenureMonths: number,
): EMISnapshot {
  if (amount <= 0 || tenureMonths <= 0) {
    return {
      emi: 0,
      totalPayment: 0,
      totalInterest: 0,
      amortization: [],
      principalPct: 50,
      interestPct: 50,
      tenureMonths: 0,
    };
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
    tenureMonths,
  };
}

export function formatIndian(amount: number): string {
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

export function formatIndianFull(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function applyPrepayment(
  P: number,
  annualRate: number,
  tenureMonths: number,
  config: PrepaymentConfig,
): PrepaymentResult {
  if (annualRate === 0) {
    return {
      originalEMI: P / tenureMonths,
      originalTenureMonths: tenureMonths,
      originalTotalInterest: 0,
      newEMI: P / tenureMonths,
      newTenureMonths: tenureMonths,
      newTotalInterest: 0,
      interestSaved: 0,
      tenureReductionMonths: 0,
    };
  }

  const r = annualRate / 12 / 100;
  const origEMI = calcEMI(P, annualRate, tenureMonths);
  const origTotal = origEMI * tenureMonths;

  if (config.mode === 'reduce-emi') {
    let balance = P;
    let totalInterest = 0;
    let months = 0;
    const remainingMonths = tenureMonths;

    for (let m = 1; m <= remainingMonths; m++) {
      const interest = balance * r;
      const isOneTimeMonth = config.oneTimeExtra > 0 && m === config.oneTimeMonth;
      const extra = config.monthlyExtra + (config.yearlyExtra > 0 && m % 12 === 0 ? config.yearlyExtra : 0) + (isOneTimeMonth ? config.oneTimeExtra : 0);
      const totalPayment = origEMI + extra;
      const principal = totalPayment - interest;
      if (principal <= 0) break;
      const actualPrincipal = Math.min(principal, balance);
      totalInterest += interest;
      balance -= actualPrincipal;
      months = m;
      if (balance <= 0) break;
    }

    const newEMI = calcEMI(P, annualRate, Math.max(months, 1));

    return {
      originalEMI: Math.round(origEMI),
      originalTenureMonths: tenureMonths,
      originalTotalInterest: Math.round(origTotal - P),
      newEMI: Math.round(newEMI),
      newTenureMonths: months,
      newTotalInterest: Math.round(totalInterest),
      interestSaved: Math.round((origTotal - P) - totalInterest),
      tenureReductionMonths: Math.max(0, tenureMonths - months),
    };
  }

  let balance = P;
  let totalInterest = 0;
  let months = 0;
  const currentEMI = origEMI;

  for (let m = 1; m <= 600; m++) {
    const interest = balance * r;
    if (interest >= currentEMI) break;
    const isOneTimeMonth = config.oneTimeExtra > 0 && m === config.oneTimeMonth;
    const extra = config.monthlyExtra + (config.yearlyExtra > 0 && m % 12 === 0 ? config.yearlyExtra : 0) + (isOneTimeMonth ? config.oneTimeExtra : 0);
    const principal = currentEMI - interest + extra;
    if (principal <= 0) break;
    const actualPrincipal = Math.min(principal, balance);
    totalInterest += interest;
    balance -= actualPrincipal;
    months = m;
    if (balance <= 0) break;
  }

  return {
    originalEMI: Math.round(origEMI),
    originalTenureMonths: tenureMonths,
    originalTotalInterest: Math.round(origTotal - P),
    newEMI: Math.round(currentEMI),
    newTenureMonths: months,
    newTotalInterest: Math.round(totalInterest),
    interestSaved: Math.round((origTotal - P) - totalInterest),
    tenureReductionMonths: Math.max(0, tenureMonths - months),
  };
}

export function calcTaxBenefits(
  annualInterest: number,
  annualPrincipal: number,
  config: TaxConfig,
): TaxBreakdown {
  const section24bDeduction = config.propertyType === 'self-occupied'
    ? Math.min(annualInterest, 200000)
    : annualInterest;

  const available80C = Math.max(0, 150000 - config.other80CInvestments);
  const section80CDeduction = Math.min(annualPrincipal, available80C);

  let section80EEDeduction = 0;
  if (config.firstTimeBuyer && config.regime === 'old') {
    section80EEDeduction = Math.min(Math.max(0, annualInterest - section24bDeduction), 50000);
  }

  const totalDeduction = (config.regime === 'old')
    ? section24bDeduction + section80CDeduction + section80EEDeduction
    : (config.propertyType === 'rented' ? section24bDeduction : 0);

  const taxRate = config.taxSlab / 100;
  const taxSaving = totalDeduction * taxRate;
  const annualEMI = (annualInterest + annualPrincipal);
  const netAnnualOutflow = annualEMI - taxSaving;

  return {
    annualInterest: Math.round(annualInterest),
    annualPrincipal: Math.round(annualPrincipal),
    section24bDeduction: Math.round(section24bDeduction),
    section80CDeduction: Math.round(section80CDeduction),
    section80EEDeduction: Math.round(section80EEDeduction),
    totalDeduction: Math.round(totalDeduction),
    taxSaving: Math.round(taxSaving),
    netAnnualOutflow: Math.round(netAnnualOutflow),
    effectiveEMI: Math.round(netAnnualOutflow / 12),
  };
}

export function calcInflationAdjustedEMI(
  emi: number,
  years: number,
  inflationRate: number,
): { year: number; nominal: number; real: number }[] {
  const result: { year: number; nominal: number; real: number }[] = [];
  for (let y = 1; y <= years; y++) {
    const real = emi / ((1 + inflationRate / 100) ** (y - 1));
    result.push({ year: y, nominal: Math.round(emi), real: Math.round(real) });
  }
  return result;
}
