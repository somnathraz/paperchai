import { Card, CardContent } from "@/components/ui/card";
import { Callout } from "@/components/docs/callout";

export default function DatabaseDocsPage() {
    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Database Schema</h1>
                <p className="text-lg text-muted-foreground">
                    Prisma models and entity relationships.
                </p>
            </div>

            <Callout type="warning" title="Multi-Tenancy Enforced">
                Every query must include a <code>workspaceId</code> filter. There is no global "Admin" role in the schema itself; isolation is handled at the application layer.
            </Callout>

            <div className="space-y-8">

                {/* Workspace Model */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-xl font-semibold">Workspace</h2>
                        <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full font-medium">Root Entity</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        The central unit of isolation. Users belong to workspaces via <code>WorkspaceMember</code>. All business data (Invoices, Clients) belongs to a Workspace.
                    </p>
                    <SchemaBlock content={`model Workspace {
  id              String             @id @default(cuid())
  slug            String             @unique
  owner           User               @relation("WorkspaceOwner")
  members         WorkspaceMember[]
  clients         Client[]
  projects        Project[]
  invoices        Invoice[]
  // ...
}`} />
                </section>

                {/* Invoice Model */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Invoice</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Represents a financial document. Linked to Client and Project. Contains <code>InvoiceItem</code> children.
                    </p>
                    <SchemaBlock content={`model Invoice {
  id           String         @id @default(cuid())
  workspaceId  String
  clientId     String
  projectId    String?
  status       InvoiceStatus  @default(draft) // draft, sent, scheduled, paid...
  total        Decimal
  items        InvoiceItem[]
  reminders    ReminderHistory[]
}`} />
                </section>

                {/* Integrations */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Integrations</h2>
                    <p className="text-sm text-muted-foreground">Stores encrypted OAuth tokens for Slack and Notion. Uses AES-256-GCM encryption with &quot;ENCRYPTION_KEY&quot; from environment. Supports OAuth tokens and sync status.</p>
                    <SchemaBlock content={`model IntegrationConnection {
  workspaceId     String
  provider        IntegrationProvider // SLACK, NOTION
  status          ConnectionStatus
  accessToken     String?
  config          Json?
  slackImports    SlackImport[]
  notionImports   NotionImport[]
}`} />
                </section>

            </div>
        </div>
    );
}

function SchemaBlock({ content }: { content: string }) {
    return (
        <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-slate-800">
            <code>{content}</code>
        </pre>
    )
}
