import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./store/slices/uiSlice";
import editorReducer from "./store/slices/editorSlice";
import authReducer from "@/features/auth/store/authSlice";
import dashboardReducer from "@/features/dashboard/store/dashboardSlice";
import invoiceReducer from "@/features/invoices/store/invoiceSlice";
import clientsReducer from "@/features/clients/store/clientsSlice";
import { projectsReducer } from "@/features/projects/store/projectsSlice";
import reminderReducer from "@/features/reminders/store/reminderSlice";
import automationReducer from "@/features/automation/store/automationSlice";

export const makeStore = () => {
    return configureStore({
        reducer: {
            ui: uiReducer,
            editor: editorReducer,
            auth: authReducer,
            dashboard: dashboardReducer,
            invoices: invoiceReducer,
            clients: clientsReducer,
            projects: projectsReducer,
            reminders: reminderReducer,
            automation: automationReducer,
        },
    });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
