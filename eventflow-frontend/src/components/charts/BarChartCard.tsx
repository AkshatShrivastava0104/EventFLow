import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

interface Props {
  title: string;
  description?: string;
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

const DEFAULT_COLOR = '#2563eb';

export function BarChartCard({ title, description, data, height = 260 }: Props) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <Card>
      <CardHeader className="mb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      {!hasData ? (
        <div style={{ height }} className="grid place-items-center">
          <EmptyState title="No data yet" description="Data will appear here once activity begins." />
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#a1a1aa' }}
                axisLine={{ stroke: '#e4e4e7' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#a1a1aa' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: '#f4f4f5' }}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e4e4e7',
                  fontSize: 12,
                  boxShadow: '0 8px 24px -4px rgba(0,0,0,0.08)',
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color ?? DEFAULT_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
