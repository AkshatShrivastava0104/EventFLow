import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { org_id } = req.query;
    let evQ = supabase.from('events').select('*');
    if (org_id) evQ = evQ.eq('org_id', org_id);
    const { data: events } = await evQ;

    const eventIds = (events || []).map((e) => e.id);
    let regs = [];
    if (eventIds.length) {
      const { data } = await supabase.from('registrations').select('*').in('event_id', eventIds);
      regs = data || [];
    }
    let ticketRows = [];
    if (regs.length) {
      const regIds = regs.map((r) => r.id);
      const { data } = await supabase.from('tickets').select('*').in('registration_id', regIds);
      ticketRows = data || [];
    }

    const totalRevenue = regs
      .filter((r) => r.payment_status === 'paid')
      .reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const totalRegistrations = regs.filter((r) => r.status === 'confirmed').length;
    const totalAttendees = ticketRows.filter((t) => t.checked_in).length;
    const upcoming = (events || []).filter((e) => new Date(e.start_at) > new Date() && e.status === 'published').length;
    const draft = (events || []).filter((e) => e.status === 'draft').length;
    const published = (events || []).filter((e) => e.status === 'published').length;
    const totalTickets = ticketRows.length;

    // revenue by month (last 6)
    const monthly = {};
    regs.forEach((r) => {
      const d = new Date(r.created_at);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthly[key] = monthly[key] || { name: key, revenue: 0, registrations: 0 };
      monthly[key].registrations += 1;
      if (r.payment_status === 'paid') monthly[key].revenue += Number(r.total_amount || 0);
    });
    const monthlyArr = Object.values(monthly).slice(-6);

    // top events by registrations
    const evMap = Object.fromEntries((events || []).map((e) => [e.id, e]));
    const perEvent = {};
    regs.forEach((r) => { perEvent[r.event_id] = (perEvent[r.event_id] || 0) + 1; });
    const topEvents = Object.entries(perEvent)
      .map(([id, count]) => ({ id: Number(id), title: evMap[id]?.title || 'Unknown', count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    // category distribution
    const catCounts = {};
    (events || []).forEach((e) => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
    const categories = Object.entries(catCounts).map(([name, value]) => ({ name, value }));

    res.status(200).json({
      totals: { revenue: totalRevenue, registrations: totalRegistrations, attendees: totalAttendees, upcoming, draft, published, tickets: totalTickets, events: (events || []).length },
      monthly: monthlyArr,
      topEvents,
      categories,
    });
  } catch (err) {
    console.error('stats api error', err);
    res.status(500).json({ error: err.message });
  }
}
