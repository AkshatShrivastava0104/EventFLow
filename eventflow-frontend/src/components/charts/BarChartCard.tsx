import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

interface Props {
  title: string;
  description?: string;
  data: Array<Record<string, any>>;
  dataKey: string;
  xKey: string;
  height?: number;
}

export function BarChartCard({ title, description, data, dataKey, xKey, height = 240 }: Props) {
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
          <BarChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} stroke="#a1a1aa" fontSize={12} />
            <YAxis tickLine={false} axisLine={false} stroke="#a1a1aa" fontSize={12} width={32} />
            <Tooltip
              contentStyle={{
                borderRadius: 6, border: '1px solid #e4e4e7', fontSize: 12,
              }}
            />
            <Bar dataKey={dataKey} fill="#18181b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
