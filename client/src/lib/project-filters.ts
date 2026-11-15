import { ProjectFilters, ProjectSort } from '../components/interfaces';

export const PROJECT_SORT_LABELS: Record<ProjectSort, string> = {
  name_asc: 'Name A-Z',
  name_desc: 'Name Z-A',
  start_date_desc: 'Start date newest',
  start_date_asc: 'Start date oldest',
  spend_desc: 'Total spend highest',
  spend_asc: 'Total spend lowest',
};

const FILTER_KEYS: (keyof ProjectFilters)[] = ['search', 'category', 'owner', 'from', 'to', 'sort'];

const isProjectSort = (value: string): value is ProjectSort => Object.keys(PROJECT_SORT_LABELS).includes(value);

export const readProjectFilters = (params: URLSearchParams): ProjectFilters => {
  const sort = params.get('sort') ?? '';
  return {
    search: params.get('search') ?? '',
    category: params.get('category') ?? '',
    owner: params.get('owner') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    sort: isProjectSort(sort) ? sort : '',
  };
};

export const getActiveFilters = (filters: ProjectFilters) => {
  const entries = Object.entries(filters).filter(([, value]) => value !== '');
  return Object.fromEntries(entries) as Partial<ProjectFilters>;
};

export const hasActiveFilters = (filters: ProjectFilters) => Object.keys(getActiveFilters(filters)).length > 0;

export const readPage = (params: URLSearchParams) => {
  const page = Number(params.get('page'));
  if (Number.isInteger(page) && page > 1) {
    return page;
  }
  return 1;
};

export const withPage = (params: URLSearchParams, page: number) => {
  const next = new URLSearchParams(params);
  if (page > 1) {
    next.set('page', String(page));
  } else {
    next.delete('page');
  }
  return next;
};

export const withFilter = (params: URLSearchParams, key: keyof ProjectFilters, value: string) => {
  const next = new URLSearchParams(params);
  if (value) {
    next.set(key, value);
  } else {
    next.delete(key);
  }
  next.delete('page');
  return next;
};

export const withoutFilters = (params: URLSearchParams) => {
  const next = new URLSearchParams(params);
  for (const key of FILTER_KEYS) {
    next.delete(key);
  }
  next.delete('page');
  return next;
};
