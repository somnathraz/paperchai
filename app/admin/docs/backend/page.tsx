import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/docs/callout";
import { DocsTabs, DocsTabsList, DocsTabsTrigger, DocsTabsContent } from "@/components/docs/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BackendDocsPage() {
    return (
        <div className="max-w-6xl space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Backend Developer Guide</h1>
                <p className="text-lg text-muted-foreground">
                    Complete API reference, security architecture, and integration documentation.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                    <Badge>76+ API Endpoints</Badge>
                    <Badge variant="outline">20 API Modules</Badge>
                    <Badge variant="outline">6 Security Components</Badge>
                    <Badge variant="outline">Prisma + NextAuth</Badge>
                </div>
            </div>

            <Callout type="tip" title="Architecture Overview">
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    <li><strong>Next.js API Routes</strong> in <code>app/api/</code> with Route Handlers</li>
                    <li><strong>Prisma ORM</strong> for PostgreSQL database access</li>
                    <li><strong>NextAuth.js</strong> for authentication (Google OAuth + Credentials)</li>
                    <li><strong>Centralized Security</strong> in <code>lib/security/</code></li>
                </ul>
            </Callout>

            <DocsTabs defaultValue="overview">
                <DocsTabsList className="mb-6 w-full flex-wrap h-auto gap-1">
                    <DocsTabsTrigger value="overview">📁 Overview</DocsTabsTrigger>
                    <DocsTabsTrigger value="security">🔒 Security</DocsTabsTrigger>
                    <DocsTabsTrigger value="core">📄 Core APIs</DocsTabsTrigger>
                    <DocsTabsTrigger value="dashboard">📊 Dashboard</DocsTabsTrigger>
                    <DocsTabsTrigger value="ai">🤖 AI Services</DocsTabsTrigger>
                    <DocsTabsTrigger value="integrations">🔗 Integrations</DocsTabsTrigger>
                    <DocsTabsTrigger value="auth">👤 Auth & Users</DocsTabsTrigger>
                    <DocsTabsTrigger value="internal">⚙️ Internal</DocsTabsTrigger>
                </DocsTabsList>

                {/* ==================== OVERVIEW TAB ==================== */}
                <DocsTabsContent value="overview">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>API Directory Structure</CardTitle>
                                <CardDescription>20 API modules organized by feature</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { path: 'api/invoices/', count: 9, desc: 'Invoice CRUD, PDF, send' },
                                        { path: 'api/integrations/', count: 17, desc: 'Notion, Slack, automations' },
                                        { path: 'api/dashboard/', count: 6, desc: 'Stats, cashflow, activity' },
                                        { path: 'api/ai/', count: 5, desc: 'Generate, extract, review' },
                                        { path: 'api/auth/', count: 6, desc: 'NextAuth, signup, reset' },
                                        { path: 'api/clients/', count: 4, desc: 'Client management' },
                                        { path: 'api/projects/', count: 5, desc: 'Project & milestones' },
                                        { path: 'api/workspace/', count: 6, desc: 'Settings, members, logo' },
                                        { path: 'api/email-templates/', count: 2, desc: 'Template CRUD' },
                                        { path: 'api/items/', count: 3, desc: 'Saved library items' },
                                        { path: 'api/reminders/', count: 1, desc: 'Reminder settings' },
                                        { path: 'api/internal/', count: 2, desc: 'CRON jobs' },
                                    ].map((item) => (
                                        <div key={item.path} className="bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                                            <div className="flex justify-between items-center mb-1">
                                                <code className="text-xs">{item.path}</code>
                                                <Badge variant="outline" className="text-xs">{item.count}</Badge>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{item.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Database</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <code>lib/prisma.ts</code> - Singleton client
                                    <br />
                                    <code>prisma/schema.prisma</code> - 35+ models
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Authentication</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <code>lib/auth.ts</code> - NextAuth config
                                    <br />
                                    Google OAuth + Credentials provider
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Email</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    <code>lib/email.ts</code> - AWS SES
                                    <br />
                                    Template-based email sending
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DocsTabsContent>

                {/* ==================== SECURITY TAB ==================== */}
                <DocsTabsContent value="security">
                    <div className="space-y-6">
                        <Callout type="warning" title="Security First">
                            All API routes should use the centralized security utilities in <code>lib/security/</code>
                        </Callout>

                        <Card>
                            <CardHeader>
                                <CardTitle>Security Modules (6 Files)</CardTitle>
                                <CardDescription>lib/security/</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>File</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Purpose</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">security.config.ts</TableCell>
                                            <TableCell>11KB</TableCell>
                                            <TableCell>Central config: rate limits, tiers, roles, audit actions</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">secure-route.ts</TableCell>
                                            <TableCell>8.5KB</TableCell>
                                            <TableCell>Route wrapper with auth, validation, rate limiting</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">workspace-auth.ts</TableCell>
                                            <TableCell>5.8KB</TableCell>
                                            <TableCell>Workspace access validation, role checking</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">rate-limit-enhanced.ts</TableCell>
                                            <TableCell>4.7KB</TableCell>
                                            <TableCell>IP, user, workspace rate limiting</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">audit-log.ts</TableCell>
                                            <TableCell>4.5KB</TableCell>
                                            <TableCell>Security event logging to database</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">index.ts</TableCell>
                                            <TableCell>0.3KB</TableCell>
                                            <TableCell>Exports all utilities</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Subscription Tiers</CardTitle>
                                    <CardDescription>Defined in security.config.ts</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tier</TableHead>
                                                <TableHead>AI Calls/mo</TableHead>
                                                <TableHead>Invoices/mo</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-medium">FREE</TableCell>
                                                <TableCell>10</TableCell>
                                                <TableCell>5</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-blue-600">STARTER</TableCell>
                                                <TableCell>100</TableCell>
                                                <TableCell>50</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-purple-600">PROFESSIONAL</TableCell>
                                                <TableCell>500</TableCell>
                                                <TableCell>Unlimited</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-amber-600">BUSINESS</TableCell>
                                                <TableCell>2000</TableCell>
                                                <TableCell>Unlimited</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-emerald-600">ENTERPRISE</TableCell>
                                                <TableCell>Unlimited</TableCell>
                                                <TableCell>Unlimited</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Rate Limit Profiles</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[200px]">
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex justify-between">
                                                <code className="text-xs">sensitive</code>
                                                <span className="text-muted-foreground">5 req/min</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">standard</code>
                                                <span className="text-muted-foreground">60 req/min</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">permissive</code>
                                                <span className="text-muted-foreground">120 req/min</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">ai</code>
                                                <span className="text-muted-foreground">10 req/min</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">pdf</code>
                                                <span className="text-muted-foreground">5 req/min</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">email</code>
                                                <span className="text-muted-foreground">20 req/min</span>
                                            </li>
                                        </ul>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DocsTabsContent>

                {/* ==================== CORE APIS TAB ==================== */}
                <DocsTabsContent value="core">
                    <div className="space-y-6">
                        <RouteTable category="Invoices (9 endpoints)" routes={[
                            { method: "GET", path: "/api/invoices", desc: "List invoices with filters" },
                            { method: "POST", path: "/api/invoices", desc: "Create new invoice" },
                            { method: "GET", path: "/api/invoices/[id]", desc: "Get invoice details" },
                            { method: "PUT", path: "/api/invoices/[id]", desc: "Update invoice" },
                            { method: "DELETE", path: "/api/invoices/[id]", desc: "Delete invoice" },
                            { method: "POST", path: "/api/invoices/save", desc: "Auto-save during editing" },
                            { method: "POST", path: "/api/invoices/send", desc: "Send invoice via email" },
                            { method: "POST", path: "/api/invoices/schedule", desc: "Schedule future send" },
                            { method: "GET", path: "/api/invoices/[id]/pdf", desc: "Generate PDF (Puppeteer)" },
                        ]} />

                        <RouteTable category="Clients (4 endpoints)" routes={[
                            { method: "GET", path: "/api/clients", desc: "List clients" },
                            { method: "POST", path: "/api/clients", desc: "Create client" },
                            { method: "GET", path: "/api/clients/[id]", desc: "Get client details" },
                            { method: "GET", path: "/api/clients/[id]/projects", desc: "Client's projects" },
                        ]} />

                        <RouteTable category="Projects (5 endpoints)" routes={[
                            { method: "GET", path: "/api/projects", desc: "List projects" },
                            { method: "POST", path: "/api/projects", desc: "Create project" },
                            { method: "GET", path: "/api/projects/[id]", desc: "Get project details" },
                            { method: "GET", path: "/api/projects/[id]/milestones", desc: "Project milestones" },
                            { method: "POST", path: "/api/projects/[id]/extract-billable-items", desc: "Extract billable items" },
                        ]} />

                        <RouteTable category="Items & Milestones" routes={[
                            { method: "GET", path: "/api/items", desc: "List saved items" },
                            { method: "POST", path: "/api/items", desc: "Create item" },
                            { method: "POST", path: "/api/items/[id]/use", desc: "Increment usage" },
                            { method: "POST", path: "/api/milestones/[id]/manual-action", desc: "Complete/paid" },
                        ]} />
                    </div>
                </DocsTabsContent>

                {/* ==================== DASHBOARD TAB ==================== */}
                <DocsTabsContent value="dashboard">
                    <div className="space-y-6">
                        <Callout type="note" title="Dashboard APIs">
                            All dashboard endpoints are read-only and optimized for fast aggregation queries.
                        </Callout>

                        <RouteTable category="Dashboard Endpoints (6)" routes={[
                            { method: "GET", path: "/api/dashboard/stats", desc: "Revenue, outstanding, reliability metrics" },
                            { method: "GET", path: "/api/dashboard/cashflow", desc: "Monthly cashflow data for charts" },
                            { method: "GET", path: "/api/dashboard/invoices", desc: "Recent invoices list" },
                            { method: "GET", path: "/api/dashboard/reminders", desc: "Upcoming reminders queue" },
                            { method: "GET", path: "/api/dashboard/recent-activity", desc: "Activity feed data" },
                            { method: "GET", path: "/api/dashboard/automation", desc: "Automation status summary" },
                        ]} />

                        <Card>
                            <CardHeader>
                                <CardTitle>Stats Response Structure</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded text-xs overflow-x-auto">
                                    {`{
  totalRevenue: number,
  outstandingAmount: number,
  pendingInvoices: number,
  averagePaymentTime: number,
  reliability: number,
  thisMonthPaid: number,
  lastMonthPaid: number,
  collectedSparkline: number[],
  outstandingSparkline: number[]
}`}
                                </pre>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

                {/* ==================== AI TAB ==================== */}
                <DocsTabsContent value="ai">
                    <div className="space-y-6">
                        <Callout type="warning" title="Rate Limited">
                            AI endpoints are rate-limited based on user tier. Uses Gemini 1.5 Flash.
                        </Callout>

                        <RouteTable category="Generative AI (5 endpoints)" routes={[
                            { method: "POST", path: "/api/ai/invoice/generate", desc: "Generate invoice from prompt" },
                            { method: "POST", path: "/api/ai/generate-template", desc: "Generate email template" },
                            { method: "POST", path: "/api/ai/projects/extract", desc: "Extract project from contract" },
                            { method: "POST", path: "/api/ai/notion/extract", desc: "Analyze Notion page" },
                            { method: "POST", path: "/api/ai/slack/extract", desc: "Extract from Slack thread" },
                        ]} />

                        <RouteTable category="AI Review" routes={[
                            { method: "POST", path: "/api/ai-review", desc: "AI audit before sending invoice" },
                        ]} />

                        <Card>
                            <CardHeader>
                                <CardTitle>AI Service Implementation</CardTitle>
                                <CardDescription>lib/ai-service.ts</CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <p>Uses <code>@google/generative-ai</code> SDK with Gemini 1.5 Flash model.</p>
                                <ul className="list-disc pl-4 text-muted-foreground">
                                    <li>Structured JSON output via response schema</li>
                                    <li>Token counting for context limits</li>
                                    <li>Usage tracking per user/workspace</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

                {/* ==================== INTEGRATIONS TAB ==================== */}
                <DocsTabsContent value="integrations">
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="border-blue-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="text-2xl">📓</span> Notion (10 routes)
                                    </CardTitle>
                                    <CardDescription>api/integrations/notion/</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[200px]">
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex gap-2">
                                                <MethodBadge method="GET" />
                                                <code className="text-xs">/oauth/authorize</code>
                                            </li>
                                            <li className="flex gap-2">
                                                <MethodBadge method="GET" />
                                                <code className="text-xs">/oauth/callback</code>
                                            </li>
                                            <li className="flex gap-2">
                                                <MethodBadge method="GET" />
                                                <code className="text-xs">/databases</code>
                                            </li>
                                            <li className="flex gap-2">
                                                <MethodBadge method="GET" />
                                                <code className="text-xs">/pages</code>
                                            </li>
                                            <li className="flex gap-2">
                                                <MethodBadge method="POST" />
                                                <code className="text-xs">/import/projects</code>
                                            </li>
                                            <li className="flex gap-2">
                                                <MethodBadge method="POST" />
                                                <code className="text-xs">/import/clients</code>
                                            </li>
                                            <li className="flex gap-2">
                                                <MethodBadge method="POST" />
                                                <code className="text-xs">/import/agreements</code>
                                            </li>
                                            <li className="flex gap-2">
                                                <MethodBadge method="POST" />
                                                <code className="text-xs">/import/notes</code>
                                            </li>
                                            <li className="flex gap-2">
                                                <MethodBadge method="POST" />
                                                <code className="text-xs">/draft-invoice</code>
                                            </li>
                                            <li className="flex gap-2">
                                                <MethodBadge method="POST" />
                                                <code className="text-xs">/disconnect</code>
                                            </li>
                                        </ul>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card className="border-purple-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="text-2xl">💬</span> Slack (4 routes)
                                    </CardTitle>
                                    <CardDescription>api/integrations/slack/</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex gap-2">
                                            <MethodBadge method="GET" />
                                            <code className="text-xs">/oauth/authorize</code>
                                        </li>
                                        <li className="flex gap-2">
                                            <MethodBadge method="GET" />
                                            <code className="text-xs">/oauth/callback</code>
                                        </li>
                                        <li className="flex gap-2">
                                            <MethodBadge method="POST" />
                                            <code className="text-xs">/commands</code>
                                            <span className="text-xs text-muted-foreground">Slash commands</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <MethodBadge method="POST" />
                                            <code className="text-xs">/disconnect</code>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>

                        <RouteTable category="Integration Management" routes={[
                            { method: "GET", path: "/api/integrations/status", desc: "Connection status for all integrations" },
                            { method: "GET", path: "/api/integrations/automations", desc: "List running automations" },
                            { method: "GET", path: "/api/integrations/imports", desc: "Import history" },
                        ]} />
                    </div>
                </DocsTabsContent>

                {/* ==================== AUTH TAB ==================== */}
                <DocsTabsContent value="auth">
                    <div className="space-y-6">
                        <RouteTable category="Authentication (6 endpoints)" routes={[
                            { method: "GET/POST", path: "/api/auth/[...nextauth]", desc: "NextAuth handler" },
                            { method: "POST", path: "/api/auth/signup", desc: "Register new account" },
                            { method: "POST", path: "/api/auth/verify-email", desc: "Confirm email" },
                            { method: "POST", path: "/api/auth/request-verification", desc: "Resend verification" },
                            { method: "POST", path: "/api/auth/reset-password", desc: "Set new password" },
                            { method: "POST", path: "/api/auth/request-reset", desc: "Request reset email" },
                        ]} />

                        <RouteTable category="User & Profile" routes={[
                            { method: "PUT", path: "/api/user/settings", desc: "Update user preferences" },
                            { method: "GET", path: "/api/profile", desc: "Get current user profile" },
                        ]} />

                        <RouteTable category="Workspace Management (6 endpoints)" routes={[
                            { method: "GET", path: "/api/workspaces", desc: "List user workspaces" },
                            { method: "POST", path: "/api/workspaces", desc: "Create workspace" },
                            { method: "POST", path: "/api/workspaces/switch", desc: "Switch active workspace" },
                            { method: "POST", path: "/api/workspace/members/invite", desc: "Invite member" },
                            { method: "PUT", path: "/api/workspace/members/role", desc: "Update member role" },
                            { method: "DELETE", path: "/api/workspace/members/remove", desc: "Remove member" },
                        ]} />

                        <Card>
                            <CardHeader>
                                <CardTitle>Workspace Roles</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border">
                                        <p className="font-semibold text-sm mb-2">owner</p>
                                        <ul className="text-xs text-muted-foreground space-y-1">
                                            <li>✓ Manage members</li>
                                            <li>✓ Delete workspace</li>
                                            <li>✓ Billing access</li>
                                            <li>✓ All permissions</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border">
                                        <p className="font-semibold text-sm mb-2">admin</p>
                                        <ul className="text-xs text-muted-foreground space-y-1">
                                            <li>✓ Manage members</li>
                                            <li>✗ Delete workspace</li>
                                            <li>✗ Billing access</li>
                                            <li>✓ Content CRUD</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

                {/* ==================== INTERNAL TAB ==================== */}
                <DocsTabsContent value="internal">
                    <div className="space-y-6">
                        <Callout type="warning" title="CRON Secret Required">
                            Internal endpoints require <code>CRON_SECRET</code> header validation.
                        </Callout>

                        <RouteTable category="CRON Jobs" routes={[
                            { method: "POST", path: "/api/internal/reminders/run", desc: "Process due reminders queue" },
                            { method: "POST", path: "/api/internal/scheduled-invoices/run", desc: "Send scheduled invoices" },
                        ]} />

                        <RouteTable category="Settings APIs" routes={[
                            { method: "GET", path: "/api/reminders/settings", desc: "Get reminder settings" },
                            { method: "PUT", path: "/api/reminders/settings", desc: "Update reminder settings" },
                            { method: "GET", path: "/api/email-templates", desc: "List email templates" },
                            { method: "POST", path: "/api/email-templates", desc: "Create/update template" },
                            { method: "POST", path: "/api/email-templates/send-test", desc: "Send test email" },
                            { method: "GET", path: "/api/templates", desc: "List invoice templates" },
                        ]} />

                        <RouteTable category="Utility" routes={[
                            { method: "GET", path: "/api/health", desc: "Health check endpoint" },
                            { method: "GET", path: "/api/smart-defaults", desc: "AI-powered form defaults" },
                        ]} />

                        <Card>
                            <CardHeader>
                                <CardTitle>Vercel CRON Configuration</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded text-xs overflow-x-auto">
                                    {`// vercel.json
{
  "crons": [
    {
      "path": "/api/internal/reminders/run",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/internal/scheduled-invoices/run",
      "schedule": "0 9 * * *"
    }
  ]
}`}
                                </pre>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

            </DocsTabs>
        </div>
    );
}

function RouteTable({ category, routes }: { category: string, routes: { method: string, path: string, desc: string }[] }) {
    return (
        <Card>
            <div className="px-4 py-2 border-b bg-muted/20 font-semibold text-sm">{category}</div>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-24">Method</TableHead>
                            <TableHead className="w-1/3">Endpoint</TableHead>
                            <TableHead>Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {routes.map((r, i) => (
                            <TableRow key={i}>
                                <TableCell><MethodBadge method={r.method} /></TableCell>
                                <TableCell className="font-mono text-xs">{r.path}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{r.desc}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function MethodBadge({ method }: { method: string }) {
    const colors: Record<string, string> = {
        GET: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
        POST: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
        PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        DELETE: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    };

    if (method.includes("/")) {
        return <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{method}</span>;
    }

    return (
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors[method] || "bg-gray-100"}`}>
            {method}
        </span>
    );
}
