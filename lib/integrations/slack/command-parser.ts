export type SlackIntent = "create" | "setup" | "send" | "status" | "help";

export type CreateInvoiceCommand = {
  intent: "create";
  clientName?: string;
  projectName?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
  email?: string;
  phone?: string;
  itemTitle?: string;
  quantity?: number;
  rate?: number;
  notes?: string;
};

export type SetupWorkspaceCommand = {
  intent: "setup";
  clientName?: string;
  projectName?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export type SendInvoiceCommand = {
  intent: "send";
  invoiceNumber?: string;
};

export type StatusInvoiceCommand = {
  intent: "status";
  invoiceNumber?: string;
};

export type HelpCommand = {
  intent: "help";
};

export type ParsedSlackCommand =
  | CreateInvoiceCommand
  | SetupWorkspaceCommand
  | SendInvoiceCommand
  | StatusInvoiceCommand
  | HelpCommand;

function parseKeyValueTokens(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = /(\w+):(?:"([^"]+)"|'([^']+)'|(\S+))/g;
  let match: RegExpExecArray | null = pattern.exec(input);

  while (match) {
    const key = match[1].toLowerCase();
    const value = (match[2] || match[3] || match[4] || "").trim();
    if (value) result[key] = value;
    match = pattern.exec(input);
  }

  return result;
}

function normalizeCurrency(value?: string): string | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (upper.length === 3) return upper;
  if (upper === "RS" || upper === "INR" || upper === "RUPEE" || upper === "RUPEES") return "INR";
  if (upper === "USD" || upper === "$") return "USD";
  if (upper === "EUR" || upper === "€") return "EUR";
  if (upper === "GBP" || upper === "POUND" || upper === "£") return "GBP";
  return undefined;
}

function parseNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[,\s]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inferClientFromSentence(input: string): string | undefined {
  const match = input.match(/\bfor\s+(.+?)(?:\s+(?:amount|due|email|item|qty|rate)[:\s]|$)/i);
  if (!match) return undefined;
  return match[1].trim().replace(/^"|"$/g, "");
}

function inferAmountFromSentence(input: string): number | undefined {
  const match = input.match(/(?:₹|\$|INR|USD|EUR|GBP)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (!match) return undefined;
  return parseNumber(match[1]);
}

export function parseSlackInvoiceCommand(text: string): ParsedSlackCommand {
  const input = text.trim();
  if (!input) {
    return { intent: "help" };
  }

  const [rawSubcommand, ...rest] = input.split(/\s+/);
  const subcommand = rawSubcommand.toLowerCase();
  const remainder = rest.join(" ").trim();

  if (subcommand === "help") {
    return { intent: "help" };
  }

  if (subcommand === "status") {
    const kv = parseKeyValueTokens(remainder);
    const invoiceNumber = kv.id || kv.invoice || kv.number || rest[0];
    return {
      intent: "status",
      invoiceNumber: invoiceNumber?.toUpperCase(),
    };
  }

  if (subcommand === "send") {
    const kv = parseKeyValueTokens(remainder);
    const invoiceNumber = kv.id || kv.invoice || kv.number || rest[0];
    return {
      intent: "send",
      invoiceNumber: invoiceNumber?.toUpperCase(),
    };
  }

  if (subcommand === "create") {
    const kv = parseKeyValueTokens(remainder);

    const quantity = parseNumber(kv.qty || kv.quantity);
    const rate = parseNumber(kv.rate || kv.unit || kv.unitprice);
    const amount =
      parseNumber(kv.amount || kv.total) ||
      (quantity && rate ? quantity * rate : undefined) ||
      inferAmountFromSentence(remainder);

    return {
      intent: "create",
      clientName: kv.client || kv.customer || inferClientFromSentence(remainder),
      projectName: kv.project || kv.proj,
      amount,
      currency: normalizeCurrency(kv.currency || kv.curr),
      dueDate: kv.due || kv.duedate,
      email: kv.email || kv.mail,
      phone: kv.phone || kv.mobile || kv.whatsapp || kv.whats,
      itemTitle: kv.item || kv.desc || kv.description,
      quantity,
      rate,
      notes: kv.notes || remainder,
    };
  }

  if (subcommand === "setup") {
    const kv = parseKeyValueTokens(remainder);
    return {
      intent: "setup",
      clientName: kv.client || kv.customer || inferClientFromSentence(remainder),
      projectName: kv.project || kv.proj,
      email: kv.email || kv.mail,
      phone: kv.phone || kv.mobile || kv.whatsapp || kv.whats,
      notes: kv.notes || remainder,
    };
  }

  return { intent: "help" };
}
