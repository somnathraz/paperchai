import { Sparkles } from "lucide-react";

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-emerald-500 to-primary text-white shadow-inner shadow-primary/30">
        <Sparkles className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{subtitle}</p>
        <p className="text-lg font-semibold text-foreground">{title}</p>
      </div>
    </div>
  );
}
