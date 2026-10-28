import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { User, Username } from "../components/interfaces";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:4000/api/", credentials: 'include', }),
  tagTypes: ["User", "Username"],
  endpoints: (builder) => ({

    getUsers: builder.query<User[], void>({
      query: () => ({
        url: 'users',
        method: 'get',
      }),
      providesTags: (result) =>
        result ?
          [...result.map(({ id }) => ({ type: 'User', id: id } as const)), { type: 'User', id: 'LIST' }]
          : [{ type: 'User', id: 'LIST' }],
    }),

    getUserAuth: builder.query<{user: User}, void>({
      query: () => ({
        url: 'auth/user',
        method: 'get',
      }),
      providesTags: (result) =>
        result
          ? [{ type: 'User', id: result.user.id }]
          : [{ type: 'User', id: 'LIST' }],
    }),

    getUserById: builder.query<User, string>({
        query: (id) => ({
            url: `users/${id}`,
            method: 'get',
        }),
    }),

    getUsernames: builder.query<Username[], void>({
      query: () => ({
        url: 'users/usernames',
        method: 'get',
      }),
      providesTags: (result) =>
        result ?
          [...result.map(({ id }) => ({ type: 'Username', id: id } as const)), { type: 'Username', id: 'LIST' }]
          : [{ type: 'Username', id: 'LIST' }],
    }),

    // The server reads the changes from a `data` field in the body
    updateUser: builder.mutation<User, { id: string; data: { data: Partial<User> } }>({
      query: ({ id, data }) => ({
        url: `users/${id}`,
        method: 'put',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'User', id }],
    }),

  }),
});

export const {useGetUsersQuery, useGetUserAuthQuery, useGetUserByIdQuery, useGetUsernamesQuery, useUpdateUserMutation} = userApi;