import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

interface Props {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
}

const DEFAULT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

export function LineChartCard({
  title,
  description,
  data,
  xKey,
  series,
  height = 260,
}: Props) {
  return (
    <Card>
      <CardHeader className="mb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      {data.length === 0 ? (
        <div style={{ height }} className="grid place-items-center">
          <EmptyState title="No data yet" description="Data will appear here once activity begins." />
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey={xKey}
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
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e4e4e7',
                  fontSize: 12,
                  boxShadow: '0 8px 24px -4px rgba(0,0,0,0.08)',
                }}
              />
              {series.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
