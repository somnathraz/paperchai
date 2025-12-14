
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/docs/callout";
import { DocsTabs, DocsTabsList, DocsTabsTrigger, DocsTabsContent } from "@/components/docs/tabs";

export default function BackendDocsPage() {
    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Backend Architecture</h1>
                <p className="text-lg text-muted-foreground">
                    Complete API reference for the Freelance Money Command Center.
                </p>
            </div>

            <div className="space-y-8">

                {/* API Routes */}
                <section>
                    <h2 className="text-2xl font-bold tracking-tight mb-4">API Route Inventory</h2>
                    <Callout type="note" title="Authentication Required">
                        All routes (except Auth/Webhooks) require a valid session cookie. Internal logic explicitly validates <code>workspaceId</code> ownership.
                    </Callout>

                    <DocsTabs defaultValue="core">
                        <DocsTabsList className="mb-4 flex flex-wrap h-auto gap-2 justify-start">
                            <DocsTabsTrigger value="core">Core Resources</DocsTabsTrigger>
                            <DocsTabsTrigger value="ai">AI & Automation</DocsTabsTrigger>
                            <DocsTabsTrigger value="integrations">Integrations</DocsTabsTrigger>
                            <DocsTabsTrigger value="auth">Auth & User</DocsTabsTrigger>
                            <DocsTabsTrigger value="system">System & Internal</DocsTabsTrigger>
                        </DocsTabsList>

                        <DocsTabsContent value="core" className="space-y-4">
                            <RouteTable category="Invoices" routes={[
                                { method: "POST", path: "/api/invoices", desc: "Create a new invoice draft" },
                                { method: "GET", path: "/api/invoices", desc: "List invoices (supports filtering)" },
                                { method: "PUT", path: "/api/invoices/[id]", desc: "Update invoice details" },
                                { method: "DELETE", path: "/api/invoices/[id]", desc: "Delete an invoice" },
                                { method: "POST", path: "/api/invoices/save", desc: "Auto-save invoice during editing" },
                                { method: "POST", path: "/api/invoices/send", desc: "Send invoice via email to client" },
                                { method: "POST", path: "/api/invoices/schedule", desc: "Schedule invoice for future sending" },
                                { method: "GET", path: "/api/invoices/[id]/pdf", desc: "Generate PDF (Puppeteer)" },
                                { method: "POST", path: "/api/invoices/[id]/reminders", desc: "Trigger manual reminder" },
                                { method: "POST", path: "/api/invoices/draft-reminders", desc: "Process draft reminders queue" },
                            ]} />
                            <RouteTable category="Projects & Clients" routes={[
                                { method: "GET", path: "/api/projects", desc: "List projects" },
                                { method: "POST", path: "/api/projects", desc: "Create project" },
                                { method: "GET", path: "/api/projects/[id]", desc: "Get project details" },
                                { method: "GET", path: "/api/projects/[id]/milestones", desc: "List project milestones" },
                                { method: "POST", path: "/api/projects/[id]/extract-billable-items", desc: "Convert milestone to billable item" },
                                { method: "GET", path: "/api/clients", desc: "List clients" },
                                { method: "POST", path: "/api/clients", desc: "Create client" },
                                { method: "GET", path: "/api/clients/[id]/projects", desc: "Get projects for specific client" },
                            ]} />
                            <RouteTable category="Items & Milestones" routes={[
                                { method: "GET", path: "/api/items", desc: "List saved library items" },
                                { method: "POST", path: "/api/items", desc: "Create new library item" },
                                { method: "POST", path: "/api/items/[id]/use", desc: "Increment usage count for item" },
                                { method: "POST", path: "/api/milestones/[id]/manual-action", desc: "Mark milestone as complete/paid manually" },
                            ]} />
                        </DocsTabsContent>

                        <DocsTabsContent value="ai" className="space-y-4">
                            <RouteTable category="Generative AI" routes={[
                                { method: "POST", path: "/api/ai/invoice/generate", desc: "Generate invoice JSON from prompt" },
                                { method: "POST", path: "/api/ai/review/route", desc: "AI audit of invoice content before sending" },
                                { method: "POST", path: "/api/ai/generate-template", desc: "Generate email template content" },
                            ]} />
                            <RouteTable category="Extraction & Analysis" routes={[
                                { method: "POST", path: "/api/ai/projects/extract", desc: "Extract project data from contract text" },
                                { method: "POST", path: "/api/ai/notion/extract", desc: "Analyze Notion page content" },
                                { method: "POST", path: "/api/ai/slack/extract", desc: "Analyze Slack thread for billable items" },
                            ]} />
                            <Callout type="warning" title="Rate Limits Apply">
                                All AI routes check the user's tier against the <code>usageMap</code> before processing.
                            </Callout>
                        </DocsTabsContent>

                        <DocsTabsContent value="integrations" className="space-y-4">
                            <RouteTable category="Slack Integration" routes={[
                                { method: "POST", path: "/api/integrations/slack/commands", desc: "Webhook for Slack Slash Commands" },
                                { method: "POST", path: "/api/integrations/slack/disconnect", desc: "Revoke Slack tokens" },
                            ]} />
                            <RouteTable category="Notion Integration" routes={[
                                { method: "POST", path: "/api/integrations/notion/import", desc: "General Notion page import" },
                                { method: "POST", path: "/api/integrations/notion/import/projects", desc: "Import database as Projects" },
                                { method: "POST", path: "/api/integrations/notion/import/clients", desc: "Import database as Clients" },
                                { method: "POST", path: "/api/integrations/notion/import/agreements", desc: "Import page as Agreement" },
                                { method: "POST", path: "/api/integrations/notion/import/notes", desc: "Import page as Meeting Note" },
                                { method: "POST", path: "/api/integrations/notion/draft-invoice", desc: "Create invoice from Notion data" },
                                { method: "POST", path: "/api/integrations/notion/disconnect", desc: "Revoke Notion tokens" },
                            ]} />
                        </DocsTabsContent>

                        <DocsTabsContent value="auth" className="space-y-4">
                            <RouteTable category="Authentication" routes={[
                                { method: "GET/POST", path: "/api/auth/[...nextauth]", desc: "NextAuth.js handler (Login/Logout)" },
                                { method: "POST", path: "/api/auth/signup", desc: "Register new account" },
                                { method: "POST", path: "/api/auth/verify-email", desc: "Confirm email address" },
                                { method: "POST", path: "/api/auth/request-verification", desc: "Resend verification email" },
                                { method: "POST", path: "/api/auth/reset-password", desc: "Set new password" },
                                { method: "POST", path: "/api/auth/request-reset", desc: "Send password reset email" },
                            ]} />
                            <RouteTable category="User" routes={[
                                { method: "PUT", path: "/api/user/settings", desc: "Update user profile & preferences" },
                            ]} />
                        </DocsTabsContent>

                        <DocsTabsContent value="system" className="space-y-4">
                            <RouteTable category="Workspaces" routes={[
                                { method: "GET", path: "/api/workspaces", desc: "List user workspaces" },
                                { method: "POST", path: "/api/workspaces", desc: "Create new workspace" },
                                { method: "POST", path: "/api/workspaces/switch", desc: "Switch active workspace session" },
                                { method: "POST", path: "/api/workspace/members/invite", desc: "Invite member to workspace" },
                                { method: "POST", path: "/api/workspace/members/role", desc: "Update member role" },
                                { method: "POST", path: "/api/workspace/members/remove", desc: "Remove member from workspace" },
                            ]} />
                            <RouteTable category="Cron / Internal" routes={[
                                { method: "POST", path: "/api/internal/reminders/run", desc: "CRON: Send due reminders" },
                                { method: "POST", path: "/api/internal/scheduled-invoices/run", desc: "CRON: Send scheduled invoices" },
                            ]} />
                            <RouteTable category="Settings" routes={[
                                { method: "GET", path: "/api/reminders/settings", desc: "Get workspace reminder settings" },
                                { method: "PUT", path: "/api/reminders/settings", desc: "Update reminder settings" },
                                { method: "GET", path: "/api/email-templates", desc: "List email templates" },
                                { method: "POST", path: "/api/email-templates", desc: "Create/Update template" },
                                { method: "POST", path: "/api/email-templates/send-test", desc: "Send test email" },
                            ]} />
                        </DocsTabsContent>
                    </DocsTabs>
                </section>

                {/* Rate Limiting */}
                <section>
                    <h2 className="text-2xl font-bold tracking-tight mb-4">AI Rate Limiting</h2>
                    <p className="text-muted-foreground mb-6">
                        To prevent abuse and manage costs, access to Gemini-powered features is tiered. Limits are enforced in <code>lib/ai-service.ts</code>.
                    </p>

                    <Card>
                        <CardContent className="p-0">
                            <p className="text-sm text-muted-foreground px-6 py-4">Ensure user&apos;s activeWorkspaceId is set</p>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Tier</th>
                                        <th className="px-6 py-4 font-medium">Rate Limit</th>
                                        <th className="px-6 py-4 font-medium">Max Token Context</th>
                                        <th className="px-6 py-4 font-medium">Integrations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    <tr className="bg-white dark:bg-slate-900/50">
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">FREE</td>
                                        <td className="px-6 py-4">3 requests / min</td>
                                        <td className="px-6 py-4">10k tokens</td>
                                        <td className="px-6 py-4 text-red-500">Disabled</td>
                                    </tr>
                                    <tr className="bg-emerald-50/50 dark:bg-emerald-950/20">
                                        <td className="px-6 py-4 font-bold text-emerald-700 dark:text-emerald-400">PREMIUM</td>
                                        <td className="px-6 py-4">20 requests / min</td>
                                        <td className="px-6 py-4">32k tokens</td>
                                        <td className="px-6 py-4 text-emerald-600">Enabled (5 connections)</td>
                                    </tr>
                                    <tr className="bg-purple-50/50 dark:bg-purple-950/20">
                                        <td className="px-6 py-4 font-bold text-purple-700 dark:text-purple-400">OWNER</td>
                                        <td className="px-6 py-4">100 requests / min</td>
                                        <td className="px-6 py-4">100k tokens</td>
                                        <td className="px-6 py-4 text-purple-600">Unlimited</td>
                                    </tr>
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </section>

            </div>
        </div>
    );
}

function RouteTable({ category, routes }: { category: string, routes: any[] }) {
    return (
        <Card className="mb-4">
            <div className="px-4 py-2 border-b bg-muted/20 font-semibold text-sm text-slate-700 dark:text-slate-300">
                {category}
            </div>
            <CardContent className="p-0">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 w-28">Method</th>
                            <th className="px-4 py-3 w-1/3">Endpoint</th>
                            <th className="px-4 py-3">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {routes.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-4 py-3">
                                    <MethodBadge method={r.method} />
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{r.path}</td>
                                <td className="px-4 py-3 text-muted-foreground">{r.desc}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}

function MethodBadge({ method }: { method: string }) {
    const isMulti = method.includes("/");
    if (isMulti) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {method}
            </span>
        )
    }

    const colors: any = {
        GET: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
        POST: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
        PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        DELETE: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${colors[method] || "bg-gray-100 text-gray-800"}`}>
            {method}
        </span>
    )
}
