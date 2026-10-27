import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Project, Pagination, BudgetSummary, CategoryBudget, ProjectTrend } from "../components/interfaces";

export const projectApi = createApi({
  reducerPath: "projectApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:4000/api/", credentials: 'include', }),
  tagTypes: ["Project"],
  endpoints: (builder) => ({

    getProjects: builder.query<Pagination<Project>, { offset?: number; limit?: number }>({
      query: ({ offset = 0, limit = 6 }) => ({
        url: `projects?offset=${offset}&limit=${limit}`,
        method: 'get',
      }),
      providesTags: (result) =>
        result ?. data ?
          [...result.data.map(({ id }) => ({ type: 'Project', id: id } as const)), { type: 'Project', id: 'LIST' }]
          : [{ type: 'Project', id: 'LIST' }],
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
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),

    updateProject: builder.mutation<Project, { id: string; data: Partial<Project> }>({
      query: ({ id, data }) => ({
        url: `projects/${id}`,
        method: 'put',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
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

export const {useAddProjectMutation, useGetBudgetByCategoryQuery, useGetBudgetSummaryQuery, useGetProjectByIdQuery, useGetProjectTrendQuery, useGetProjectsQuery, useUpdateProjectMutation} = projectApi;

