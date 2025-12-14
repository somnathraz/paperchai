/**
 * useAuth Hook - Convenient access to auth state and actions
 */

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    loginWithCredentials,
    loginWithGoogle,
    signup,
    forgotPassword,
    resetPassword,
    resendVerification,
    logout,
    clearError,
    clearStatus,
} from "../store/authSlice";

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const auth = useAppSelector((state) => state.auth);

    return {
        // State
        user: auth.user,
        isAuthenticated: auth.isAuthenticated,
        isLoading: auth.isLoading,
        error: auth.error,
        status: auth.status,

        // Actions
        login: (email: string, password: string) =>
            dispatch(loginWithCredentials({ email, password })),
        loginWithGoogle: () => dispatch(loginWithGoogle()),
        signup: (email: string, password: string) =>
            dispatch(signup({ email, password })),
        forgotPassword: (email: string) => dispatch(forgotPassword({ email })),
        resetPassword: (token: string, password: string) =>
            dispatch(resetPassword({ token, password })),
        resendVerification: (email: string) =>
            dispatch(resendVerification({ email })),
        logout: () => dispatch(logout()),

        // Utilities
        clearError: () => dispatch(clearError()),
        clearStatus: () => dispatch(clearStatus()),
    };
};
