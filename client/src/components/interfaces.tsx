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
    start_date: Date;
    end_date: Date;
    created_by_id: string;
    created_at: Date;
    updated_at: Date;
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