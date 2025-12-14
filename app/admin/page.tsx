import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
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
                        {/* TODO: Connect to real stats */}
                        <div className="text-2xl font-bold">Checking...</div>
                    </CardContent>
                </Card>

                <Card>
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
