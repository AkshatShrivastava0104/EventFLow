import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { code, staff_id } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code required' });
    const { data: ticket, error } = await supabase.from('tickets').select('*').eq('ticket_code', code).maybeSingle();
    if (error) throw error;
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.checked_in) {
      const { data: reg } = await supabase.from('registrations').select('*').eq('id', ticket.registration_id).maybeSingle();
      const { data: ev } = reg ? await supabase.from('events').select('*').eq('id', reg.event_id).maybeSingle() : { data: null };
      return res.status(200).json({ ...ticket, event: ev, registration: reg, already: true });
    }
    const { data: updated } = await supabase.from('tickets').update({
      checked_in: true, checked_in_at: new Date().toISOString(),
    }).eq('id', ticket.id).select('*').single();
    const { data: reg } = await supabase.from('registrations').select('*').eq('id', updated.registration_id).maybeSingle();
    const { data: ev } = reg ? await supabase.from('events').select('*').eq('id', reg.event_id).maybeSingle() : { data: null };
    return res.status(200).json({ ...updated, event: ev, registration: reg });
  } catch (err) {
    console.error('checkin api error', err);
    res.status(500).json({ error: err.message });
  }
}
