import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type DashboardLayoutProps = {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
};

export function DashboardLayout({ children, userName, userEmail }: DashboardLayoutProps) {
  return (
    <div className="h-screen w-full max-w-full overflow-hidden bg-gradient-to-b from-white via-[#f7fafc] to-[#ecf2f7]">
      {/* subtle bg accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 top-16 h-[360px] w-[360px] rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute -left-32 bottom-10 h-[260px] w-[260px] rounded-full bg-emerald-400/12 blur-[120px]" />
      </div>

      <div className="relative flex h-full w-full max-w-full overflow-hidden">
        {/* Fixed Sidebar */}
        <div className="hidden lg:block lg:w-[260px] lg:shrink-0 h-full overflow-y-auto">
          <Sidebar />
        </div>

        {/* Scrollable Main Content */}
        <div className="flex flex-1 min-w-0 flex-col h-full overflow-hidden">
          <Topbar userName={userName} userEmail={userEmail} />
          <main className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
