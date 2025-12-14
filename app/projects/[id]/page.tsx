import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { ProjectDetailWidget } from "@/features/projects/components/ProjectDetailWidget";

type PageProps = {
    params: {
        id: string;
    };
};

export default async function ProjectDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        redirect("/dashboard");
    }

    // Server component only handles auth and passing ID. Data fetching is in Client Widget (Redux Gold Standard).

    return (
        <DashboardLayout userName={session.user.name} userEmail={session.user.email}>
            <ProjectDetailWidget projectId={params.id} />
        </DashboardLayout>
    );
}
