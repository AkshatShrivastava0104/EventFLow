import { useQuery } from '@tanstack/react-query';
import { StatsAPI } from '../../lib/queries';
import { StatCard } from '../../components/ui/StatCard';
import { fmtMoney } from '../../lib/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function Analytics() {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => StatsAPI.overview() });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">Analytics</h2>
          <p className="text-sm text-ink-500">Deep dive into your event performance.</p>
        </div>
        <div className="flex gap-2 text-xs">
          {['7 days', '30 days', '90 days', '12 months'].map((r, i) => (
            <button key={r} className={`rounded-full px-3 py-1 font-semibold ${i === 1 ? 'bg-ink-900 text-white' : 'bg-white border border-ink-200'}`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross revenue" value={fmtMoney(stats?.totals?.revenue || 0)} delta="⬆ 12.5%" tone="positive" />
        <StatCard label="Ticket sales" value={stats?.totals?.tickets || 0} delta="⬆ 8.4%" tone="positive" />
        <StatCard label="Avg. ticket price" value={fmtMoney((stats?.totals?.revenue || 0) / Math.max(1, stats?.totals?.tickets || 1))} delta="⬇ 1.2%" tone="negative" />
        <StatCard label="Show-up rate" value={`${Math.round((stats?.totals?.attendees / Math.max(1, stats?.totals?.tickets)) * 100) || 0}%`} delta="Industry avg 68%" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <h3 className="font-display text-lg font-semibold">Revenue trend</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={stats?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
                <XAxis dataKey="name" tick={{ fill: '#7c8894', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7c8894', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eef0f2', fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <h3 className="font-display text-lg font-semibold">Registrations by month</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={stats?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
                <XAxis dataKey="name" tick={{ fill: '#7c8894', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7c8894', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eef0f2', fontSize: 12 }} />
                <Bar dataKey="registrations" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <h3 className="font-display text-lg font-semibold">Top events</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <BarChart data={stats?.topEvents || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#7c8894', fontSize: 12 }} />
              <YAxis dataKey="title" type="category" tick={{ fill: '#2b333d', fontSize: 12 }} width={200} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eef0f2', fontSize: 12 }} />
              <Bar dataKey="count" fill="#f97316" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
