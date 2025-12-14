/**
 * Project Slice - Redux state management for projects
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { projectService } from "@/lib/api/services";

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  clientId?: string | null;
}

export interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  selectedProject: null,
  isLoading: false,
  error: null,
};

export const fetchProjects = createAsyncThunk(
  "projects/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const result = await projectService.getAll();
      if (result.error) return rejectWithValue(result.error);
      return result.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch projects");
    }
  }
);

const projectSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setSelectedProject(state, action: PayloadAction<Project | null>) {
      state.selectedProject = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects = (action.payload as Project[]) || [];
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedProject, clearError } = projectSlice.actions;
export default projectSlice.reducer;
