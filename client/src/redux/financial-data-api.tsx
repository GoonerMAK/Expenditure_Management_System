import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ExpenseEntry, FinancialData } from "../components/interfaces";

const BASE_URL = "http://localhost:4000/api/";

export const getReceiptUrl = (id: string) => `${BASE_URL}expenses/${id}/receipt`;

// Entries change the month's expenditure on the server, so the project's financial data is refetched too.
const expenseTags = (projectId: string) => [
  { type: 'Expense' as const, id: projectId },
  { type: 'FinancialData' as const, id: projectId },
  { type: 'FinancialData' as const, id: 'LIST' },
];

export const financialDataApi = createApi({
  reducerPath: "financialDataApi",
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL, credentials: 'include', }),
  tagTypes: ["FinancialData", "Expense"],
  endpoints: (builder) => ({

    getFinancialData: builder.query<FinancialData[], void>({
      query: () => ({
        url: 'financialData',
        method: 'get',
      }),
      providesTags: (result) =>
        result ?
          [...result.map(({ project_id }) => ({ type: 'FinancialData', id: project_id } as const)), { type: 'FinancialData', id: 'LIST' }]
          : [{ type: 'FinancialData', id: 'LIST' }],
    }),

    getFinancialDataById: builder.query<FinancialData, string>({
      query: (id) => ({
        url: `financialData/${id}`,
        method: 'get',
      }),
      providesTags: (_result, _error, id) => [{ type: 'FinancialData', id }],
    }),

    addFinancialData: builder.mutation<FinancialData, Partial<FinancialData>>({
      query: (data) => ({
        url: 'financialData',
        method: 'post',
        body: data,
      }),
      invalidatesTags: [{ type: 'FinancialData', id: 'LIST' }],
    }),

    updateFinancialData: builder.mutation<FinancialData, { id: string; data: Partial<FinancialData> }>({
      query: ({ id, data }) => ({
        url: `financialData/${id}`,
        method: 'put',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'FinancialData', id }],
    }),

    getProjectExpenses: builder.query<ExpenseEntry[], string>({
      query: (projectId) => ({
        url: `projects/${projectId}/expenses`,
        method: 'get',
      }),
      providesTags: (_result, _error, projectId) => [{ type: 'Expense', id: projectId }],
    }),

    addExpense: builder.mutation<ExpenseEntry, { projectId: string; data: FormData }>({
      query: ({ data }) => ({
        url: 'expenses',
        method: 'post',
        body: data,
      }),
      invalidatesTags: (_result, _error, { projectId }) => expenseTags(projectId),
    }),

    updateExpense: builder.mutation<ExpenseEntry, { id: string; projectId: string; data: FormData }>({
      query: ({ id, data }) => ({
        url: `expenses/${id}`,
        method: 'put',
        body: data,
      }),
      invalidatesTags: (_result, _error, { projectId }) => expenseTags(projectId),
    }),

    deleteExpense: builder.mutation<ExpenseEntry, { id: string; projectId: string }>({
      query: ({ id }) => ({
        url: `expenses/${id}`,
        method: 'delete',
      }),
      invalidatesTags: (_result, _error, { projectId }) => expenseTags(projectId),
    }),

  }),
});

export const {
  useGetFinancialDataQuery, useGetFinancialDataByIdQuery, useAddFinancialDataMutation, useUpdateFinancialDataMutation,
  useGetProjectExpensesQuery, useAddExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation,
} = financialDataApi;
