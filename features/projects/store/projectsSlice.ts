
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { projectService, CreateProjectPayload, UpdateProjectPayload } from "@/lib/api/services";

export interface ProjectState {
    list: any[];
    selectedProject: any | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: ProjectState = {
    list: [],
    selectedProject: null,
    isLoading: false,
    error: null,
};

// Thunks
export const fetchProjects = createAsyncThunk(
    "projects/fetchAll",
    async (_, { rejectWithValue }) => {
        try {
            const response = await projectService.getAll();
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to fetch projects");
        }
    }
);

export const fetchProjectById = createAsyncThunk(
    "projects/fetchById",
    async (id: string, { rejectWithValue }) => {
        try {
            // The service call currently returns the response object
            // We assume /api/projects/[id] returns { project: ... } or just the project
            // Based on existing page.tsx, it's Prisma directly, but the API endpoint logic usually returns the object.
            // Let's assume response.data is the project or response.data.project
            const response = await projectService.getById(id);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to fetch project");
        }
    }
);

export const createProject = createAsyncThunk(
    "projects/create",
    async (payload: CreateProjectPayload, { rejectWithValue }) => {
        try {
            const response = await projectService.create(payload);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to create project");
        }
    }
);

export const updateProject = createAsyncThunk(
    "projects/update",
    async ({ id, data }: { id: string; data: UpdateProjectPayload }, { rejectWithValue }) => {
        try {
            const response = await projectService.update(id, data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to update project");
        }
    }
);

export const createMilestone = createAsyncThunk(
    "projects/createMilestone",
    async ({ projectId, data }: { projectId: string; data: any }, { rejectWithValue }) => {
        try {
            const response = await projectService.createMilestone(projectId, data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to create milestone");
        }
    }
);

export const updateMilestone = createAsyncThunk(
    "projects/updateMilestone",
    async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
        try {
            const response = await projectService.updateMilestone(id, data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || "Failed to update milestone");
        }
    }
);

const projectsSlice = createSlice({
    name: "projects",
    initialState,
    reducers: {
        clearSelectedProject: (state) => {
            state.selectedProject = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch All
            .addCase(fetchProjects.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProjects.fulfilled, (state, action) => {
                state.isLoading = false;
                state.list = action.payload as any[];
            })
            .addCase(fetchProjects.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch By ID
            .addCase(fetchProjectById.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProjectById.fulfilled, (state, action) => {
                state.isLoading = false;
                const payload: any = action.payload;
                state.selectedProject = payload.project || payload;
            })
            .addCase(fetchProjectById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Create Project
            .addCase(createProject.fulfilled, (state, action) => {
                state.list.unshift(action.payload as any);
            })
            // Update Project
            .addCase(updateProject.fulfilled, (state, action) => {
                const payload: any = action.payload;
                const updated = payload.project || payload;
                if (state.selectedProject?.id === updated.id) {
                    state.selectedProject = { ...state.selectedProject, ...updated };
                }
                const index = state.list.findIndex(p => p.id === updated.id);
                if (index !== -1) {
                    state.list[index] = { ...state.list[index], ...updated };
                }
            })
            // Create Milestone
            .addCase(createMilestone.fulfilled, (state, action) => {
                // Typically returns the milestone or the updated project?
                // If the API returns the created milestone, we need to push it to selectedProject.milestones
                const payload: any = action.payload;
                if (state.selectedProject && state.selectedProject.id === action.meta.arg.projectId) {
                    const newMilestone = payload.milestone || payload;
                    if (state.selectedProject.milestones) {
                        state.selectedProject.milestones.push(newMilestone);
                    } else {
                        state.selectedProject.milestones = [newMilestone];
                    }
                }
            })
            // Update Milestone
            .addCase(updateMilestone.fulfilled, (state, action) => {
                const payload: any = action.payload;
                if (state.selectedProject && state.selectedProject.milestones) {
                    const updatedMilestone = payload.milestone || payload;
                    const index = state.selectedProject.milestones.findIndex((m: any) => m.id === updatedMilestone.id);
                    if (index !== -1) {
                        state.selectedProject.milestones[index] = { ...state.selectedProject.milestones[index], ...updatedMilestone };
                    }
                }
            });
    },
});

export const { clearSelectedProject } = projectsSlice.actions;
export const projectsReducer = projectsSlice.reducer;

