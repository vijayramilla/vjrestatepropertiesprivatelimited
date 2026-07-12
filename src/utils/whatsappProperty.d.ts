export type WhatsAppPropertyInput = {
  id: string | number;
  title: string;
  type?: string;
  area?: string;
  price_label?: string;
  monthly_rental?: number | string;
  monthly_rental_label?: string | null;
  contact_phone?: string;
  contact_name?: string;
};

export type WhatsAppEnquiryOptions = {
  visitDate?: string;
  visitTime?: string;
  buyerName?: string;
  buyerPhone?: string;
  source?: string;
  leadType?: string;
};

export function buildWhatsAppMessage(
  property: WhatsAppPropertyInput,
  extra?: {
    visitDate?: string;
    visitTime?: string;
    buyerName?: string;
    buyerPhone?: string;
  },
): string;

export function getWhatsAppPropertyUrl(
  property: WhatsAppPropertyInput,
  extra?: {
    visitDate?: string;
    visitTime?: string;
    buyerName?: string;
    buyerPhone?: string;
  },
): string;

export function openWhatsAppPropertyEnquiry(
  property: WhatsAppPropertyInput,
  options?: WhatsAppEnquiryOptions,
): Promise<void>;
