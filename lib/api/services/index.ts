/**
 * API Services - Centralized export
 * 
 * Import services from here instead of individual files:
 * import { authService, invoiceService } from '@/lib/api/services';
 */
export * from './reminder.service';
export * from './automation.service';
export { authService } from './auth.service';
export { invoiceService } from './invoice.service';
export { clientService } from './client.service';
export { projectService } from './project.service';
export { dashboardService } from './dashboard.service';

// Export types
export type { LoginPayload, SignupPayload } from './auth.service';
export type { SaveInvoicePayload, SendInvoicePayload } from './invoice.service';
export type { CreateClientPayload, UpdateClientPayload } from './client.service';
export type { CreateProjectPayload, UpdateProjectPayload } from './project.service';
export type { DashboardStats, RecentActivity, CashflowData, RecentInvoice } from './dashboard.service';
