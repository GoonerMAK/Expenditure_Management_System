import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Project, Pagination } from "../components/interfaces";

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

  }),
});

export const {useAddProjectMutation, useGetProjectByIdQuery, useGetProjectsQuery, useUpdateProjectMutation} = projectApi;

