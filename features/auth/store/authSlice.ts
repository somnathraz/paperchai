/**
 * Auth Slice - Redux state management for authentication
 * 
 * Manages user auth state, login/signup/logout flows, and error handling
 */

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { authService } from "@/lib/api/services";
import { signIn, signOut } from "next-auth/react";

// ==================== TYPES ====================
export interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    status: string | null; // Success messages
}

// ==================== ASYNC THUNKS ====================

/**
 * Login with credentials
 */
export const loginWithCredentials = createAsyncThunk(
    "auth/loginWithCredentials",
    async (
        { email, password }: { email: string; password: string },
        { rejectWithValue }
    ) => {
        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
                callbackUrl: "/dashboard",
            });

            if (res?.error) {
                const message =
                    res.error === "Account not found"
                        ? "No account found for this email."
                        : res.error === "Use Google sign-in for this account"
                            ? "This account uses Google sign-in. Please continue with Google."
                            : res.error === "Missing credentials"
                                ? "Enter your email and password."
                                : res.error === "Invalid credentials"
                                    ? "Invalid email or password."
                                    : res.error === "Verify email to continue"
                                        ? "Please verify your email before signing in."
                                        : "Could not sign in. Please try again.";

                return rejectWithValue(message);
            }

            return { email };
        } catch (error: any) {
            return rejectWithValue(error.message || "Login failed");
        }
    }
);

/**
 * Login with Google
 */
export const loginWithGoogle = createAsyncThunk(
    "auth/loginWithGoogle",
    async (_, { rejectWithValue }) => {
        try {
            await signIn("google", { callbackUrl: "/dashboard" });
            return {};
        } catch (error: any) {
            return rejectWithValue("Google sign-in failed. Please try again.");
        }
    }
);

/**
 * Sign up new user
 */
export const signup = createAsyncThunk(
    "auth/signup",
    async (
        { email, password }: { email: string; password: string },
        { rejectWithValue }
    ) => {
        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const message =
                    res.status === 409
                        ? "An account with this email already exists."
                        : data.error || "Could not create account. Try again.";
                return rejectWithValue(message);
            }

            const data = await res.json();
            return {
                message: "Account created. Check your email for a verification link.",
                verifyUrl: data?.verifyUrl,
            };
        } catch (error: any) {
            return rejectWithValue("Could not create account. Please try again.");
        }
    }
);

/**
 * Request password reset
 */
export const forgotPassword = createAsyncThunk(
    "auth/forgotPassword",
    async ({ email }: { email: string }, { rejectWithValue }) => {
        try {
            const result = await authService.forgotPassword({ email });
            if (result.error) {
                return rejectWithValue(result.error);
            }
            return { message: "Password reset link sent. Check your email." };
        } catch (error: any) {
            return rejectWithValue("Could not send reset email. Please try again.");
        }
    }
);

/**
 * Reset password with token
 */
export const resetPassword = createAsyncThunk(
    "auth/resetPassword",
    async (
        { token, password }: { token: string; password: string },
        { rejectWithValue }
    ) => {
        try {
            const result = await authService.resetPassword({ token, password });
            if (result.error) {
                return rejectWithValue(result.error);
            }
            return { message: "Password reset successful. You can now log in." };
        } catch (error: any) {
            return rejectWithValue("Could not reset password. Please try again.");
        }
    }
);

/**
 * Resend verification email
 */
export const resendVerification = createAsyncThunk(
    "auth/resendVerification",
    async ({ email }: { email: string }, { rejectWithValue }) => {
        try {
            const res = await fetch("/api/auth/request-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                return rejectWithValue(data.error || "Could not send verification email.");
            }

            const data = await res.json();
            return {
                message: "Verification link sent. Check your email.",
                verifyUrl: data?.verifyUrl,
            };
        } catch (error: any) {
            return rejectWithValue("Could not send verification email.");
        }
    }
);

/**
 * Logout user
 */
export const logout = createAsyncThunk("auth/logout", async () => {
    await signOut({ callbackUrl: "/login" });
});

// ==================== SLICE ====================

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    status: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        clearError(state) {
            state.error = null;
        },
        clearStatus(state) {
            state.status = null;
        },
        setUser(state, action: PayloadAction<User>) {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
        clearUser(state) {
            state.user = null;
            state.isAuthenticated = false;
        },
    },
    extraReducers: (builder) => {
        // Login with credentials
        builder
            .addCase(loginWithCredentials.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                state.status = null;
            })
            .addCase(loginWithCredentials.fulfilled, (state) => {
                state.isLoading = false;
                state.isAuthenticated = true;
            })
            .addCase(loginWithCredentials.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Login with Google
        builder
            .addCase(loginWithGoogle.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginWithGoogle.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(loginWithGoogle.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Signup
        builder
            .addCase(signup.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                state.status = null;
            })
            .addCase(signup.fulfilled, (state, action) => {
                state.isLoading = false;
                state.status = action.payload.message;
            })
            .addCase(signup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Forgot password
        builder
            .addCase(forgotPassword.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                state.status = null;
            })
            .addCase(forgotPassword.fulfilled, (state, action) => {
                state.isLoading = false;
                state.status = action.payload.message;
            })
            .addCase(forgotPassword.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Reset password
        builder
            .addCase(resetPassword.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                state.status = null;
            })
            .addCase(resetPassword.fulfilled, (state, action) => {
                state.isLoading = false;
                state.status = action.payload.message;
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Resend verification
        builder
            .addCase(resendVerification.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                state.status = null;
            })
            .addCase(resendVerification.fulfilled, (state, action) => {
                state.isLoading = false;
                state.status = action.payload.message;
            })
            .addCase(resendVerification.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Logout
        builder.addCase(logout.fulfilled, (state) => {
            state.user = null;
            state.isAuthenticated = false;
        });
    },
});

export const { clearError, clearStatus, setUser, clearUser } = authSlice.actions;

export default authSlice.reducer;
