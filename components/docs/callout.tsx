import { cn } from "@/lib/utils";
import { AlertCircle, FileText, CheckCircle, XCircle, Info } from "lucide-react";

type CalloutProps = {
    type?: "note" | "warning" | "danger" | "tip";
    title?: string;
    children: React.ReactNode;
    className?: string;
};

const icons = {
    note: Info,
    warning: AlertCircle,
    danger: XCircle,
    tip: CheckCircle
};

const styles = {
    note: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200",
    danger: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200",
    tip: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200",
};

export function Callout({ type = "note", title, children, className }: CalloutProps) {
    const Icon = icons[type];
    return (
        <div className={cn("my-6 flex gap-3 rounded-lg border p-4 text-sm", styles[type], className)}>
            <Icon className="h-5 w-5 shrink-0" />
            <div className="flex-1 space-y-1">
                {title && <div className="font-medium">{title}</div>}
                <div className="opacity-90 leading-relaxed">{children}</div>
            </div>
        </div>
    );
}
