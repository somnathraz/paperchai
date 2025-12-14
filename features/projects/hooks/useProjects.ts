
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  fetchProjects,
  fetchProjectById,
  createProject,
  updateProject,
  createMilestone,
  updateMilestone,
  clearSelectedProject
} from "../store/projectsSlice";
import { CreateProjectPayload, UpdateProjectPayload } from "@/lib/api/services";

export const useProjects = () => {
  const dispatch = useAppDispatch();
  const { list, selectedProject, isLoading, error } = useAppSelector((state) => state.projects);

  useEffect(() => {
    // Initial fetch if list is empty
    if (list.length === 0 && !isLoading && !error) {
      dispatch(fetchProjects());
    }
  }, [dispatch, list.length, isLoading, error]);

  return {
    projects: list,
    selectedProject,
    isLoading,
    error,

    // Actions
    fetchProjects: () => dispatch(fetchProjects()),
    fetchProject: (id: string) => dispatch(fetchProjectById(id)),
    createProject: (payload: CreateProjectPayload) => dispatch(createProject(payload)),
    updateProject: (id: string, data: UpdateProjectPayload) => dispatch(updateProject({ id, data })),

    // Milestone Actions
    addMilestone: (projectId: string, data: any) => dispatch(createMilestone({ projectId, data })),
    editMilestone: (id: string, data: any) => dispatch(updateMilestone({ id, data })),

    clearSelected: () => dispatch(clearSelectedProject()),
  };
};
