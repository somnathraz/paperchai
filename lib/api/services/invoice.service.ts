/**
 * Invoice Service - Handles all invoice-related API calls
 */

import { apiClient } from "../client";
import { API_ENDPOINTS } from "../endpoints";
import { InvoiceFormState } from "@/components/invoices/invoice-form";

export type SaveInvoicePayload = InvoiceFormState & {
  templateSlug?: string;
  sections?: any[];
  reminderCadence?: string;
  attachments?: any[];
};

export type SendInvoicePayload = {
  invoiceId: string;
  channel: "email" | "whatsapp" | "both";
};

export type ScheduleInvoicePayload = {
  invoiceId: string;
  scheduledSendAt: string;
  channel: "email" | "whatsapp" | "both";
  templateSlug?: string;
  reminderCadence?: string;
};

export type RecordPaymentPayload = {
  invoiceId: string;
  amount: number;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentNote?: string;
};

export const invoiceService = {
  /**
   * Get all invoices
   */
  getAll: async () => {
    return apiClient.get(API_ENDPOINTS.INVOICES.LIST);
  },

  /**
   * Save invoice (create or update)
   */
  save: async (payload: SaveInvoicePayload) => {
    return apiClient.post(API_ENDPOINTS.INVOICES.SAVE, payload);
  },

  /**
   * Send invoice immediately
   */
  send: async (payload: SendInvoicePayload) => {
    return apiClient.post(API_ENDPOINTS.INVOICES.SEND, payload);
  },

  /**
   * Schedule invoice for future send
   */
  schedule: async (payload: ScheduleInvoicePayload) => {
    return apiClient.post(API_ENDPOINTS.INVOICES.SCHEDULE, payload);
  },

  /**
   * Get invoice PDF
   */
  getPdf: async (invoiceId: string) => {
    return apiClient.get(API_ENDPOINTS.INVOICES.PDF(invoiceId));
  },

  /**
   * Update invoice status
   */
  updateStatus: async (invoiceId: string, status: string) => {
    return apiClient.patch(API_ENDPOINTS.INVOICES.STATUS(invoiceId), { status });
  },

  recordPayment: async (payload: RecordPaymentPayload) => {
    const { invoiceId, ...body } = payload;
    return apiClient.post(API_ENDPOINTS.INVOICES.PAYMENT(invoiceId), body);
  },

  generateRazorpayPaymentLink: async (invoiceId: string) => {
    return apiClient.post(API_ENDPOINTS.INVOICES.RAZORPAY_PAYMENT_LINK(invoiceId));
  },
};
