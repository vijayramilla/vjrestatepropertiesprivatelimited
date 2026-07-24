import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eimvaxrmiizdlgonhiov.supabase.co',
  process.env.VITE_SUPABASE_REQ_SERVICE_KEY ?? '',
);

const API_KEY = 'vjr-lead-webhook-key-2026';

async function generateLeadId(): Promise<string> {
  const { data } = await supabase
    .from('leads')
    .select('lead_id')
    .like('lead_id', 'LEAD-%')
    .order('lead_id', { ascending: false })
    .limit(1);
  let seq = 1;
  if (data && data.length > 0) {
    const num = parseInt(data[0].lead_id.replace('LEAD-', ''), 10);
    seq = num + 1;
  }
  return `LEAD-${seq.toString().padStart(6, '0')}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers['x-api-key'];
  if (!auth || auth !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, phone, email, requirement } = body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    const cleanPhone = phone.replace(/[\s-]/g, '');
    const { data: existing } = await supabase.from('leads').select('lead_id').eq('phone', cleanPhone).maybeSingle();
    if (existing) {
      return res.status(200).json({ message: 'Duplicate lead', leadId: existing.lead_id });
    }

    const leadId = await generateLeadId();

    const { data: lead, error } = await supabase.from('leads').insert({
      lead_id: leadId,
      name: name.trim(),
      phone: cleanPhone,
      email: email?.trim() ?? '',
      lead_source: 'Google Form',
      status: 'New Lead',
      priority: 'Medium',
      requirement: {
        selfPurchase: requirement?.selfPurchase ?? '',
        propertyType: requirement?.propertyType ?? '',
        preferredLocation: requirement?.preferredLocation ?? '',
        budget: requirement?.budget ?? '',
        paymentMode: requirement?.paymentMode ?? '',
        timeline: requirement?.timeline ?? '',
        specialRequirements: requirement?.specialRequirements ?? '',
      },
    }).select('id').single();

    if (error) throw error;

    await supabase.from('activity_logs').insert({
      lead_id: lead.id,
      action: 'lead_created',
      description: 'Lead created from Google Form',
      performed_by: 'Google Form',
    });

    await supabase.from('notifications').insert({
      lead_id: lead.id,
      message: `New lead from Google Form: ${name}`,
      type: 'new_lead',
    });

    return res.status(201).json({ message: 'Lead created', leadId });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
