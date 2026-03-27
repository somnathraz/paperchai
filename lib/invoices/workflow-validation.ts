export function isValidInvoiceDateOrder(issueDate?: Date | null, dueDate?: Date | null): boolean {
  if (!issueDate || !dueDate) return true;
  return dueDate.getTime() >= issueDate.getTime();
}

export function canDeliverInvoiceStatus(status?: string | null): boolean {
  if (!status) return false;
  return ["draft", "scheduled", "overdue"].includes(status);
}

export function canScheduleInvoiceStatus(status?: string | null): boolean {
  if (!status) return false;
  return ["draft", "scheduled", "overdue"].includes(status);
}

export function canSendInvoiceStatus(status?: string | null): boolean {
  if (!status) return false;
  return ["draft", "scheduled", "overdue"].includes(status);
}
