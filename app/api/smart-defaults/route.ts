"use server";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";
import {
    getWorkspaceDefaults,
    getClientDefaults,
    getProjectDefaults,
    WorkspaceDefaults,
    ClientDefaults,
    ProjectDefaults,
} from "@/lib/smart-defaults";

export type SmartDefaultsResponse = {
    workspace: WorkspaceDefaults | null;
    client: ClientDefaults | null;
    project: ProjectDefaults | null;
};

/**
 * GET /api/smart-defaults
 * 
 * Query params:
 * - clientId: Optional - get client-specific recommendations
 * - projectId: Optional - get project-specific recommendations
 * 
 * Always includes workspace-level defaults.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get("clientId");
        const projectId = searchParams.get("projectId");

        // Always fetch workspace defaults
        const workspaceDefaults = await getWorkspaceDefaults(workspace.id);

        // Fetch client defaults if clientId provided
        let clientDefaults: ClientDefaults | null = null;
        if (clientId) {
            clientDefaults = await getClientDefaults(clientId);
        }

        // Fetch project defaults if projectId provided
        let projectDefaults: ProjectDefaults | null = null;
        if (projectId) {
            projectDefaults = await getProjectDefaults(projectId);
        }

        const response: SmartDefaultsResponse = {
            workspace: workspaceDefaults,
            client: clientDefaults,
            project: projectDefaults,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching smart defaults:", error);
        return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
    }
}
