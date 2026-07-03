export interface NearbyPlace {
  name: string;
  type: string;
  label: string;
  color: string;
  icon: string;
  lat: number;
  lng: number;
  distance: number;
  rating?: number;
}

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters = 2000,
): Promise<NearbyPlace[]> {
  const results: NearbyPlace[] = [];
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { NEARBY_CATEGORIES } = await import('../data/nearbyCategories');

  const promises = NEARBY_CATEGORIES.map(async (cat) => {
    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchNearby',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'places.displayName,places.location,places.rating,places.types',
          },
          body: JSON.stringify({
            includedTypes: [cat.type],
            maxResultCount: 3,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: radiusMeters,
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Places API error for ${cat.type}:`, response.status, errText);
        return [];
      }

      const data = await response.json();
      const places = data.places || [];

      return places.slice(0, 3).map((place: any) => {
        const pLat = place.location?.latitude || lat;
        const pLng = place.location?.longitude || lng;

        const R = 6371000;
        const dLat = ((pLat - lat) * Math.PI) / 180;
        const dLng = ((pLng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((pLat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

        return {
          name: place.displayName?.text || cat.label,
          type: cat.type,
          label: cat.label,
          color: cat.color,
          icon: cat.emoji,
          lat: pLat,
          lng: pLng,
          distance,
          rating: place.rating,
        } as NearbyPlace;
      });
    } catch (err) {
      console.error('Nearby fetch error:', cat.type, err);
      return [];
    }
  });

  const allResults = await Promise.all(promises);
  allResults.forEach((r) => results.push(...r));
  return results.sort((a, b) => a.distance - b.distance);
}
