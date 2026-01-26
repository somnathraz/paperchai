import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/docs/callout";
import { DocsTabs, DocsTabsList, DocsTabsTrigger, DocsTabsContent } from "@/components/docs/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SystemLogsDocsPage() {
    return (
        <div className="max-w-6xl space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">System Logs & Audit Trail</h1>
                <p className="text-lg text-muted-foreground">
                    Security event logging, audit trail implementation, and compliance tracking.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                    <Badge>Audit Logging</Badge>
                    <Badge variant="outline">Database Persisted</Badge>
                    <Badge variant="outline">Console + DB</Badge>
                    <Badge variant="outline">6 Log Categories</Badge>
                </div>
            </div>

            <Callout type="tip" title="Implementation Location">
                All audit logging is implemented in <code>lib/security/audit-log.ts</code> and stored in the <code>AuditLog</code> Prisma model.
            </Callout>

            <DocsTabs defaultValue="overview">
                <DocsTabsList className="mb-6 w-full flex-wrap h-auto gap-1">
                    <DocsTabsTrigger value="overview">📊 Overview</DocsTabsTrigger>
                    <DocsTabsTrigger value="functions">🔧 Log Functions</DocsTabsTrigger>
                    <DocsTabsTrigger value="actions">📝 Action Types</DocsTabsTrigger>
                    <DocsTabsTrigger value="schema">💾 Database Schema</DocsTabsTrigger>
                    <DocsTabsTrigger value="usage">💡 Usage Examples</DocsTabsTrigger>
                </DocsTabsList>

                {/* ==================== OVERVIEW TAB ==================== */}
                <DocsTabsContent value="overview">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Audit Logging Architecture</CardTitle>
                                <CardDescription>How security events are captured and stored</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg text-xs overflow-x-auto">
                                    {`┌─────────────────────────────────────────────────────────────────────────┐
│                         API Route Handler                                │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               logAuditEvent() / logAuthEvent() / etc.                   │
│                     (lib/security/audit-log.ts)                          │
└─────────────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────────────┐
│  Console.log  │       │  prisma.auditLog.create()  │
│   [AUDIT]     │       │   (Database Storage)   │
└───────────────┘       └───────────────────────┘`}
                                </pre>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>🔐</span> Auth Events
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Login success/failure, signup, password reset, email verification
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>🏢</span> Workspace Events
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Create, update, delete, export workspace operations
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>👥</span> Member Events
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Invite, remove, role change, invite acceptance
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>📄</span> Invoice Events
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Create, update, send, delete, PDF generation, scheduling
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>⏰</span> CRON Events
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Scheduled job execution, failures with system user ID
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>📋</span> Client Info
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    IP address, user agent, request ID automatically captured
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DocsTabsContent>

                {/* ==================== FUNCTIONS TAB ==================== */}
                <DocsTabsContent value="functions">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Logging Functions</CardTitle>
                                <CardDescription>lib/security/audit-log.ts</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Function</TableHead>
                                            <TableHead>Parameters</TableHead>
                                            <TableHead>Use Case</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs font-bold text-blue-600">logAuditEvent()</TableCell>
                                            <TableCell className="text-xs">entry: AuditLogEntry</TableCell>
                                            <TableCell>Core function - writes to console + DB</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs font-bold text-emerald-600">logAuthEvent()</TableCell>
                                            <TableCell className="text-xs">action, userId, request, metadata?</TableCell>
                                            <TableCell>Authentication events</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs font-bold text-purple-600">logWorkspaceEvent()</TableCell>
                                            <TableCell className="text-xs">action, userId, workspaceId, request, metadata?</TableCell>
                                            <TableCell>Workspace CRUD operations</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs font-bold text-amber-600">logMemberEvent()</TableCell>
                                            <TableCell className="text-xs">action, userId, workspaceId, targetUserId, request, metadata?</TableCell>
                                            <TableCell>Team member changes</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs font-bold text-red-600">logInvoiceEvent()</TableCell>
                                            <TableCell className="text-xs">action, userId, workspaceId, invoiceId, request, metadata?</TableCell>
                                            <TableCell>Invoice operations</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs font-bold text-slate-600">logCronEvent()</TableCell>
                                            <TableCell className="text-xs">action, cronName, metadata?</TableCell>
                                            <TableCell>CRON job execution (userId = "SYSTEM")</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">getClientInfo()</TableCell>
                                            <TableCell className="text-xs">request: NextRequest</TableCell>
                                            <TableCell>Extract IP, user agent, request ID</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>AuditLogEntry Interface</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                    {`interface AuditLogEntry {
    userId: string;            // User who performed action
    action: AuditAction;       // Action type enum
    workspaceId?: string;      // Workspace context
    resourceType?: string;     // "INVOICE" | "WORKSPACE" | "MEMBER" | etc.
    resourceId?: string;       // ID of affected resource
    metadata?: Record<string, unknown>;  // Additional context
    ipAddress?: string;        // Client IP
    userAgent?: string;        // Browser/client info
    requestId?: string;        // For request tracing
}`}
                                </pre>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

                {/* ==================== ACTIONS TAB ==================== */}
                <DocsTabsContent value="actions">
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">🔐 Auth Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {["LOGIN_SUCCESS", "LOGIN_FAILED", "SIGNUP", "PASSWORD_RESET_REQUESTED", "PASSWORD_RESET_COMPLETED", "EMAIL_VERIFIED"].map((v) => (
                                            <Badge key={v} variant="outline" className="font-mono text-xs">
                                                {v}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">🏢 Workspace Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {["WORKSPACE_CREATED", "WORKSPACE_UPDATED", "WORKSPACE_DELETED", "WORKSPACE_EXPORTED"].map((v) => (
                                            <Badge key={v} variant="outline" className="font-mono text-xs">
                                                {v}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">👥 Member Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {["MEMBER_INVITED", "MEMBER_REMOVED", "MEMBER_ROLE_CHANGED", "INVITE_ACCEPTED"].map((v) => (
                                            <Badge key={v} variant="outline" className="font-mono text-xs">
                                                {v}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">📄 Invoice Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {["INVOICE_CREATED", "INVOICE_UPDATED", "INVOICE_SENT", "INVOICE_DELETED", "PDF_GENERATED", "INVOICE_SCHEDULED"].map((v) => (
                                            <Badge key={v} variant="outline" className="font-mono text-xs">
                                                {v}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="text-base">⏰ CRON Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {["CRON_EXECUTED", "CRON_FAILED"].map((v) => (
                                            <Badge key={v} variant="outline" className="font-mono text-xs">
                                                {v}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        CRON events use <code>userId: "SYSTEM"</code> since they run without a user context.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DocsTabsContent>

                {/* ==================== SCHEMA TAB ==================== */}
                <DocsTabsContent value="schema">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>AuditLog Model</CardTitle>
                                <CardDescription>prisma/schema.prisma</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                    {`model AuditLog {
  id          String   @id @default(cuid())
  userId      String   // User who performed action (or "SYSTEM" for cron)
  workspaceId String?  // Associated workspace (if applicable)
  action      String   // Action type (e.g., "INVOICE_SENT", "LOGIN_FAILED")
  resourceType String? // Type of resource (e.g., "INVOICE", "WORKSPACE")
  resourceId  String?  // ID of the affected resource
  metadata    Json?    // Additional context as JSON
  ipAddress   String?  // Client IP address
  userAgent   String?  // Client user agent
  requestId   String?  // Request ID for correlation
  createdAt   DateTime @default(now())
  
  @@index([userId, action])
  @@index([workspaceId, action])
  @@index([createdAt])
  @@index([resourceType, resourceId])
}`}
                                </pre>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Database Indexes</CardTitle>
                                <CardDescription>Optimized for common query patterns</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Index</TableHead>
                                            <TableHead>Use Case</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">[userId, action]</TableCell>
                                            <TableCell>Find all actions by a specific user</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">[workspaceId, action]</TableCell>
                                            <TableCell>Find all actions in a workspace</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">[createdAt]</TableCell>
                                            <TableCell>Time-based queries, pagination</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-mono text-xs">[resourceType, resourceId]</TableCell>
                                            <TableCell>Find all actions on a specific resource</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

                {/* ==================== USAGE TAB ==================== */}
                <DocsTabsContent value="usage">
                    <div className="space-y-6">
                        <Callout type="warning" title="Error Resilience">
                            Audit logging is wrapped in try-catch and will <strong>never</strong> break the main request flow. Errors are logged to console.
                        </Callout>

                        <Card>
                            <CardHeader>
                                <CardTitle>Example: Logging Invoice Send</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                    {`import { logInvoiceEvent } from '@/lib/security/audit-log';

// In your API route handler:
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    
    // ... send invoice logic ...
    
    // Log the event
    await logInvoiceEvent(
        'INVOICE_SENT',
        session.user.id,
        workspaceId,
        invoiceId,
        request,
        { 
            clientEmail: client.email,
            amount: invoice.total 
        }
    );
    
    return NextResponse.json({ success: true });
}`}
                                </pre>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Example: Logging Auth Events</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                    {`import { logAuthEvent } from '@/lib/security/audit-log';

// On successful login:
await logAuthEvent(
    'LOGIN_SUCCESS',
    user.id,
    request,
    { provider: 'credentials' }
);

// On failed login:
await logAuthEvent(
    'LOGIN_FAILED',
    email, // use email as identifier
    request,
    { reason: 'Invalid password' }
);`}
                                </pre>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Example: CRON Job Logging</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                    {`import { logCronEvent } from '@/lib/security/audit-log';

// In CRON route handler:
export async function POST() {
    try {
        // Process reminders...
        
        await logCronEvent(
            'CRON_EXECUTED',
            'reminders-run',
            { 
                processed: 15, 
                sent: 12, 
                failed: 3 
            }
        );
    } catch (error) {
        await logCronEvent(
            'CRON_FAILED',
            'reminders-run',
            { error: error.message }
        );
    }
}`}
                                </pre>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Console Output Format</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-950 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                    {`[AUDIT] {"userId":"clx123...","action":"INVOICE_SENT","workspaceId":"clx456...",
         "resourceType":"INVOICE","resourceId":"clx789...","ipAddress":"192.168.1.1",
         "userAgent":"Mozilla/5.0...","timestamp":"2024-12-15T07:30:00.000Z"}`}
                                </pre>
                            </CardContent>
                        </Card>
                    </div>
                </DocsTabsContent>

            </DocsTabs>
        </div>
    );
}
