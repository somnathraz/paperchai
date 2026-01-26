import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/docs/callout";
import { DocsTabs, DocsTabsList, DocsTabsTrigger, DocsTabsContent } from "@/components/docs/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function FrontendDocsPage() {
    return (
        <div className="max-w-6xl space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Frontend Developer Guide</h1>
                <p className="text-lg text-muted-foreground">
                    Complete documentation of all frontend features, components, and architecture.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                    <Badge>37 Pages</Badge>
                    <Badge variant="outline">7 Feature Modules</Badge>
                    <Badge variant="outline">16 Settings Pages</Badge>
                    <Badge variant="outline">Redux + Server Components</Badge>
                </div>
            </div>

            <Callout type="tip" title="Architecture Overview">
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    <li><strong>Next.js 14 App Router</strong> with Server Components for data fetching</li>
                    <li><strong>Feature-based organization</strong> in <code>features/</code> directory</li>
                    <li><strong>Redux Toolkit</strong> for complex client state (editor, UI)</li>
                    <li><strong>Prisma</strong> for database access in Server Components</li>
                </ul>
            </Callout>

            <DocsTabs defaultValue="structure">
                <DocsTabsList className="mb-6 w-full flex-wrap h-auto gap-1">
                    <DocsTabsTrigger value="structure">📁 Structure</DocsTabsTrigger>
                    <DocsTabsTrigger value="invoices">📄 Invoices</DocsTabsTrigger>
                    <DocsTabsTrigger value="dashboard">📊 Dashboard</DocsTabsTrigger>
                    <DocsTabsTrigger value="reminders">⏰ Reminders</DocsTabsTrigger>
                    <DocsTabsTrigger value="automation">🤖 Automation</DocsTabsTrigger>
                    <DocsTabsTrigger value="integrations">🔗 Integrations</DocsTabsTrigger>
                    <DocsTabsTrigger value="settings">⚙️ Settings</DocsTabsTrigger>
                    <DocsTabsTrigger value="state">🗃️ State</DocsTabsTrigger>
                </DocsTabsList>

                {/* ==================== STRUCTURE TAB ==================== */}
                <DocsTabsContent value="structure">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Directory Structure</CardTitle>
                                <CardDescription>Where code lives in the project</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-primary flex items-center gap-2">
                                            <span className="text-lg">📂</span> app/ (Routes)
                                        </h3>
                                        <Table>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs w-[180px]">app/dashboard/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Main dashboard page</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">app/invoices/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Invoice list, editor, PDF view</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">app/clients/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Client management</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">app/reminders/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Reminder queue & calendar</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">app/automation/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Automation hub</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">app/settings/*</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">16 settings subpages</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">app/api/*</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Backend API routes</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-primary flex items-center gap-2">
                                            <span className="text-lg">📂</span> features/ (Modules)
                                        </h3>
                                        <Table>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs w-[180px]">features/dashboard/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">7 components, hooks, store</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">features/invoices/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Hooks, utils, store slice</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">features/clients/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Client list components</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">features/reminders/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">7 components, hooks, store</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">features/automation/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">8 components, hooks, store</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">features/auth/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Auth forms, validation</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-mono text-xs">features/projects/</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">Project detail views</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">components/ui/</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Shadcn/Radix primitives: Button, Input, Card, Dialog, etc. Stateless.
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">components/invoices/</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Modern Editor, Templates, Send Modal, AI Panel
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">components/settings/</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    15 settings components including Notion wizard
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DocsTabsContent>

                {/* ==================== INVOICES TAB ==================== */}
                <DocsTabsContent value="invoices">
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Pages</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Route</TableHead>
                                                <TableHead>Purpose</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell className="font-mono text-xs">/invoices</TableCell>
                                                <TableCell>Template gallery (Server)</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-mono text-xs">/invoices/new</TableCell>
                                                <TableCell>Modern Editor (Client)</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-mono text-xs">/invoices/[id]/pdf-view</TableCell>
                                                <TableCell>PDF preview (Server)</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Modern Editor Components</CardTitle>
                                    <CardDescription>components/invoices/modern-editor/</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[200px]">
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex justify-between">
                                                <code className="text-xs">modern-editor.tsx</code>
                                                <span className="text-muted-foreground">Main wrapper</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">canvas-preview.tsx</code>
                                                <span className="text-muted-foreground">Live preview</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">properties-panel.tsx</code>
                                                <span className="text-muted-foreground">Form controls</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">editor-header.tsx</code>
                                                <span className="text-muted-foreground">Top bar actions</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">ai-panel.tsx</code>
                                                <span className="text-muted-foreground">AI suggestions</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">AIReviewPanel.tsx</code>
                                                <span className="text-muted-foreground">AI review</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">SendInvoiceModal.tsx</code>
                                                <span className="text-muted-foreground">Send flow</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <code className="text-xs">template-sidebar.tsx</code>
                                                <span className="text-muted-foreground">Template picker</span>
                                            </li>
                                        </ul>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>State Management</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                                        <p className="font-semibold text-sm mb-2">Redux: <code>lib/store/slices/editorSlice.ts</code></p>
                                        <ul className="text-xs font-mono space-y-1 text-muted-foreground">
                                            <li>setInvoiceField(field, value)</li>
                                            <li>addInvoiceItem(item)</li>
                                            <li>removeInvoiceItem(index)</li>
                                            <li>updateInvoiceItem(index, field, value)</li>
                                            <li>setBranding(config)</li>
                                            <li>resetEditor()</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                                        <p className="font-semibold text-sm mb-2">Utils: <code>features/invoices/utils/</code></p>
                                        <ul className="text-xs space-y-1 text-muted-foreground">
                                            <li><code>calculations.ts</code> - Tax, totals</li>
                                            <li><code>index.ts</code> - Exports</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

                {/* ==================== DASHBOARD TAB ==================== */}
                <DocsTabsContent value="dashboard">
                    <div className="space-y-6">
                        <Callout type="note" title="Hybrid Fetching">
                            Dashboard uses Server Components for layout + Client Components with hooks for real-time stats.
                        </Callout>

                        <Card>
                            <CardHeader>
                                <CardTitle>Components</CardTitle>
                                <CardDescription>features/dashboard/components/</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Component</TableHead>
                                            <TableHead>File</TableHead>
                                            <TableHead>Description</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">StatsCards</TableCell>
                                            <TableCell className="font-mono text-xs">StatsCards.tsx</TableCell>
                                            <TableCell>4 KPI cards with sparklines</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">CashflowWidget</TableCell>
                                            <TableCell className="font-mono text-xs">CashflowWidget.tsx</TableCell>
                                            <TableCell>Revenue chart (Recharts)</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">ActivityWidget</TableCell>
                                            <TableCell className="font-mono text-xs">ActivityWidget.tsx</TableCell>
                                            <TableCell>Recent activity feed</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">InvoiceTableWidget</TableCell>
                                            <TableCell className="font-mono text-xs">InvoiceTableWidget.tsx</TableCell>
                                            <TableCell>Recent invoices table</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Hooks & Store</CardTitle>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                                    <p className="font-semibold text-sm mb-2">useDashboard()</p>
                                    <p className="text-xs text-muted-foreground">
                                        Fetches /api/dashboard/stats. Returns stats, cashflow, activity, isLoading.
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                                    <p className="font-semibold text-sm mb-2">dashboardSlice.ts</p>
                                    <p className="text-xs text-muted-foreground">
                                        Stores fetched data. Actions: setStats, setActivity, setCashflow.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

                {/* ==================== REMINDERS TAB ==================== */}
                <DocsTabsContent value="reminders">
                    <div className="space-y-6">
                        <div className="border border-l-4 border-l-amber-500 rounded p-4 bg-amber-50/10">
                            <h3 className="font-semibold">Feature Location</h3>
                            <code className="text-sm">features/reminders/</code>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Components (7)</CardTitle>
                                <CardDescription>features/reminders/components/</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Component</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Purpose</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">queue.tsx</TableCell>
                                            <TableCell>10KB</TableCell>
                                            <TableCell>Main reminder queue with actions</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">upcoming.tsx</TableCell>
                                            <TableCell>5.7KB</TableCell>
                                            <TableCell>Upcoming reminders list</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">filters.tsx</TableCell>
                                            <TableCell>6KB</TableCell>
                                            <TableCell>Filter controls (status, client)</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">calendar-modal.tsx</TableCell>
                                            <TableCell>5.7KB</TableCell>
                                            <TableCell>Calendar view modal</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">timeline-drawer.tsx</TableCell>
                                            <TableCell>5KB</TableCell>
                                            <TableCell>Invoice reminder timeline</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">health-stats.tsx</TableCell>
                                            <TableCell>3.3KB</TableCell>
                                            <TableCell>Health metrics cards</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">failures.tsx</TableCell>
                                            <TableCell>3.5KB</TableCell>
                                            <TableCell>Failed reminders list</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Slack Integration</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    <code className="text-xs bg-muted px-1 rounded">components/reminders/slack-notification-toggle.tsx</code>
                                    <p className="text-muted-foreground mt-2">Toggle Slack notifications for reminders</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Store</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    <code className="text-xs bg-muted px-1 rounded">features/reminders/store/</code>
                                    <p className="text-muted-foreground mt-2">reminderSlice: queue, filters, health stats</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DocsTabsContent>

                {/* ==================== AUTOMATION TAB ==================== */}
                <DocsTabsContent value="automation">
                    <div className="space-y-6">
                        <div className="border border-l-4 border-l-violet-500 rounded p-4 bg-violet-50/10">
                            <h3 className="font-semibold">Feature Location</h3>
                            <code className="text-sm">features/automation/</code>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Components (8)</CardTitle>
                                <CardDescription>features/automation/components/</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Component</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Purpose</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">RunningAutomations.tsx</TableCell>
                                            <TableCell>7KB</TableCell>
                                            <TableCell>Active Notion/Slack imports</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">IntegrationRecommendations.tsx</TableCell>
                                            <TableCell>6.2KB</TableCell>
                                            <TableCell>Connect Notion/Slack CTAs</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">pipeline.tsx</TableCell>
                                            <TableCell>4.1KB</TableCell>
                                            <TableCell>Import pipeline visualization</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">rules.tsx</TableCell>
                                            <TableCell>5.1KB</TableCell>
                                            <TableCell>Automation rules config</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">activity-feed.tsx</TableCell>
                                            <TableCell>2.8KB</TableCell>
                                            <TableCell>Automation activity log</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">revenue-impact.tsx</TableCell>
                                            <TableCell>3KB</TableCell>
                                            <TableCell>Revenue impact metrics</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">client-insights.tsx</TableCell>
                                            <TableCell>3KB</TableCell>
                                            <TableCell>Client behavior insights</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">settings-summary.tsx</TableCell>
                                            <TableCell>2.7KB</TableCell>
                                            <TableCell>Quick settings overview</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
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
                                        <span className="text-2xl">📓</span> Notion Integration
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="font-semibold text-sm">Import Wizard</p>
                                        <code className="text-xs bg-muted px-1 rounded block mt-1">
                                            components/settings/notion-import-wizard.tsx
                                        </code>
                                        <p className="text-xs text-muted-foreground mt-1">25KB - Multi-step wizard for importing from Notion</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">OAuth Flow</p>
                                        <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                                            <li>• GET /api/integrations/notion/oauth/authorize</li>
                                            <li>• GET /api/integrations/notion/oauth/callback</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Import Types</p>
                                        <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                                            <li>• Projects • Clients • Agreements • Notes</li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-purple-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="text-2xl">💬</span> Slack Integration
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="font-semibold text-sm">Notification Toggle</p>
                                        <code className="text-xs bg-muted px-1 rounded block mt-1">
                                            components/reminders/slack-notification-toggle.tsx
                                        </code>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">OAuth Flow</p>
                                        <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                                            <li>• GET /api/integrations/slack/oauth/authorize</li>
                                            <li>• GET /api/integrations/slack/oauth/callback</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Features</p>
                                        <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                                            <li>• Reminder notifications</li>
                                            <li>• Slash commands (/invoice)</li>
                                            <li>• Channel imports</li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Integration Settings Page</CardTitle>
                                <CardDescription>/settings/integrations</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Manage connected accounts, view import history, configure sync settings.
                                </p>
                                <div className="mt-4 flex gap-2">
                                    <Badge variant="outline">connected-accounts.tsx</Badge>
                                    <Badge variant="outline">notion-import-wizard.tsx</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

                {/* ==================== SETTINGS TAB ==================== */}
                <DocsTabsContent value="settings">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Settings Pages (16)</CardTitle>
                                <CardDescription>app/settings/*/page.tsx</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { route: '/settings/profile', desc: 'User profile & avatar' },
                                        { route: '/settings/workspace', desc: 'Workspace info, logo' },
                                        { route: '/settings/invoices', desc: 'Invoice defaults' },
                                        { route: '/settings/payment', desc: 'Payment methods' },
                                        { route: '/settings/reminders', desc: 'Reminder settings' },
                                        { route: '/settings/email-templates', desc: 'Email templates' },
                                        { route: '/settings/whatsapp-templates', desc: 'WhatsApp templates' },
                                        { route: '/settings/integrations', desc: 'Notion/Slack' },
                                        { route: '/settings/integrations/history', desc: 'Import history' },
                                        { route: '/settings/members', desc: 'Team members' },
                                        { route: '/settings/billing', desc: 'Subscription' },
                                        { route: '/settings/security', desc: 'Password, 2FA' },
                                        { route: '/settings/notifications', desc: 'Email prefs' },
                                        { route: '/settings/saved-items', desc: 'Reusable items' },
                                        { route: '/settings/export', desc: 'Data export' },
                                        { route: '/settings/ai-autopilot', desc: 'AI settings' },
                                    ].map((item) => (
                                        <div key={item.route} className="bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                                            <code className="text-xs block mb-1">{item.route}</code>
                                            <span className="text-xs text-muted-foreground">{item.desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Key Settings Components (15)</CardTitle>
                                <CardDescription>components/settings/</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Component</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Purpose</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">email-template-editor.tsx</TableCell>
                                            <TableCell>31KB</TableCell>
                                            <TableCell>Rich email template editor</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">notion-import-wizard.tsx</TableCell>
                                            <TableCell>25KB</TableCell>
                                            <TableCell>Notion import flow</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">workspace-form.tsx</TableCell>
                                            <TableCell>21KB</TableCell>
                                            <TableCell>Workspace settings form</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">reminder-settings-client.tsx</TableCell>
                                            <TableCell>19KB</TableCell>
                                            <TableCell>Global reminder config</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">saved-items-manager.tsx</TableCell>
                                            <TableCell>17KB</TableCell>
                                            <TableCell>Reusable items CRUD</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">workspace-members-panel.tsx</TableCell>
                                            <TableCell>15KB</TableCell>
                                            <TableCell>Team member management</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">settings-layout.tsx</TableCell>
                                            <TableCell>7KB</TableCell>
                                            <TableCell>Settings page shell</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">settings-sidebar.tsx</TableCell>
                                            <TableCell>5KB</TableCell>
                                            <TableCell>Settings navigation</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

                {/* ==================== STATE TAB ==================== */}
                <DocsTabsContent value="state">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Redux Store</CardTitle>
                                <CardDescription>lib/store/</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Slice</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Purpose</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">editorSlice</TableCell>
                                            <TableCell className="font-mono text-xs">lib/store/slices/editorSlice.ts</TableCell>
                                            <TableCell>Invoice editor draft state</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">uiSlice</TableCell>
                                            <TableCell className="font-mono text-xs">lib/store/slices/uiSlice.ts</TableCell>
                                            <TableCell>Global UI state (sidebar, modals)</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Server Data</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Fetched in Server Components via Prisma. Passed as props. No Redux needed.
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Client Fetching</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Custom hooks (useDashboard, useReminders) with SWR patterns for real-time data.
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">URL State</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Filters, pagination, tabs stored in URL search params for shareability.
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Feature-Specific Stores</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {[
                                        { feature: 'dashboard', path: 'features/dashboard/store/', desc: 'Stats, activity, cashflow' },
                                        { feature: 'reminders', path: 'features/reminders/store/', desc: 'Queue, filters, health' },
                                        { feature: 'automation', path: 'features/automation/store/', desc: 'Running imports, status' },
                                        { feature: 'clients', path: 'features/clients/store/', desc: 'Client list, selected' },
                                    ].map((item) => (
                                        <div key={item.feature} className="bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                                            <p className="font-medium text-sm capitalize">{item.feature}</p>
                                            <code className="text-xs text-muted-foreground block">{item.path}</code>
                                            <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

            </DocsTabs>
        </div>
    );
}
