export interface VastuZone {
  id: string;
  name: string;
  sanskrit: string;
  direction: string;
  color: string;
  element: string;
  planet: string;
  goodAspects: string[];
  badAspects: string[];
  remedies: string[];
  score: number;
}

export interface RoomAnalysis {
  id: string;
  name: string;
  icon: string;
  idealZone: string;
  compliance: number;
  status: 'compliant' | 'partial' | 'needs-attention';
  tip: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export const vastuZones: VastuZone[] = [
  { id: 'ne', name: 'Northeast', sanskrit: 'Ishanya', direction: 'NE', color: '#FFD700', element: 'Water', planet: 'Jupiter', goodAspects: ['Main entrance ideal', 'Pooja room placement', 'Living room', 'Meditation space'], badAspects: ['Kitchen', 'Toilet', 'Master bedroom', 'Staircase'], remedies: ['Keep this zone open and clutter-free', 'Place a water feature or fountain', 'Use light colors and mirrors', 'Avoid heavy furniture'], score: 92 },
  { id: 'e', name: 'East', sanskrit: 'Indra', direction: 'E', color: '#FF6B6B', element: 'Fire', planet: 'Sun', goodAspects: ['Living room', 'Study room', 'Windows and ventilation', 'Entrance'], badAspects: ['Kitchen stove facing east', 'Bedroom', 'Storage room', 'Bathroom'], remedies: ['Place indoor plants in this zone', 'Ensure plenty of sunlight', 'Avoid clutter near windows', 'Use warm colors'], score: 78 },
  { id: 'se', name: 'Southeast', sanskrit: 'Agni', direction: 'SE', color: '#FF4444', element: 'Fire', planet: 'Venus', goodAspects: ['Kitchen', 'Kitchen stove', 'Dining area', 'Electrical room'], badAspects: ['Bedroom', 'Bathroom', 'Pooja room', 'Water storage'], remedies: ['Keep kitchen clean and well-lit', 'Ensure stove faces east', 'Use fire-element colors (red, orange)', 'Ventilate properly'], score: 85 },
  { id: 's', name: 'South', sanskrit: 'Yama', direction: 'S', color: '#666666', element: 'Earth', planet: 'Mars', goodAspects: ['Bedroom', 'Storage room', 'Heavy furniture', 'Safe/vault'], badAspects: ['Main entrance', 'Kitchen', 'Pooja room', 'Water body'], remedies: ['Use dark, earthy colors', 'Place heavy furniture here', 'Avoid mirrors', 'Keep this zone dimly lit'], score: 70 },
  { id: 'sw', name: 'Southwest', sanskrit: 'Nairitya', direction: 'SW', color: '#8B4513', element: 'Earth', planet: 'Rahu', goodAspects: ['Master bedroom', 'Heavy structures', 'Storage', 'Overhead tank'], badAspects: ['Kitchen', 'Pooja room', 'Main entrance', 'Underground tank'], remedies: ['Make this the heaviest zone of the house', 'Master bedroom should be here', 'Use deep rich colors', 'Avoid cutting this corner'], score: 82 },
  { id: 'w', name: 'West', sanskrit: 'Varuna', direction: 'W', color: '#4FC3F7', element: 'Water', planet: 'Saturn', goodAspects: ['Dining room', 'Study room', 'Children\'s room', 'Staircase'], badAspects: ['Main entrance', 'Kitchen', 'Pooja room', 'Bathroom'], remedies: ['Place study table facing east', 'Use blue and green tones', 'Keep well-ventilated', 'Avoid dark colors'], score: 75 },
  { id: 'nw', name: 'Northwest', sanskrit: 'Vayu', direction: 'NW', color: '#E0E0E0', element: 'Air', planet: 'Moon', goodAspects: ['Guest bedroom', 'Bathroom', 'Staircase', 'Car parking'], badAspects: ['Pooja room', 'Kitchen', 'Master bedroom', 'Dining room'], remedies: ['Keep lightweight furniture', 'Use white and light gray', 'Ensure cross-ventilation', 'Place indoor plants'], score: 72 },
  { id: 'n', name: 'North', sanskrit: 'Kubera', direction: 'N', color: '#81C784', element: 'Water', planet: 'Mercury', goodAspects: ['Entrance', 'Living room', 'Study room', 'Pooja room'], badAspects: ['Kitchen', 'Bedroom', 'Bathroom', 'Store room'], remedies: ['Keep this zone open and welcoming', 'Use water features', 'Place wealth-related items', 'Use green and blue colors'], score: 88 },
];

export const roomAnalyses: RoomAnalysis[] = [
  { id: 'living', name: 'Living Room', icon: 'Sofa', idealZone: 'NE / E / N', compliance: 85, status: 'compliant', tip: 'Position seating facing east or north. Keep center of room open.' },
  { id: 'kitchen', name: 'Kitchen', icon: 'CookingPot', idealZone: 'SE', compliance: 90, status: 'compliant', tip: 'Kitchen in SE corner is ideal. Stove should face east.' },
  { id: 'bedroom', name: 'Master Bedroom', icon: 'Bed', idealZone: 'SW', compliance: 72, status: 'partial', tip: 'Master bedroom in SW corner. Sleep with head toward south or west.' },
  { id: 'pooja', name: 'Pooja Room', icon: 'Placeholder', idealZone: 'NE', compliance: 95, status: 'compliant', tip: 'Ideal in NE corner. Face east or west while praying.' },
  { id: 'study', name: 'Study Room', icon: 'BookOpenText', idealZone: 'E / N / W', compliance: 68, status: 'partial', tip: 'Face east or north while studying. Avoid sitting with back to door.' },
  { id: 'bathroom', name: 'Bathroom', icon: 'Shower', idealZone: 'NW / SE', compliance: 60, status: 'needs-attention', tip: 'Bathroom in NW or SE corner. Avoid NE and SW placements.' },
];

export const vastuFAQs: FAQ[] = [
  { question: 'What is Vastu Shastra?', answer: 'Vastu Shastra is an ancient Indian science of architecture that describes principles of design, layout, measurements, and spatial geometry. It integrates architecture with nature and cosmic energies to create harmonious living spaces.' },
  { question: 'How is the Vastu score calculated?', answer: 'Your Vastu score is calculated based on the orientation, placement, and alignment of each room relative to the eight cardinal directions. Each room gets weighted according to its function, and the overall score reflects how well the entire floor plan follows Vastu principles.' },
  { question: 'Can a home with low Vastu score be fixed?', answer: 'Yes. Most Vastu defects can be corrected through remedies like color adjustments, mirror placements, element balancing, and minor structural modifications. Our report provides specific remedies for each issue found.' },
  { question: 'Is Vastu relevant for apartments?', answer: 'Absolutely. While apartments have fixed external structures, internal room placement, furniture layout, color schemes, and element balancing can all be optimized according to Vastu principles.' },
  { question: 'Do I need to upload a professional floor plan?', answer: 'No. A simple hand-drawn sketch or photo of your floor plan works fine. Our AI system can analyze any clear layout drawing.' },
  { question: 'How long does the analysis take?', answer: 'The AI analysis completes in under 60 seconds. You will receive a comprehensive report with room-by-room breakdown and actionable recommendations.' },
];
