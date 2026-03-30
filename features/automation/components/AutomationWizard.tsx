"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { Check, ChevronRight, Zap, Users, Bell, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface AutomationWizardProps {
  open: boolean;
  onClose: () => void;
  recipe?: {
    id: string;
    title: string;
    trigger: string;
    source: "notion" | "slack";
    actions: string[];
  };
  initialConfig?: Partial<AutomationConfig>;
  onComplete?: (config: AutomationConfig) => void;
}

interface AutomationConfig {
  id?: string;
  name?: string;
  recipeId: string;
  trigger: string;
  scope: "all" | "tag" | "risk" | "selected_clients";
  scopeValue?: string;
  selectedClients?: string[]; // Array of client IDs
  sequence: "standard" | "aggressive" | "custom";
}

type Step = {
  id: number;
  title: string;
  description: string;
  icon: ElementType;
};

const STEPS: Step[] = [
  { id: 1, title: "Trigger", description: "Pick the source and trigger", icon: Zap },
  { id: 2, title: "Scope", description: "Choose who it applies to", icon: Users },
  { id: 3, title: "Sequence", description: "Set cadence and tone", icon: Bell },
  { id: 4, title: "Review", description: "Confirm the automation", icon: Eye },
];

type ScopeOption = {
  id: AutomationConfig["scope"];
  title: string;
  description: string;
  icon: ElementType;
};

const SCOPES: ScopeOption[] = [
  {
    id: "all",
    title: "All active projects",
    description: "Apply this automation to every project in the workspace.",
    icon: Users,
  },
  {
    id: "selected_clients",
    title: "Selected clients",
    description: "Run only for specific clients you choose.",
    icon: Users,
  },
];

type SequenceOption = {
  id: AutomationConfig["sequence"];
  title: string;
  description: string;
  icon: ElementType;
  isDefault?: boolean;
};

const SEQUENCES: SequenceOption[] = [
  {
    id: "standard",
    title: "Standard cadence",
    description: "Balanced reminders with a friendly tone.",
    icon: Bell,
    isDefault: true,
  },
  {
    id: "aggressive",
    title: "Aggressive cadence",
    description: "Tighter follow-ups for faster payments.",
    icon: Zap,
  },
  {
    id: "custom",
    title: "Custom cadence",
    description: "Fine-tune every step and template.",
    icon: Eye,
  },
];

const AutomationStepIndicator = memo(function AutomationStepIndicator({
  steps,
  currentStep,
}: {
  steps: Step[];
  currentStep: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {steps.map((step) => {
        const status = step.id < currentStep ? "done" : step.id === currentStep ? "active" : "todo";
        const Icon = step.icon;
        return (
          <div
            key={step.id}
            className={`flex items-start gap-3 rounded-lg border p-3 transition ${
              status === "active"
                ? "border-violet-300 bg-violet-50 dark:border-violet-700/70 dark:bg-violet-900/20"
                : status === "done"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20"
                  : "border-border bg-background"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                status === "done"
                  ? "bg-emerald-600 text-white"
                  : status === "active"
                    ? "bg-violet-600 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {status === "done" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
});

type Recipe = AutomationWizardProps["recipe"];

const Step1Trigger = memo(function Step1Trigger({
  recipe,
  name,
  trigger,
  onNameChange,
}: {
  recipe?: Recipe;
  name?: string;
  trigger?: string;
  onNameChange?: (value: string) => void;
}) {
  const sourceLabel = recipe?.source ? recipe.source : "custom";
  const displayTitle = name?.trim() ? name : recipe?.title || "Custom automation";
  const displayTrigger = trigger || recipe?.trigger || "Manual trigger";
  const actions = recipe?.actions ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{displayTitle}</h3>
            <p className="text-sm text-muted-foreground">Trigger: {displayTrigger}</p>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {sourceLabel}
          </Badge>
        </div>

        <div className="space-y-2">
          <Label htmlFor="automation-name">Automation name</Label>
          <Input
            id="automation-name"
            value={name ?? recipe?.title ?? ""}
            onChange={(event) => onNameChange?.(event.target.value)}
            placeholder="Name this automation"
          />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">What will happen</p>
        </div>
        {actions.length > 0 ? (
          <ScrollArea className="h-28 pr-2">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {actions.map((action) => (
                <li key={action} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-violet-600 mt-0.5" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground">
            No prebuilt actions. You can add steps after saving.
          </p>
        )}
      </Card>
    </div>
  );
});

const Step2Scope = memo(function Step2Scope({
  scope,
  scopeValue,
  selectedClients,
  onScopeChange,
}: {
  scope: AutomationConfig["scope"];
  scopeValue?: string;
  selectedClients?: string[];
  onScopeChange: (
    scope: AutomationConfig["scope"],
    value?: string,
    selectedClients?: string[]
  ) => void;
}) {
  type ClientOption = {
    id: string;
    name: string;
    email?: string | null;
    company?: string | null;
  };

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const selectedScope = useMemo(() => SCOPES.find((option) => option.id === scope), [scope]);

  useEffect(() => {
    if (scope !== "selected_clients" || clients.length > 0 || isLoadingClients) return;

    const fetchClients = async () => {
      setIsLoadingClients(true);
      setClientError(null);
      try {
        const response = await fetch("/api/clients/list");
        if (!response.ok) {
          throw new Error("Failed to load clients");
        }
        const data = await response.json();
        setClients(data.clients || []);
      } catch (error: any) {
        setClientError(error.message || "Failed to load clients");
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, [scope, clients.length, isLoadingClients]);

  const selectedIds = useMemo(() => new Set(selectedClients ?? []), [selectedClients]);
  const filteredClients = useMemo(() => {
    const query = clientQuery.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => {
      const haystack = [client.name, client.email, client.company]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [clients, clientQuery]);

  const toggleClient = (clientId: string) => {
    const nextSelected = new Set(selectedIds);
    if (nextSelected.has(clientId)) {
      nextSelected.delete(clientId);
    } else {
      nextSelected.add(clientId);
    }
    const selectedArray = Array.from(nextSelected);
    onScopeChange(
      "selected_clients",
      selectedArray.join(","),
      selectedArray.length ? selectedArray : undefined
    );
  };

  const clearSelection = () => {
    onScopeChange("selected_clients", undefined, undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Selected scope</p>
        <Badge variant="outline" className="text-xs">
          {selectedScope?.title ?? "All active projects"}
        </Badge>
      </div>
      <RadioGroup
        value={scope}
        onValueChange={(value) => {
          const nextScope = value as AutomationConfig["scope"];
          if (nextScope === "all") {
            onScopeChange(nextScope, undefined, undefined);
            return;
          }
          onScopeChange(nextScope, scopeValue, selectedClients);
        }}
        className="grid gap-3"
      >
        {SCOPES.map((option) => {
          const Icon = option.icon;
          const isSelected = option.id === scope;
          const selectedClass = isSelected
            ? "border-violet-600 bg-violet-50 ring-2 ring-violet-200 dark:border-violet-700/70 dark:bg-violet-900/20 dark:ring-violet-800/40"
            : "border-border bg-background";
          return (
            <div key={option.id} className="relative">
              <RadioGroupItem
                value={option.id}
                id={`scope-${option.id}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`scope-${option.id}`}
                className={`relative flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition hover:border-violet-300 ${selectedClass}`}
              >
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  {isSelected ? (
                    <Check className="h-4 w-4 text-violet-600" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{option.title}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {isSelected ? (
                  <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Selected
                  </span>
                ) : null}
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {scope === "selected_clients" ? (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="client-search">Search clients</Label>
            {selectedIds.size > 0 ? (
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </button>
            ) : null}
          </div>
          <Input
            id="client-search"
            value={clientQuery}
            onChange={(event) => setClientQuery(event.target.value)}
            placeholder="Search by name or email"
          />

          {isLoadingClients ? (
            <p className="text-xs text-muted-foreground">Loading clients...</p>
          ) : clientError ? (
            <p className="text-xs text-red-600">{clientError}</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
              {filteredClients.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">No matching clients.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredClients.map((client) => {
                    const isSelected = selectedIds.has(client.id);
                    return (
                      <li key={client.id}>
                        <button
                          type="button"
                          onClick={() => toggleClient(client.id)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                        >
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                              isSelected
                                ? "border-violet-500 bg-violet-500 text-white"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {isSelected ? <Check className="h-3 w-3" /> : (client.name?.[0] ?? "?")}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {client.name || client.email || "Unknown client"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {client.email && client.name
                                ? client.email
                                : client.company || "No email"}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedIds).map((clientId) => {
                const client = clients.find((item) => item.id === clientId);
                return (
                  <Badge key={clientId} variant="outline" className="text-xs">
                    {client?.name || client?.email || clientId}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Choose one or more clients to target.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
});

const Step3Sequence = memo(function Step3Sequence({
  sequence,
  onSequenceChange,
}: {
  sequence: AutomationConfig["sequence"];
  onSequenceChange: (sequence: AutomationConfig["sequence"]) => void;
}) {
  const selectedSequence = useMemo(
    () => SEQUENCES.find((option) => option.id === sequence),
    [sequence]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Selected cadence</p>
        <Badge variant="outline" className="text-xs">
          {selectedSequence?.title ?? "Standard cadence"}
        </Badge>
      </div>
      <RadioGroup
        value={sequence}
        onValueChange={(value) => onSequenceChange(value as AutomationConfig["sequence"])}
        className="grid gap-3"
      >
        {SEQUENCES.map((option) => {
          const Icon = option.icon;
          const isSelected = option.id === sequence;
          const selectedClass = isSelected
            ? "border-violet-600 bg-violet-50 ring-2 ring-violet-200 dark:border-violet-700/70 dark:bg-violet-900/20 dark:ring-violet-800/40"
            : "border-border bg-background";
          return (
            <div key={option.id}>
              <RadioGroupItem
                value={option.id}
                id={`sequence-${option.id}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`sequence-${option.id}`}
                className={`relative flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition hover:border-violet-300 ${selectedClass}`}
              >
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  {isSelected ? (
                    <Check className="h-4 w-4 text-violet-600" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{option.title}</p>
                    {option.isDefault ? (
                      <Badge variant="outline" className="text-[10px]">
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {isSelected ? (
                  <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Selected
                  </span>
                ) : null}
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {sequence === "custom" ? (
        <Card className="p-4 text-sm text-muted-foreground">
          You can edit every step and template once the automation is saved.
        </Card>
      ) : null}
    </div>
  );
});

const Step4Review = memo(function Step4Review({
  recipe,
  config,
}: {
  recipe?: Recipe;
  config: AutomationConfig;
}) {
  const isNewAutomation = !config.id;
  const scopeOption = SCOPES.find((option) => option.id === config.scope);
  const sequenceOption = SEQUENCES.find((option) => option.id === config.sequence);
  const displayName = config.name || recipe?.title || "New automation";
  const displayTrigger = config.trigger || recipe?.trigger || "Manual trigger";
  const scopeDetail =
    config.scope === "selected_clients"
      ? config.selectedClients?.length
        ? `${config.selectedClients.length} client(s) selected`
        : config.scopeValue
      : config.scopeValue;
  const actions = recipe?.actions ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{displayName}</h3>
            <p className="text-sm text-muted-foreground">Trigger: {displayTrigger}</p>
          </div>
          <Badge variant="outline" className="text-xs capitalize">
            {recipe?.source ?? "custom"}
          </Badge>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scope</p>
            <p className="text-sm font-medium">{scopeOption?.title ?? "Scope"}</p>
            {scopeDetail ? <p className="text-xs text-muted-foreground">{scopeDetail}</p> : null}
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sequence</p>
            <p className="text-sm font-medium">{sequenceOption?.title ?? "Sequence"}</p>
            {sequenceOption?.description ? (
              <p className="text-xs text-muted-foreground">{sequenceOption.description}</p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Planned actions</p>
        </div>
        {actions.length > 0 ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {actions.map((action) => (
              <li key={action} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-violet-600 mt-0.5" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No predefined actions yet. You can add steps after saving.
          </p>
        )}
      </Card>

      {isNewAutomation ? (
        <Card className="p-4 text-sm text-muted-foreground">
          New automations start in a pending state. Approve it before reminders are sent.
        </Card>
      ) : null}
    </div>
  );
});

export const AutomationWizard = memo(function AutomationWizard({
  open,
  onClose,
  recipe,
  initialConfig,
  onComplete,
}: AutomationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<AutomationConfig>({
    recipeId: recipe?.id || "",
    trigger: recipe?.trigger || "",
    scope: "all",
    sequence: "standard",
    ...(initialConfig as any),
  });

  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      const initialSelectedClients =
        initialConfig?.selectedClients ||
        (initialConfig?.scopeValue
          ? initialConfig.scopeValue
              .split(",")
              .map((value: string) => value.trim())
              .filter(Boolean)
          : undefined);
      setConfig({
        recipeId: recipe?.id || initialConfig?.recipeId || "",
        trigger: recipe?.trigger || initialConfig?.trigger || "",
        scope: (initialConfig?.scope as any) || "all",
        scopeValue: initialConfig?.scopeValue,
        selectedClients: initialSelectedClients,
        sequence: (initialConfig?.sequence as any) || "standard",
        id: initialConfig?.id,
        name: initialConfig?.name,
      });
    }
  }, [open, recipe, initialConfig]);

  const handleNext = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    onComplete?.(config);
    onClose();
    setCurrentStep(1);
  }, [config, onComplete, onClose]);

  const handleClose = useCallback(() => {
    onClose();
    setCurrentStep(1);
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] w-full h-[100dvh] sm:h-[80vh] p-0 flex flex-col overflow-hidden sm:rounded-lg rounded-none">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle>Create Automation</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="p-6 pb-2 shrink-0">
            <AutomationStepIndicator steps={STEPS} currentStep={currentStep} />
          </div>

          <div className="flex-1 overflow-y-auto px-6 min-h-0">
            <div className="pb-6">
              {currentStep === 1 && (
                <Step1Trigger
                  recipe={recipe}
                  name={config.name}
                  trigger={config.trigger}
                  onNameChange={(name) => setConfig((prev) => ({ ...prev, name }))}
                />
              )}
              {currentStep === 2 && (
                <Step2Scope
                  scope={config.scope}
                  scopeValue={config.scopeValue}
                  selectedClients={config.selectedClients}
                  onScopeChange={(scope, value, selectedClients) =>
                    setConfig((prev) => ({
                      ...prev,
                      scope: scope as AutomationConfig["scope"],
                      scopeValue: value,
                      selectedClients,
                    }))
                  }
                />
              )}
              {currentStep === 3 && (
                <Step3Sequence
                  sequence={config.sequence}
                  onSequenceChange={(sequence) =>
                    setConfig((prev) => ({
                      ...prev,
                      sequence: sequence as AutomationConfig["sequence"],
                    }))
                  }
                />
              )}
              {currentStep === 4 && <Step4Review recipe={recipe} config={config} />}
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 border-t mt-auto flex flex-col sm:flex-row gap-3 sm:justify-between bg-background shrink-0 z-10">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? handleClose : handleBack}
            className="w-full sm:w-auto"
          >
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>
          <Button
            onClick={currentStep === 4 ? handleComplete : handleNext}
            className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700"
          >
            {currentStep === 4 ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Automation
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
