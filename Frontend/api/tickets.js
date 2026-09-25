import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, registration_id, user_id, code, event_id } = req.query;
      if (id) {
        const { data, error } = await supabase.from('tickets').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Not found' });
        const { data: reg } = await supabase.from('registrations').select('*').eq('id', data.registration_id).maybeSingle();
        const { data: ev } = reg ? await supabase.from('events').select('*').eq('id', reg.event_id).maybeSingle() : { data: null };
        return res.status(200).json({ ...data, registration: reg, event: ev });
      }
      if (code) {
        const { data, error } = await supabase.from('tickets').select('*').eq('ticket_code', code).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Ticket not found' });
        const { data: reg } = await supabase.from('registrations').select('*').eq('id', data.registration_id).maybeSingle();
        const { data: ev } = reg ? await supabase.from('events').select('*').eq('id', reg.event_id).maybeSingle() : { data: null };
        return res.status(200).json({ ...data, registration: reg, event: ev });
      }
      let q = supabase.from('tickets').select('*').order('id', { ascending: false });
      if (registration_id) q = q.eq('registration_id', registration_id);
      const { data, error } = await q;
      if (error) throw error;
      let list = data || [];
      if (user_id || event_id) {
        const regIds = [...new Set(list.map((t) => t.registration_id))];
        if (regIds.length) {
          const { data: regs } = await supabase.from('registrations').select('*').in('id', regIds);
          const regMap = {};
          (regs || []).forEach((r) => { regMap[r.id] = r; });
          if (user_id) list = list.filter((t) => regMap[t.registration_id]?.user_id === user_id);
          if (event_id) list = list.filter((t) => String(regMap[t.registration_id]?.event_id) === String(event_id));
          list = list.map((t) => ({ ...t, registration: regMap[t.registration_id] }));
          const evIds = [...new Set(list.map((t) => t.registration?.event_id).filter(Boolean))];
          if (evIds.length) {
            const { data: evs } = await supabase.from('events').select('*').in('id', evIds);
            const evMap = {};
            (evs || []).forEach((e) => { evMap[e.id] = e; });
            list = list.map((t) => ({ ...t, event: evMap[t.registration?.event_id] || null }));
          }
        }
      }
      return res.status(200).json(list);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase.from('tickets').update(updates).eq('id', id).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('tickets api error', err);
    res.status(500).json({ error: err.message });
  }
}
