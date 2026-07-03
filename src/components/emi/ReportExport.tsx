import { useCallback } from 'react';
import { Download, FileText } from 'lucide-react';
import type { AmortRow } from './types';
import { formatIndianFull } from './calculations';

interface Props {
  amortization: AmortRow[];
  amount: number;
  rate: number;
  tenure: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
}

export default function ReportExport({ amortization, amount, rate, tenure, emi, totalInterest, totalPayment }: Props) {
  const exportCSV = useCallback(() => {
    const headers = 'Year,Principal Paid (₹),Interest Paid (₹),Balance (₹)\n';
    const rows = amortization
      .map((r) => `${r.year},${r.principalPaid},${r.interestPaid},${r.balance}`)
      .join('\n');

    const summary = `Loan Summary\nAmount,${amount}\nRate,${rate}%\nTenure,${tenure} years\nEMI,${emi}\nTotal Interest,${totalInterest}\nTotal Payment,${totalPayment}\n\n`;
    const csv = summary + headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amortization-schedule-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [amortization, amount, rate, tenure, emi, totalInterest, totalPayment]);

  const exportPDF = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    doc.setFontSize(18);
    doc.text('Amortization Schedule', 40, 40);
    doc.setFontSize(10);
    doc.text(`Loan: ${formatIndianFull(amount)} @ ${rate}% for ${tenure} years`, 40, 60);
    doc.text(`EMI: ${formatIndianFull(emi)} | Total Interest: ${formatIndianFull(totalInterest)} | Total: ${formatIndianFull(totalPayment)}`, 40, 75);

    const tableData = amortization.map((r) => [
      r.year.toString(),
      formatIndianFull(r.principalPaid),
      formatIndianFull(r.interestPaid),
      formatIndianFull(r.balance),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: 90,
      head: [['Year', 'Principal Paid', 'Interest Paid', 'Balance']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] },
      styles: { fontSize: 8 },
    });

    doc.save(`amortization-${Date.now()}.pdf`);
  }, [amortization, amount, rate, tenure, emi, totalInterest, totalPayment]);

  return (
    <div className="flex gap-2">
      <button
        onClick={exportCSV}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-gray-400 hover:bg-gray-50"
      >
        <Download size={12} />
        CSV
      </button>
      <button
        onClick={exportPDF}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-gray-400 hover:bg-gray-50"
      >
        <FileText size={12} />
        PDF
      </button>
    </div>
  );
}
