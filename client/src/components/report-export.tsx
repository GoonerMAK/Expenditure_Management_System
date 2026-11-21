import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ErrorState from './error-state';
import { CategoryBudget, ProjectBudget } from './interfaces';
import {
  downloadReport,
  ReportFormat,
  ReportPeriod,
  ReportSubject,
  UNCATEGORISED_REPORT_ID,
} from '../lib/download-report';

interface ReportExportProps {
  projects: Pick<ProjectBudget, 'project_id' | 'project_name'>[];
  categories: Pick<CategoryBudget, 'category_id' | 'category_name'>[];
}

interface ReportTarget {
  id: string;
  name: string;
}

const MIN_YEAR = 1900;
const MAX_YEAR = 9999;

const isValidYear = (year: string) => {
  if (year === '') {
    return true;
  }
  const value = Number(year);
  return Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR;
};

const ReportExport = ({ projects, categories }: ReportExportProps) => {
  const [subject, setSubject] = useState<ReportSubject>('projects');
  const [selectedId, setSelectedId] = useState('');
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [year, setYear] = useState('');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const targets: ReportTarget[] = subject === 'projects'
    ? projects.map(({ project_id, project_name }) => ({ id: project_id, name: project_name }))
    : categories.map(({ category_id, category_name }) => ({ id: category_id ?? UNCATEGORISED_REPORT_ID, name: category_name }));
  const targetId = targets.some((target) => target.id === selectedId) ? selectedId : targets[0]?.id ?? '';
  const targetLabel = subject === 'projects' ? 'Which project' : 'Which category';
  const yearIsValid = isValidYear(year);

  const changeSubject = (value: string) => {
    setSubject(value as ReportSubject);
    setSelectedId('');
  };

  const exportReport = async () => {
    setIsExporting(true);
    setHasFailed(false);
    try {
      await downloadReport({ subject, id: targetId, period, format, year });
    } catch {
      setHasFailed(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export report</CardTitle>
        <CardDescription>Download budget and spend by month or by year as a CSV or PDF file</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-subject">Report for</Label>
            <Select value={subject} onValueChange={changeSubject}>
              <SelectTrigger id="report-subject" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="projects">Project</SelectItem>
                <SelectItem value="categories">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-target">{targetLabel}</Label>
            <Select value={targetId} onValueChange={setSelectedId} disabled={targets.length === 0}>
              <SelectTrigger id="report-target" className="w-64">
                <SelectValue placeholder={subject === 'projects' ? 'No projects' : 'No categories'} />
              </SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>{target.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-period">Period</Label>
            <Select value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
              <SelectTrigger id="report-period" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-year">Year</Label>
            <Input
              id="report-year"
              type="number"
              inputMode="numeric"
              min={MIN_YEAR}
              max={MAX_YEAR}
              placeholder="All years"
              value={year}
              onChange={(event) => setYear(event.target.value.trim())}
              aria-invalid={!yearIsValid}
              className="w-32"
            />
            {!yearIsValid && <p className="text-sm text-destructive">Enter a year from {MIN_YEAR} to {MAX_YEAR}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-format">Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ReportFormat)}>
              <SelectTrigger id="report-format" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={exportReport} disabled={!targetId || !yearIsValid || isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          {hasFailed && <ErrorState message="Couldn't export the report. Please try again." />}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportExport;
