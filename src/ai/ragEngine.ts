import {
  searchProperties,
  getAllProperties,
  getAuctions,
  getOpenRequirements,
  calculateRentalYield,
  calculateEMI,
  compareProperties,
  analyzeMarket,
  formatINR,
  type AiProperty,
  type AiAuction,
  type MarketAnalysis,
} from './dataConnector';
import { filterLocalities, BANGALORE_AREAS } from '@/data/properties';
import { formatCompanyContext, companyInfo } from './companyInfo';

// ─────────────────────────────────────────────────────────────────────────────
// RAG ENGINE — query understanding → retrieval → calculation → grounded
// generation (with deterministic fallback so the chat always works).
// ─────────────────────────────────────────────────────────────────────────────

export type QueryIntent =
  | 'PROPERTY_SEARCH'
  | 'PROPERTY_DETAIL'
  | 'PRICE_ANALYSIS'
  | 'RENTAL_YIELD'
  | 'COMPARISON'
  | 'INVESTMENT_ADVICE'
  | 'MARKET_OVERVIEW'
  | 'LOCATION_QUERY'
  | 'REQUIREMENT_MATCH'
  | 'AUCTION_QUERY'
  | 'EMI_CALCULATION'
  | 'COMPANY_QUERY'
  | 'GENERAL';

export type UserRole = 'public' | 'agent' | 'admin';

export interface RagResponse {
  answer: string;
  properties: AiProperty[];
  intent: QueryIntent;
  sources: string[];
  calculations: Record<string, unknown>;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedQuestions: string[];
}

// ─── QUERY INTENT CLASSIFIER ─────────────────────────────────────────────────
export function classifyIntent(query: string): QueryIntent {
  const q = query.toLowerCase();

  if (/(compare|vs\.?|versus|better(?: (?:option|deal|buy))?|difference between)/.test(q)) return 'COMPARISON';
  if (/(yield|rental income|monthly income|returns?|income generating|income)/.test(q)) return 'RENTAL_YIELD';
  if (/(emi|loan|mortgage|finance|down payment)/.test(q)) return 'EMI_CALCULATION';
  if (/(invest|worth buying|good deal|should i buy|buy or (?:rent|wait)|appreciation)/.test(q)) return 'INVESTMENT_ADVICE';
  if (/(market overview|average price|how many|overview|market (?:analysis|trend)|price trend)/.test(q)) return 'MARKET_OVERVIEW';
  if (/(auction|bank auction|bid)/.test(q)) return 'AUCTION_QUERY';
  if (/(requirement|client|match|buyer looking)/.test(q)) return 'REQUIREMENT_MATCH';
  if (/(contact|phone number|our phone|call (?:you|us)|email (?:us|address|id)|our email|reach (?:you|us)|your address|office address|office location|head office|where are you|your location|hours|timing|open now|open (?:on|during|at)|opening hours|directions|instagram|linkedin|youtube|social media|whatsapp)/.test(q)) return 'COMPANY_QUERY';
  if (/(about (?:the )?(?:company|vjr)|about you|who is|who are|founder|\bvijay\b|vijay ram|ceo|mission|vision|company story|our story|company history|our history|how did.*start|when.*founded|our services|services you offer|what do you do|advisory)/.test(q)) return 'COMPANY_QUERY';
  if (/(price|cost|budget|expensive|cheap(?:est)?|under |below |afford)/.test(q)) return 'PRICE_ANALYSIS';
  if (/(find|show|search|list|looking for|properties in|available|near|in )/.test(q)) return 'PROPERTY_SEARCH';
  if (/(property|listing|details?|describe|tell me about)/.test(q)) return 'PROPERTY_DETAIL';

  return 'GENERAL';
}

// ─── PARAMETER EXTRACTOR ─────────────────────────────────────────────────────
// Matches against the real Bangalore locality list and the real property types
// used by the site, so extraction always aligns with the Firestore schema.
export interface SearchParams {
  localities: string[];
  types: string[];
  maxPrice: number | null;
  minPrice: number | null;
  minArea: number | null;
}

const TYPE_KEYWORDS: { key: string; types: string[] }[] = [
  { key: 'pg', types: ['PG Building'] },
  { key: 'residential rental', types: ['Residential Rental'] },
  { key: 'rental income', types: ['Residential Rental'] },
  { key: 'commercial', types: ['Commercial'] },
  { key: 'residential plot', types: ['Residential Plot'] },
  { key: 'plot', types: ['Residential Plot', 'Commercial Plot'] },
  { key: 'jd land', types: ['JD Land'] },
  { key: 'agriculture', types: ['JD Land'] },
  { key: 'land', types: ['Residential Plot', 'Commercial Plot', 'JD Land'] },
];

export function extractSearchParams(query: string): SearchParams {
  const q = query.toLowerCase();

  // Localities — fuzzy-match against the site's canonical Bangalore list, and
  // drop filterLocalities' raw-query fallback (it returns the whole query when
  // nothing matches). Only canonical areas <= 3 words are accepted.
  const localities = filterLocalities(q.replace(/[.,]/g, ' '), 6)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.split(/\s+/).length <= 3 && (BANGALORE_AREAS as readonly string[]).includes(l));

  // Property types.
  const types: string[] = [];
  TYPE_KEYWORDS.forEach(({ key, types: mapped }) => {
    if (q.includes(key) && !types.some((t) => mapped.includes(t))) types.push(...mapped);
  });

  // Price mentions: "under 2 crore", "below 50 lakh", "1 cr", "within 80 l", "5l".
  let maxPrice: number | null = null;
  let minPrice: number | null = null;

  const underCr = q.match(/(?:under|below|within|max|less than|upto|up to)\s*(?:rs\.?\s*|₹)?\s*(\d+(?:\.\d+)?)\s*cr(?:ore)?/);
  const underLakh = q.match(/(?:under|below|within|max|less than|upto|up to)\s*(?:rs\.?\s*|₹)?\s*(\d+(?:\.\d+)?)\s*(?:l|lakh|lak)/);
  const aboveCr = q.match(/(?:above|over|min|minimum|more than)\s*(?:rs\.?\s*|₹)?\s*(\d+(?:\.\d+)?)\s*cr(?:ore)?/);
  const plainCr = q.match(/(?:\b)(\d+(?:\.\d+)?)\s*cr(?:ore)?(?:\b)/);
  const plainLakh = q.match(/(?:\b)(\d+(?:\.\d+)?)\s*(?:l|lakh|lak)(?:\b)/);

  if (underCr) maxPrice = parseFloat(underCr[1]) * 10000000;
  else if (underLakh) maxPrice = parseFloat(underLakh[1]) * 100000;
  if (aboveCr) minPrice = parseFloat(aboveCr[1]) * 10000000;
  else if (!minPrice && plainCr) {
    const v = parseFloat(plainCr[1]);
    minPrice = v * 10000000 * 0.8;
    if (maxPrice == null) maxPrice = v * 10000000 * 1.2;
  } else if (!minPrice && plainLakh && maxPrice == null) {
    const v = parseFloat(plainLakh[1]);
    minPrice = v * 100000 * 0.8;
    maxPrice = v * 100000 * 1.2;
  }

  // Area: "1500 sqft", "2000 square feet".
  let minArea: number | null = null;
  const areaMatch = q.match(/(\d{3,})\s*(?:sq\.?\s?ft|sqft|square\s*feet)/);
  if (areaMatch) minArea = parseInt(areaMatch[1], 10);

  return { localities, types, maxPrice, minPrice, minArea };
}

// ─── PROPERTY SUMMARY BUILDER (context for the LLM) ─────────────────────────
function summarizeProperty(p: AiProperty): string {
  const lines = [
    `ID: ${p.id}`,
    `Title: ${p.title}`,
    `Type: ${p.type}`,
    `Location: ${p.location || p.area || 'Bangalore'}`,
    `Price: ${formatINR(p.price)}`,
  ];
  if (p.areaSqft) lines.push(`Area: ${p.areaSqft.toLocaleString('en-IN')} sq.ft`);
  if (p.areaAcres) lines.push(`Land: ${(p.areaAcres + (p.areaGuntas ?? 0) / 40).toFixed(2)} acres`);
  if (p.monthlyRental) lines.push(`Monthly Rental: ${formatINR(p.monthlyRental)}`);
  if (p.pricePerSqft) lines.push(`Price/sqft: ${formatINR(p.pricePerSqft)}/sq.ft`);
  if (p.katha) lines.push(`Khata: ${p.katha}`);
  if (p.facing) lines.push(`Facing: ${p.facing}`);
  if (p.status) lines.push(`Status: ${p.status}`);
  if (p.highlights?.length) lines.push(`Highlights: ${p.highlights.slice(0, 4).join(', ')}`);
  return lines.join('\n');
}

// ─── LLM CALL — follows the project's existing OpenRouter → gemini-2.5-flash
// pattern (see src/utils/aiValuation.ts). No new API key required.
async function callGemini(
  systemPrompt: string,
  userQuery: string,
  history: { role: string; content: string }[],
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENROUTER_API_KEY is not configured');

  const messages = [
    ...history.slice(-6).map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: userQuery },
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': import.meta.env.VITE_SITE_URL || 'https://vjrestate.com',
      'X-Title': 'VJR Estate',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 900,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenRouter');
  return text;
}

// ─── DETERMINISTIC FALLBACK ──────────────────────────────────────────────────
// Used when the API key is missing or the API call fails — the chat still
// answers with real, grounded database data.
function buildFallbackAnswer(
  intent: QueryIntent,
  properties: AiProperty[],
  calculations: Record<string, unknown>,
  marketData: MarketAnalysis | null,
  auctions: AiAuction[],
  query: string,
): string {
  const parts: string[] = [];

  if (intent === 'COMPANY_QUERY') {
    const c = companyInfo;
    if (/(contact|phone|email|call|reach|address|office|location|hours|timing|open now|open (?:on|during|at)|opening hours|directions|instagram|linkedin|youtube|social|whatsapp)/.test(query.toLowerCase())) {
      parts.push(`You can reach VJR Estate at ${c.phone} or ${c.email}.`);
      parts.push(`Our office is at ${c.address}.`);
      parts.push(`We are open ${c.hours}.`);
      parts.push(`You can also find us on Instagram, LinkedIn, and YouTube — search for VJR Estate.`);
    } else if (/(founder|vijay|ceo|who is|who are)/.test(query.toLowerCase())) {
      parts.push(`${c.founder.name} is the ${c.founder.role} of ${c.legalName}.`);
      parts.push(c.founder.bio);
      parts.push(`\u201c${c.founder.quote}\u201d`);
    } else if (/(mission|vision)/.test(query.toLowerCase())) {
      parts.push(`Our mission: ${c.mission}`);
      parts.push(`Our vision: ${c.vision}`);
    } else {
      parts.push(`${c.legalName} is ${c.tagline}, headquartered in ${c.hq}.`);
      parts.push(`We focus on ${c.focus.join(', ')} across Bangalore.`);
      parts.push(`Reach us at ${c.phone} or ${c.email}.`);
    }
  } else if (intent === 'AUCTION_QUERY' && auctions.length > 0) {
    parts.push('Here are the current auctions:');
    auctions.slice(0, 6).forEach((a) => {
      parts.push(`• ${a.title} — ${a.location}, starting at ${formatINR(a.startingBid)} — ${a.status.toUpperCase()}`);
    });
  } else if (intent === 'MARKET_OVERVIEW' && marketData) {
    parts.push(`I found ${marketData.totalListings} propert${marketData.totalListings === 1 ? 'y' : 'ies'} currently listed.`);
    parts.push(`• Average price: ${formatINR(marketData.avgPrice)}`);
    parts.push(`• Average price per sq.ft: ${formatINR(marketData.avgPricePerSqft)}`);
    parts.push(`• Price range: ${formatINR(marketData.priceRange.min)} – ${formatINR(marketData.priceRange.max)}`);
    if (marketData.avgRentalYield > 0) parts.push(`• Average rental yield: ${marketData.avgRentalYield}%`);
    if (marketData.topLocalities.length) parts.push(`• Most listings in: ${marketData.topLocalities.slice(0, 4).join(', ')}`);
  } else if (intent === 'COMPARISON' && properties.length > 0) {
    const cmp = compareProperties(properties.slice(0, 4));
    parts.push('Here is a quick comparison:');
    cmp.forEach((c) => {
      parts.push(
        `• ${c.title} (${c.locality}) — ${c.priceFormatted}, ${formatINR(c.pricePerSqft)}/sq.ft` +
          (c.rentalYield ? `, yield ${c.rentalYield.annualYield.toFixed(1)}%` : ''),
      );
    });
  } else if (intent === 'REQUIREMENT_MATCH') {
    parts.push('I can match open buyer requirements against our listings. Ask me something like “show properties matching open requirements” and I will pull both sides for you.');
  } else if (properties.length > 0) {
    if (intent === 'RENTAL_YIELD' || intent === 'INVESTMENT_ADVICE') {
      const ranked = [...properties]
        .filter((p) => p.monthlyRental > 0)
        .sort((a, b) => calculateRentalYield(b.price, b.monthlyRental).annualYield - calculateRentalYield(a.price, a.monthlyRental).annualYield);
      parts.push('Top income-generating properties by rental yield:');
      ranked.slice(0, 6).forEach((p) => {
        const y = calculateRentalYield(p.price, p.monthlyRental);
        parts.push(`• ${p.title} — ${p.location} — ${formatINR(p.price)} — yield ${y.annualYield.toFixed(1)}% (${y.grade})`);
      });
    } else {
      parts.push(`Found ${properties.length} matching propert${properties.length === 1 ? 'y' : 'ies'}:`);
      properties.slice(0, 6).forEach((p) => {
        parts.push(
          `• ${p.title} — ${p.location || p.area} — ${formatINR(p.price)}` +
            (p.monthlyRental ? `, ${formatINR(p.monthlyRental)}/mo` : '') +
            (p.areaSqft ? `, ${p.areaSqft.toLocaleString('en-IN')} sq.ft` : ''),
        );
      });
    }
  } else {
    parts.push('I couldn’t find a matching property with those requirements. Try asking for a locality, budget range, or property type — for example “show PG buildings in Whitefield under 2 crore”.');
  }

  if (calculations.emi) {
    const e = calculations.emi as { monthlyEMI: number; totalInterest: number };
    parts.push(`EMI estimate: ${formatINR(e.monthlyEMI)}/month at 8.5% over 20 years (total interest ${formatINR(e.totalInterest)}).`);
  }

  parts.push('Based on the available property information');
  return parts.join('\n\n');
}

// ─── SUGGESTED QUESTIONS ─────────────────────────────────────────────────────
const SUGGESTIONS: Record<QueryIntent, string[]> = {
  PROPERTY_SEARCH: ['Which of these has the best rental yield?', 'Compare the top 3 properties', 'Which have A Khata documentation?'],
  PROPERTY_DETAIL: ['What is the price per sq.ft?', 'Calculate the rental yield', 'Show similar properties nearby'],
  PRICE_ANALYSIS: ['Show properties under ₹1 Cr', 'Which is cheapest per sq.ft?', 'What is the average price in Bangalore?'],
  RENTAL_YIELD: ['Show PG buildings with income above ₹50K/month', 'Which location has the highest average yield?', 'What is the EMI on the best yielding property?'],
  COMPARISON: ['Which has better investment potential?', 'What documents should I verify?', 'Show similar properties at lower price'],
  INVESTMENT_ADVICE: ['What is the market average in this area?', 'Show similar properties at lower price', 'What is the rental yield on the top pick?'],
  MARKET_OVERVIEW: ['Which locality has the most listings?', 'Show highest yielding properties', 'What is the average price per sq.ft?'],
  LOCATION_QUERY: ['Show properties in this area', 'Compare with the neighboring locality', 'What is the average price here?'],
  REQUIREMENT_MATCH: ['Show open requirements', 'Match requirements to listings', 'Which listings fit a ₹2 Cr budget?'],
  AUCTION_QUERY: ['Show all live auctions', 'Compare auction vs regular listing', 'Which auctions are ending soon?'],
  EMI_CALCULATION: ['What is the rental yield on this?', 'Can I afford this with 20% down payment?', 'Show similar properties at lower price'],
  COMPANY_QUERY: ['What is your office address?', 'How can I contact VJR Estate?', 'Tell me about the founder'],
  GENERAL: ['Show all properties', 'What is the market overview?', 'Find PG buildings in Bangalore'],
};

function generateSuggestedQuestions(intent: QueryIntent, query: string): string[] {
  const base = SUGGESTIONS[intent] || SUGGESTIONS.GENERAL;
  // Personalize the first suggestion with an actual locality when found.
  const locality = extractSearchParams(query).localities[0];
  if (locality && intent === 'PROPERTY_SEARCH') {
    return [`What is the average price in ${locality}?`, ...base.slice(1, 3)];
  }
  return base.slice(0, 3);
}

// ─── MAIN ORCHESTRATOR ───────────────────────────────────────────────────────
export async function processQuery(
  userQuery: string,
  conversationHistory: { role: string; content: string }[],
  userRole: UserRole = 'public',
): Promise<RagResponse> {
  const intent = classifyIntent(userQuery);
  const params = extractSearchParams(userQuery);

  let properties: AiProperty[] = [];
  let auctions: AiAuction[] = [];
  let marketData: MarketAnalysis | null = null;
  let requirements: unknown[] = [];
  const calculations: Record<string, unknown> = {};
  const sources: string[] = [];

  // ── STEP 1: RETRIEVE ─────────────────────────────────────────────────────
  try {
    if (intent === 'COMPANY_QUERY') {
      // Company profile is static knowledge — no Firestore query needed.
      sources.push('Based on the available company information');
    } else if (intent === 'AUCTION_QUERY') {
      auctions = await getAuctions();
      sources.push('Based on available auction information');
    } else if (intent === 'MARKET_OVERVIEW') {
      properties = await getAllProperties(300);
      marketData = analyzeMarket(properties);
      sources.push('Based on available property information');
    } else if (intent === 'REQUIREMENT_MATCH' && userRole !== 'public') {
      requirements = await getOpenRequirements();
      properties = await getAllProperties(300);
      sources.push('Based on available requirement and property information');
    } else {
      const hasFilters = params.localities.length > 0 || params.types.length > 0 || params.maxPrice != null || params.minPrice != null || params.minArea != null;
      if (hasFilters) {
        properties = await searchProperties({
          localities: params.localities,
          types: params.types,
          minPrice: params.minPrice ?? undefined,
          maxPrice: params.maxPrice ?? undefined,
          minArea: params.minArea ?? undefined,
          limitCount: 20,
        });
        // Soft fallback: if filters returned nothing, still show the catalog.
        if (properties.length === 0) properties = await getAllProperties(300);
      } else {
        properties = await getAllProperties(300);
      }
      sources.push(`${properties.length} matching propert${properties.length === 1 ? 'y' : 'ies'} found`);
    }
  } catch (err) {
    console.error('VJR AI retrieval error:', err);
    sources.push('Based on the available property information');
  }

  // ── STEP 2: CALCULATE ────────────────────────────────────────────────────
  if ((intent === 'RENTAL_YIELD' || intent === 'INVESTMENT_ADVICE') && properties.length > 0) {
    calculations.rentalYields = properties
      .filter((p) => p.price > 0 && p.monthlyRental > 0)
      .map((p) => ({
        id: p.id,
        property: p.title,
        locality: p.location || p.area,
        price: formatINR(p.price),
        monthlyIncome: formatINR(p.monthlyRental),
        yield: calculateRentalYield(p.price, p.monthlyRental),
      }))
      .sort((a, b) => b.yield.annualYield - a.yield.annualYield);
    sources.push('Calculated from the available property details');
  }

  if (intent === 'COMPARISON' && properties.length > 0) {
    calculations.comparison = compareProperties(properties.slice(0, 5));
    sources.push('Based on the available property information');
  }

  if (intent === 'EMI_CALCULATION') {
    const priceMatch = userQuery.match(/(\d+(?:\.\d+)?)\s*cr/i) ?? userQuery.match(/(\d+(?:\.\d+)?)\s*(?:l|lakh)/i);
    if (priceMatch) {
      const isCr = /cr/i.test(priceMatch[0]);
      const principal = parseFloat(priceMatch[1]) * (isCr ? 10000000 : 100000);
      calculations.emi = calculateEMI(principal);
      sources.push('EMI estimated at 8.5% over 20 years');
    } else if (properties[0]?.price) {
      calculations.emi = calculateEMI(properties[0].price);
      sources.push('EMI estimated at 8.5% over 20 years');
    }
  }

  if (intent === 'PRICE_ANALYSIS') {
    const m = marketData ?? analyzeMarket(properties);
    calculations.priceAnalysis = {
      avgPrice: formatINR(m.avgPrice),
      avgPricePerSqft: formatINR(m.avgPricePerSqft),
      totalListings: m.totalListings,
      priceRange: m.priceRange,
    };
    sources.push('Calculated from the available property details');
  }

  // ── STEP 3: BUILD CONTEXT ────────────────────────────────────────────────
  const propertySummary = properties.slice(0, 12).map(summarizeProperty).join('\n---\n');
  const calculationContext = Object.keys(calculations).length > 0 ? `\nCALCULATED DATA:\n${JSON.stringify(calculations, null, 2)}` : '';
  const marketContext = marketData ? `\nMARKET OVERVIEW:\n${JSON.stringify(marketData, null, 2)}` : '';
  const auctionContext =
    auctions.length > 0
      ? `\nAUCTION DATA:\n${auctions
          .slice(0, 5)
          .map((a) => `${a.title} — ${a.location} — Starting: ${formatINR(a.startingBid)} — Status: ${a.status}`)
          .join('\n')}`
      : '';
  const requirementContext =
    requirements.length > 0 ? `\nOPEN REQUIREMENTS:\n${JSON.stringify(requirements.slice(0, 8), null, 2)}` : '';
  const companyContext =
    intent === 'COMPANY_QUERY' || properties.length === 0 ? `\n${formatCompanyContext()}` : '';

  const systemPrompt = `You are Nexa — the property intelligence assistant for VJR Estate, a Bangalore real estate company (vjrestate.com).

YOUR ROLE: ${userRole.toUpperCase()}
${userRole === 'admin' ? 'You may show internal details and open buyer requirements.' : userRole === 'agent' ? 'You may discuss property and buyer requirement matching.' : 'You answer for public website visitors.'}

CORE RULES:
1. NEVER invent property data. Use ONLY the data provided below. If the answer is not in the data, say "I don't have enough information to confirm that."
2. Describe information sources naturally for a customer (e.g. "based on the available listing information", "calculated at 8.5% over 20 years"). Never mention databases, models, APIs, or other technical internals.
3. Be specific: use real property titles, prices, localities.
4. When multiple properties match, list up to 5 with the most relevant details (price, area, income, khata, facing).
5. Distinguish FACT vs CALCULATION vs INFERENCE where useful.
6. Keep answers concise, structured, and actionable. Use short bullet lines, no long paragraphs.
7. The user may reference "the properties page", "the map", or an earlier result — use the conversation history for context.
8. Bangalore market context: average residential yield 3–5%, PG building yields 6–10%, premium localities Koramangala/Indiranagar/Whitefield, growth corridors Devanahalli/Sarjapur/Electronic City.

VJR ESTATE PROPERTY DATA (${properties.length} properties):
${propertySummary}
${calculationContext}${marketContext}${auctionContext}${requirementContext}${companyContext}`;

  const suggestedQuestions = generateSuggestedQuestions(intent, userQuery);
  const confidence: RagResponse['confidence'] = properties.length > 0 || auctions.length > 0 ? 'HIGH' : 'MEDIUM';

  // ── STEP 4: GENERATE ─────────────────────────────────────────────────────
  try {
    const answer = await callGemini(systemPrompt, userQuery, conversationHistory);
    return { answer, properties: properties.slice(0, 8), intent, sources, calculations, confidence, suggestedQuestions };
  } catch (err) {
    console.error('VJR AI generation error (using deterministic fallback):', err);
    const answer = buildFallbackAnswer(intent, properties, calculations, marketData, auctions, userQuery);
    return { answer, properties: properties.slice(0, 8), intent, sources, calculations, confidence, suggestedQuestions };
  }
}
