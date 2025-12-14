import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PrimaryButtonProps = {
  children: ReactNode;
  icon?: ReactNode;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  className?: string;
  disabled?: boolean;
};

export function PrimaryButton({ children, icon, type = "button", onClick, className, disabled }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_16px_50px_-20px_rgba(16,185,129,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_60px_-24px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        className
      )}
      disabled={disabled}
    >
      {children}
      {icon}
    </button>
  );
}
