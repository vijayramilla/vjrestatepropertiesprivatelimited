import { MAX_LOCALITY_SELECTIONS } from '@/data/properties';

export function toggleLocalitySelection(
  current: string[],
  locality: string,
): { next: string[]; limited: boolean; removed: boolean } {
  if (current.includes(locality)) {
    return { next: current.filter((l) => l !== locality), limited: false, removed: true };
  }
  if (current.length >= MAX_LOCALITY_SELECTIONS) {
    return { next: current, limited: true, removed: false };
  }
  return { next: [...current, locality], limited: false, removed: false };
}
