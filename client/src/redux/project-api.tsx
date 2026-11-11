import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Project, Pagination, BudgetSummary, CategoryBudget, ProjectTrend, ProjectListArgs, ProjectOwner } from "../components/interfaces";

export const toProjectListQuery = ({ offset = 0, limit = 6, ...filters }: ProjectListArgs) => {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  return params.toString();
};

export const projectApi = createApi({
  reducerPath: "projectApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:4000/api/", credentials: 'include', }),
  tagTypes: ["Project"],
  endpoints: (builder) => ({

    getProjects: builder.query<Pagination<Project>, ProjectListArgs>({
      query: (args) => ({
        url: `projects?${toProjectListQuery(args)}`,
        method: 'get',
      }),
      providesTags: (result) =>
        result ?. data ?
          [...result.data.map(({ id }) => ({ type: 'Project', id: id } as const)), { type: 'Project', id: 'LIST' }]
          : [{ type: 'Project', id: 'LIST' }],
    }),

    getProjectOwners: builder.query<ProjectOwner[], void>({
      query: () => ({
        url: 'projects/owners',
        method: 'get',
      }),
      providesTags: [{ type: 'Project', id: 'OWNERS' }],
    }),

    getProjectById: builder.query<Project, string>({
      query: (id) => ({
        url: `projects/${id}`,
        method: 'get',
      }),
    }),

    addProject: builder.mutation<Project, Partial<Project>>({
      query: (data) => ({
        url: 'projects',
        method: 'post',
        body: data,
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }, { type: 'Project', id: 'OWNERS' }],
    }),

    updateProject: builder.mutation<Project, { id: string; data: Partial<Project> }>({
      query: ({ id, data }) => ({
        url: `projects/${id}`,
        method: 'put',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Project', id }],
    }),

    getBudgetSummary: builder.query<BudgetSummary, void>({
      query: () => ({
        url: 'projects/summary',
        method: 'get',
      }),
    }),

    getBudgetByCategory: builder.query<CategoryBudget[], void>({
      query: () => ({
        url: 'projects/summary/categories',
        method: 'get',
      }),
    }),

    getProjectTrend: builder.query<ProjectTrend, string>({
      query: (id) => ({
        url: `projects/${id}/trend`,
        method: 'get',
      }),
    }),

  }),
});

export const {useAddProjectMutation, useGetBudgetByCategoryQuery, useGetBudgetSummaryQuery, useGetProjectByIdQuery, useGetProjectOwnersQuery, useGetProjectTrendQuery, useGetProjectsQuery, useUpdateProjectMutation} = projectApi;

