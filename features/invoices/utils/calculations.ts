/**
 * Invoice Calculation Utilities
 */

export interface InvoiceItem {
    title: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    total: number;
}

export const calculateItemTotal = (quantity: number, unitPrice: number): number => {
    return quantity * unitPrice;
};

export const calculateItemWithTax = (quantity: number, unitPrice: number, taxRate: number = 0): number => {
    const subtotal = calculateItemTotal(quantity, unitPrice);
    return subtotal + (subtotal * taxRate / 100);
};

export const calculateSubtotal = (items: InvoiceItem[]): number => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
};

export const calculateTotalTax = (items: InvoiceItem[]): number => {
    return items.reduce((sum, item) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTax = itemSubtotal * (item.taxRate || 0) / 100;
        return sum + itemTax;
    }, 0);
};

export const calculateGrandTotal = (items: InvoiceItem[]): number => {
    return items.reduce((sum, item) => sum + item.total, 0);
};

export const formatCurrency = (amount: number, currency: string = "INR"): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

export const generateInvoiceNumber = (prefix: string = "INV", count: number): string => {
    const paddedCount = String(count).padStart(4, '0');
    return `${prefix}-${paddedCount}`;
};

export const validateInvoiceData = (data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.clientId && !data.clientName) {
        errors.push("Client is required");
    }

    if (!data.items || data.items.length === 0) {
        errors.push("At least one item is required");
    }

    if (data.items) {
        data.items.forEach((item: InvoiceItem, index: number) => {
            if (!item.title) {
                errors.push(`Item ${index + 1}: Title is required`);
            }
            if (item.quantity <= 0) {
                errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
            }
            if (item.unitPrice <= 0) {
                errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};
