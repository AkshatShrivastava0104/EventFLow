import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      let q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
      if (user_id) q = q.eq('user_id', user_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { data, error } = await supabase.from('notifications').insert({ read: false, ...req.body }).select('*').single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, user_id, all, ...updates } = req.body || {};
      if (all && user_id) {
        const { error } = await supabase.from('notifications').update(updates).eq('user_id', user_id);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase.from('notifications').update(updates).eq('id', id).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('notifications api error', err);
    res.status(500).json({ error: err.message });
  }
}
