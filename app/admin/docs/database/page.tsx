import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/docs/callout";
import { DocsTabs, DocsTabsList, DocsTabsTrigger, DocsTabsContent } from "@/components/docs/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DatabaseDocsPage() {
    return (
        <div className="max-w-6xl space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Database Schema Guide</h1>
                <p className="text-lg text-muted-foreground">
                    Complete Prisma model reference, relationships, and data architecture.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                    <Badge>35+ Models</Badge>
                    <Badge variant="outline">15+ Enums</Badge>
                    <Badge variant="outline">PostgreSQL</Badge>
                    <Badge variant="outline">Multi-Tenant</Badge>
                </div>
            </div>

            <Callout type="warning" title="Multi-Tenancy Enforced">
                Every query <strong>must</strong> include a <code>workspaceId</code> filter. Data isolation is enforced at the application layer.
            </Callout>

            <DocsTabs defaultValue="overview">
                <DocsTabsList className="mb-6 w-full flex-wrap h-auto gap-1">
                    <DocsTabsTrigger value="overview">📊 Overview</DocsTabsTrigger>
                    <DocsTabsTrigger value="core">🏢 Core Models</DocsTabsTrigger>
                    <DocsTabsTrigger value="billing">💰 Billing</DocsTabsTrigger>
                    <DocsTabsTrigger value="projects">📋 Projects</DocsTabsTrigger>
                    <DocsTabsTrigger value="reminders">⏰ Reminders</DocsTabsTrigger>
                    <DocsTabsTrigger value="integrations">🔗 Integrations</DocsTabsTrigger>
                    <DocsTabsTrigger value="enums">📝 Enums</DocsTabsTrigger>
                </DocsTabsList>

                {/* ==================== OVERVIEW TAB ==================== */}
                <DocsTabsContent value="overview">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Entity Relationship Diagram</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg text-xs overflow-x-auto">
                                    {`┌─────────────────────────────────────────────────────────────────────────┐
│                              WORKSPACE                                   │
│  (Root entity - all data belongs to a workspace)                        │
└─────────────────────────────────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┬───────────────┬───────────────┐
    ▼               ▼               ▼               ▼               ▼
┌───────┐     ┌─────────┐     ┌─────────┐     ┌─────────────┐   ┌───────────┐
│ User  │────▶│ Members │     │ Clients │────▶│  Projects   │──▶│ Invoices  │
└───────┘     └─────────┘     └─────────┘     └─────────────┘   └───────────┘
                                   │               │                   │
                                   ▼               ▼                   ▼
                             ┌──────────┐  ┌────────────┐      ┌─────────────┐
                             │Agreements│  │ Milestones │      │ InvoiceItem │
                             └──────────┘  └────────────┘      └─────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          INTEGRATIONS                                    │
│  IntegrationConnection ──▶ NotionImport / SlackImport                   │
└─────────────────────────────────────────────────────────────────────────┘`}
                                </pre>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>🏠</span> Core (8)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    User, UserSettings, Workspace, WorkspaceMember, WorkspaceInvite, SavedItem, VerificationToken, PasswordResetToken
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>💰</span> Billing (6)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Client, Invoice, InvoiceItem, InvoiceTemplate, ClientDocument, ReminderHistory
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>📋</span> Projects (5)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Project, ProjectMilestone, ProjectDocument, Agreement, MeetingNote
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>⏰</span> Reminders (4)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    ReminderSettings, InvoiceReminderSchedule, InvoiceReminderStep, EmailTemplate
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>🔗</span> Integrations (4)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    IntegrationConnection, NotionImport, SlackImport, AuditLog
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span>📝</span> Enums (15)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    InvoiceStatus, ProjectStatus, ProjectType, MilestoneStatus, ImportStatus, and 10 more
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DocsTabsContent>

                {/* ==================== CORE MODELS TAB ==================== */}
                <DocsTabsContent value="core">
                    <div className="space-y-6">
                        <SchemaCard
                            name="User"
                            badge="Auth"
                            description="User account with preferences and workspace memberships"
                            schema={`model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String?
  password        String?   // Hashed (for credentials auth)
  image           String?
  role            String?   @default("Founder")
  timezone        String?   @default("Asia/Kolkata")
  currency        String?   @default("INR")
  reminderTone    String?   @default("Warm + Polite")
  backupEmail     String?
  emailVerified   DateTime?
  activeWorkspace Workspace? @relation("ActiveWorkspace")
  activeWorkspaceId String?
  memberships     WorkspaceMember[]
  workspaces      Workspace[] @relation("WorkspaceOwner")
  settings        UserSettings?
  savedItems      SavedItem[]
}`}
                        />

                        <SchemaCard
                            name="Workspace"
                            badge="Root Entity"
                            badgeColor="emerald"
                            description="Central unit of isolation. All business data belongs to a workspace."
                            schema={`model Workspace {
  id              String             @id @default(cuid())
  name            String
  slug            String             @unique
  logo            String?
  businessType    String?            @default("Freelancer")
  taxGstNumber    String?
  pan             String?
  registeredEmail String?
  addressLine1    String?
  city            String?
  state           String?
  country         String?            @default("India")
  owner           User               @relation("WorkspaceOwner")
  ownerId         String
  members         WorkspaceMember[]
  clients         Client[]
  projects        Project[]
  invoices        Invoice[]
  integrationConnections IntegrationConnection[]
  // ... more relations
}`}
                        />

                        <SchemaCard
                            name="WorkspaceMember"
                            badge="Access Control"
                            description="Junction table for user-workspace membership with role"
                            schema={`model WorkspaceMember {
  id          String    @id @default(cuid())
  role        String    @default("owner")  // owner | admin
  user        User      @relation(...)
  userId      String
  workspace   Workspace @relation(...)
  workspaceId String
  
  @@unique([userId, workspaceId])
}`}
                        />

                        <SchemaCard
                            name="SavedItem"
                            badge="Library"
                            description="Reusable invoice line items for quick-add"
                            schema={`model SavedItem {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  rate        Float    @default(0)
  unit        String?  @default("nos")
  taxRate     Float?
  hsnCode     String?
  category    String?  // "Services", "Products"
  usageCount  Int      @default(0)
  lastUsedAt  DateTime?
  
  @@index([userId, usageCount(sort: Desc)])
}`}
                        />
                    </div>
                </DocsTabsContent>

                {/* ==================== BILLING TAB ==================== */}
                <DocsTabsContent value="billing">
                    <div className="space-y-6">
                        <SchemaCard
                            name="Client"
                            badge="CRM"
                            description="Client/customer with contact info, payment preferences, and risk scoring"
                            schema={`model Client {
  id              String    @id @default(cuid())
  workspaceId     String
  name            String
  contactPerson   String?
  company         String?
  email           String?
  phone           String?
  businessType    String?   @default("Individual")
  preferredPaymentMethod String? @default("Bank Transfer")
  paymentTerms    String?   @default("Net 15")
  reminderChannel String?   @default("Email")
  tonePreference  String?   @default("Warm")
  timezone        String?   @default("Asia/Kolkata")
  currency        String?   @default("INR")
  
  // Risk & Analytics
  reliabilityScore Int       @default(80)
  averageDelayDays Int       @default(5)
  outstanding      Decimal   @default(0)
  riskBadge        String?   @default("Reliable")
  
  // Relations
  projects         Project[]
  invoices         Invoice[]
  agreements       Agreement[]
  meetingNotes     MeetingNote[]
}`}
                        />

                        <SchemaCard
                            name="Invoice"
                            badge="Core"
                            badgeColor="blue"
                            description="Financial document with line items, status tracking, and source attribution"
                            schema={`model Invoice {
  id           String         @id @default(cuid())
  workspaceId  String
  clientId     String
  projectId    String?
  templateId   String?
  number       String
  status       InvoiceStatus  @default(draft)
  issueDate    DateTime       @default(now())
  dueDate      DateTime?
  scheduledSendAt DateTime?
  lastSentAt   DateTime?
  deliveryChannel String?     @default("email")
  currency     String         @default("INR")
  subtotal     Decimal        @default(0)
  taxTotal     Decimal        @default(0)
  lateFee      Decimal        @default(0)
  total        Decimal        @default(0)
  notes        String?
  terms        String?
  
  // Source tracking
  source       String?        // "slack", "notion", "manual"
  sourceImportId String?
  
  items        InvoiceItem[]
  reminders    ReminderHistory[]
  remindersEnabled Boolean    @default(false)
}`}
                        />

                        <SchemaCard
                            name="InvoiceItem"
                            badge="Line Item"
                            description="Individual billable item within an invoice"
                            schema={`model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String
  title       String
  description String?
  quantity    Decimal  @default(1)
  unitPrice   Decimal  @default(0)
  taxRate     Decimal  @default(0)
  total       Decimal  @default(0)
}`}
                        />

                        <SchemaCard
                            name="InvoiceTemplate"
                            badge="Branding"
                            description="Reusable invoice layouts with styling options"
                            schema={`model InvoiceTemplate {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  category    String?
  tags        String?
  isPro       Boolean  @default(false)
  accent      String?  // Gradient token
  thumbnail   String?
  layout      Json?
  invoices    Invoice[]
}`}
                        />
                    </div>
                </DocsTabsContent>

                {/* ==================== PROJECTS TAB ==================== */}
                <DocsTabsContent value="projects">
                    <div className="space-y-6">
                        <SchemaCard
                            name="Project"
                            badge="Work Management"
                            description="Tracks project details, billing strategy, and automation settings"
                            schema={`model Project {
  id             String    @id @default(cuid())
  workspaceId    String
  clientId       String?
  name           String
  description    String?
  status         ProjectStatus @default(ACTIVE)
  type           ProjectType   @default(FIXED)
  billingStrategy BillingStrategy @default(SINGLE_INVOICE)
  totalBudget    Int?
  currency       String    @default("INR")
  
  // Automation flags
  autoInvoiceEnabled  Boolean  @default(false)
  autoRemindersEnabled Boolean @default(false)
  
  // Legacy support
  rateType       RateType      @default(fixed)
  rateValue      Decimal       @default(0)
  startDate      DateTime?
  endDate        DateTime?
  
  // Relations
  invoices       Invoice[]
  milestones     ProjectMilestone[]
  aiDocuments    ProjectDocument[]
  agreements     Agreement[]
  meetingNotes   MeetingNote[]
}`}
                        />

                        <SchemaCard
                            name="ProjectMilestone"
                            badge="Billing Trigger"
                            badgeColor="amber"
                            description="Tracks project phases with automatic invoicing support"
                            schema={`model ProjectMilestone {
  id              String   @id @default(cuid())
  projectId       String
  title           String
  description     String?
  amount          Int        // smallest currency unit
  currency        String     @default("INR")
  expectedDate    DateTime?
  dueDate         DateTime?
  billingTrigger  MilestoneBillingTrigger @default(ON_COMPLETION)
  status          MilestoneStatus         @default(PLANNED)
  invoiceId       String?   // link to Invoice once generated
  orderIndex      Int       @default(0)
  
  // Automation
  autoInvoiceEnabled   Boolean @default(true)
  autoRemindersEnabled Boolean @default(true)
  lastManualActionAt   DateTime?
  manualActionType     String?
  skipAutomation       Boolean    @default(false)
}`}
                        />

                        <SchemaCard
                            name="Agreement"
                            badge="Notion Import"
                            description="Stores contracts and SOWs imported from Notion"
                            schema={`model Agreement {
  id              String    @id @default(cuid())
  workspaceId     String
  clientId        String?
  projectId       String?
  title           String
  notionPageId    String?   @unique
  rawBlocks       Json?     // Notion block content
  summary         String?   // AI-generated (Premium)
  milestones      Json?     // Parsed milestones (Premium)
  amount          Decimal?
  
  @@index([workspaceId, clientId])
}`}
                        />

                        <SchemaCard
                            name="MeetingNote"
                            badge="Notion Import"
                            description="Client meeting notes imported from Notion"
                            schema={`model MeetingNote {
  id              String    @id @default(cuid())
  workspaceId     String
  clientId        String?
  projectId       String?
  title           String
  notionPageId    String?   @unique
  date            DateTime?
  rawBlocks       Json?
  billableSummary String?   // AI suggestion (Premium)
}`}
                        />
                    </div>
                </DocsTabsContent>

                {/* ==================== REMINDERS TAB ==================== */}
                <DocsTabsContent value="reminders">
                    <div className="space-y-6">
                        <Callout type="note" title="Reminder Flow">
                            InvoiceReminderSchedule → InvoiceReminderStep → EmailTemplate → ReminderHistory
                        </Callout>

                        <SchemaCard
                            name="InvoiceReminderSchedule"
                            badge="Automation"
                            description="Per-invoice reminder configuration"
                            schema={`model InvoiceReminderSchedule {
  id             String   @id @default(cuid())
  invoiceId      String   @unique
  workspaceId    String
  enabled        Boolean  @default(true)
  useDefaults    Boolean  @default(true)
  presetName     String?
  steps          InvoiceReminderStep[]
}`}
                        />

                        <SchemaCard
                            name="InvoiceReminderStep"
                            badge="Schedule Step"
                            description="Individual reminder in a schedule"
                            schema={`model InvoiceReminderStep {
  id              String   @id @default(cuid())
  scheduleId      String
  index           Int
  daysBeforeDue   Int?
  daysAfterDue    Int?
  offsetFromDueInMinutes Int
  sendAt          DateTime
  emailTemplateId String?
  notifyCreator   Boolean @default(true)
  status          String  @default("PENDING")
  // PENDING | SENT | SKIPPED | CANCELLED | FAILED
  lastError       String?
}`}
                        />

                        <SchemaCard
                            name="EmailTemplate"
                            badge="Messaging"
                            description="Reusable email templates with themes"
                            schema={`model EmailTemplate {
  id          String   @id @default(cuid())
  workspaceId String
  slug        String
  name        String
  description String?
  subject     String
  body        String
  theme       String   @default("modern")
  // minimal | classic | modern | noir
  brandColor  String   @default("#0f172a")
  logoUrl     String?
  usedFor     String?
  
  @@unique([workspaceId, slug])
}`}
                        />

                        <SchemaCard
                            name="ReminderHistory"
                            badge="Audit"
                            description="Log of all sent reminders"
                            schema={`model ReminderHistory {
  id          String    @id @default(cuid())
  workspaceId String
  clientId    String?
  projectId   String?
  invoiceId   String?
  channel     ReminderChannel @default(email)
  kind        String?   @default("reminder")
  tone        String?   @default("Warm")
  status      String?   @default("sent")
  sentAt      DateTime  @default(now())
}`}
                        />
                    </div>
                </DocsTabsContent>

                {/* ==================== INTEGRATIONS TAB ==================== */}
                <DocsTabsContent value="integrations">
                    <div className="space-y-6">
                        <SchemaCard
                            name="IntegrationConnection"
                            badge="OAuth"
                            badgeColor="blue"
                            description="Stores encrypted OAuth tokens for Slack and Notion"
                            schema={`model IntegrationConnection {
  id              String   @id @default(cuid())
  workspaceId     String
  provider        IntegrationProvider  // SLACK | NOTION
  status          ConnectionStatus @default(CONNECTED)
  
  // OAuth tokens (encrypted)
  accessToken     String?
  refreshToken    String?
  tokenExpiresAt  DateTime?
  
  // Provider metadata
  providerWorkspaceId   String?
  providerWorkspaceName String?
  scopes          String?
  config          Json?
  
  // Error tracking
  lastError       String?
  lastErrorAt     DateTime?
  
  slackImports    SlackImport[]
  notionImports   NotionImport[]
  
  @@unique([workspaceId, provider])
}`}
                        />

                        <SchemaCard
                            name="NotionImport"
                            badge="Notion"
                            description="Tracks Notion database/page imports with AI extraction"
                            schema={`model NotionImport {
  id                String   @id @default(cuid())
  connectionId      String
  notionDatabaseId  String
  notionPageId      String?
  notionPageTitle   String?
  importType        NotionImportType
  // PROJECT | CLIENT | AGREEMENT | MEETING_NOTE
  status            ImportStatus @default(PENDING)
  aiSummary         String?
  extractedData     Json?
  projectId         String?
  clientId          String?
  lastSyncedAt      DateTime?
  syncEnabled       Boolean @default(false)
  errorMessage      String?
  retryCount        Int @default(0)
}`}
                        />

                        <SchemaCard
                            name="SlackImport"
                            badge="Slack"
                            description="Tracks Slack thread imports with AI extraction"
                            schema={`model SlackImport {
  id              String   @id @default(cuid())
  connectionId    String
  channelId       String
  channelName     String?
  threadTs        String?   // Thread timestamp
  importType      SlackImportType
  // THREAD_SUMMARY | SLASH_COMMAND | etc.
  status          ImportStatus @default(PENDING)
  rawMessages     Json?
  aiSummary       String?
  extractedData   Json?
  confidenceScore Int?   // 0-100
  invoiceId       String?
  projectId       String?
  errorMessage    String?
}`}
                        />

                        <SchemaCard
                            name="AuditLog"
                            badge="Security"
                            badgeColor="red"
                            description="Security event logging for compliance"
                            schema={`model AuditLog {
  id          String   @id @default(cuid())
  userId      String   // or "SYSTEM" for cron
  workspaceId String?
  action      String   // "INVOICE_SENT", "LOGIN_FAILED"
  resourceType String? // "INVOICE", "WORKSPACE"
  resourceId  String?
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  requestId   String?
  createdAt   DateTime @default(now())
  
  @@index([userId, action])
  @@index([workspaceId, action])
  @@index([createdAt])
}`}
                        />
                    </div>
                </DocsTabsContent>

                {/* ==================== ENUMS TAB ==================== */}
                <DocsTabsContent value="enums">
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <EnumCard
                                name="InvoiceStatus"
                                values={["draft", "sent", "scheduled", "paid", "overdue", "cancelled"]}
                            />
                            <EnumCard
                                name="ProjectStatus"
                                values={["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]}
                            />
                            <EnumCard
                                name="ProjectType"
                                values={["RETAINER", "FIXED", "HOURLY", "MILESTONE"]}
                            />
                            <EnumCard
                                name="BillingStrategy"
                                values={["PER_MILESTONE", "SINGLE_INVOICE", "RETAINER_MONTHLY", "HOURLY_TIMESHEET"]}
                            />
                            <EnumCard
                                name="MilestoneStatus"
                                values={["PLANNED", "IN_PROGRESS", "READY_FOR_INVOICE", "INVOICED", "PAID", "CANCELLED"]}
                            />
                            <EnumCard
                                name="MilestoneBillingTrigger"
                                values={["ON_CREATION", "ON_COMPLETION", "ON_APPROVAL", "ON_FIXED_DATE"]}
                            />
                            <EnumCard
                                name="IntegrationProvider"
                                values={["SLACK", "NOTION"]}
                            />
                            <EnumCard
                                name="ConnectionStatus"
                                values={["CONNECTED", "DISCONNECTED", "ERROR"]}
                            />
                            <EnumCard
                                name="NotionImportType"
                                values={["PROJECT", "CLIENT", "TASK", "INVOICE_DATA", "AGREEMENT", "MEETING_NOTE"]}
                            />
                            <EnumCard
                                name="SlackImportType"
                                values={["THREAD_SUMMARY", "SLASH_COMMAND", "MESSAGE_REACTION", "MESSAGE_SHORTCUT"]}
                            />
                            <EnumCard
                                name="ImportStatus"
                                values={["PENDING", "PROCESSING", "COMPLETED", "FAILED"]}
                            />
                            <EnumCard
                                name="ReminderChannel"
                                values={["email", "whatsapp", "both"]}
                            />
                        </div>
                    </div>
                </DocsTabsContent>

            </DocsTabs>
        </div>
    );
}

function SchemaCard({ name, badge, badgeColor = "slate", description, schema }: {
    name: string;
    badge: string;
    badgeColor?: string;
    description: string;
    schema: string;
}) {
    const colors: Record<string, string> = {
        slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
        blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
        amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <CardTitle>{name}</CardTitle>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors[badgeColor]}`}>
                        {badge}
                    </span>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                    <code>{schema}</code>
                </pre>
            </CardContent>
        </Card>
    );
}

function EnumCard({ name, values }: { name: string; values: string[] }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-mono">{name}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-1">
                    {values.map((v) => (
                        <Badge key={v} variant="outline" className="font-mono text-xs">
                            {v}
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
