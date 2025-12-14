/**
 * AI Invoice Review Engine
 * 
 * Analyzes invoices before sending to detect issues, anomalies,
 * and provide actionable suggestions with one-click fixes.
 */

import { prisma } from "@/lib/prisma";

// ============================================================================
// Types
// ============================================================================

export type IssueSeverity = "critical" | "warning" | "info";

export type ReviewIssue = {
    id: string;
    severity: IssueSeverity;
    category: string;
    title: string;
    description: string;
    field?: string;
    autoFix?: {
        label: string;
        field: string;
        value: any;
    };
};

export type ReviewSuggestion = {
    id: string;
    type: "description" | "notes" | "terms" | "title";
    original: string;
    improved: string;
    reason: string;
};

export type Anomaly = {
    id: string;
    type: string;
    title: string;
    description: string;
    severity: IssueSeverity;
    metric?: {
        expected: number;
        actual: number;
        unit: string;
    };
};

export type AIReviewResult = {
    riskScore: number; // 0-100
    riskLevel: "low" | "medium" | "high" | "critical";
    issues: ReviewIssue[];
    suggestions: ReviewSuggestion[];
    anomalies: Anomaly[];
    predictedPaymentDate?: string;
    latePaymentProbability?: number;
    analysisTime: number; // ms
};

export type InvoiceReviewData = {
    id?: string;
    number?: string;
    clientId?: string;
    projectId?: string;
    issueDate?: string;
    dueDate?: string;
    currency?: string;
    items: Array<{
        title?: string;
        description?: string;
        quantity?: number;
        unitPrice?: number;
        taxRate?: number;
    }>;
    adjustments?: Array<{
        type: "discount" | "fee";
        value: number;
        mode: "fixed" | "percent";
    }>;
    notes?: string;
    terms?: string;
    taxSettings?: {
        inclusive?: boolean;
        defaultRate?: number;
    };
    total?: number;
    subtotal?: number;
    workspaceId: string;
};

type HistoricalContext = {
    avgInvoiceAmount: number;
    avgItemCount: number;
    clientUsualCurrency?: string;
    clientReliabilityScore?: number;
    clientAverageDelayDays?: number;
    recentInvoiceNumbers?: string[];
    lastInvoiceItems?: string[];
};

// ============================================================================
// Main Analysis Function
// ============================================================================

export async function analyzeInvoice(
    invoice: InvoiceReviewData
): Promise<AIReviewResult> {
    const startTime = Date.now();

    // Fetch historical context
    const history = await getHistoricalContext(invoice);

    // Run all detection rules
    const issues: ReviewIssue[] = [];
    const suggestions: ReviewSuggestion[] = [];
    const anomalies: Anomaly[] = [];

    // Critical checks
    issues.push(...detectCriticalIssues(invoice));

    // Warning checks
    issues.push(...detectWarnings(invoice, history));

    // Info/suggestions
    issues.push(...detectInfoIssues(invoice));
    suggestions.push(...generateSuggestions(invoice));

    // Anomaly detection
    anomalies.push(...detectAnomalies(invoice, history));

    // Calculate risk score
    const riskScore = calculateRiskScore(issues, anomalies);
    const riskLevel = getRiskLevel(riskScore);

    // Predict payment
    const paymentPrediction = predictPayment(invoice, history);

    return {
        riskScore,
        riskLevel,
        issues,
        suggestions,
        anomalies,
        predictedPaymentDate: paymentPrediction.date,
        latePaymentProbability: paymentPrediction.lateProb,
        analysisTime: Date.now() - startTime,
    };
}

// ============================================================================
// Historical Context
// ============================================================================

async function getHistoricalContext(
    invoice: InvoiceReviewData
): Promise<HistoricalContext> {
    const context: HistoricalContext = {
        avgInvoiceAmount: 0,
        avgItemCount: 0,
    };

    try {
        // Get workspace invoice history
        const recentInvoices = await prisma.invoice.findMany({
            where: { workspaceId: invoice.workspaceId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                total: true,
                number: true,
                items: { select: { title: true } },
            },
        });

        if (recentInvoices.length > 0) {
            const totals = recentInvoices.map(inv => Number(inv.total) || 0);
            context.avgInvoiceAmount = totals.reduce((a, b) => a + b, 0) / totals.length;
            context.avgItemCount = recentInvoices.reduce((sum, inv) => sum + inv.items.length, 0) / recentInvoices.length;
            context.recentInvoiceNumbers = recentInvoices.map(inv => inv.number);
            context.lastInvoiceItems = recentInvoices[0]?.items.map(i => i.title) || [];
        }

        // Get client info
        if (invoice.clientId) {
            const client = await prisma.client.findUnique({
                where: { id: invoice.clientId },
                select: {
                    reliabilityScore: true,
                    averageDelayDays: true,
                    invoices: {
                        orderBy: { createdAt: "desc" },
                        take: 5,
                        select: { currency: true },
                    },
                },
            });

            if (client) {
                context.clientReliabilityScore = client.reliabilityScore ?? undefined;
                context.clientAverageDelayDays = client.averageDelayDays ?? undefined;

                // Most common currency
                const currencies = client.invoices.map(inv => inv.currency).filter(Boolean);
                if (currencies.length > 0) {
                    const counts: Record<string, number> = {};
                    currencies.forEach(c => { counts[c!] = (counts[c!] || 0) + 1; });
                    context.clientUsualCurrency = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
                }
            }
        }
    } catch (error) {
        console.error("Error fetching historical context:", error);
    }

    return context;
}

// ============================================================================
// Critical Issue Detection
// ============================================================================

function detectCriticalIssues(invoice: InvoiceReviewData): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    // Missing client
    if (!invoice.clientId) {
        issues.push({
            id: "missing-client",
            severity: "critical",
            category: "Required Field",
            title: "Missing client",
            description: "Invoice must have a client assigned before sending.",
            field: "clientId",
        });
    }

    // Missing items
    if (!invoice.items || invoice.items.length === 0) {
        issues.push({
            id: "missing-items",
            severity: "critical",
            category: "Required Field",
            title: "No line items",
            description: "Invoice must have at least one billable item.",
            field: "items",
        });
    }

    // Zero/negative total
    const total = invoice.total ?? calculateTotal(invoice);
    if (total < 0) {
        issues.push({
            id: "negative-total",
            severity: "critical",
            category: "Calculation Error",
            title: "Negative total amount",
            description: "Invoice total is negative. Check discounts and item prices.",
            field: "total",
        });
    }

    if (total === 0 && invoice.items && invoice.items.length > 0) {
        issues.push({
            id: "zero-total",
            severity: "critical",
            category: "Calculation Error",
            title: "Zero amount invoice",
            description: "Invoice total is ₹0 despite having items. Check unit prices.",
            field: "total",
        });
    }

    // Due date before issue date
    if (invoice.issueDate && invoice.dueDate) {
        const issue = new Date(invoice.issueDate);
        const due = new Date(invoice.dueDate);
        if (due < issue) {
            issues.push({
                id: "invalid-due-date",
                severity: "critical",
                category: "Date Error",
                title: "Due date before issue date",
                description: `Due date (${invoice.dueDate}) is before issue date (${invoice.issueDate}).`,
                field: "dueDate",
                autoFix: {
                    label: "Set due date to +15 days",
                    field: "dueDate",
                    value: addDays(issue, 15).toISOString().slice(0, 10),
                },
            });
        }
    }

    return issues;
}

// ============================================================================
// Warning Detection
// ============================================================================

function detectWarnings(
    invoice: InvoiceReviewData,
    history: HistoricalContext
): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const total = invoice.total ?? calculateTotal(invoice);

    // Missing tax when workspace uses tax
    const hasNoTax = invoice.items?.every(item => (item.taxRate ?? 0) === 0);
    if (hasNoTax && invoice.taxSettings?.defaultRate && invoice.taxSettings.defaultRate > 0) {
        issues.push({
            id: "missing-tax",
            severity: "warning",
            category: "Tax",
            title: "No tax applied",
            description: `Your default tax rate is ${invoice.taxSettings.defaultRate}% but no items have tax.`,
            field: "items",
            autoFix: {
                label: `Apply ${invoice.taxSettings.defaultRate}% tax to all items`,
                field: "taxRate",
                value: invoice.taxSettings.defaultRate,
            },
        });
    }

    // High discount
    const discounts = invoice.adjustments?.filter(a => a.type === "discount") || [];
    const discountTotal = discounts.reduce((sum, d) => {
        return sum + (d.mode === "percent" ? (d.value / 100) * (invoice.subtotal || 0) : d.value);
    }, 0);
    const discountPercent = invoice.subtotal ? (discountTotal / invoice.subtotal) * 100 : 0;

    if (discountPercent > 30) {
        issues.push({
            id: "high-discount",
            severity: "warning",
            category: "Pricing",
            title: "Unusually high discount",
            description: `Discount of ${discountPercent.toFixed(0)}% is higher than typical (max 30%).`,
            field: "adjustments",
        });
    }

    // Suspiciously low amount
    if (history.avgInvoiceAmount > 0 && total < history.avgInvoiceAmount * 0.1 && total > 0) {
        issues.push({
            id: "low-amount",
            severity: "warning",
            category: "Amount",
            title: "Unusually low invoice amount",
            description: `This invoice (₹${total.toLocaleString()}) is much lower than your average (₹${history.avgInvoiceAmount.toLocaleString()}).`,
            field: "total",
        });
    }

    // Suspiciously high amount
    if (history.avgInvoiceAmount > 0 && total > history.avgInvoiceAmount * 5) {
        issues.push({
            id: "high-amount",
            severity: "warning",
            category: "Amount",
            title: "Unusually high invoice amount",
            description: `This invoice (₹${total.toLocaleString()}) is 5x higher than your average (₹${history.avgInvoiceAmount.toLocaleString()}).`,
            field: "total",
        });
    }

    // Currency mismatch
    if (invoice.currency && history.clientUsualCurrency && invoice.currency !== history.clientUsualCurrency) {
        issues.push({
            id: "currency-mismatch",
            severity: "warning",
            category: "Currency",
            title: "Different currency than usual",
            description: `This client usually receives invoices in ${history.clientUsualCurrency}, but this invoice uses ${invoice.currency}.`,
            field: "currency",
            autoFix: {
                label: `Change to ${history.clientUsualCurrency}`,
                field: "currency",
                value: history.clientUsualCurrency,
            },
        });
    }

    // Duplicate items
    const itemTitles = invoice.items?.map(i => i.title?.toLowerCase().trim()).filter(Boolean) || [];
    const duplicates = itemTitles.filter((item, index) => itemTitles.indexOf(item) !== index);
    if (duplicates.length > 0) {
        issues.push({
            id: "duplicate-items",
            severity: "warning",
            category: "Items",
            title: "Duplicate line items",
            description: `Found duplicate items: ${Array.from(new Set(duplicates)).join(", ")}`,
            field: "items",
        });
    }

    // Empty notes
    if (!invoice.notes || invoice.notes.trim().length < 5) {
        issues.push({
            id: "empty-notes",
            severity: "warning",
            category: "Content",
            title: "Empty or minimal notes",
            description: "Adding notes helps clarify payment expectations.",
            field: "notes",
            autoFix: {
                label: "Add standard notes",
                field: "notes",
                value: "Thank you for your business! Please reach out if you have any questions about this invoice.",
            },
        });
    }

    return issues;
}

// ============================================================================
// Info Issue Detection
// ============================================================================

function detectInfoIssues(invoice: InvoiceReviewData): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    // Short item descriptions
    const shortDescriptions = invoice.items?.filter(
        item => item.title && item.title.length < 10
    ) || [];

    if (shortDescriptions.length > 0) {
        issues.push({
            id: "short-descriptions",
            severity: "info",
            category: "Content Quality",
            title: "Item descriptions could be improved",
            description: `${shortDescriptions.length} item(s) have very short descriptions. Consider adding more detail.`,
            field: "items",
        });
    }

    // Missing terms
    if (!invoice.terms || invoice.terms.trim().length < 10) {
        issues.push({
            id: "missing-terms",
            severity: "info",
            category: "Content",
            title: "No payment terms specified",
            description: "Adding payment terms helps set clear expectations.",
            field: "terms",
            autoFix: {
                label: "Add Net 30 terms",
                field: "terms",
                value: "Payment is due within 30 days of invoice date. Late payments may incur additional charges.",
            },
        });
    }

    return issues;
}

// ============================================================================
// AI Suggestions
// ============================================================================

function generateSuggestions(invoice: InvoiceReviewData): ReviewSuggestion[] {
    const suggestions: ReviewSuggestion[] = [];

    // Improve vague item descriptions
    invoice.items?.forEach((item, index) => {
        if (item.title && isVagueDescription(item.title)) {
            suggestions.push({
                id: `improve-desc-${index}`,
                type: "description",
                original: item.title,
                improved: improveDescription(item.title),
                reason: "More professional and descriptive",
            });
        }
    });

    return suggestions;
}

function isVagueDescription(text: string): boolean {
    const vagueTerms = ["work", "stuff", "things", "misc", "other", "dev", "design"];
    return vagueTerms.some(term => text.toLowerCase().trim() === term);
}

function improveDescription(text: string): string {
    const improvements: Record<string, string> = {
        "work": "Professional Services",
        "stuff": "Miscellaneous Services",
        "things": "Project Deliverables",
        "misc": "Miscellaneous Items",
        "other": "Additional Services",
        "dev": "Software Development Services",
        "design": "Design & Creative Services",
    };
    return improvements[text.toLowerCase().trim()] || `${text} - Professional Services`;
}

// ============================================================================
// Anomaly Detection
// ============================================================================

function detectAnomalies(
    invoice: InvoiceReviewData,
    history: HistoricalContext
): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const total = invoice.total ?? calculateTotal(invoice);

    // Sudden spike in amount
    if (history.avgInvoiceAmount > 0 && total > history.avgInvoiceAmount * 3) {
        anomalies.push({
            id: "amount-spike",
            type: "amount",
            title: "Unusual Amount Spike",
            description: `This invoice is ${(total / history.avgInvoiceAmount).toFixed(1)}x your average.`,
            severity: "warning",
            metric: {
                expected: history.avgInvoiceAmount,
                actual: total,
                unit: invoice.currency || "INR",
            },
        });
    }

    // Very short due date for low-reliability client
    if (invoice.dueDate && invoice.issueDate && history.clientReliabilityScore !== undefined) {
        const daysDiff = Math.round(
            (new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff < 7 && history.clientReliabilityScore < 70) {
            anomalies.push({
                id: "short-due-risky-client",
                type: "timing",
                title: "Short Due Date for Slow Payer",
                description: `This client has ${history.clientReliabilityScore}% reliability score but due date is in ${daysDiff} days.`,
                severity: "warning",
            });
        }
    }

    return anomalies;
}

// ============================================================================
// Risk Score Calculation
// ============================================================================

function calculateRiskScore(issues: ReviewIssue[], anomalies: Anomaly[]): number {
    let score = 0;

    // Issues add to risk
    issues.forEach(issue => {
        switch (issue.severity) {
            case "critical": score += 30; break;
            case "warning": score += 15; break;
            case "info": score += 5; break;
        }
    });

    // Anomalies add to risk
    anomalies.forEach(anomaly => {
        switch (anomaly.severity) {
            case "critical": score += 25; break;
            case "warning": score += 12; break;
            case "info": score += 3; break;
        }
    });

    return Math.min(100, score);
}

function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
    if (score >= 60) return "critical";
    if (score >= 40) return "high";
    if (score >= 20) return "medium";
    return "low";
}

// ============================================================================
// Payment Prediction
// ============================================================================

function predictPayment(
    invoice: InvoiceReviewData,
    history: HistoricalContext
): { date: string | undefined; lateProb: number } {
    if (!invoice.dueDate) {
        return { date: undefined, lateProb: 0 };
    }

    const dueDate = new Date(invoice.dueDate);
    const reliability = history.clientReliabilityScore ?? 100;
    const avgDelay = history.clientAverageDelayDays ?? 0;

    // Calculate late probability
    let lateProb = 0;
    if (reliability < 50) lateProb = 80;
    else if (reliability < 70) lateProb = 50;
    else if (reliability < 85) lateProb = 25;
    else lateProb = 10;

    // Adjust for invoice amount
    const total = invoice.total ?? calculateTotal(invoice);
    if (history.avgInvoiceAmount > 0 && total > history.avgInvoiceAmount * 2) {
        lateProb = Math.min(100, lateProb + 15);
    }

    // Predict actual payment date
    const predictedDate = new Date(dueDate);
    predictedDate.setDate(predictedDate.getDate() + Math.round(avgDelay * 0.7));

    return {
        date: predictedDate.toISOString().slice(0, 10),
        lateProb: Math.round(lateProb),
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateTotal(invoice: InvoiceReviewData): number {
    if (!invoice.items) return 0;

    let subtotal = 0;
    let tax = 0;

    invoice.items.forEach(item => {
        const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
        subtotal += lineTotal;
        tax += (lineTotal * (item.taxRate || 0)) / 100;
    });

    let adjustmentTotal = 0;
    invoice.adjustments?.forEach(adj => {
        const amount = adj.mode === "percent" ? (adj.value / 100) * subtotal : adj.value;
        adjustmentTotal += adj.type === "discount" ? -amount : amount;
    });

    return subtotal + tax + adjustmentTotal;
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// ============================================================================
// Description Polisher (AI Text Improvement)
// ============================================================================

export type PolishMode = "concise" | "professional" | "friendly" | "strict";

export async function polishDescription(
    text: string,
    mode: PolishMode
): Promise<string> {
    // In production, this would call an LLM API
    // For now, use rule-based improvements

    const cleanText = text.trim();

    switch (mode) {
        case "concise":
            return makeConcise(cleanText);
        case "professional":
            return makeProfessional(cleanText);
        case "friendly":
            return makeFriendly(cleanText);
        case "strict":
            return makeStrict(cleanText);
        default:
            return cleanText;
    }
}

function makeConcise(text: string): string {
    // Remove filler words
    return text
        .replace(/\b(very|really|just|actually|basically|simply)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

function makeProfessional(text: string): string {
    // Capitalize properly and add formal structure
    const words = text.split(" ");
    if (words.length < 3) {
        return `${capitalize(text)} Services`;
    }
    return words.map(w => capitalize(w)).join(" ");
}

function makeFriendly(text: string): string {
    return text.endsWith("!") ? text : `${text} 🙂`;
}

function makeStrict(text: string): string {
    return text.toUpperCase();
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
