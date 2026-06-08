export interface Property {
  id: string;
  name: string;
  type: "PG Building" | "Residential Rental Income" | "Commercial Properties" | "Residential Plot" | "Commercial Plot";
  location: string;
  price: number;
  monthlyRentalIncome: number;
  plotSizeSqFt: number;
  builtUpAreaSqFt: number;
  floors: number;
  tenants: number;
  occupancyPercent: number;
  bbmpApproved: boolean;
  description: string;
  featured: boolean;
  createdAt: string;
}

export const BANGALORE_AREAS = [
  "Koramangala", "Indiranagar", "Whitefield", "Electronic City", "HSR Layout",
  "BTM Layout", "Jayanagar", "JP Nagar", "Rajajinagar", "Malleshwaram",
  "Hebbal", "Yelahanka", "Bannerghatta Road", "Sarjapur Road", "Marathahalli",
  "Bellandur", "Bommanahalli", "Basavanagudi", "Vijayanagar", "Banashankari",
  "Kengeri", "KR Puram", "Kadugodi", "Devanahalli", "Hennur", "Banaswadi",
  "RT Nagar", "Nagarbhavi", "Mysore Road", "Tumkur Road", "Hosur Road",
  "Old Madras Road", "Varthur", "Brookefield", "Domlur", "Frazer Town",
  "Cox Town", "Shivajinagar", "Chamrajpet", "Padmanabhanagar", "Kanakapura Road",
  "Jigani", "Anekal", "Electronic City Phase 1", "Electronic City Phase 2",
  "Hoskote", "Bidadi", "Attibele",
];

export const PROPERTY_TYPES = [
  "PG Building", "Residential Rental Income", "Commercial Properties", "Residential Plot", "Commercial Plot",
];

export const properties: Property[] = [
  {
    id: "1", name: "Koramangala PG Tower", type: "PG Building", location: "Koramangala",
    price: 25000000, monthlyRentalIncome: 95000, plotSizeSqFt: 2400, builtUpAreaSqFt: 4800,
    floors: 4, tenants: 36, occupancyPercent: 97, bbmpApproved: true, featured: true,
    description: "A 4-floor PG building in the heart of Koramangala with 36 fully occupied rooms. Walking distance to tech parks and restaurants. Consistent rental income with zero vacancy for the past 3 years.",
    createdAt: "2025-11-01",
  },
  {
    id: "2", name: "HSR Layout Income Building", type: "Residential Rental Income", location: "HSR Layout",
    price: 42000000, monthlyRentalIncome: 145000, plotSizeSqFt: 3600, builtUpAreaSqFt: 7200,
    floors: 5, tenants: 12, occupancyPercent: 100, bbmpApproved: true, featured: true,
    description: "Prime 5-floor residential rental building in HSR Layout with 12 independently rented apartments. 100% occupancy maintained year-round.",
    createdAt: "2025-11-15",
  },
  {
    id: "3", name: "Whitefield IT Corridor Building", type: "Residential Rental Income", location: "Whitefield",
    price: 58000000, monthlyRentalIncome: 210000, plotSizeSqFt: 4800, builtUpAreaSqFt: 9600,
    floors: 6, tenants: 18, occupancyPercent: 94, bbmpApproved: true, featured: true,
    description: "Premium 6-floor building adjacent to Whitefield IT corridor. Primarily occupied by software professionals with long-term lease agreements.",
    createdAt: "2025-12-01",
  },
  {
    id: "4", name: "Electronic City Phase 1 PG", type: "PG Building", location: "Electronic City Phase 1",
    price: 18000000, monthlyRentalIncome: 72000, plotSizeSqFt: 1800, builtUpAreaSqFt: 3200,
    floors: 3, tenants: 28, occupancyPercent: 96, bbmpApproved: true, featured: false,
    description: "Strategically located PG building near Electronic City with consistent demand from IT professionals.",
    createdAt: "2025-12-10",
  },
  {
    id: "5", name: "Indiranagar Commercial Block", type: "Commercial Properties", location: "Indiranagar",
    price: 85000000, monthlyRentalIncome: 320000, plotSizeSqFt: 3000, builtUpAreaSqFt: 5400,
    floors: 3, tenants: 6, occupancyPercent: 100, bbmpApproved: true, featured: false,
    description: "Prime commercial property on 100 Feet Road Indiranagar with 6 commercial tenants. 100% occupied with blue-chip retail brands.",
    createdAt: "2025-12-15",
  },
  {
    id: "6", name: "Marathahalli Commercial Complex", type: "Commercial Properties", location: "Marathahalli",
    price: 62000000, monthlyRentalIncome: 245000, plotSizeSqFt: 3600, builtUpAreaSqFt: 6200,
    floors: 4, tenants: 8, occupancyPercent: 88, bbmpApproved: true, featured: false,
    description: "Four-floor commercial complex near Marathahalli bridge. Mix of retail and office tenants with strong rental yield.",
    createdAt: "2026-01-05",
  },
  {
    id: "7", name: "Devanahalli Residential Plot", type: "Residential Plot", location: "Devanahalli",
    price: 35000000, monthlyRentalIncome: 0, plotSizeSqFt: 4800, builtUpAreaSqFt: 0,
    floors: 0, tenants: 0, occupancyPercent: 0, bbmpApproved: true, featured: false,
    description: "Prime residential plot near Devanahalli airport corridor. BBMP approved with clear title. Excellent for constructing a PG or rental income building.",
    createdAt: "2026-01-10",
  },
  {
    id: "8", name: "Sarjapur Road Commercial Plot", type: "Commercial Plot", location: "Sarjapur Road",
    price: 52000000, monthlyRentalIncome: 0, plotSizeSqFt: 6000, builtUpAreaSqFt: 0,
    floors: 0, tenants: 0, occupancyPercent: 0, bbmpApproved: true, featured: false,
    description: "Commercial plot on Sarjapur Road main arterial, approved for commercial construction. Surrounded by tech parks and residential complexes.",
    createdAt: "2026-01-20",
  },
];

export function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

export function formatMonthlyIncome(income: number): string {
  if (income >= 100000) return `₹${(income / 100000).toFixed(1)}L/month`;
  return `₹${income.toLocaleString("en-IN")}/month`;
}
