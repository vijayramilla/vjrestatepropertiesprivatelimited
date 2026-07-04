import { Client } from '@notionhq/client';
import type { PageObjectResponse, QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import admin from 'firebase-admin';
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface NotionPropertyMapping {
  title: string;
  type: string;
  commercial_subtype: string;
  plot_subtype: string;
  area: string;
  location: string;
  price: string;
  monthly_rental: string;
  area_sqft: string;
  area_unit: string;
  area_acres: string;
  area_guntas: string;
  price_per_sqft: string;
  built_up_area_sqft: string;
  dimensions: string;
  floor_count: string;
  total_units: string;
  available_units: string;
  occupancy_percent: string;
  facing: string;
  age: string;
  status: string;
  featured: string;
  bbmp_approved: string;
  bank_loan_eligible: string;
  clear_title: string;
  katha: string;
  highlights: string;
  amenities: string;
  description: string;
  images: string;
}

const DEFAULT_MAPPING: NotionPropertyMapping = {
  title: 'Title',
  type: 'Type',
  commercial_subtype: 'Commercial Subtype',
  plot_subtype: 'Plot Subtype',
  area: 'Area',
  location: 'Location',
  price: 'Price',
  monthly_rental: 'Monthly Rental',
  area_sqft: 'Area Sqft',
  area_unit: 'Area Unit',
  area_acres: 'Area Acres',
  area_guntas: 'Area Guntas',
  price_per_sqft: 'Price Per Sqft',
  built_up_area_sqft: 'Built Up Area Sqft',
  dimensions: 'Dimensions',
  floor_count: 'Floor Count',
  total_units: 'Total Units',
  available_units: 'Available Units',
  occupancy_percent: 'Occupancy Percent',
  facing: 'Facing',
  age: 'Age',
  status: 'Status',
  featured: 'Featured',
  bbmp_approved: 'BBMP Approved',
  bank_loan_eligible: 'Bank Loan Eligible',
  clear_title: 'Clear Title',
  katha: 'Katha',
  highlights: 'Highlights',
  amenities: 'Amenities',
  description: 'Description',
  images: 'Images',
};

function extractNotionValue(property: PageObjectResponse['properties'][string]): unknown {
  if (!property) return undefined;

  switch (property.type) {
    case 'title':
      return 'title' in property ? (property as any).title.map((t: any) => t.plain_text).join('') : undefined;
    case 'rich_text':
      return 'rich_text' in property ? (property as any).rich_text.map((t: any) => t.plain_text).join('') : undefined;
    case 'number':
      return 'number' in property ? (property as any).number : undefined;
    case 'select':
      return 'select' in property ? (property as any).select?.name ?? null : undefined;
    case 'multi_select':
      return 'multi_select' in property ? (property as any).multi_select.map((s: any) => s.name) : undefined;
    case 'checkbox':
      return 'checkbox' in property ? (property as any).checkbox : undefined;
    case 'date':
      return 'date' in property ? (property as any).date?.start ?? null : undefined;
    case 'email':
      return 'email' in property ? (property as any).email ?? undefined : undefined;
    case 'phone_number':
      return 'phone_number' in property ? (property as any).phone_number ?? undefined : undefined;
    case 'url':
      return 'url' in property ? (property as any).url ?? undefined : undefined;
    case 'status':
      return 'status' in property ? (property as any).status?.name ?? null : undefined;
    default:
      return undefined;
  }
}

function mapNotionPageToFirestore(
  page: PageObjectResponse,
  mapping: NotionPropertyMapping,
): Record<string, unknown> {
  const props = page.properties;
  const doc: Record<string, unknown> = {};

  const fieldMap: [string, string][] = [
    ['title', mapping.title],
    ['type', mapping.type],
    ['commercial_subtype', mapping.commercial_subtype],
    ['plot_subtype', mapping.plot_subtype],
    ['area', mapping.area],
    ['location', mapping.location],
    ['price', mapping.price],
    ['monthly_rental', mapping.monthly_rental],
    ['area_sqft', mapping.area_sqft],
    ['area_unit', mapping.area_unit],
    ['area_acres', mapping.area_acres],
    ['area_guntas', mapping.area_guntas],
    ['price_per_sqft', mapping.price_per_sqft],
    ['built_up_area_sqft', mapping.built_up_area_sqft],
    ['dimensions', mapping.dimensions],
    ['floor_count', mapping.floor_count],
    ['total_units', mapping.total_units],
    ['available_units', mapping.available_units],
    ['occupancy_percent', mapping.occupancy_percent],
    ['facing', mapping.facing],
    ['age', mapping.age],
    ['status', mapping.status],
    ['featured', mapping.featured],
    ['bbmp_approved', mapping.bbmp_approved],
    ['bank_loan_eligible', mapping.bank_loan_eligible],
    ['clear_title', mapping.clear_title],
    ['katha', mapping.katha],
    ['highlights', mapping.highlights],
    ['amenities', mapping.amenities],
    ['description', mapping.description],
    ['images', mapping.images],
  ];

  for (const [field, columnName] of fieldMap) {
    if (!columnName) continue;
    const propValue = props[columnName];
    if (!propValue) continue;
    const value = extractNotionValue(propValue);
    if (value !== undefined && value !== null) {
      doc[field] = value;
    }
  }

  doc.listed_days_ago = 1;
  doc.createdAt = admin.firestore.FieldValue.serverTimestamp();

  return doc;
}

async function fetchAllPages(notion: Client, databaseId: string): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response: QueryDatabaseResponse = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const result of response.results) {
      if (result.object === 'page' && 'properties' in result) {
        pages.push(result as PageObjectResponse);
      }
    }

    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  return pages;
}

function initFirebaseAdmin(): void {
  if (admin.apps.length > 0) return;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'),
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
  }
}

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const syncSecret = process.env.SYNC_SECRET;
  const authHeader = event.headers['authorization'];
  if (syncSecret) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== syncSecret) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!notionApiKey || !notionDatabaseId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing NOTION_API_KEY or NOTION_DATABASE_ID environment variables' }),
    };
  }

  try {
    initFirebaseAdmin();

    const db = admin.firestore();
    const notion = new Client({ auth: notionApiKey });

    const overrideMappingStr = process.env.NOTION_COLUMN_MAPPING;
    const mapping: NotionPropertyMapping = overrideMappingStr
      ? { ...DEFAULT_MAPPING, ...JSON.parse(overrideMappingStr) }
      : DEFAULT_MAPPING;

    const pages = await fetchAllPages(notion, notionDatabaseId);
    const results = { synced: 0, skipped: 0, errors: 0, total: pages.length, details: [] as string[] };

    const batch = db.batch();
    const propertiesRef = db.collection('properties');
    let ops = 0;

    for (const page of pages) {
      try {
        const titleValue = extractNotionValue(page.properties[mapping.title]);
        const docData = mapNotionPageToFirestore(page, mapping);
        const docId = page.id.replace(/-/g, '');
        const docRef = propertiesRef.doc(docId);

        batch.set(docRef, docData, { merge: true });
        ops++;
        results.synced++;
        results.details.push(`✓ ${titleValue ?? docId}`);

        if (ops >= 500) {
          await batch.commit();
          ops = 0;
        }
      } catch (err) {
        results.errors++;
        results.details.push(`✗ ${page.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Sync completed',
        results,
      }),
    };
  } catch (err) {
    console.error('Sync error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
    };
  }
};
