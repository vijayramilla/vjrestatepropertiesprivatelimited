import { MAX_LOCALITY_SELECTIONS } from '@/data/properties';
import { normalizeLocalityInput } from '@/lib/propertyFilters';

export function toggleLocalitySelection(
  current: string[],
  locality: string,
): { next: string[]; limited: boolean; removed: boolean } {
  const normalized = normalizeLocalityInput(locality);
  if (!normalized) {
    return { next: current, limited: false, removed: false };
  }

  if (current.includes(normalized)) {
    return { next: current.filter((l) => l !== normalized), limited: false, removed: true };
  }
  if (current.length >= MAX_LOCALITY_SELECTIONS) {
    return { next: current, limited: true, removed: false };
  }
  return { next: [...current, normalized], limited: false, removed: false };
}
