export interface Category {
    id: string;
    category_name: string;
    created_at: string;
    updated_at: string;
}

export interface FinancialData {
    year: number;
    month: number;
    expenditure: number;
    initial_budget: number;
    revised_budget: number;
    project_id?: string;
    project_name?: string;
}

export interface Project {
    id: string;
    project_name: string;
    description: string;
    category_id: string;
    category_name: string;
    // Strings in API responses; forms may send Date objects
    start_date: string | Date;
    end_date: string | Date;
    created_by_id: string;
    created_at: string | Date;
    updated_at: string | Date;
}

export interface User {
  id: string;
  username?: string;
  password?: string;
  email?: string;
  name?: string;
  age?: number | null;
  gender?: string | null;
  nationality?: string | null;
  role_id?: string;
  role_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
    id: string;
    role_name: string;
}
  
export interface RoleWithUsers {
    role_name: string;
    users: string[];
}
  
export interface Username {
    id: string;
    username: string,
}

export interface Pagination<T> {
    data: T[];
    pagination: {
        offset: number;
        limit: number;
        totalItems: number;
        totalPages: number;
        hasMore: boolean;
    };
}
export interface BudgetTotals {
    budget: number;
    spent: number;
    remaining: number;
    percent_used: number | null;
    over_budget: boolean;
}

export interface ProjectBudget extends BudgetTotals {
    project_id: string;
    project_name: string;
}

export interface BudgetSummary {
    overall: BudgetTotals & { over_budget_count: number };
    projects: ProjectBudget[];
}

export interface CategoryBudget {
    category_id: string;
    category_name: string;
    budget: number;
    spent: number;
}

export interface ProjectTrend {
    project_id: string;
    project_name: string;
    monthly: { year: number; month: number; budget: number; spent: number }[];
    yearly: { year: number; budget: number; spent: number }[];
}
