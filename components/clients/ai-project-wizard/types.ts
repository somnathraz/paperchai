// Types for AI Project Wizard

export type AiProjectWizardProps = {
    onSuccess?: () => void;
    defaultClientId?: string;
    // Modal mode props (optional)
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    existingClientId?: string;
    onComplete?: (data: { clientId?: string; projectId?: string }) => void;
};

export type ExtractedData = {
    client: {
        name: string;
        email: string;
        company?: string;
        phone?: string;
        notes?: string;
    };
    project: {
        name: string;
        description: string;
        type: "RETAINER" | "FIXED" | "HOURLY" | "MILESTONE";
        billingStrategy: "PER_MILESTONE" | "SINGLE_INVOICE" | "RETAINER_MONTHLY" | "HOURLY_TIMESHEET";
        totalBudget: number; // in cents/paise
        currency: string;
        startDate?: string;
        endDate?: string;
        autoInvoiceEnabled: boolean;
        autoRemindersEnabled: boolean;
    };
    milestones: Array<{
        title: string;
        description?: string;
        amount: number;
        expectedDate?: string;
        dueDate?: string;
        billingTrigger: "ON_COMPLETION" | "ON_FIXED_DATE" | "ON_CREATION";
        status: "PLANNED" | "in_progress" | "READY_FOR_INVOICE";
    }>;
    confidence: {
        client: number;
        project: number;
        milestones: number;
    };
    warnings?: string[];
};

export type WizardStep = "upload" | "review";

export type DuplicateInfo = {
    client: any | null;
    project: any | null;
    projectNameExists: boolean;
};
