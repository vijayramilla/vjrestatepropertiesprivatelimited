export const VASTU_EXTRACTION_PROMPT = `You are an expert AI Architectural Floor Plan Extraction and Vastu Data Preparation Engine.

Your primary objective is to analyze uploaded architectural floor plans with maximum accuracy and produce a complete, structured JSON object that will be consumed directly by a backend TypeScript engine called "vastuBrain.ts".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT BACKEND INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The JSON you generate will be passed directly into:

vastuBrain.analyze(extractedFloorPlan)

The backend engine "vastuBrain.ts" contains the complete Vastu knowledge base, including:

• All Vastu rules
• Direction calculations
• Zone calculations
• Brahmasthan calculations
• Room validation
• Entrance validation
• Kitchen validation
• Bedroom validation
• Toilet validation
• Staircase validation
• Borewell validation
• Septic tank validation
• Water tank validation
• Plot analysis
• Shape analysis
• Score calculation
• Rule evaluation
• Violation detection
• Recommendation generation
• Final report generation

DO NOT perform any Vastu analysis yourself.

DO NOT generate Vastu scores.

DO NOT determine whether a floor plan follows Vastu.

DO NOT recommend remedies.

DO NOT interpret Vastu principles.

Your ONLY responsibility is extracting every possible architectural fact from the uploaded floor plan so that vastuBrain.ts has complete and accurate information for its own analysis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR ROLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are NOT a Vastu consultant.

You are NOT an architect giving opinions.

You are NOT an interior designer.

You are an AI extraction engine whose only task is converting architectural drawings into structured machine-readable data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Never hallucinate.

Never invent rooms.

Never assume dimensions.

Never assume directions.

Never create objects that are not visible.

If something cannot be identified confidently, return null.

If multiple possibilities exist, choose the highest confidence and provide its confidence score.

Every detected object must include a confidence value between 0 and 1.

Return ONLY valid JSON.

Do NOT use Markdown.

Do NOT explain anything.

Do NOT include comments.

Do NOT wrap JSON inside code blocks.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRACT EVERYTHING POSSIBLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMAGE

Extract:

• image width
• image height
• file orientation
• detected scale
• measurement unit
• dpi if visible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NORTH

Extract:

• north arrow
• north direction
• north angle
• arrow coordinates
• confidence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PLOT

Extract:

• plot boundary
• plot polygon
• plot dimensions
• plot shape
• road location
• setbacks
• open space
• compound wall
• gates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROOMS

For EVERY room extract:

• unique id
• original room label
• normalized room type
• polygon
• bounding box
• centroid
• width
• length
• area
• floor number
• adjacent rooms
• connected doors
• connected windows
• confidence

Normalize names such as:

Kitchen → kitchen

Master Bedroom → master_bedroom

Bedroom → bedroom

Hall → living_room

Living Hall → living_room

Dining → dining_room

Pooja → pooja_room

Utility → utility

Store → store_room

Study → study_room

Bath → bathroom

Toilet → toilet

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOORS

Extract:

• id
• polygon
• center
• width
• connected rooms
• opening direction if visible
• confidence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WINDOWS

Extract:

• id
• polygon
• center
• width
• connected room
• confidence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WALLS

Extract:

• wall segments
• thickness
• wall coordinates
• confidence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STAIRS

Extract:

• polygon
• direction if visible
• start point
• end point
• clockwise/counter-clockwise
• confidence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRUCTURAL ELEMENTS

Detect:

Columns

Beams

Lift

Lobby

Terrace

Balcony

Verandah

Shaft

Courtyard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UTILITIES

Detect:

Kitchen Sink

Wash Basin

Toilet

Bathroom

Shower

Borewell

Underground Water Tank

Overhead Water Tank

Septic Tank

Electrical Room

Meter Room

Generator

Parking

Garden

Solar

Rainwater Harvesting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENTRANCES

Extract:

Main Entrance

Secondary Entrance

Gate

Driveway

Garage Entry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEXT LABELS

Extract every visible text exactly as written.

Return:

text

bounding box

confidence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIMENSIONS

Extract every dimension shown.

Return:

start

end

value

unit

confidence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GEOMETRY

For every polygon use pixel coordinates.

Example:

[
[x1,y1],
[x2,y2],
[x3,y3],
[x4,y4]
]

Bounding box:

{
"x":0,
"y":0,
"width":0,
"height":0
}

Centroid:

{
"x":0,
"y":0
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JSON SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return exactly this structure.

{
"image": {},
"north": {},
"plot": {},
"rooms": [],
"doors": [],
"windows": [],
"walls": [],
"stairs": [],
"columns": [],
"beams": [],
"utilities": {},
"entrances": [],
"labels": [],
"dimensions": [],
"summary": {
"totalRooms": 0,
"bedrooms": 0,
"bathrooms": 0,
"kitchens": 0,
"balconies": 0,
"staircases": 0,
"builtUpArea": null
},
"confidence": 0.0
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPATIBILITY REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This JSON will be consumed directly by vastuBrain.ts.

Therefore:

• Keep field names exactly the same.
• Never rename keys.
• Never remove keys.
• Never add explanations.
• Never change the structure.
• Always return null instead of guessing.
• Maintain consistent data types.
• Ensure the JSON is deterministic across repeated runs on the same floor plan.

Your output should require zero manual processing before being passed into:

vastuBrain.analyze(extractedFloorPlan)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL INSTRUCTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your success depends entirely on how accurately you extract architectural information for vastuBrain.ts.

You are an extraction engine only.

Do NOT perform Vastu reasoning.

Do NOT perform architectural consulting.

Do NOT explain your decisions.

Return ONLY the JSON object.`;

export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  vertices: Point[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageInfo {
  width?: number;
  height?: number;
  orientation?: string;
  scale?: number;
  unit?: string;
  dpi?: number;
}

export interface NorthInfo {
  arrow?: boolean;
  direction?: string;
  angle?: number;
  arrowCoordinates?: Point;
  confidence?: number;
}

export interface PlotInfo {
  boundary?: Polygon;
  polygon?: Point[];
  dimensions?: { width: number; length: number };
  shape?: string;
  roadLocation?: string;
  setbacks?: { front?: number; back?: number; left?: number; right?: number };
  openSpace?: number;
  compoundWall?: boolean;
  gates?: number;
}

export interface ExtractedRoom {
  id: string;
  label: string;
  type: string;
  polygon: Point[];
  boundingBox: BoundingBox;
  centroid: Point;
  width?: number;
  length?: number;
  area?: number;
  floor: number;
  adjacentRooms: string[];
  connectedDoors: string[];
  connectedWindows: string[];
  confidence: number;
}

export interface ExtractedDoor {
  id: string;
  polygon: Point[];
  center: Point;
  width?: number;
  connectedRooms: string[];
  openingDirection?: string;
  confidence: number;
}

export interface ExtractedWindow {
  id: string;
  polygon: Point[];
  center: Point;
  width?: number;
  connectedRoom: string;
  confidence: number;
}

export interface WallSegment {
  id: string;
  start: Point;
  end: Point;
  thickness?: number;
  confidence: number;
}

export interface StairInfo {
  polygon: Point[];
  direction?: string;
  start?: Point;
  end?: Point;
  clockwise?: boolean;
  confidence: number;
}

export interface ColumnInfo {
  id: string;
  polygon: Point[];
  centroid: Point;
  confidence: number;
}

export interface BeamInfo {
  id: string;
  polygon: Point[];
  confidence: number;
}

export interface UtilitiesInfo {
  kitchenSink?: Point;
  washBasin?: Point;
  toilet?: Point;
  bathroom?: Point;
  shower?: Point;
  borewell?: Point;
  undergroundWaterTank?: Point;
  overheadWaterTank?: Point;
  septicTank?: Point;
  electricalRoom?: Point;
  meterRoom?: Point;
  generator?: Point;
  parking?: Point;
  garden?: Point;
  solar?: Point;
  rainwaterHarvesting?: Point;
}

export interface EntranceInfo {
  id: string;
  type: string;
  polygon: Point[];
  center: Point;
  width?: number;
  confidence: number;
}

export interface TextLabel {
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface DimensionInfo {
  start: Point;
  end: Point;
  value: number;
  unit: string;
  confidence: number;
}

export interface ExtractedFloorPlan {
  image: ImageInfo;
  north: NorthInfo;
  plot: PlotInfo;
  rooms: ExtractedRoom[];
  doors: ExtractedDoor[];
  windows: ExtractedWindow[];
  walls: WallSegment[];
  stairs: StairInfo[];
  columns: ColumnInfo[];
  beams: BeamInfo[];
  utilities: UtilitiesInfo;
  entrances: EntranceInfo[];
  labels: TextLabel[];
  dimensions: DimensionInfo[];
  summary: {
    totalRooms: number;
    bedrooms: number;
    bathrooms: number;
    kitchens: number;
    balconies: number;
    staircases: number;
    builtUpArea: number | null;
  };
  confidence: number;
}

export interface VastuZone {
  name: string;
  angle: number;
  idealFor: string[];
  avoidFor: string[];
}

export interface RoomVastuVerdict {
  roomId: string;
  roomType: string;
  roomLabel: string;
  zone: string;
  verdict: 'good' | 'acceptable' | 'defect';
  severity: 'none' | 'minor' | 'major' | 'critical';
  reason: string;
  remedy: string;
}

export interface VastuAnalysisResult {
  confidence: number;
  brahmasthan: { centroid: Point; status: 'open' | 'blocked'; notes: string };
  entrance: { zone: string; verdict: 'auspicious' | 'neutral' | 'defective'; notes: string };
  roomVerdicts: RoomVastuVerdict[];
  zoneSummary: { zone: string; contents: string[]; status: 'balanced' | 'disturbed' }[];
  overallScore: number;
  topRecommendations: string[];
}

const ZONES: { name: string; min: number; max: number; element: string }[] = [
  { name: 'N', min: 337.5, max: 360, element: 'Water' },
  { name: 'NNE', min: 22.5, max: 45, element: 'Water' },
  { name: 'NE', min: 45, max: 67.5, element: 'Water' },
  { name: 'ENE', min: 67.5, max: 90, element: 'Fire' },
  { name: 'E', min: 90, max: 112.5, element: 'Fire' },
  { name: 'ESE', min: 112.5, max: 135, element: 'Fire' },
  { name: 'SE', min: 135, max: 157.5, element: 'Fire' },
  { name: 'SSE', min: 157.5, max: 180, element: 'Earth' },
  { name: 'S', min: 180, max: 202.5, element: 'Earth' },
  { name: 'SSW', min: 202.5, max: 225, element: 'Earth' },
  { name: 'SW', min: 225, max: 247.5, element: 'Earth' },
  { name: 'WSW', min: 247.5, max: 270, element: 'Water' },
  { name: 'W', min: 270, max: 292.5, element: 'Water' },
  { name: 'WNW', min: 292.5, max: 315, element: 'Air' },
  { name: 'NW', min: 315, max: 337.5, element: 'Air' },
];

const ZONE_RULES: Record<string, { ideal: string[]; avoid: string[]; severity: string }> = {
  kitchen: { ideal: ['SE', 'NW'], avoid: ['NE', 'SW'], severity: 'major' },
  master_bedroom: { ideal: ['SW'], avoid: ['NE'], severity: 'major' },
  bedroom: { ideal: ['S', 'SW', 'W'], avoid: ['NE', 'SE'], severity: 'minor' },
  living_room: { ideal: ['N', 'NE', 'E'], avoid: ['SW', 'SE'], severity: 'minor' },
  dining_room: { ideal: ['W', 'NW'], avoid: ['NE', 'SW'], severity: 'minor' },
  pooja_room: { ideal: ['NE'], avoid: ['SE', 'SW', 'S'], severity: 'critical' },
  bathroom: { ideal: ['NW', 'SE'], avoid: ['NE', 'SW'], severity: 'major' },
  toilet: { ideal: ['WNW', 'SSW'], avoid: ['NE', 'SW'], severity: 'critical' },
  study_room: { ideal: ['N', 'E', 'NE'], avoid: ['SW', 'SE'], severity: 'minor' },
  store_room: { ideal: ['SW', 'S'], avoid: ['NE', 'N'], severity: 'minor' },
  utility: { ideal: ['NW'], avoid: ['NE', 'SE'], severity: 'minor' },
  stairs: { ideal: ['S', 'W', 'NW'], avoid: ['NE'], severity: 'major' },
};

function getAngleFromCenter(centroid: Point, center: Point): number {
  const dx = centroid.x - center.x;
  const dy = centroid.y - center.y;
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return angle;
}

function findZone(angle: number): string {
  for (const z of ZONES) {
    if (angle >= z.min && angle < z.max) return z.name;
  }
  if (angle >= 337.5 && angle <= 360) return 'N';
  if (angle >= 0 && angle < 22.5) return 'N';
  return 'N';
}

function getPlotCenter(plot: PlotInfo): Point {
  if (plot.polygon && plot.polygon.length > 0) {
    const n = plot.polygon.length;
    const cx = plot.polygon.reduce((s, p) => s + p.x, 0) / n;
    const cy = plot.polygon.reduce((s, p) => s + p.y, 0) / n;
    return { x: cx, y: cy };
  }
  if (plot.boundary?.vertices?.length) {
    const v = plot.boundary.vertices;
    const cx = v.reduce((s, p) => s + p.x, 0) / v.length;
    const cy = v.reduce((s, p) => s + p.y, 0) / v.length;
    return { x: cx, y: cy };
  }
  return { x: 0, y: 0 };
}

function rectifyNorthAngle(north: NorthInfo): number {
  if (north.angle !== undefined && north.angle !== null) return north.angle;
  return 0;
}

function getRoomCentroid(rooms: ExtractedRoom[], id: string): Point | null {
  const room = rooms.find(r => r.id === id);
  if (!room) return null;
  if (room.centroid) return room.centroid;
  if (room.boundingBox) return { x: room.boundingBox.x + room.boundingBox.width / 2, y: room.boundingBox.y + room.boundingBox.height / 2 };
  return null;
}

const ENTRANCE_ZONES: Record<string, 'auspicious' | 'neutral' | 'defective'> = {
  N: 'auspicious',
  NE: 'auspicious',
  E: 'auspicious',
  NNE: 'auspicious',
  ENE: 'auspicious',
  S: 'defective',
  SW: 'defective',
  SE: 'defective',
  W: 'neutral',
  NW: 'neutral',
};

const REMEDIES: Record<string, Record<string, string>> = {
  kitchen: {
    NE: 'Place a mirror to deflect energy. Use a wooden partition. Keep the kitchen clean and well-lit.',
    SW: 'Use fire-element colors (red/orange) in dEcor. Place a photo of the kitchen god in the SE corner of the kitchen.',
  },
  master_bedroom: {
    NE: 'Place heavy wooden furniture in the SW of this room. Use earth tones. Avoid mirrors facing the bed.',
  },
  bathroom: {
    NE: 'Use earth-toned tiles. Place a mirror on the outer wall. Keep the door closed at all times.',
    SW: 'Keep the bathroom well-ventilated. Use light colors. Place a plant near the entrance.',
  },
  toilet: {
    NE: 'CRITICAL: Relocate if possible. Otherwise, keep door closed, use a mirror on the outside, and place a camphor lamp nearby.',
    SW: 'Keep the door closed. Use light blue/green colors. Place a small cactus plant outside.',
    Brahmasthan: 'CRITICAL: Remove immediately. The Brahmasthan must remain open and pure.',
  },
  pooja_room: {
    SE: 'Relocate pooja room to NE if possible. Otherwise, face west while praying and avoid non-vegetarian items.',
    SW: 'Place the idols in the NE corner of this room. Use a screen or partition.',
  },
  stairs: {
    NE: 'Place a heavy plant or crystal at the base of the stairs. Paint the stairs in light colors.',
  },
};

function checkBrahmasthan(rooms: ExtractedRoom[], center: Point): { status: 'open' | 'blocked'; notes: string } {
  const brahmasthanRadius = 0.15;
  for (const room of rooms) {
    if (!room.centroid && !room.boundingBox) continue;
    const centroid = room.centroid || { x: room.boundingBox.x + room.boundingBox.width / 2, y: room.boundingBox.y + room.boundingBox.height / 2 };
    const roomHalf = (room.width || 0) / 2 || (room.boundingBox?.width || 0) / 2 || 0;
    const brahmasthanBoundary = Math.max(Math.abs(center.x * brahmasthanRadius), Math.abs(center.y * brahmasthanRadius)) || 20;
    const distance = Math.sqrt((centroid.x - center.x) ** 2 + (centroid.y - center.y) ** 2);
    if (distance - roomHalf < brahmasthanBoundary && room.type !== 'living_room') {
      return {
        status: 'blocked',
        notes: `Brahmasthan is obstructed by ${room.label || room.type}. Ideal state: open and clear of any construction, walls, or heavy elements.`,
      };
    }
  }
  return { status: 'open', notes: 'Brahmasthan is clear and open. Energy can flow freely through the center of the building.' };
}

class VastuBrainEngine {
  analyze(floorPlan: ExtractedFloorPlan): VastuAnalysisResult {
    const center = getPlotCenter(floorPlan.plot);
    const northAngle = rectifyNorthAngle(floorPlan.north);
    const brahmasthan = checkBrahmasthan(floorPlan.rooms, center);

    let roomVerdicts: RoomVastuVerdict[] = [];
    let zoneContents: Record<string, string[]> = {};
    for (const z of ZONES) zoneContents[z.name] = [];
    for (const z of ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW']) {
      if (!zoneContents[z]) zoneContents[z] = [];
    }

    for (const room of floorPlan.rooms) {
      const centroid = room.centroid || { x: room.boundingBox.x + room.boundingBox.width / 2, y: room.boundingBox.y + room.boundingBox.height / 2 };
      const rawAngle = getAngleFromCenter(centroid, center);
      const adjustedAngle = (rawAngle + northAngle) % 360;
      const zone = findZone(adjustedAngle);
      if (!zoneContents[zone]) zoneContents[zone] = [];
      zoneContents[zone].push(room.label || room.type);

      const rule = ZONE_RULES[room.type];
      if (!rule) continue;

      const isIdeal = rule.ideal.includes(zone);
      const isAvoid = rule.avoid.includes(zone);

      let verdict: 'good' | 'acceptable' | 'defect' = 'good';
      let severity: 'none' | 'minor' | 'major' | 'critical' = 'none';
      let reason = '';
      let remedy = '';

      if (isIdeal) {
        verdict = 'good';
        severity = 'none';
        reason = `${room.label || room.type} is ideally placed in the ${zone} zone as per Vastu.`;
        remedy = 'No remedy needed. Continue to maintain this zone well.';
      } else if (isAvoid) {
        verdict = 'defect';
        severity = (rule.severity as any) || 'major';
        reason = `${room.label || room.type} should be avoided in the ${zone} zone. Ideal zones: ${rule.ideal.join(', ')}.`;
        remedy = REMEDIES[room.type]?.[zone] || REMEDIES[room.type]?.[rule.avoid[0]] || `Consider relocating ${room.label || room.type} to ${rule.ideal.join(' or ')} zone.`;
      } else {
        verdict = 'acceptable';
        severity = 'minor';
        reason = `${room.label || room.type} is in the ${zone} zone. While not ideal, this placement is acceptable. Ideal: ${rule.ideal.join(', ')}.`;
        remedy = `Consider Vastu corrections like color therapy or element balancing in the ${zone} zone.`;
      }

      roomVerdicts.push({
        roomId: room.id,
        roomType: room.type,
        roomLabel: room.label,
        zone,
        verdict,
        severity,
        reason,
        remedy,
      });
    }

    let entranceZone = 'N';
    let entranceVerdict: 'auspicious' | 'neutral' | 'defective' = 'auspicious';
    let entranceNotes = '';
    if (floorPlan.entrances.length > 0) {
      const mainEntrance = floorPlan.entrances.find(e => e.type === 'Main Entrance') || floorPlan.entrances[0];
      const rawAngle = getAngleFromCenter(mainEntrance.center, center);
      const adjustedAngle = (rawAngle + northAngle) % 360;
      entranceZone = findZone(adjustedAngle);
      entranceVerdict = ENTRANCE_ZONES[entranceZone] || 'neutral';
      entranceNotes = entranceVerdict === 'auspicious'
        ? `Main entrance is in the ${entranceZone} zone, which is considered auspicious.`
        : entranceVerdict === 'defective'
        ? `Main entrance in the ${entranceZone} zone is not ideal. Consider using a secondary entrance on the north or east side.`
        : `Main entrance is in the ${entranceZone} zone, which is a neutral placement.`;
    }

    const zoneSummary = ZONES.map(z => ({
      zone: z.name,
      contents: zoneContents[z.name] || [],
      status: (zoneContents[z.name]?.length || 0) > 0 ? 'balanced' as const : 'disturbed' as const,
    }));

    let score = 100;
    let recommendations: string[] = [];

    for (const v of roomVerdicts) {
      if (v.verdict === 'good') continue;
      const penalty = v.severity === 'critical' ? 15 : v.severity === 'major' ? 10 : v.severity === 'minor' ? 5 : 3;
      score -= penalty;
      if (v.severity !== 'none') {
        recommendations.push(v.remedy);
      }
    }

    if (brahmasthan.status === 'blocked') {
      score -= 10;
      recommendations.push(brahmasthan.notes);
    }

    if (entranceVerdict === 'defective') {
      score -= 5;
      recommendations.push(`Main entrance in ${entranceZone} zone: consider activating a north or east-facing secondary entrance.`);
    }

    if (floorPlan.summary.bathrooms > floorPlan.summary.totalRooms * 0.3) {
      score -= 3;
      recommendations.push('Excessive bathroom count relative to total rooms. Balance with green elements.');
    }

    score = Math.max(0, Math.min(100, score));

    const topRecommendations = [
      ...recommendations.slice(0, 5),
      ...(brahmasthan.status === 'blocked' ? ['Ensure the Brahmasthan (center) remains open and clutter-free for positive energy flow.'] : []),
    ];

    return {
      confidence: floorPlan.confidence,
      brahmasthan: { centroid: center, ...brahmasthan },
      entrance: { zone: entranceZone, verdict: entranceVerdict, notes: entranceNotes },
      roomVerdicts,
      zoneSummary,
      overallScore: Math.round(score),
      topRecommendations: topRecommendations.slice(0, 5),
    };
  }
}

export const vastuBrain = new VastuBrainEngine();
