"use client";

import { memo } from "react";
import { Sparkles, Database, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAutomation } from "../hooks/useAutomation";

interface Recipe {
  id: string;
  title: string;
  trigger: string;
  actions: string[];
  source: "notion" | "slack";
  icon: React.ElementType;
}

const RECIPES: Recipe[] = [
  {
    id: "notion-invoice-draft",
    title: "Auto-create invoices from Notion 'Ready to Bill'",
    trigger: "Notion status = Ready to Bill",
    actions: [
      "Create draft invoice in PaperChai",
      "Attach to client & project automatically",
      "Schedule reminders before due date",
    ],
    source: "notion",
    icon: Database,
  },
  {
    id: "notion-milestone-tracking",
    title: "Track milestones from Notion agreements",
    trigger: "Notion page tagged as 'Agreement'",
    actions: [
      "Extract milestone dates automatically",
      "Create project with milestones",
      "Set up reminder sequences for each milestone",
    ],
    source: "notion",
    icon: Database,
  },
  {
    id: "slack-overdue-nudge",
    title: "Nudge overdue clients from Slack threads",
    trigger: "Slack thread tagged with 💸 or 'overdue'",
    actions: [
      "Identify client from thread context",
      "Create reminder sequence: email + WhatsApp",
      "Post status update back to Slack",
    ],
    source: "slack",
    icon: MessageSquare,
  },
  {
    id: "slack-invoice-command",
    title: "Create invoices from Slack /invoice command",
    trigger: "User runs /invoice in Slack channel",
    actions: [
      "Parse invoice details from command",
      "Create draft invoice",
      "Send confirmation to Slack thread",
    ],
    source: "slack",
    icon: MessageSquare,
  },
];

interface RecipeCardProps {
  recipe: Recipe;
  canManage?: boolean;
  onAddCustomize?: (recipeId: string) => void;
  onPreview?: (recipeId: string) => void;
}

const RecipeCard = memo(function RecipeCard({
  recipe,
  canManage = true,
  onAddCustomize,
  onPreview,
}: RecipeCardProps) {
  const Icon = recipe.icon;

  return (
    <Card className="p-4 sm:p-5 min-w-0 hover:border-violet-300 dark:hover:border-violet-700 transition-colors flex flex-col">
      <div className="flex items-start gap-3 mb-3 min-w-0">
        <div
          className={`shrink-0 p-2 rounded-lg ${recipe.source === "notion" ? "bg-black" : "bg-[#4A154B]"}`}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">{recipe.title}</h3>
          <p className="text-xs text-muted-foreground break-words">Trigger: {recipe.trigger}</p>
        </div>
      </div>

      <ul className="space-y-1.5 mb-4 min-w-0 flex-1">
        {recipe.actions.map((action, index) => (
          <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-violet-600 dark:text-violet-400 mt-0.5 shrink-0">•</span>
            <span className="min-w-0 break-words">{action}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => onAddCustomize?.(recipe.id)}
          disabled={!canManage}
          title={!canManage ? "Only workspace owners/admins can manage automations" : undefined}
          className="w-full sm:flex-1 bg-violet-600 hover:bg-violet-700 text-sm min-h-[44px]"
        >
          Add & Customize
        </Button>
        <Button
          onClick={() => onPreview?.(recipe.id)}
          disabled={!canManage}
          title={!canManage ? "Only workspace owners/admins can manage automations" : undefined}
          variant="outline"
          className="w-full sm:flex-1 text-sm min-h-[44px]"
        >
          Preview
        </Button>
      </div>
    </Card>
  );
});

const EmptyState = memo(function EmptyState() {
  return (
    <Card className="p-8 text-center min-w-0">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-muted-foreground opacity-30" />
      </div>
      <h3 className="font-medium mb-2">No recipes available yet</h3>
      <p className="text-sm text-muted-foreground">
        Connect Notion or Slack to see ready-made automations from your data.
      </p>
    </Card>
  );
});

export const RecipesSection = memo(function RecipesSection({
  canManage = true,
  onAddCustomize,
  onPreview,
}: {
  canManage?: boolean;
  onAddCustomize?: (recipeId: string) => void;
  onPreview?: (recipeId: string) => void;
}) {
  const { integrationStatus } = useAutomation();

  const notionConnected = integrationStatus?.integrations?.notion?.connected ?? false;
  const slackConnected = integrationStatus?.integrations?.slack?.connected ?? false;
  const hasIntegrations = notionConnected || slackConnected;

  // Filter recipes based on connected integrations
  const availableRecipes = RECIPES.filter((recipe) => {
    if (recipe.source === "notion") return notionConnected;
    if (recipe.source === "slack") return slackConnected;
    return false;
  });

  if (!hasIntegrations) {
    return null; // Don't show section if no integrations
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold mb-1">Recommended Recipes</h2>
        <p className="text-sm text-muted-foreground">
          Quick-start automations from your {notionConnected && "Notion"}
          {notionConnected && slackConnected && " & "}
          {slackConnected && "Slack"} data.
        </p>
      </div>

      {availableRecipes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
          {availableRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              canManage={canManage}
              onAddCustomize={onAddCustomize}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
});
