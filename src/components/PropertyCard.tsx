import { type ListingProperty } from '../data/listingProperties';
import { type Property } from '../data/properties';
import PropertyListingCard from './PropertyListingCard';
import {
  mapFirestoreToListing,
  type FirestorePropertyDoc,
} from '../lib/firestoreProperties';

type CardInput =
  | ListingProperty
  | Property
  | (FirestorePropertyDoc & { id: string });

function isFullListing(property: CardInput): property is ListingProperty {
  return (
    'price_label' in property &&
    'posted_date' in property &&
    'units' in property &&
    'contact_name' in property
  );
}

function toFirestoreDoc(property: CardInput): FirestorePropertyDoc {
  if ('name' in property && !('title' in property)) {
    const legacy = property as Property;
    return {
      title: legacy.name,
      type: legacy.type,
      area: legacy.area,
      location: legacy.location,
      price: legacy.price,
      monthly_rental: legacy.monthlyRentalIncome,
      monthly_rental_label: legacy.monthly_rental ?? undefined,
      rental_yield: legacy.rental_yield,
      area_sqft: legacy.area_sqft,
      area_unit: legacy.area_unit,
      area_acres: legacy.area_acres,
      area_guntas: legacy.area_guntas,
      price_per_sqft: legacy.price_per_sqft,
      plot_subtype: legacy.plot_subtype,
      total_units: legacy.total_units,
      facing: legacy.facing,
      description: legacy.description,
      highlights: legacy.highlights,
      listed_days_ago: legacy.listed_days_ago,
      images: legacy.images,
      katha: legacy.katha,
    };
  }

  const rest = { ...(property as FirestorePropertyDoc & { id: string }) };
  delete (rest as { id?: string }).id;
  return rest;
}

interface PropertyCardProps {
  property: CardInput;
  index?: number;
  compact?: boolean;
}

export default function PropertyCard({ property, index = 0, compact = false }: PropertyCardProps) {
  const listing = isFullListing(property)
    ? property
    : mapFirestoreToListing(String(property.id), toFirestoreDoc(property));

  return <PropertyListingCard property={listing} index={index} compact={compact} />;
}
