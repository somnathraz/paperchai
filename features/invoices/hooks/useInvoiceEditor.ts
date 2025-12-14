/**
 * useInvoiceEditor Hook - Access invoice editor state and actions
 * Wraps the editorSlice for invoice-specific operations
 */

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    saveInvoice,
    sendInvoice,
    setFormState,
    setSections,
    setCurrentTemplate,
    resetEditor,
    clearError,
} from "@/lib/store/slices/editorSlice";

export const useInvoiceEditor = () => {
    const dispatch = useAppDispatch();
    const editorState = useAppSelector((state) => state.editor);

    return {
        // State
        formState: editorState.formState,
        sections: editorState.sections,
        currentTemplate: editorState.currentTemplate,
        savedInvoiceId: editorState.savedInvoiceId,
        invoiceStatus: editorState.invoiceStatus,
        status: editorState.status,
        error: editorState.error,

        // Actions
        setFormState: (formState: any) => dispatch(setFormState(formState)),
        setSections: (sections: any[]) => dispatch(setSections(sections)),
        setTemplate: (template: string) => dispatch(setCurrentTemplate(template)),
        saveInvoice: (payload: any) => dispatch(saveInvoice(payload)),
        sendInvoice: (invoiceId: string, channel: "email" | "whatsapp" | "both") =>
            dispatch(sendInvoice({ invoiceId, channel })),
        resetEditor: () => dispatch(resetEditor()),
        clearError: () => dispatch(clearError()),
    };
};
