import { applyPlugin } from 'jspdf-autotable';
import type { SalaryStructure } from './payrollCalculator';
import { formatCurrency, numberToWords, getMonthName } from './payrollCalculator';

// Lazy-load jsPDF to keep initial bundle small
async function loadJsPDF() {
  const jsPDFModule = await import('jspdf');
  const JsPDF = jsPDFModule.default ?? jsPDFModule.jsPDF;
  applyPlugin(JsPDF);
  return JsPDF;
}

interface PayslipEmployee {
  employee_id?: string;
  id?: string;
  name?: string;
  designation?: string;
  department?: string;
  joining_date?: string;
  bank_account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  pan_number?: string;
  uan_number?: string;
  esi_number?: string;
  salary?: number;
  email?: string;
  phone?: string;
}

interface PayslipRecord {
  month: number;
  year: number;
  workingDays?: number;
  daysWorked?: number;
  lopDays?: number;
  incentive?: number;
  performanceBonus?: number;
  loanDeduction?: number;
  otherDeductions?: number;
  otherAllowances?: number;
  paidHolidays?: number;
  leavesTaken?: number;
  remainingLeaves?: number;
}

export async function generatePayslipPDF(
  employee: PayslipEmployee,
  record: PayslipRecord,
  salary: SalaryStructure,
): Promise<void> {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;

  // ─── COLORS ──────────────────────────────
  const navy: [number, number, number] = [10, 22, 40];
  const gold: [number, number, number] = [201, 168, 76];
  const lightGray: [number, number, number] = [248, 249, 250];
  const darkGray: [number, number, number] = [55, 65, 81];
  const medGray: [number, number, number] = [107, 114, 128];

  const monthName = getMonthName(record.month);

  // ─── HEADER BACKGROUND ───────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // ─── GOLD ACCENT LINE ────────────────────
  doc.setFillColor(...gold);
  doc.rect(0, 50, pageWidth, 1.5, 'F');

  // ─── COMPANY NAME ────────────────────────
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('VJR ESTATE', margin, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gold);
  doc.text('Properties Pvt. Ltd.', margin, 26);

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.text('Bangalore, Karnataka, India', margin, 32);
  doc.text('www.vjrestate.com', margin, 37);

  // ─── PAYSLIP TITLE ───────────────────────
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const title = `PAYSLIP \u2014 ${monthName.toUpperCase()} ${record.year}`;
  doc.text(title, pageWidth - margin, 20, { align: 'right' } as any);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gold);
  doc.text(`Pay Period: ${monthName} ${record.year}`, pageWidth - margin, 28, { align: 'right' } as any);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin, 34, { align: 'right' } as any);

  // ─── EMPLOYEE INFO — LEFT BOX ────────────
  let y = 58;

  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, 85, 42, 3, 3, 'F');

  doc.setTextColor(...navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const empId = employee.employee_id || employee.id || '\u2014';
  const empName = employee.name || '\u2014';
  const empDesig = employee.designation || '\u2014';
  const empDept = employee.department || '\u2014';
  const empJoin = employee.joining_date
    ? new Date(employee.joining_date).toLocaleDateString('en-IN')
    : '\u2014';

  const empDetails: [string, string][] = [
    ['Employee ID:', empId],
    ['Name:', empName],
    ['Designation:', empDesig],
    ['Department:', empDept],
    ['Date of Joining:', empJoin],
    ['Employment Type:', 'Full Time'],
  ];

  empDetails.forEach(([label, value], i) => {
    doc.setTextColor(...medGray);
    doc.text(label, margin + 4, y + 14 + i * 5);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value || '\u2014'), margin + 32, y + 14 + i * 5);
    doc.setFont('helvetica', 'normal');
  });

  // ─── BANK & COMPLIANCE — RIGHT BOX ───────
  doc.setFillColor(...lightGray);
  doc.roundedRect(105, y, 90, 42, 3, 3, 'F');

  doc.setTextColor(...navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK & COMPLIANCE', 109, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const bankDetails: [string, string][] = [
    ['Bank Account:', employee.bank_account_number || 'XXXXXX1234'],
    ['Bank Name:', employee.bank_name || '\u2014'],
    ['IFSC Code:', employee.ifsc_code || '\u2014'],
    ['PAN Number:', employee.pan_number || '\u2014'],
    ['UAN Number:', employee.uan_number || '\u2014'],
    ['ESI Number:', employee.esi_number || 'N/A'],
  ];

  bankDetails.forEach(([label, value], i) => {
    doc.setTextColor(...medGray);
    doc.text(label, 109, y + 14 + i * 5);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), 139, y + 14 + i * 5);
    doc.setFont('helvetica', 'normal');
  });

  y += 48;

  // ─── ATTENDANCE SUMMARY BAR ──────────────
  doc.setFillColor(...navy);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 3, 3, 'F');

  const attendanceCols = [
    { label: 'Working Days', value: record.workingDays || 26 },
    { label: 'Days Worked', value: record.daysWorked || (record.workingDays || 26) - (record.lopDays || 0) },
    { label: 'LOP Days', value: record.lopDays || 0 },
    { label: 'Paid Holidays', value: record.paidHolidays || 0 },
    { label: 'Leaves Taken', value: record.leavesTaken || 0 },
    { label: 'Leave Balance', value: record.remainingLeaves || 0 },
  ];

  const colWidth = (pageWidth - margin * 2) / attendanceCols.length;

  attendanceCols.forEach((col, i) => {
    const x = margin + i * colWidth + colWidth / 2;
    doc.setTextColor(...gold);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(String(col.value), x, y + 7, { align: 'center' } as any);
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(col.label, x, y + 12, { align: 'center' } as any);
  });

  y += 20;

  // ─── EARNINGS TABLE ──────────────────────
  doc.setFillColor(...navy);
  doc.roundedRect(margin, y, 88, 7, 0, 0, 'F');
  doc.setTextColor(...gold);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS', margin + 4, y + 5);
  doc.text('AMOUNT (\u20b9)', margin + 70, y + 5, { align: 'right' } as any);

  y += 7;

  const earnings: [string, number][] = [
    ['Basic Pay', salary.basicPay],
    ['House Rent Allowance (HRA)', salary.hra],
    ['Conveyance Allowance', salary.conveyanceAllowance],
    ['Medical Allowance', salary.medicalAllowance],
    ...(salary.specialAllowance > 0 ? [['Special Allowance', salary.specialAllowance] as [string, number]] : []),
    ...(salary.otherAllowances > 0 ? [['Other Allowances', salary.otherAllowances] as [string, number]] : []),
    ...(salary.incentive > 0 ? [['Sales Incentive', salary.incentive] as [string, number]] : []),
    ...(salary.performanceBonus > 0 ? [['Performance Bonus', salary.performanceBonus] as [string, number]] : []),
  ];

  earnings.forEach((row, i) => {
    const bg: [number, number, number] = i % 2 === 0 ? [255, 255, 255] : [248, 249, 250];
    doc.setFillColor(...bg);
    doc.rect(margin, y, 88, 6, 'F');
    doc.setTextColor(...darkGray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], margin + 4, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(row[1]), margin + 84, y + 4, { align: 'right' } as any);
    y += 6;
  });

  // Earnings total
  doc.setFillColor(...navy);
  doc.rect(margin, y, 88, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('GROSS EARNINGS', margin + 4, y + 5);
  doc.setTextColor(...gold);
  doc.text(formatCurrency(salary.grossEarnings), margin + 84, y + 5, { align: 'right' } as any);

  // ─── DEDUCTIONS TABLE ────────────────────
  let dy = y - earnings.length * 6 - 14;

  doc.setFillColor(...navy);
  doc.roundedRect(103, dy, 92, 7, 0, 0, 'F');
  doc.setTextColor(...gold);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DEDUCTIONS', 107, dy + 5);
  doc.text('AMOUNT (\u20b9)', 187, dy + 5, { align: 'right' } as any);

  dy += 7;

  const deductions: [string, number][] = [
    ['Provident Fund (12%)', salary.employeePF],
    ...(salary.employeeESI > 0 ? [['ESI (0.75%)', salary.employeeESI] as [string, number]] : []),
    ...(salary.professionalTax > 0 ? [['Professional Tax', salary.professionalTax] as [string, number]] : []),
    ...(salary.tds > 0 ? [['TDS (Income Tax)', salary.tds] as [string, number]] : []),
    ...(salary.lopDeduction > 0 ? [['LOP Deduction', salary.lopDeduction] as [string, number]] : []),
    ...(salary.loanDeduction > 0 ? [['Loan Repayment', salary.loanDeduction] as [string, number]] : []),
    ...(salary.otherDeductions > 0 ? [['Other Deductions', salary.otherDeductions] as [string, number]] : []),
  ];

  deductions.forEach((row, i) => {
    const bg: [number, number, number] = i % 2 === 0 ? [255, 255, 255] : [248, 249, 250];
    doc.setFillColor(...bg);
    doc.rect(103, dy, 92, 6, 'F');
    doc.setTextColor(...darkGray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], 107, dy + 4);
    doc.setTextColor(239, 68, 68);
    doc.setFont('helvetica', 'bold');
    doc.text('- ' + formatCurrency(row[1]), 191, dy + 4, { align: 'right' } as any);
    dy += 6;
  });

  // Deductions total
  doc.setFillColor(...navy);
  doc.rect(103, y, 92, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DEDUCTIONS', 107, y + 5);
  doc.setTextColor(239, 68, 68);
  doc.text('- ' + formatCurrency(salary.totalDeductions), 191, y + 5, { align: 'right' } as any);

  y += 12;

  // ─── EMPLOYER CONTRIBUTIONS ──────────────
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 3, 3, 'F');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYER CONTRIBUTIONS (Not deducted from salary \u2014 paid by VJR Estate)', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Employer PF (12%): \u20b9${formatCurrency(salary.employerPF)}   |   Employer ESI (3.25%): \u20b9${formatCurrency(salary.employerESI)}   |   Gratuity Provision: \u20b9${formatCurrency(Math.round(salary.basicPay * 0.0481))}`,
    margin + 4,
    y + 12,
  );

  y += 22;

  // ─── NET PAY BOX ─────────────────────────
  doc.setFillColor(...gold);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 4, 4, 'F');

  doc.setTextColor(...navy);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY (TAKE HOME)', margin + 6, y + 8);

  doc.setFontSize(16);
  doc.text('\u20b9 ' + formatCurrency(salary.netPay), pageWidth - margin - 6, y + 10, { align: 'right' } as any);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(numberToWords(salary.netPay), margin + 6, y + 16);

  y += 26;

  // ─── YTD SUMMARY ─────────────────────────
  const ytdFactor = record.month;

  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, 'F');
  doc.setTextColor(...navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('YEAR TO DATE (YTD) SUMMARY', margin + 4, y + 7);

  const ytdCols = [
    { label: 'YTD Gross', value: salary.grossEarnings * ytdFactor },
    { label: 'YTD PF', value: salary.employeePF * ytdFactor },
    { label: 'YTD ESI', value: salary.employeeESI * ytdFactor },
    { label: 'YTD Prof. Tax', value: salary.professionalTax * ytdFactor },
    { label: 'YTD TDS', value: salary.tds * ytdFactor },
    { label: 'YTD Net Pay', value: salary.netPay * ytdFactor },
  ];

  const ytdColWidth = (pageWidth - margin * 2) / ytdCols.length;

  ytdCols.forEach((col, i) => {
    const x = margin + i * ytdColWidth + ytdColWidth / 2;
    doc.setTextColor(...navy);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('\u20b9' + formatCurrency(col.value), x, y + 14, { align: 'center' } as any);
    doc.setTextColor(...medGray);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(col.label, x, y + 19, { align: 'center' } as any);
  });

  y += 28;

  // ─── FOOTER ──────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');

  doc.setTextColor(...gold);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('VJR Estate Properties Pvt. Ltd.', margin, pageHeight - 12);

  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('www.vjrestate.com', margin, pageHeight - 7);

  doc.setTextColor(150, 150, 150);
  doc.text('This is a computer-generated payslip and does not require a signature.', pageWidth / 2, pageHeight - 12, { align: 'center' } as any);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, pageHeight - 7, { align: 'center' } as any);

  doc.setTextColor(...gold);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL', pageWidth - margin, pageHeight - 12, { align: 'right' } as any);
  doc.setTextColor(180, 180, 180);
  doc.setFont('helvetica', 'normal');
  const refId = `VJR-PAY-${record.year}-${String(record.month).padStart(2, '0')}-${empId}`;
  doc.text(refId, pageWidth - margin, pageHeight - 7, { align: 'right' } as any);

  // ─── TRIGGER DOWNLOAD ────────────────────
  const safeName = (empName || 'employee').replace(/\s+/g, '_');
  doc.save(`payslip-${safeName}-${monthName}-${record.year}.pdf`);
}
