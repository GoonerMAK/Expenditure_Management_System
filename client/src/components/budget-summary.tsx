import { BudgetSummary as Summary } from './interfaces';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatAmount, formatPercent } from '../lib/utils';

const BudgetSummary = ({ summary }: { summary: Summary }) => {
  const { overall } = summary;

  const tiles = [
    { title: 'Total Budget', value: formatAmount(overall.budget) },
    { title: 'Total Spent', value: formatAmount(overall.spent) },
    { title: 'Remaining', value: formatAmount(overall.remaining), negative: overall.remaining < 0 },
    { title: 'Budget Used', value: formatPercent(overall.percent_used) },
  ];

  return (
    <section aria-label="Budget summary" className="flex flex-col gap-2">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ title, value, negative }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${negative ? 'text-destructive' : ''}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {overall.over_budget_count > 0 && (
        <div>
          <Badge variant="destructive">
            {overall.over_budget_count} {overall.over_budget_count === 1 ? 'project' : 'projects'} over budget
          </Badge>
        </div>
      )}
    </section>
  );
};

export default BudgetSummary;
