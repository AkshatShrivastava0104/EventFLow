import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PaymentsAPI } from '../../lib/queries';
import { fmtMoney } from '../../lib/utils';

export function RevenueChart({
  organizationId,
}: {
  organizationId: number | string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['organization-payments', organizationId],
    queryFn: () => PaymentsAPI.organization(organizationId),
    enabled: Boolean(organizationId),
    staleTime: 60_000,
  });

  const monthlyRevenue = Array.isArray(data?.monthly_revenue)
    ? data.monthly_revenue
    : [];

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-900">Ticket revenue</h3>
          <p className="mt-1 text-xs text-ink-500">Successful paid-event registrations · last 12 months</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Total revenue</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-900">
            {fmtMoney(Number(data?.revenue ?? 0))}
          </p>
        </div>
      </div>
      <div className="mt-4 h-64">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">Loading revenue…</div>
        ) : isError ? (
          <div className="flex h-full items-center justify-center text-sm text-red-600">Revenue data could not be loaded.</div>
        ) : monthlyRevenue.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#7c8894', fontSize: 11 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#7c8894', fontSize: 11 }}
                tickFormatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
              />
              <Tooltip
                formatter={(value) => [fmtMoney(Number(value)), 'Revenue']}
                contentStyle={{ borderRadius: 12, border: '1px solid #eef0f2', fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">No paid-event revenue yet.</div>
        )}
      </div>
    </section>
  );
}
