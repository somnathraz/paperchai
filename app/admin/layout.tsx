import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Book,
    LayoutDashboard,
    Database,
    Server,
    ShieldCheck,
    Code
} from "lucide-react";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !isAdmin(session.user.email)) {
        redirect("/dashboard");
    }

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-white dark:bg-slate-900 shadow-sm flex-shrink-0 flex flex-col">
                <div className="p-6 border-b">
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
                            A
                        </div>
                        <span className="font-semibold text-lg">Admin Portal</span>
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
                    {/* Main Section */}
                    <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">
                            Platform
                        </div>
                        <div className="space-y-1">
                            <NavLink href="/admin" icon={LayoutDashboard}>Overview</NavLink>
                            <NavLink href="/admin/feature-flags" icon={ShieldCheck}>Feature Flags</NavLink>
                        </div>
                    </div>

                    {/* Docs Section */}
                    <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">
                            Developer Docs
                        </div>
                        <div className="space-y-1">
                            <NavLink href="/admin/docs" icon={Book}>Introduction</NavLink>
                            <NavLink href="/admin/docs/frontend" icon={LayoutDashboard}>Frontend Arch</NavLink>
                            <NavLink href="/admin/docs/backend" icon={Server}>Backend API</NavLink>
                            <NavLink href="/admin/docs/database" icon={Database}>Database Schema</NavLink>
                        </div>
                    </div>

                    {/* System Section */}
                    <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">
                            System
                        </div>
                        <div className="space-y-1">
                            <NavLink href="/admin/logs" icon={Code}>System Logs</NavLink>
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t text-xs text-muted-foreground text-center">
                    Wait, you're the admin? Nice.
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="mx-auto max-w-5xl p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
            <Icon className="h-4 w-4" />
            {children}
        </Link>
    );
}
