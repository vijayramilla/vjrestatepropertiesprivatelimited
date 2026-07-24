const SHEET_ID = '1N6jyzpp0KYK0eKLRfcCuq99dRWGeCc4BK3oJ5S_u1qc';

function excelSerialToDate(serial: number): string | null {
  if (!serial || serial < 40000) return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

function parseBudget(raw: string): { label: string; val: number } {
  const s = (raw || '').replace(/\s+/g, ' ').trim();
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  return { label: s || '—', val: isNaN(num) ? 0 : num };
}

export interface SheetClient {
  sno: number;
  name: string;
  phone: string;
  email: string;
  type: string;
  budget: string;
  budget_val: number;
  location: string;
  closed_price: string;
  closing_timeline: string;
  requirements: string;
  status: string;
  date: string | null;
  notes: string;
  buyer_comm_pct: string;
  buyer_comm_val: string;
  seller_comm_pct: string;
  seller_comm_val: string;
  total_comm: string;
  comm_status: string;
  my_share: string;
  source: string;
  updated_date: string;
}

export async function fetchSheetClients(): Promise<SheetClient[]> {
  // Use Google Visualization API — works cross-origin, no CORS issues
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch sheet: ${resp.status}`);
  }

  const text = await resp.text();

  // Strip the JSONP wrapper: /*O_o*/google.visualization.Query.setResponse(...)
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('Unexpected response format from Google Sheets');
  }

  const raw = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

  if (raw.status !== 'ok') {
    throw new Error(`Sheet error: ${raw.errors?.[0]?.message || raw.status}`);
  }

  const cols = raw.table.cols as { label: string }[];
  const rows = raw.table.rows as { c: ({ v: unknown } | null)[] }[];

  // Data rows start at index 4 (after title, filters, empty, header)
  const dataRows = rows.slice(4);

  return dataRows.map((row) => {
    const vals = row.c.map((cell) =>
      cell?.v != null ? String(cell.v) : '',
    );

    const get = (colLabel: string): string => {
      const idx = cols.findIndex((c) => c.label === colLabel);
      return idx >= 0 && idx < vals.length ? vals[idx] : '';
    };

    const sno = parseInt(get('S.No'), 10);
    const budget = parseBudget(get('Budget (₹)'));
    const dateRaw = parseFloat(get('Lead Date'));

    return {
      sno: isNaN(sno) ? 0 : sno,
      name: get('Client Name').trim(),
      phone: get('Phone Number').trim(),
      email: get('Email').trim(),
      type: get('Property Type') || 'PG Building',
      budget: budget.label,
      budget_val: budget.val,
      location: get('Preferred Location').trim(),
      closed_price: get('Closed Price (₹)').trim(),
      closing_timeline: get('Closing Timeline').trim(),
      requirements: get('Special Requirements').trim(),
      status: get('Lead Status') || 'New Lead',
      date: excelSerialToDate(dateRaw),
      notes: get('Notes').trim(),
      buyer_comm_pct: get('Buyer Comm %').trim(),
      buyer_comm_val: get('Buyer Comm (₹ L)').trim(),
      seller_comm_pct: get('Seller Comm %').trim(),
      seller_comm_val: get('Seller Comm (₹ L)').trim(),
      total_comm: get('Total Comm (₹ L)').trim(),
      comm_status: get('Comm. Status').trim(),
      my_share: get('My Share (₹ L)').trim(),
      source: get('Lead From').trim(),
      updated_date: get('Updated Date').trim(),
    };
  });
}
