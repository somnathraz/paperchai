/**
 * UI Slice - Global UI state management
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UIState {
    sidebarCollapsed: boolean;
    sidebarWidth: number;
    templateDrawerOpen: boolean;
    zoom: number;
    previewMode: "desktop" | "mobile";
    darkMode: boolean;
    activePropertyTab: string;
}

const initialState: UIState = {
    sidebarCollapsed: false,
    sidebarWidth: 280,
    templateDrawerOpen: false,
    zoom: 100,
    previewMode: "desktop",
    darkMode: false,
    activePropertyTab: "details",
};

const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        toggleSidebar(state) {
            state.sidebarCollapsed = !state.sidebarCollapsed;
        },
        setSidebarWidth(state, action: PayloadAction<number>) {
            state.sidebarWidth = action.payload;
        },
        toggleTemplateDrawer(state) {
            state.templateDrawerOpen = !state.templateDrawerOpen;
        },
        setZoom(state, action: PayloadAction<number>) {
            state.zoom = action.payload;
        },
        setPreviewMode(state, action: PayloadAction<"desktop" | "mobile">) {
            state.previewMode = action.payload;
        },
        toggleDarkMode(state) {
            state.darkMode = !state.darkMode;
        },
        setActivePropertyTab(state, action: PayloadAction<string>) {
            state.activePropertyTab = action.payload;
        },
    },
});

export const {
    toggleSidebar,
    setSidebarWidth,
    toggleTemplateDrawer,
    setZoom,
    setPreviewMode,
    toggleDarkMode,
    setActivePropertyTab,
} = uiSlice.actions;

export default uiSlice.reducer;
