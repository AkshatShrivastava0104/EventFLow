import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, owner_id } = req.query;
      if (id) {
        const { data, error } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return res.status(200).json(data);
      }
      let q = supabase.from('organizations').select('*').order('id');
      if (owner_id) q = q.eq('owner_id', owner_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { data, error } = await supabase.from('organizations').insert(req.body).select('*').single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      const { data, error } = await supabase.from('organizations').update(updates).eq('id', id).select('*').single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orgs api error', err);
    res.status(500).json({ error: err.message });
  }
}
