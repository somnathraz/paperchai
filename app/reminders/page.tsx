import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Queue } from "@/components/dashboard/reminders/queue";
import { UpcomingReminders } from "@/components/dashboard/reminders/upcoming";
import { HealthStats } from "@/components/dashboard/reminders/health-stats";
import { Failures } from "@/components/dashboard/reminders/failures";
import { Filters } from "@/components/dashboard/reminders/filters";

export default async function RemindersPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login?callbackUrl=/reminders");
    }

    return (
        <DashboardLayout userName={session.user?.name} userEmail={session.user?.email}>
            <div className="space-y-8 pt-2 sm:pt-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-4">
                    <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Operations</p>
                        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Reminders Service</h1>
                        <p className="text-muted-foreground">
                            Live view of your reminder queue, health, and upcoming schedule.
                        </p>
                    </div>
                    <Filters />
                </div>

                <div className="grid gap-8 grid-cols-1 xl:grid-cols-[2.5fr_1fr]">
                    <div className="space-y-8">
                        <Queue />
                        <UpcomingReminders />
                    </div>
                    <div className="space-y-8">
                        <HealthStats />
                        <Failures />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
