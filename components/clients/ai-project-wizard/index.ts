// Re-export the main AI Project Wizard component from original location
// The step components below can be used for future modular refactoring
export { AiProjectWizard } from "../ai-project-wizard";

// Export modular step components for gradual migration
export { UploadStep, ClientDetailsCard, ProjectScopeCard } from "./steps";

// Export hooks for validation and duplicate detection
export { useProjectValidation, useDuplicateDetection } from "./hooks";

// Export types for external use
export type { ExtractedData, AiProjectWizardProps, WizardStep, DuplicateInfo } from "./types";

