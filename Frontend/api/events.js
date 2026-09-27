import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, slug, featured, category, search, status, org_id, organizer_id, limit } = req.query;
      if (id) {
        const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(data);
      }
      if (slug) {
        const { data, error } = await supabase.from('events').select('*').eq('slug', slug).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(data);
      }
      let q = supabase.from('events').select('*').order('start_at', { ascending: true });
      if (featured === 'true') q = q.eq('featured', true);
      if (category && category !== 'All') q = q.eq('category', category);
      if (status) q = q.eq('status', status);
      if (org_id) q = q.eq('org_id', org_id);
      if (organizer_id) q = q.eq('organizer_id', organizer_id);
      if (search) q = q.ilike('title', `%${search}%`);
      if (limit) q = q.limit(parseInt(limit, 10));
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const payload = { ...body, tags: body.tags || [], registered_count: 0 };
      const { data, error } = await supabase.from('events').insert(payload).select('*').single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase.from('events').update(updates).eq('id', id).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('events api error', err);
    res.status(500).json({ error: err.message });
  }
}
