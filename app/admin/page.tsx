import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [userCount, workspaceCount, invoiceCount] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.invoice.count(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to the command center. Review system status and documentation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Operational health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems go</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Accounts</CardTitle>
            <CardDescription>Registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {workspaceCount.toLocaleString()} workspace{workspaceCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Total across all workspaces</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
            <CardDescription>Developer resources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              Access schemas, API references, and architecture docs from the sidebar.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
