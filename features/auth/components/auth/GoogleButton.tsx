import { ButtonHTMLAttributes } from "react";

type GoogleButtonProps = {
  label: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  disabled?: boolean;
};

export function GoogleButton({ label, onClick, disabled }: GoogleButtonProps) {
  return (
    <button
      className="flex w-full items-center justify-center gap-3 rounded-full border border-border/70 bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-lg shadow-primary/10 ring-1 ring-black/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-primary/20 hover:ring-black/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white text-xs font-bold">G</span>
      {label}
    </button>
  );
}
