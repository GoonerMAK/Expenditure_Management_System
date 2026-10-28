import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from './ui/button';
import ErrorState from './error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { formatAmount } from '../lib/utils';

export interface BudgetChartPoint {
  label: string;
  budget: number;
  spent: number;
}

interface BudgetChartProps {
  title: string;
  description?: string;
  data: BudgetChartPoint[];
  emptyMessage: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  // Horizontal bars keep every label readable when there are many named items
  horizontal?: boolean;
}

const SERIES = [
  { key: 'budget', name: 'Budget', color: 'var(--chart-budget)' },
  { key: 'spent', name: 'Spent', color: 'var(--chart-spent)' },
] as const;

const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };

const BudgetChart = ({ title, description, data, emptyMessage, isLoading, isError, onRetry, horizontal }: BudgetChartProps) => {
  const [showTable, setShowTable] = useState(false);
  const chartHeight = horizontal ? Math.max(288, data.length * 56 + 64) : 288;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {!isLoading && !isError && data.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowTable(!showTable)}>
            {showTable ? 'Show chart' : 'Show table'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading...</p>
        ) : isError ? (
          <ErrorState message="Couldn't load this chart. Please try again." onRetry={onRetry} className="flex-col py-12 text-center" />
        ) : data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : showTable ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((point) => (
                <TableRow key={point.label}>
                  <TableCell className="font-medium">{point.label}</TableCell>
                  <TableCell className="text-right">{formatAmount(point.budget)}</TableCell>
                  <TableCell className="text-right">{formatAmount(point.spent)}</TableCell>
                  <TableCell className="text-right">{formatAmount(point.budget - point.spent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div style={{ height: chartHeight }} role="img" aria-label={`${title}: budget and spent`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout={horizontal ? 'vertical' : 'horizontal'}
                barGap={2}
                barCategoryGap="25%"
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={!!horizontal} horizontal={!horizontal} stroke="hsl(var(--border))" />
                {horizontal ? (
                  <>
                    <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatAmount} tick={AXIS_TICK} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={140}
                      interval={0}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tick={AXIS_TICK}
                    />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} tick={AXIS_TICK} />
                    <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={formatAmount} tick={AXIS_TICK} />
                  </>
                )}
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  formatter={(value: number) => formatAmount(value)}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 600 }}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                />
                {SERIES.map(({ key, name, color }) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={name}
                    fill={color}
                    radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                    barSize={horizontal ? 16 : 24}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetChart;
