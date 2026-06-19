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
