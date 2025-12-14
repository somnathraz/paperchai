/**
 * Auth Service - Handles all authentication API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export type LoginPayload = {
    email: string;
    password: string;
};

export type SignupPayload = {
    email: string;
    password: string;
    name: string;
};

export type ForgotPasswordPayload = {
    email: string;
};

export type ResetPasswordPayload = {
    token: string;
    password: string;
};

export const authService = {
    /**
     * Login user
     */
    login: async (payload: LoginPayload) => {
        return apiClient.post(API_ENDPOINTS.AUTH.LOGIN, payload);
    },

    /**
     * Register new user
     */
    signup: async (payload: SignupPayload) => {
        return apiClient.post(API_ENDPOINTS.AUTH.SIGNUP, payload);
    },

    /**
     * Request password reset
     */
    forgotPassword: async (payload: ForgotPasswordPayload) => {
        return apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, payload);
    },

    /**
     * Reset password with token
     */
    resetPassword: async (payload: ResetPasswordPayload) => {
        return apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload);
    },

    /**
     * Verify email
     */
    verifyEmail: async (token: string) => {
        return apiClient.get(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
    },

    /**
     * Logout user
     */
    logout: async () => {
        return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    },
};
