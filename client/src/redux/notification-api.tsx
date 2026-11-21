import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Notification, NotificationList } from "../components/interfaces";

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:4000/api/", credentials: 'include', }),
  tagTypes: ["Notification"],
  endpoints: (builder) => ({

    getNotifications: builder.query<NotificationList, void>({
      query: () => ({
        url: 'notifications',
        method: 'get',
      }),
      providesTags: ["Notification"],
    }),

    markNotificationRead: builder.mutation<Notification, string>({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: 'post',
      }),
      invalidatesTags: ["Notification"],
    }),

    markAllNotificationsRead: builder.mutation<{ count: number }, void>({
      query: () => ({
        url: 'notifications/read-all',
        method: 'post',
      }),
      invalidatesTags: ["Notification"],
    }),

  }),
});

export const { useGetNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } = notificationApi;
