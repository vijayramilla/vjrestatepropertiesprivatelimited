import { idPrefixFor } from '@/data/employeeHierarchy';
import { leadSupabase } from '@/services/leadSupabase';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Ask Gemini (via OpenRouter, same path as the rest of the app) for a short
 *  role-based ID prefix. Returns null on failure so we fall back to the map. */
async function aiPrefix(department: string, designation: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are an HR ID generator for "VJR Estate", a Bangalore real-estate firm. ' +
              'Given a department and designation, reply with ONLY a short uppercase ID prefix ' +
              'code (2-6 chars, letters and hyphens only, e.g. "SL-TC" for Sales Telecaller). No explanation.',
          },
          { role: 'user', content: `Department: ${department}\nDesignation: ${designation}` },
        ],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const clean = text.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '');
    if (clean.length >= 2 && clean.length <= 8) return clean;
    return null;
  } catch {
    return null;
  }
}

/** Largest numeric suffix already used for a prefix, +1 (or 1). */
async function nextNumber(prefix: string): Promise<number> {
  try {
    const res = await leadSupabase.employees.list();
    const ids = (res.data ?? []).map((e: any) => String(e.employee_id ?? ''));
    const re = new RegExp(`^VJR-${prefix}-(\\d+)$`);
    let max = 0;
    for (const id of ids) {
      const m = id.match(re);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    if (max > 0) return max + 1;
    // fallback: any trailing number across existing IDs
    let anyMax = 0;
    for (const id of ids) {
      const m = id.match(/(\d+)$/);
      if (m) anyMax = Math.max(anyMax, parseInt(m[1], 10));
    }
    return anyMax + 1;
  } catch {
    return 1;
  }
}

export type GeneratedId = { employeeId: string; usedAi: boolean };

/**
 * Generate an employee ID from the role: VJR-<DEPT>-<ROLE>-<NNN>.
 * Gemini suggests the prefix when VITE_OPENROUTER_API_KEY is set; otherwise the
 * deterministic hierarchy map is used so ID generation always works.
 */
export async function generateEmployeeId(department: string, designation: string): Promise<GeneratedId> {
  const fallback = idPrefixFor(department, designation);
  const ai = await aiPrefix(department, designation);
  const prefix = ai ?? fallback;
  const num = await nextNumber(prefix);
  return { employeeId: `VJR-${prefix}-${String(num).padStart(3, '0')}`, usedAi: Boolean(ai) };
}
