import type { Category, FinancialData, Permission, Project, Role, User } from '@prisma/client';

export const ID = '3f1c2a4e-8b7d-4c6a-9e2f-1a2b3c4d5e6f';
export const OTHER_ID = '7a9b8c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
export const NOW = new Date('2026-01-15T10:00:00.000Z');

export const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: ID,
  category_name: 'Infrastructure',
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

export const buildRole = (overrides: Partial<Role> = {}): Role => ({
  id: ID,
  role_name: 'Contributor',
  permission_id: null,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

export const buildPermission = (overrides: Partial<Permission> = {}): Permission => ({
  id: ID,
  permission_name: 'create_project',
  role_id: null,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

export const buildUser = (overrides: Partial<User> = {}): User => ({
  id: ID,
  username: 'jdoe',
  password: '$2b$10$hashedpasswordvalue',
  email: 'jdoe@example.com',
  name: 'John Doe',
  age: '30',
  gender: 'Male',
  nationality: 'Bangladeshi',
  role_id: OTHER_ID,
  role_name: 'Contributor',
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

export const buildProject = (overrides: Partial<Project> = {}): Project => ({
  id: ID,
  project_name: 'Bridge Renovation',
  description: 'Renovate the river bridge',
  category_id: OTHER_ID,
  category_name: 'Infrastructure',
  start_date: new Date('2026-02-01T00:00:00.000Z'),
  end_date: new Date('2026-12-31T00:00:00.000Z'),
  created_by_id: OTHER_ID,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

export const buildFinancialData = (overrides: Partial<FinancialData> = {}): FinancialData => ({
  id: ID,
  year: 2026,
  month: 3,
  expenditure: 1500.5,
  initial_budget: 10000,
  revised_budget: 12000,
  project_id: OTHER_ID,
  project_name: 'Bridge Renovation',
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});
