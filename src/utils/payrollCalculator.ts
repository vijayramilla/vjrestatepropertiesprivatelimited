// ─── INDIA 2026 SALARY CALCULATION ENGINE ─────────────
// Karnataka PT slabs, PF/ESI rules, New Tax Regime FY 2026-27

export interface SalaryStructure {
  // EARNINGS
  basicPay: number;
  hra: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  performanceBonus: number;
  incentive: number;
  otherAllowances: number;

  // DEDUCTIONS
  employeePF: number;
  employerPF: number;
  employeeESI: number;
  employerESI: number;
  professionalTax: number;
  tds: number;
  lopDeduction: number;
  loanDeduction: number;
  otherDeductions: number;

  // TOTALS
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  ctc: number;
}

// ─── PROFESSIONAL TAX - KARNATAKA 2026 ─────────────────
export function calculateProfessionalTax(grossSalary: number): number {
  if (grossSalary <= 15000) return 0;
  if (grossSalary <= 17999) return 150;
  if (grossSalary >= 18000) return 200;
  return 0;
}

// ─── PF CALCULATION ───────────────────────────────────
export function calculatePF(basicSalary: number): { employee: number; employer: number } {
  const pfBasis = Math.min(basicSalary, 15000);
  const contribution = Math.round(pfBasis * 0.12);
  return { employee: contribution, employer: contribution };
}

// ─── ESI CALCULATION ──────────────────────────────────
export function calculateESI(grossSalary: number): { employee: number; employer: number } {
  if (grossSalary > 21000) return { employee: 0, employer: 0 };
  return {
    employee: Math.round(grossSalary * 0.0075),
    employer: Math.round(grossSalary * 0.0325),
  };
}

// ─── TDS CALCULATION (FY 2026-27 New Regime) ──────────
export function calculateMonthlyTDS(annualGross: number): number {
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, annualGross - standardDeduction);

  let annualTax = 0;

  if (taxableIncome <= 400000) {
    annualTax = 0;
  } else if (taxableIncome <= 800000) {
    annualTax = (taxableIncome - 400000) * 0.05;
  } else if (taxableIncome <= 1200000) {
    annualTax = 20000 + (taxableIncome - 800000) * 0.1;
  } else if (taxableIncome <= 1600000) {
    annualTax = 60000 + (taxableIncome - 1200000) * 0.15;
  } else if (taxableIncome <= 2000000) {
    annualTax = 120000 + (taxableIncome - 1600000) * 0.2;
  } else if (taxableIncome <= 2400000) {
    annualTax = 200000 + (taxableIncome - 2000000) * 0.25;
  } else {
    annualTax = 300000 + (taxableIncome - 2400000) * 0.3;
  }

  const totalTax = Math.round(annualTax * 1.04); // 4% H&E Cess
  return Math.round(totalTax / 12);
}

// ─── SALARY STRUCTURE BUILDER ─────────────────────────
export function buildSalaryStructure(
  ctcMonthly: number,
  incentive: number = 0,
  performanceBonus: number = 0,
  lopDays: number = 0,
  workingDays: number = 26,
  loanDeduction: number = 0,
  otherDeductions: number = 0,
  otherAllowances: number = 0,
): SalaryStructure {
  const basicPay = Math.round(ctcMonthly * 0.4);
  const employerPF = Math.min(Math.round(basicPay * 0.12), 1800);
  const employerGratuityProvision = Math.round(basicPay * 0.0481);

  const grossSalary = Math.round(ctcMonthly - employerPF - employerGratuityProvision);

  const hra = Math.round(basicPay * 0.5);
  const conveyanceAllowance = 1600;
  const medicalAllowance = 1250;
  const specialAllowance = Math.max(0, grossSalary - basicPay - hra - conveyanceAllowance - medicalAllowance - otherAllowances);

  const totalEarnings = grossSalary + incentive + performanceBonus + otherAllowances;

  const perDaySalary = Math.round(grossSalary / workingDays);
  const lopDeduction = lopDays > 0 ? Math.round(perDaySalary * lopDays) : 0;

  const employeePF = Math.min(Math.round(basicPay * 0.12), 1800);
  const esiCalc = calculateESI(grossSalary - lopDeduction);
  const employeeESI = esiCalc.employee;
  const professionalTax = calculateProfessionalTax(grossSalary - lopDeduction);

  const annualGross = totalEarnings * 12;
  const tds = calculateMonthlyTDS(annualGross);

  const totalDeductions = employeePF + employeeESI + professionalTax + tds + lopDeduction + loanDeduction + otherDeductions;
  const netPay = Math.max(0, totalEarnings - totalDeductions);

  return {
    basicPay,
    hra,
    conveyanceAllowance,
    medicalAllowance,
    specialAllowance,
    performanceBonus,
    incentive,
    otherAllowances,
    employeePF,
    employerPF,
    employeeESI,
    employerESI: esiCalc.employer,
    professionalTax,
    tds,
    lopDeduction,
    loanDeduction,
    otherDeductions,
    grossEarnings: totalEarnings,
    totalDeductions,
    netPay,
    ctc: ctcMonthly * 12 + employerPF * 12 + employerGratuityProvision * 12,
  };
}

// ─── NUMBER TO WORDS (Indian) ─────────────────────────
export function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  return 'Rupees ' + convert(Math.round(num)) + ' Only';
}

// ─── FORMAT CURRENCY (Indian) ─────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function getMonthName(month: number): string {
  return MONTH_NAMES[(month - 1) % 12] || '';
}
