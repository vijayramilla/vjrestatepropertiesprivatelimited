import { BANGALORE_AREAS } from '../../data/properties';

export interface MockListing {
  id: number;
  title: string;
  type: string;
  location: string;
  area_sqft: number;
  price: number;
  price_label: string;
  status: string;
  yield_percent: number | null;
  image_placeholder_color: string;
  tags: string[];
  description_short: string;
  bedrooms: number;
  bathrooms: number;
  listed_date: string;
}

export const MOCK_LISTINGS: MockListing[] = [];

export const PROPERTY_TYPE_OPTIONS = [
  'All Types',
  'PG Building',
  'Residential Rental',
  'Commercial',
  'Plot / Agriculture',
] as const;

export const AREA_DEFAULT = 'All Areas';

export const LOCATION_OPTIONS = [AREA_DEFAULT, ...BANGALORE_AREAS] as const;

export const BUDGET_OPTIONS = [
  'Any Budget',
  'Under ₹50L',
  '₹50L – ₹1Cr',
  '₹1Cr – ₹2Cr',
  '₹2Cr – ₹5Cr',
  'Above ₹5Cr',
] as const;

export const STATUS_OPTIONS = [
  'Any Status',
  'Ready to Move',
  'Under Construction',
  'New Launch',
] as const;

export const SORT_OPTIONS = [
  'Newest First',
  'Price: Low to High',
  'Price: High to Low',
  'Most Popular',
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export function matchesBudget(price: number, budget: string): boolean {
  switch (budget) {
    case 'Under ₹50L':
    case 'Under ₹50 Lakhs':
      return price < 5_000_000;
    case '₹50L – ₹1Cr':
    case '₹50L – ₹1 Crore':
      return price >= 5_000_000 && price < 10_000_000;
    case '₹1Cr – ₹2Cr':
    case '₹1 Cr – ₹2 Crore':
      return price >= 10_000_000 && price < 20_000_000;
    case '₹2Cr – ₹5Cr':
    case '₹2 Cr – ₹5 Crore':
      return price >= 20_000_000 && price < 50_000_000;
    case 'Above ₹5Cr':
      return price >= 50_000_000;
    case '₹5 Cr – ₹10 Crore':
      return price >= 50_000_000 && price < 100_000_000;
    case 'Above ₹10 Crore':
      return price >= 100_000_000;
    default:
      return true;
  }
}

export function getTypeIcon(type: string) {
  if (type === 'PG Building') return 'Buildings';
  if (type === 'Residential Rental') return 'HouseLine';
  if (type === 'Commercial') return 'Storefront';
  return 'Tree';
}
