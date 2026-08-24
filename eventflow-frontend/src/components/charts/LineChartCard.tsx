import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

interface Props {
  title: string;
  description?: string;
  data: Array<Record<string, any>>;
  dataKey: string;
  xKey: string;
  height?: number;
}

export function LineChartCard({ title, description, data, dataKey, xKey, height = 240 }: Props) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#18181b" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#18181b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} stroke="#a1a1aa" fontSize={12} />
            <YAxis tickLine={false} axisLine={false} stroke="#a1a1aa" fontSize={12} width={32} />
            <Tooltip
              contentStyle={{
                borderRadius: 6, border: '1px solid #e4e4e7', fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey={dataKey} stroke="#18181b" strokeWidth={2} fill="url(#grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
