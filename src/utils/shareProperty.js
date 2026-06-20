import { siteContact } from '@/data/siteContact';
import { getPropertyShareUrl } from '@/lib/siteUrl';

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

function buildShareContent(property) {
  if (!property?.id) {
    return null;
  }

  const url = getPropertyShareUrl(property.id);
  const title = `${property.title} — VJR Estate`;
  const monthlyLabel = property.monthly_rental_label ?? property.monthly_rental;
  const text = `${property.type} in ${property.area}, Bangalore\nPrice: ${property.price_label}${
    monthlyLabel && monthlyLabel !== '—'
      ? `\nMonthly Income: ${monthlyLabel}`
      : ''
  }\n${url}`;

  return { url, title, text };
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function buildWhatsAppShareUrl(message) {
  const waNumber = siteContact.phoneTel.replace('+', '');
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

async function trySharePayload(payload) {
  if (typeof navigator.canShare === 'function' && !navigator.canShare(payload)) {
    return 'unsupported';
  }
  await navigator.share(payload);
  return 'shared';
}

/**
 * Native OS share on mobile (WhatsApp, Telegram, etc.).
 * Falls back to WhatsApp deep link on mobile, clipboard on desktop.
 * @returns {'shared' | 'whatsapp' | 'copied' | 'cancelled' | 'failed'}
 */
export async function shareProperty(property) {
  const content = buildShareContent(property);
  if (!content) return 'failed';

  const { url, title, text } = content;
  const mobile = isMobileDevice();

  if (typeof navigator.share === 'function') {
    const payloads = [{ title, text, url }, { title, url }, { text }, { url }];

    for (const payload of payloads) {
      try {
        const result = await trySharePayload(payload);
        if (result === 'shared') return 'shared';
      } catch (err) {
        if (err?.name === 'AbortError') return 'cancelled';
        if (err?.name === 'NotAllowedError') break;
      }
    }
  }

  if (mobile) {
    window.open(buildWhatsAppShareUrl(text), '_blank', 'noopener,noreferrer');
    return 'whatsapp';
  }

  const copied = await copyTextToClipboard(text);
  return copied ? 'copied' : 'failed';
}
