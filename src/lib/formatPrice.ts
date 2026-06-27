export function formatPrice(rupees: number | null | undefined): string {
  if (!rupees) return '—';
  
  if (rupees >= 10000000) {
    const crores = rupees / 10000000;
    return `₹${crores.toFixed(1).replace('.0', '')} Cr`;
  }
  
  if (rupees >= 100000) {
    const lakhs = rupees / 100000;
    return `₹${lakhs.toFixed(1).replace('.0', '')}L`;
  }
  
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export function formatRental(rupees: number | null | undefined): string {
  if (!rupees) return '—';
  
  if (rupees >= 100000) {
    const lakhs = rupees / 100000;
    return `₹${lakhs.toFixed(1).replace('.0', '')}L`;
  }
  
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export function formatYield(price: number, monthlyRental: number): number | null {
  if (!price || !monthlyRental) return null;
  const annualRental = monthlyRental * 12;
  return Number(((annualRental / price) * 100).toFixed(1));
}

/** Formatted INR for plot/land price helpers (e.g. ₹85.00 L, ₹1.20 Cr) */
export function formatINR(amount: number | null | undefined): string {
  if (!amount || amount === 0) return '';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatINRPerSqft(amount: number | null | undefined): string {
  if (!amount || amount === 0) return '';
  return `= ₹${amount.toLocaleString('en-IN')} per sq.ft`;
}

/** Compact card total price — e.g. ₹85 L, ₹1.2 Cr */
export function formatCardTotalPrice(amount: number | null | undefined): string {
  if (!amount) return '—';
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    const formatted = cr % 1 === 0 ? String(cr) : cr.toFixed(1).replace(/\.0$/, '');
    return `₹${formatted} Cr`;
  }
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    const formatted = lakhs % 1 === 0 ? String(lakhs) : lakhs.toFixed(1).replace(/\.0$/, '');
    return `₹${formatted} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Compact card per-sqft — e.g. ₹708/sq.ft */
export function formatCardPricePerSqft(amount: number | null | undefined): string {
  if (!amount) return '';
  return `₹${amount.toLocaleString('en-IN')}/sq.ft`;
}

/** Card headline price from formatINR — e.g. ₹85 L, ₹1.2 Cr */
export function formatINRCompact(amount: number | null | undefined): string {
  const formatted = formatINR(amount);
  if (!formatted) return '—';
  return formatted.replace(/\.00(?=\s)/, '');
}
