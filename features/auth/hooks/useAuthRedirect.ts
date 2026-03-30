/**
 * useAuthRedirect Hook - Redirect authenticated users
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export const useAuthRedirect = (redirectTo: string = "/dashboard") => {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "authenticated" && session) {
            router.push(redirectTo);
        }
    }, [status, session, router, redirectTo]);

    return {
        isLoading: status === "loading",
        isAuthenticated: status === "authenticated",
    };
};
