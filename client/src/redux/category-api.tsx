import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"; 
import { Category, CategoryUsage } from "../components/interfaces";
import { projectApi } from "./project-api";

const refreshProjectsAfter = async (_arg: unknown, { dispatch, queryFulfilled }: { dispatch: (action: unknown) => unknown; queryFulfilled: Promise<unknown> }) => {
  try {
    await queryFulfilled;
    dispatch(projectApi.util.resetApiState());
  } catch {
    // The caller shows the error
  }
};

export const categoryApi = createApi({
  reducerPath: "categoryApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:4000/api/", credentials: 'include', }),
  tagTypes: ["Categories"],
  endpoints: (builder) => ({

    getCategories: builder.query<Category[], void>({
      query: () => ({
        url: 'categories',
        method: 'get',
      }),
      providesTags: (result) =>
        result ? 
          [...result.map(({ id }) => ({ type: 'Categories', id } as const)), { type: 'Categories', id: 'LIST' }]
          : [{ type: 'Categories', id: 'LIST' }],
    }),

    getCategoryById: builder.query<Category, string>({
      query: (id) => ({
        url: `categories/${id}`,
        method: 'get',
      }),
    }),

    getCategoryUsage: builder.query<CategoryUsage, string>({
      query: (id) => ({
        url: `categories/${id}/usage`,
        method: 'get',
      }),
      keepUnusedDataFor: 0,
    }),

    addCategory: builder.mutation<Category, Partial<Category>>({
      query: (data) => ({
        url: 'categories',
        method: 'post',
        body: data,
      }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
    }),

    updateCategory: builder.mutation<Category, { id: string; category_name: string }>({
      query: ({ id, category_name }) => ({
        url: `categories/${id}`,
        method: 'put',
        body: { category_name },
      }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
      onQueryStarted: refreshProjectsAfter,
    }),

    deleteCategory: builder.mutation<Category, string>({
      query: (id) => ({
        url: `categories/${id}`,
        method: 'delete',
      }),
      invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
      onQueryStarted: refreshProjectsAfter,
    }),

  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryByIdQuery,
  useGetCategoryUsageQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
