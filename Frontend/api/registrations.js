import supabase from './db-client.js';

function genCode() {
  return 'TKT-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, user_id, event_id, org_id, status } = req.query;
      if (id) {
        const { data, error } = await supabase.from('registrations').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Not found' });
        // enrich with event
        const { data: ev } = await supabase.from('events').select('*').eq('id', data.event_id).maybeSingle();
        return res.status(200).json({ ...data, event: ev });
      }
      let q = supabase.from('registrations').select('*').order('created_at', { ascending: false });
      if (user_id) q = q.eq('user_id', user_id);
      if (event_id) q = q.eq('event_id', event_id);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      // enrich with event snippet
      const eventIds = [...new Set((data || []).map((r) => r.event_id))];
      let evMap = {};
      if (eventIds.length) {
        const { data: evs } = await supabase.from('events').select('*').in('id', eventIds);
        (evs || []).forEach((e) => { evMap[e.id] = e; });
      }
      let filtered = data || [];
      if (org_id) filtered = filtered.filter((r) => evMap[r.event_id] && String(evMap[r.event_id].org_id) === String(org_id));
      return res.status(200).json(filtered.map((r) => ({ ...r, event: evMap[r.event_id] || null })));
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const {
        event_id, user_id, user_email, user_name, user_phone,
        ticket_type = 'General', quantity = 1, total_amount = 0,
        payment_status = 'free', payment_id = null, status,
      } = body;
      if (!event_id || !user_email) return res.status(400).json({ error: 'event_id and user_email required' });

      // capacity check
      const { data: ev } = await supabase.from('events').select('*').eq('id', event_id).maybeSingle();
      if (!ev) return res.status(404).json({ error: 'Event not found' });
      const isWaitlist = ev.capacity > 0 && ev.registered_count + quantity > ev.capacity;

      const regStatus = status || (isWaitlist ? 'waitlist' : 'confirmed');

      const { data: reg, error } = await supabase.from('registrations').insert({
        event_id, user_id, user_email, user_name, user_phone,
        ticket_type, quantity, total_amount, payment_status, payment_id,
        status: regStatus,
      }).select('*').single();
      if (error) throw error;

      let tickets = [];
      if (regStatus === 'confirmed') {
        const rows = Array.from({ length: quantity }).map(() => ({
          registration_id: reg.id,
          ticket_code: genCode(),
          attendee_name: user_name,
          attendee_email: user_email,
          checked_in: false,
        }));
        const { data: t } = await supabase.from('tickets').insert(rows).select('*');
        tickets = t || [];

        await supabase.from('events').update({ registered_count: ev.registered_count + quantity }).eq('id', event_id);

        // notify
        if (user_id) {
          await supabase.from('notifications').insert({
            user_id,
            title: `You're in — ${ev.title}`,
            message: `Your ${quantity} ticket${quantity > 1 ? 's are' : ' is'} confirmed. See you at ${ev.venue}.`,
            type: 'success',
            link: `/registrations/${reg.id}`,
            read: false,
          });
        }
      } else if (regStatus === 'waitlist') {
        // create waitlist entries
        const { count } = await supabase.from('waitlist').select('*', { count: 'exact', head: true }).eq('event_id', event_id);
        await supabase.from('waitlist').insert({
          event_id, user_id, user_email, user_name,
          position: (count || 0) + 1,
        });
        if (user_id) {
          await supabase.from('notifications').insert({
            user_id,
            title: `Waitlisted for ${ev.title}`,
            message: `Event is at capacity. We'll notify you if a spot opens up.`,
            type: 'info', link: `/registrations/${reg.id}`, read: false,
          });
        }
      }
      return res.status(201).json({ registration: reg, tickets });
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase.from('registrations').update(updates).eq('id', id).select('*').single();
      if (error) throw error;
      // if cancelled, decrement event registered_count
      if (updates.status === 'cancelled') {
        const { data: ev } = await supabase.from('events').select('*').eq('id', data.event_id).maybeSingle();
        if (ev) await supabase.from('events').update({ registered_count: Math.max(0, ev.registered_count - data.quantity) }).eq('id', ev.id);
      }
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('registrations api error', err);
    res.status(500).json({ error: err.message });
  }
}
