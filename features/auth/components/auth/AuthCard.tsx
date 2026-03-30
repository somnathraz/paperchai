import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  children: ReactNode;
  className?: string;
};

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-md space-y-6 self-center rounded-[32px] border border-white/20 bg-white/90 p-8 shadow-[0_40px_140px_-60px_rgba(0,0,0,0.45)] backdrop-blur-2xl before:absolute before:inset-x-0 before:-top-px before:h-[1px] before:bg-white/40 lg:mt-4",
        className
      )}
    >
      {children}
    </div>
  );
}
