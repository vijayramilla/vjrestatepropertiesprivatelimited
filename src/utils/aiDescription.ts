const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

interface FormData {
  title: string;
  type: string;
  area: string;
  location: string;
  price: number;
  price_label?: string;
  price_per_sqft: number;
  area_sqft: number;
  area_unit: string;
  land_acres: number;
  land_guntas: number;
  dimensions: string;
  facing: string;
  katha: string;
  description: string;
  city: string;
  state: string;
}

export async function enhanceDescription(form: FormData): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return 'ERROR: Groq API key is not configured. Add VITE_GROQ_API_KEY to your .env file.';

  const details = [
    `Title: ${form.title}`,
    `Type: ${form.type}`,
    `Location: ${form.area}${form.location ? `, ${form.location}` : ''}`,
    `Price: ₹${form.price?.toLocaleString('en-IN')}${form.price_label ? ` (${form.price_label})` : ''}`,
    form.price_per_sqft > 0 ? `Price per sq.ft: ₹${form.price_per_sqft.toLocaleString('en-IN')}` : '',
    form.area_sqft > 0 ? `Size: ${form.area_sqft.toLocaleString('en-IN')} sq.ft` : '',
    form.land_acres > 0 ? `Land: ${form.land_acres} acres ${form.land_guntas} guntas` : '',
    form.dimensions ? `Dimensions: ${form.dimensions}` : '',
    `Facing: ${form.facing}`,
    form.katha ? `Khata: ${form.katha}` : '',
    form.city ? `City: ${form.city}` : '',
    form.state ? `State: ${form.state}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = `You are a professional real estate copywriter for VJR Estate, an Indian property marketplace. Your task is to write a compelling, SEO-optimized property description.

Rules:
- Write 150-300 words in British Indian English
- Be factual, specific, and persuasive — use actual measurements and figures
- Structure: attention-grabbing opening → key features with specifics → location advantages → clear call to action
- Use bullet points for key features (road access, nearby landmarks, unique selling points)
- End with a call to action inviting buyers to enquire
- Do NOT include placeholders like "[Insert...]" or "[Name]"
- Do NOT include the property title as a heading
- Do NOT use markdown formatting
- Write in natural paragraph form with bullet points where appropriate`;

  const userPrompt = `Generate a property description based on these details:\n\n${details}`;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq API ${res.status}: ${text}`);
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    if (!content) throw new Error('Groq returned empty response');

    return content.slice(0, 500).trim();
  } catch (err) {
    console.error('Description enhance error:', err);
    throw err;
  }
}

const TARGET_FORMAT = `Commercial Building for Sale - Kadubeesanahalli, Bangalore

Premium income-generating commercial building located in the heart of Kadubeesanahalli, one of Bangalore's fastest-growing IT and business corridors. An excellent investment opportunity offering stable rental income and strong long-term appreciation.

Property Details:
- Location: Kadubeesanahalli, Bangalore
- Site Area: 3,300 Sq.ft
- Built-up Area: 10,600 Sq.ft

Rental Details (Per Month):
- Ground Floor: Rs.1,58,770
- First Floor: Rs.1,27,563
- Second Floor: Rs.95,000
- Rooftop: Rs.36,640

Financials:
- Total Monthly Rental Income: Rs.4,17,973 (Approx. Rs.4.18 Lakhs)
- Asking Price: Rs.7 Crores

Investment Highlights:
- Prime Commercial Location
- Stable Monthly Rental Income
- Multiple Rental Streams
- High Demand Business Corridor
- Excellent Capital Appreciation Potential
- Ready-to-Own Income-Generating Asset`;

export async function restructureDescription(raw: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_OPENROUTER_API_KEY is missing from .env');
  }

  const prompt = `You are VJR Estate's property listing writer for Bangalore real estate.

The admin pasted raw property details below. Restructure them into a clean, professional property description.

Follow EXACTLY this structure and style (section order, headers, and bullet format must match this example):

${TARGET_FORMAT}

Rules:
- First line: Title as "Property Type for Sale - Locality, Bangalore"
- Second paragraph: 2-3 sentences of compelling intro (investment opportunity, stable income, appreciation)
- Section headers: "Property Details:", "Rental Details (Per Month):", "Financials:", "Investment Highlights:"
- Use "- " bullets under each section
- Use Indian Rupee symbol or "Rs." and Indian number formats (lakhs/crores)
- Keep every number/fact from the raw text; do NOT invent data
- Turn leftover one-line selling points into the Investment Highlights bullets
- Maximum 1100 characters
- Output the description ONLY, no preamble, no code fences

RAW PASTED DETAILS:
${raw}`;

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
      max_tokens: 700,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('AI returned no content');
  }

  return text.replace(/```/g, '').trim();
}