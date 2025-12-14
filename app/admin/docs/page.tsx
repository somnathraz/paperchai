
export default function DocsOverviewPage() {
    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-4">Developer Documentation</h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                    Technical specifications and architecture implementation details for the Freelance Money Command Center.
                </p>
            </div>

            <div className="prose dark:prose-invert max-w-none">

                <h3>Architecture Philosophy</h3>
                <p>
                    This application is built on the <strong>Next.js 14 App Router</strong> framework, emphasizing server-first data fetching, type safety via TypeScript, and a unified full-stack architecture.
                </p>

                <div className="grid md:grid-cols-2 gap-6 my-8 not-prose">
                    <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                        <h4 className="font-semibold mb-2">Frontend</h4>
                        <ul className="text-sm space-y-2 text-muted-foreground">
                            <li>• Next.js 14 App Router</li>
                            <li>• Tailwind CSS + Shadcn UI</li>
                            <li>• Lucide Icons</li>
                            <li>• Linear-style animations</li>
                        </ul>
                    </div>
                    <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                        <h4 className="font-semibold mb-2">Backend</h4>
                        <ul className="text-sm space-y-2 text-muted-foreground">
                            <li>• Next.js Server Actions & API Routes</li>
                            <li>• Prisma ORM (PostgreSQL)</li>
                            <li>• NextAuth.js (Auth)</li>
                            <li>• Google Gemini (AI)</li>
                        </ul>
                    </div>
                </div>

                <h3>Key Conventions</h3>
                <ul>
                    <li><strong>Multi-tenancy:</strong> All data is scoped to a <code>Workspace</code>. Always ensure queries include <code>where: &#123; workspaceId &#125;</code>.</li>
                    <li><strong>Security:</strong> All mutations must use <code>ensureActiveWorkspace</code> or check session entitlement.</li>
                    <li><strong>Design:</strong> Use existing <code>components/ui</code> primitives. Avoid custom CSS classes where utility classes resolve the need.</li>
                </ul>
            </div>
        </div>
    );
}
