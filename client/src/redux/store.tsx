import { configureStore } from "@reduxjs/toolkit";
import { categoryApi } from "./category-api";
import { financialDataApi } from "./financial-data-api";
import { notificationApi } from "./notification-api";
import { projectApi } from "./project-api";
import { userApi } from "./user-api";
import { roleApi } from "./role-api";

export const store = configureStore({
    reducer:{
        [categoryApi.reducerPath]: categoryApi.reducer,
        [financialDataApi.reducerPath]: financialDataApi.reducer,
        [notificationApi.reducerPath]: notificationApi.reducer,
        [projectApi.reducerPath]: projectApi.reducer,
        [userApi.reducerPath]: userApi.reducer,
        [roleApi.reducerPath]: roleApi.reducer,

    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(categoryApi.middleware, financialDataApi.middleware, notificationApi.middleware, projectApi.middleware, userApi.middleware, roleApi.middleware)
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;