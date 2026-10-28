import { useState } from 'react';
import PageLayout from '../components/page-layout';
import BudgetChart from '../components/budget-chart';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useGetBudgetByCategoryQuery, useGetBudgetSummaryQuery, useGetProjectTrendQuery } from '../redux/project-api';

const monthLabel = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const Analytics = () => {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Data can change on other pages, so refetch whenever Analytics opens
  const categoriesQuery = useGetBudgetByCategoryQuery(undefined, { refetchOnMountOrArgChange: true });
  const summaryQuery = useGetBudgetSummaryQuery(undefined, { refetchOnMountOrArgChange: true });

  const categories = categoriesQuery.data ?? [];
  const projects = summaryQuery.data?.projects ?? [];
  const projectId = selectedProjectId || projects[0]?.project_id || '';
  const trendQuery = useGetProjectTrendQuery(projectId, { skip: !projectId, refetchOnMountOrArgChange: true });
  const trend = trendQuery.data;

  const categoryData = categories.map(({ category_name, budget, spent }) => ({ label: category_name, budget, spent }));
  const trendData = period === 'monthly'
    ? (trend?.monthly ?? []).map(({ year, month, budget, spent }) => ({ label: monthLabel(year, month), budget, spent }))
    : (trend?.yearly ?? []).map(({ year, budget, spent }) => ({ label: String(year), budget, spent }));

  return (
    <PageLayout>
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <h1 className="text-lg font-semibold md:text-2xl">Analytics</h1>

        <BudgetChart
          title="Spending by category"
          description="Total budget and spend of all projects in each category"
          data={categoryData}
          emptyMessage="No categories with projects yet."
          horizontal
          isLoading={categoriesQuery.isLoading}
          isError={categoriesQuery.isError}
          onRetry={categoriesQuery.refetch}
        />

        {summaryQuery.isError ? (
          <BudgetChart
            title="Budget vs spent by project"
            data={[]}
            emptyMessage=""
            isError
            onRetry={summaryQuery.refetch}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="trend-project">Project</Label>
                <select
                  id="trend-project"
                  value={projectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={projects.length === 0}
                  className="h-10 w-64 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {projects.map((project) => (
                    <option key={project.project_id} value={project.project_id}>{project.project_name}</option>
                  ))}
                </select>
              </div>
              <Tabs value={period} onValueChange={(value) => setPeriod(value as 'monthly' | 'yearly')}>
                <TabsList>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <BudgetChart
              title={`${period === 'monthly' ? 'Monthly' : 'Yearly'} budget vs spent`}
              description={trend?.project_name}
              data={trendData}
              emptyMessage={projects.length === 0 ? 'No projects yet.' : 'No financial data for this project yet.'}
              isLoading={summaryQuery.isLoading || trendQuery.isLoading}
              isError={trendQuery.isError}
              onRetry={trendQuery.refetch}
            />
          </>
        )}
      </main>
    </PageLayout>
  );
};

export default Analytics;
