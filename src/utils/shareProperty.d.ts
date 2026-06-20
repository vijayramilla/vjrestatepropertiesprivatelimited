export type SharePropertyInput = {
  id: string | number;
  title: string;
  type?: string;
  area?: string;
  price_label?: string;
  monthly_rental?: number | string;
  monthly_rental_label?: string;
};

export type SharePropertyResult = 'shared' | 'whatsapp' | 'copied' | 'cancelled' | 'failed';

export function shareProperty(property: SharePropertyInput): Promise<SharePropertyResult>;
