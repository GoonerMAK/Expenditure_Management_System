import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { FinancialData } from "../components/interfaces";

export const financialDataApi = createApi({
  reducerPath: "financialDataApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:4000/api/", credentials: 'include', }),
  tagTypes: ["FinancialData"],
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

  }),
});

export const { useGetFinancialDataQuery, useGetFinancialDataByIdQuery, useAddFinancialDataMutation, useUpdateFinancialDataMutation } = financialDataApi;
