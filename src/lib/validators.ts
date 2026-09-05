/**
 * Shared format validators (India).
 *
 * Mobile: 10 digits starting 6–9, optionally prefixed with `+91` / `91` / `0`.
 * PAN:    5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).
 * Aadhaar: exactly 12 digits.
 * IFSC:   4 letters + `0` + 6 alphanumerics (e.g. HDFC0001234).
 * UAN:    exactly 12 digits (EPFO).
 */

export function normalizeIndianMobile(raw: string | number | null | undefined): string {
  return String(raw ?? '').replace(/[\s()-]/g, '').replace(/^\+/, '');
}

/** Accepts `9880773859`, `+919880773859`, `919880773859` or `09880773859`. */
export function isIndianMobile(raw: string | number | null | undefined): boolean {
  const t = normalizeIndianMobile(raw);
  if (/^91[6-9]\d{9}$/.test(t)) return true; // country code present
  if (/^0[6-9]\d{9}$/.test(t)) return true; // leading trunk 0
  return /^[6-9]\d{9}$/.test(t); // bare 10 digits
}

export function isPan(raw: string | null | undefined): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(raw ?? '').trim().toUpperCase());
}

export function isAadhaar(raw: string | null | undefined): boolean {
  return /^\d{12}$/.test(String(raw ?? '').replace(/[\s-]/g, ''));
}

export function isIfsc(raw: string | null | undefined): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(raw ?? '').trim().toUpperCase());
}

export function isUan(raw: string | null | undefined): boolean {
  return /^\d{12}$/.test(String(raw ?? '').replace(/\s/g, ''));
}

export function isEmail(raw: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(raw ?? '').trim());
}
