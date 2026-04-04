/**
 * Dashboard Service - API calls for dashboard data
 */

import { apiClient } from "../client";
import { API_ENDPOINTS } from "../endpoints";

export type DashboardStats = {
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  activeClients: number;
  averagePaymentTime: number;
  reliability: number;
  outstandingAmount: number;
  balanceDueAmount: number;
  partialPaymentsAmount: number;
  collectedSparkline: number[];
  outstandingSparkline: number[];
  payoutSparkline: number[];
  reliabilitySparkline: number[];
  thisMonthPaid: number;
  lastMonthPaid: number;
};

export type RecentActivity = {
  id: string;
  type: "invoice" | "payment" | "reminder" | "client";
  description: string;
  timestamp: string;
  metadata?: any;
};

export type CashflowData = {
  paidSum: number;
  outstandingSum: number;
  paidCount: number;
  outstandingCount: number;
  paidPoints: { x: number; y: number }[];
  forecastPoints: { x: number; y: number }[];
};

export type RecentInvoice = {
  id: string;
  number: string;
  client: string;
  amount: string;
  status: string;
  due: string;
  channel: string[];
  displayStatus: string;
  amountPaid?: number;
  balanceDue?: number;
};

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  getStats: async () => {
    return apiClient.get<DashboardStats>(API_ENDPOINTS.DASHBOARD.STATS);
  },

  /**
   * Get recent activity feed
   */
  getRecentActivity: async () => {
    const result = await apiClient.get<any>(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITY);
    if (result.error) {
      return { error: result.error };
    }

    const payload = result.data;
    const activities = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.activities)
        ? payload.activities
        : [];

    return { data: activities as RecentActivity[] };
  },

  /**
   * Get cashflow data
   */
  getCashflow: async () => {
    return apiClient.get<CashflowData>(API_ENDPOINTS.DASHBOARD.CASHFLOW);
  },

  /**
   * Get recent invoices
   */
  getRecentInvoices: async () => {
    return apiClient.get<{ invoices: RecentInvoice[] }>(API_ENDPOINTS.DASHBOARD.INVOICES);
  },
};
