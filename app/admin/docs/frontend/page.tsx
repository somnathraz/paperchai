import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/docs/callout";
import { DocsTabs, DocsTabsList, DocsTabsTrigger, DocsTabsContent } from "@/components/docs/tabs";

export default function FrontendDocsPage() {
    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Frontend Architecture</h1>
                <p className="text-lg text-muted-foreground">
                    Component structure, state management, and routing patterns.
                </p>
            </div>

            <Callout type="tip" title="Server-First Philosophy">
                We prioritize <strong>Server Components</strong> for data fetching and layout. Client components are leaf nodes used only for interactivity.
            </Callout>

            <div className="space-y-6">
                <DocsTabs defaultValue="structure">
                    <DocsTabsList className="mb-4">
                        <DocsTabsTrigger value="structure">Directory Structure</DocsTabsTrigger>
                        <DocsTabsTrigger value="tech">Tech Stack</DocsTabsTrigger>
                        <DocsTabsTrigger value="state">State Management</DocsTabsTrigger>
                    </DocsTabsList>

                    <DocsTabsContent value="structure">
                        <Card>
                            <CardContent className="p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Path</th>
                                            <th className="px-4 py-3 font-medium">Purpose</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        <tr className="bg-white dark:bg-slate-900">
                                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">app/(dashboard)</td>
                                            <td className="px-4 py-3">Protected application routes (Dashboard, Invoices, Clients)</td>
                                        </tr>
                                        <tr className="bg-white dark:bg-slate-900">
                                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">app/(marketing)</td>
                                            <td className="px-4 py-3">Public landing pages and blog</td>
                                        </tr>
                                        <tr className="bg-white dark:bg-slate-900">
                                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">components/ui</td>
                                            <td className="px-4 py-3">Reusable primitives (Buttons, Inputs) - based on Shadcn/Radix</td>
                                        </tr>
                                        <tr className="bg-white dark:bg-slate-900">
                                            <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">components/dashboard</td>
                                            <td className="px-4 py-3">Feature-specific complex UI components (Charts, Tables)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </DocsTabsContent>

                    <DocsTabsContent value="tech">
                        <div className="flex flex-wrap gap-2 mb-6">
                            <Badge variant="secondary">Next.js 14</Badge>
                            <Badge variant="secondary">React Server Components</Badge>
                            <Badge variant="secondary">Tailwind CSS</Badge>
                            <Badge variant="secondary">Framer Motion</Badge>
                            <Badge variant="secondary">Zustand (Minimal)</Badge>
                            <Badge variant="secondary">React Hook Form</Badge>
                            <Badge variant="secondary">Zod</Badge>
                        </div>
                        <Callout type="note" title="Styling Convention">
                            Use Tailwind utility classes for 90% of styling. Use <code>globals.css</code> only for critical resets or complex animations.
                        </Callout>
                    </DocsTabsContent>

                    <DocsTabsContent value="state">
                        <div className="prose dark:prose-invert max-w-none">
                            <h3>Strategy</h3>
                            <ul>
                                <li><strong>Server Components:</strong> Fetch data directly in <code>page.tsx</code> or <code>layout.tsx</code> using Prisma. Pass data down as props.</li>
                                <li><strong>Server Actions:</strong> Handle mutations (form submissions) via <code>use server</code> actions in <code>app/actions/</code> (or inline).</li>
                                <li><strong>URL State:</strong> Use search params for filters/pagination (e.g., <code>?tab=invoices&page=2</code>).</li>
                                <li><strong>Client State:</strong> Use <code>useState</code> only for UI interactivity (modals, dropdowns, optimistic updates).</li>
                            </ul>
                        </div>
                    </DocsTabsContent>
                </DocsTabs>
            </div>
        </div>
    );
}
