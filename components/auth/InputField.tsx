import { LucideIcon } from "lucide-react";
import { ChangeEvent } from "react";

type InputFieldProps = {
  label: string;
  icon: LucideIcon;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
};

export function InputField({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
}: InputFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-4 py-3 shadow-inner shadow-black/5 focus-within:ring-2 focus-within:ring-primary/40">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <input
          type={type}
          required
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </label>
  );
}
