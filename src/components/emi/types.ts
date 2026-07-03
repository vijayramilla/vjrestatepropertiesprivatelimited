export interface LoanInput {
  amount: number;
  rate: number;
  tenure: number;
}

export interface AmortRow {
  year: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
}

export interface PrepaymentConfig {
  monthlyExtra: number;
  yearlyExtra: number;
  oneTimeExtra: number;
  oneTimeMonth: number;
  mode: 'reduce-tenure' | 'reduce-emi';
}

export interface TaxConfig {
  regime: 'old' | 'new';
  propertyType: 'self-occupied' | 'rented';
  taxSlab: number;
  firstTimeBuyer: boolean;
  jointLoan: boolean;
  other80CInvestments: number;
  annualIncome: number;
}

export interface ComparisonLoan extends LoanInput {
  id: string;
  label: string;
  prepayment?: PrepaymentConfig;
}

export interface EMISnapshot {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  amortization: AmortRow[];
  principalPct: number;
  interestPct: number;
  tenureMonths: number;
}

export interface TaxBreakdown {
  annualInterest: number;
  annualPrincipal: number;
  section24bDeduction: number;
  section80CDeduction: number;
  section80EEDeduction: number;
  totalDeduction: number;
  taxSaving: number;
  netAnnualOutflow: number;
  effectiveEMI: number;
}

export interface PrepaymentResult {
  originalEMI: number;
  originalTenureMonths: number;
  originalTotalInterest: number;
  newEMI: number;
  newTenureMonths: number;
  newTotalInterest: number;
  interestSaved: number;
  tenureReductionMonths: number;
}
