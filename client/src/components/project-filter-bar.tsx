import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Search } from 'lucide-react';

import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Category, ProjectFilters, ProjectOwner, ProjectSort } from './interfaces';
import { PROJECT_SORT_LABELS } from '../lib/project-filters';
import { cn } from '../lib/utils';

export const SEARCH_DELAY_MS = 300;

const ALL = 'all';

const SORT_OPTIONS = Object.keys(PROJECT_SORT_LABELS) as ProjectSort[];

interface DateFilterProps {
  label: string;
  value: string;
  otherValue: string;
  onChange: (value: string) => void;
  isDisabled: (date: Date) => boolean;
}

const toDate = (value: string) => (value ? parseISO(value) : undefined);

const DateFilter = ({ label, value, otherValue, onChange, isDisabled }: DateFilterProps) => {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const openingMonth = selected ?? toDate(otherValue);

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? format(date, 'yyyy-MM-dd') : '');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={label}
          className={cn('w-full justify-start text-left font-normal sm:w-44', !selected && 'text-muted-foreground')}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
          {selected ? format(selected, 'd MMM yyyy') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selected} defaultMonth={openingMonth} onSelect={handleSelect} disabled={isDisabled} initialFocus />
      </PopoverContent>
    </Popover>
  );
};

interface ProjectFilterBarProps {
  filters: ProjectFilters;
  categories: Category[];
  owners: ProjectOwner[];
  onChange: (key: keyof ProjectFilters, value: string) => void;
  onClear: () => void;
  canClear: boolean;
}

const ProjectFilterBar = ({ filters, categories, owners, onChange, onClear, canClear }: ProjectFilterBarProps) => {
  const [searchText, setSearchText] = useState(filters.search);

  useEffect(() => {
    setSearchText(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (searchText === filters.search) {
      return;
    }
    const timer = setTimeout(() => onChange('search', searchText), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, filters.search, onChange]);

  const isBeforeFrom = (date: Date) => Boolean(filters.from) && date < parseISO(filters.from);
  const isAfterTo = (date: Date) => Boolean(filters.to) && date > parseISO(filters.to);

  return (
    <div role="search" aria-label="Project filters" className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full md:w-2/3 lg:w-1/3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="w-full appearance-none bg-background pl-8 shadow-none"
          />
        </div>
        <Button variant="ghost" onClick={onClear} disabled={!canClear}>
          Clear filters
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={filters.category || ALL} onValueChange={(value) => onChange('category', value === ALL ? '' : value)}>
          <SelectTrigger aria-label="Category" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>{category.category_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.owner || ALL} onValueChange={(value) => onChange('owner', value === ALL ? '' : value)}>
          <SelectTrigger aria-label="Owner" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All owners</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>{owner.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateFilter label="From date" value={filters.from} otherValue={filters.to} onChange={(value) => onChange('from', value)} isDisabled={isAfterTo} />
        <DateFilter label="To date" value={filters.to} otherValue={filters.from} onChange={(value) => onChange('to', value)} isDisabled={isBeforeFrom} />
        <Select value={filters.sort} onValueChange={(value) => onChange('sort', value)}>
          <SelectTrigger aria-label="Sort" className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((sort) => (
              <SelectItem key={sort} value={sort}>{PROJECT_SORT_LABELS[sort]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ProjectFilterBar;
