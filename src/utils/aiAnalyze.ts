export async function generateAIAnalysis(property: any, nearbyPlaces: any[]): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('VITE_OPENROUTER_API_KEY is missing from .env');
    return 'ERROR: AI API key not configured.';
  }

  const grouped = nearbyPlaces.reduce((acc: any, p) => {
    if (!acc[p.label]) acc[p.label] = [];
    acc[p.label].push(p);
    return acc;
  }, {});

  const placesSummary = Object.entries(grouped)
    .map(([label, places]: any) => {
      const items = (places as any[])
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, 3)
        .map(
          (p: any) =>
            `  • ${p.name} — ${p.distance < 1000 ? p.distance + 'm' : (p.distance / 1000).toFixed(1) + 'km'} away` +
            `${p.rating ? ` (${p.rating}⭐)` : ''}`,
        )
        .join('\n');
      return `${label}:\n${items}`;
    })
    .join('\n\n');

  const pricePerSqft =
    property.pricePerSqft ||
    (property.price && property.areaSqft ? Math.round(property.price / property.areaSqft) : null);

  const prompt = `You are VJR Estate's premium AI property analyst for Bangalore real estate market.

Analyze this property comprehensively:

═══ PROPERTY ═══
Type: ${property.propertyType}
Location: ${property.locality || property.area}, Bangalore
Asking Price: ₹${(property.price / 10000000).toFixed(2)} Cr
${pricePerSqft ? `Price per sq.ft: ₹${pricePerSqft.toLocaleString('en-IN')}` : ''}
${property.areaSqft ? `Plot Size: ${property.areaSqft.toLocaleString('en-IN')} sq.ft` : property.areaAcres ? `Land Area: ${((property.areaAcres || 0) + (property.areaGuntas || 0) / 40).toFixed(2)} Acres` : ''}
${property.dimensions ? `Dimensions: ${property.dimensions}` : ''}
${property.facing ? `Facing: ${property.facing}` : ''}
${property.khata ? `Khata: ${property.khata}` : ''}

═══ NEARBY AMENITIES WITHIN 2KM ═══
${placesSummary}

Provide a DETAILED premium investment analysis.
Format EXACTLY as below — use these exact headers:

**INVESTMENT SCORE**
[X.X/10] — [one sentence justification]

**LOCATION ADVANTAGE**
[2-3 sentences about why this location is strategic in Bangalore's real estate market right now]

**CONNECTIVITY**
[Rate: Excellent/Good/Average] — [explain metro/bus/road access based on nearby transport found above]

**NEARBY HIGHLIGHTS**
[List top 5 most valuable nearby amenities with exact distances — format as: Name (Xm/Xkm) — why it matters]

**MARKET PRICE ANALYSIS**
[Is ₹X/sq.ft fair, expensive or cheap for ${property.locality || property.area}? Compare to Bangalore average. What appreciation % to expect in 2-3 years?]

**TOP ADVANTAGES**
[+] Advantage 1
[+] Advantage 2
[+] Advantage 3

**RISK TO WATCH**
[!] One honest risk or concern

**VJR VERDICT**
[BUY NOW / NEGOTIATE PRICE / WAIT]
[One powerful closing sentence with recommendation]

Keep factual, data-driven, and Bangalore-specific.
Total: 200-250 words maximum.`;

  try {
    console.log('Calling OpenRouter with model: google/gemini-2.5-flash');

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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return `Analysis failed: API error ${response.status}. Check console.`;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      console.error('OpenRouter: unexpected response', JSON.stringify(data));
      return 'Analysis failed: unexpected API response.';
    }

    console.log('OpenRouter response received:', text.length, 'chars');
    return text;
  } catch (err: any) {
    console.error('OpenRouter API error:', err);
    console.error('Error details:', err.message);
    return `Analysis failed: ${err.message}. Check console for details.`;
  }
}
