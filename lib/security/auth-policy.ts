export const authPolicy = {
  messages: {
    invalidCredentials: "Invalid credentials",
    verifyEmail: "Verify email to continue",
    genericReset: "If the email exists, a reset link has been sent.",
    genericSignup: "If this email can be used to sign up, next steps have been sent.",
    genericVerify: "If the email exists and is unverified, a verification link has been sent.",
  },
} as const;

export function isActiveUserStatus(status?: string | null): boolean {
  return status === "ACTIVE";
}
