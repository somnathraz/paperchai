import { addMinutes, differenceInMinutes, format } from "date-fns";

export type TemplateVars = {
    clientName: string;
    invoiceId: string;
    amount: string;
    dueDate: string;
    paymentLink?: string;
    companyName?: string;
};

export const REMINDER_PRESETS = {
    standard: [
        {
            index: 0,
            daysBeforeDue: 3,
            offsetFromDueInMinutes: -3 * 24 * 60, // -3 days
            fnLabel: "3 days before due",
        },
        {
            index: 1,
            daysAfterDue: 0,
            offsetFromDueInMinutes: 0, // due date
            fnLabel: "On due date",
        },
        {
            index: 2,
            daysAfterDue: 7,
            offsetFromDueInMinutes: 7 * 24 * 60, // +7 days
            fnLabel: "7 days overdue",
        },
    ],
};

/**
 * Replaces handlebars-style variables in a template string.
 * Supported/Safe variables only.
 */
export function replaceTemplateVariables(template: string, vars: TemplateVars): string {
    if (!template) return "";

    let result = template;
    // Replace standard variables
    result = result.replace(/{{clientName}}/g, vars.clientName || "");
    result = result.replace(/{{invoiceId}}/g, vars.invoiceId || "");
    result = result.replace(/{{amount}}/g, vars.amount || "");
    result = result.replace(/{{dueDate}}/g, vars.dueDate || "");

    // Optional extras
    if (vars.paymentLink) {
        result = result.replace(/{{paymentLink}}/g, vars.paymentLink);
    }
    if (vars.companyName) {
        result = result.replace(/{{companyName}}/g, vars.companyName);
    }

    return result;
}

/**
 * Compute the absolute sendAt time based on due date and offset.
 */
export function computeSendAt(dueAt: Date, offsetInMinutes: number): Date {
    // If dueAt is just a date (e.g. midnight), adding minutes works fine.
    // We assume the system handles timezones by storing dueAt as UTC midnight of that day 
    // or specific time. for simplicity we add minutes directly.
    return addMinutes(dueAt, offsetInMinutes);
}

/**
 * Returns a readable label for an offset (e.g. "3 days before due")
 */
export function getOffsetLabel(offsetInMinutes: number): string {
    if (offsetInMinutes === 0) return "On due date";

    const days = Math.round(Math.abs(offsetInMinutes) / (24 * 60));

    if (offsetInMinutes < 0) {
        return `${days} day${days > 1 ? 's' : ''} before due`;
    } else {
        return `${days} day${days > 1 ? 's' : ''} after due`;
    }
}
