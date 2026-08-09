export type AuctionCategory =
  | 'Residential'
  | 'Commercial'
  | 'Land & Plot'
  | 'Apartment'
  | 'Villa'
  | 'Industrial';

export type AuctionStatus = 'upcoming' | 'live' | 'ending_soon' | 'closed' | 'sold';

export interface AuctionCategoryItem {
  id: 'all' | AuctionCategory;
  label: string;
  icon: string; // Phosphor icon name
  color: string;
}

export const AUCTION_CATEGORIES: AuctionCategoryItem[] = [
  { id: 'all', label: 'All Auctions', icon: 'Gavel', color: '#C9A84C' },
  { id: 'Residential', label: 'Residential', icon: 'House', color: '#EF4444' },
  { id: 'Commercial', label: 'Commercial', icon: 'BuildingOffice', color: '#3B82F6' },
  { id: 'Land & Plot', label: 'Land & Plot', icon: 'Leaf', color: '#22C55E' },
  { id: 'Apartment', label: 'Apartment', icon: 'BuildingApartment', color: '#8B5CF6' },
  { id: 'Villa', label: 'Villa', icon: 'HouseLine', color: '#F59E0B' },
  { id: 'Industrial', label: 'Industrial', icon: 'Factory', color: '#6B7280' },
];

export const AUCTION_STATUS_CONFIG: Record<
  AuctionStatus,
  { label: string; color: string; bg: string; pulse: boolean }
> = {
  live: { label: 'LIVE', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', pulse: true },
  ending_soon: { label: 'ENDING SOON', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', pulse: true },
  upcoming: { label: 'UPCOMING', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', pulse: false },
  closed: { label: 'CLOSED', color: '#6B7280', bg: 'rgba(107,114,128,0.15)', pulse: false },
  sold: { label: 'SOLD', color: '#C9A84C', bg: 'rgba(201,168,76,0.15)', pulse: false },
};

export interface Auction {
  id: string;
  title: string;
  category: AuctionCategory;
  location: string;
  city: string;
  images: string[];
  description: string;

  startingBid: number;
  currentBid: number;
  reservePrice: number;
  bidIncrement: number;
  totalBids: number;

  auctionStartTime?: Date | null;
  auctionEndTime?: Date | null;
  status: AuctionStatus;

  areaSqft?: number;
  propertyType?: string;
  khata?: string;
  facing?: string;

  registeredBidders?: number;
  isFeatured?: boolean;
  createdAt?: unknown;
}
