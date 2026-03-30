/**
 * Auth Validation Utilities
 */

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (email: string): boolean => {
    return emailRegex.test(email.trim());
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (!password) {
        return { valid: false, error: "Password is required" };
    }
    if (password.length < 8) {
        return { valid: false, error: "Password must be at least 8 characters" };
    }
    return { valid: true };
};

export const validatePasswordMatch = (password: string, confirm: string): { valid: boolean; error?: string } => {
    if (password !== confirm) {
        return { valid: false, error: "Passwords must match" };
    }
    return { valid: true };
};

export const extractFirstName = (fullName?: string | null, email?: string | null): string => {
    if (fullName) {
        return fullName.split(" ")[0];
    }
    if (email) {
        return email.split("@")[0];
    }
    return "there";
};
