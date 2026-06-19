export const HERO_ZONE_AREAS: { zone: string; areas: string[] }[] = [
  {
    zone: 'South Bangalore',
    areas: [
      'Koramangala', 'Indiranagar', 'HSR Layout', 'BTM Layout', 'JP Nagar', 'Jayanagar',
      'Banashankari', 'Basavanagudi', 'Kumaraswamy Layout', 'Uttarahalli', 'Kanakapura Road',
      'Sarakki', 'Padmanabhanagar',
    ],
  },
  {
    zone: 'North Bangalore',
    areas: [
      'Hebbal', 'Yelahanka', 'Devanahalli', 'Hennur', 'Thanisandra', 'Jakkur', 'Kogilu',
      'Bettahalasur', 'Bagalur', 'HBR Layout', 'Kalyan Nagar', 'RT Nagar', 'Vidyaranyapura', 'Dasarahalli',
    ],
  },
  {
    zone: 'East Bangalore',
    areas: [
      'Whitefield', 'Marathahalli', 'Sarjapur Road', 'Bellandur', 'Brookefield', 'Varthur',
      'Kadugodi', 'Mahadevapura', 'Hoodi', 'ITPL', 'KR Puram', 'CV Raman Nagar', 'Kasturi Nagar', 'Old Airport Road',
    ],
  },
  {
    zone: 'West Bangalore',
    areas: [
      'Rajajinagar', 'Malleshwaram', 'Yeshwanthpur', 'Nagarbhavi', 'Vijayanagar', 'Basaveshwaranagar',
      'Tumkur Road', 'Peenya', 'RR Nagar', 'Kengeri', 'Mysore Road', 'Electronic City', 'Bannerghatta Road', 'Hulimavu',
    ],
  },
  {
    zone: 'Central Bangalore',
    areas: [
      'MG Road', 'Brigade Road', 'Lavelle Road', 'Richmond Town', 'Sadashivanagar', 'Vasanth Nagar',
      'Shivajinagar', 'Domlur', 'Frazer Town', 'Commercial Street', 'Infantry Road',
    ],
  },
  {
    zone: 'Outer / Emerging',
    areas: [
      'Sarjapur', 'Attibele', 'Chandapura', 'Budigere Cross', 'Hoskote', 'Devanahalli (Aerospace)',
      'Doddaballapur', 'Nandi Hills Area', 'North Bangalore Corridor',
    ],
  },
];

export const HERO_BUDGET_OPTIONS = [
  'Any Budget',
  'Under ₹50 Lakhs',
  '₹50L – ₹1 Crore',
  '₹1 Cr – ₹2 Crore',
  '₹2 Cr – ₹5 Crore',
  '₹5 Cr – ₹10 Crore',
  'Above ₹10 Crore',
] as const;

export const HERO_TRENDING = [
  'Koramangala',
  'Indiranagar',
  'Whitefield',
  'HSR Layout',
  'Electronic City',
  'Hebbal',
] as const;

export const PLOT_SUB_TYPES = ['Residential Plot', 'Commercial Plot', 'Agriculture Land'] as const;
