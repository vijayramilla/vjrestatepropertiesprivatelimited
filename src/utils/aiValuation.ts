export interface ValuationInput {
  propertyType: string;
  locality: string;
  areaSqft: number;
  age: string;
  facing: string;
  floor: string;
  bhk: string;
  status: string;
}

export interface ValuationResult {
  marketValue: number;
  pricePerSqft: number;
  rentalYield: number;
  circleRate: number;
  confidenceScore: number;
  explanation: string;
  comparableLocalities: string[];
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export async function getPropertyValuation(input: ValuationInput): Promise<ValuationResult | null> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('VITE_OPENROUTER_API_KEY is missing from .env');
    return null;
  }

  const prompt = `You are a real estate valuation expert for Bangalore, India.
Given the following property details, provide an accurate market valuation:

Property Type: ${input.propertyType}
Locality: ${input.locality}
Area: ${input.areaSqft} sqft
Age: ${input.age}
Facing: ${input.facing}
Floor: ${input.floor}
BHK: ${input.bhk}
Construction Status: ${input.status}

Consider:
- Recent comparable sales in ${input.locality}
- Current market trends in Bangalore real estate
- Property type premiums/discounts
- Age depreciation (5-15% for 5-10yr old, 15-25% for 10-20yr old)
- Floor and facing adjustments
- Circle rate / government guidance value for ${input.locality}

Return a JSON object ONLY (no markdown, no code blocks):
{
  "marketValue": <number in INR>,
  "pricePerSqft": <number>,
  "rentalYield": <number per month>,
  "circleRate": <number per sqft>,
  "confidenceScore": <0-100>,
  "explanation": "<2-3 sentence plain English explanation>",
  "comparableLocalities": ["<locality1>", "<locality2>"],
  "trend": "<up|down|stable>",
  "trendPercentage": <number>
}`;

  try {
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
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('Valuation API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenRouter response');
      return null;
    }

    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result: ValuationResult = JSON.parse(cleaned);

    if (!result.marketValue || !result.pricePerSqft) {
      console.error('Invalid valuation result:', result);
      return null;
    }

    return result;
  } catch (err) {
    console.error('Valuation fetch error:', err);
    return null;
  }
}
