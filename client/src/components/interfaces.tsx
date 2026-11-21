export interface Category {
    id: string;
    category_name: string;
    created_at: string;
    updated_at: string;
}

export interface CategoryUsage {
    category_id: string;
    category_name: string;
    project_count: number;
    projects: { id: string; project_name: string }[];
    financial_record_count: number;
}

export interface FinancialData {
    year: number;
    month: number;
    expenditure: number;
    initial_budget: number;
    revised_budget: number | null;
    project_id?: string;
    project_name?: string;
}

export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ExpenseEntry {
    id: string;
    project_id: string;
    date: string;
    vendor: string;
    amount: number;
    notes: string | null;
    receipt_name: string | null;
    receipt_type: string | null;
    has_receipt: boolean;
    status: ExpenseStatus;
    rejection_reason: string | null;
    reviewed_by_id: string | null;
    reviewed_by_name: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
}

export type HistoryAction = 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Rejected';

export type HistoryEntity = 'Project' | 'Budget' | 'Expense';

export type HistoryValue = string | number | null;

export interface HistoryChange {
    field: string;
    from: HistoryValue;
    to: HistoryValue;
}

export interface HistoryEntry {
    id: string;
    project_id: string;
    entity: HistoryEntity;
    entity_label: string;
    action: HistoryAction;
    changes: HistoryChange[];
    user_id: string | null;
    user_name: string | null;
    created_at: string;
}

export interface Project {
    id: string;
    project_name: string;
    description: string;
    category_id: string | null;
    category_name: string;
    start_date: string | Date | null;
    end_date: string | Date | null;
    created_by_id: string;
    alert_threshold: number;
    created_at: string | Date;
    updated_at: string | Date;
}

export type BudgetAlertLevel = 'Threshold' | 'OverBudget';

export interface Notification {
    id: string;
    user_id: string;
    project_id: string | null;
    project_name: string;
    level: BudgetAlertLevel;
    threshold: number;
    budget: number;
    spent: number;
    percent_used: number | null;
    read_at: string | null;
    created_at: string;
}

export interface NotificationList {
    data: Notification[];
    unread_count: number;
}

export type ProjectSort = 'name_asc' | 'name_desc' | 'start_date_desc' | 'start_date_asc' | 'spend_desc' | 'spend_asc';

export interface ProjectFilters {
    search: string;
    category: string;
    owner: string;
    from: string;
    to: string;
    sort: ProjectSort | '';
}

export type ProjectListArgs = Partial<ProjectFilters> & {
    offset?: number;
    limit?: number;
};

export interface ProjectOwner {
    id: string;
    display_name: string;
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
    category_id: string | null;
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
