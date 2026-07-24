import { VASTU_EXTRACTION_PROMPT, vastuBrain } from '../src/data/vastuBrain';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  let body: { image?: string; mimeType?: string; northDegrees?: number };
  try {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      body = req.body;
    } else {
      const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
      body = JSON.parse(raw);
    }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { image, mimeType, northDegrees } = body;
  if (!image || northDegrees === undefined) {
    return res.status(400).json({ error: 'image and northDegrees are required' });
  }

  const systemPrompt = VASTU_EXTRACTION_PROMPT.replace('{north_degrees}', String(northDegrees));
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${image}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vjrestate.com',
        'X-Title': 'VJR Estate',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.1,
        max_tokens: 16384,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Extract all architectural data from this floor plan. North = ${northDegrees}° clockwise from image top. Return ONLY valid JSON matching the specified schema.` },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API error:', response.status, errText);
      return res.status(502).json({ error: 'AI extraction failed', detail: errText });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({ error: 'Empty response from AI' });
    }

    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const extraction = JSON.parse(cleaned);

    const analysis = vastuBrain.analyze(extraction);

    return res.status(200).json({ extraction, analysis });
  } catch (err: any) {
    console.error('analyze-vastu error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'AI analysis failed' });
  }
}
