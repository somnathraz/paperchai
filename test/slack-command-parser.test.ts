/**
 * Unit tests for Slack /invoice command parser
 * Every intent and edge case for parseSlackInvoiceCommand
 */

import assert from "node:assert/strict";
import { parseSlackInvoiceCommand } from "../lib/integrations/slack/command-parser";

function assertIntent(result: unknown, intent: string) {
  assert.equal((result as { intent: string }).intent, intent);
}

// --- Help ---
function testHelpEmpty() {
  assertIntent(parseSlackInvoiceCommand(""), "help");
  assertIntent(parseSlackInvoiceCommand("   "), "help");
}

function testHelpExplicit() {
  assertIntent(parseSlackInvoiceCommand("help"), "help");
  assertIntent(parseSlackInvoiceCommand("HELP"), "help");
}

// --- Status ---
function testStatusWithNumber() {
  const r = parseSlackInvoiceCommand("status INV-0001");
  assertIntent(r, "status");
  assert.equal((r as { invoiceNumber?: string }).invoiceNumber, "INV-0001");
}

function testStatusWithKeyValue() {
  const r = parseSlackInvoiceCommand("status invoice:INV-0042");
  assertIntent(r, "status");
  assert.equal((r as { invoiceNumber?: string }).invoiceNumber, "INV-0042");
}

function testStatusNumberOnly() {
  const r = parseSlackInvoiceCommand("status INV-99");
  assert.equal((r as { invoiceNumber?: string }).invoiceNumber, "INV-99");
}

// --- Send ---
function testSendWithNumber() {
  const r = parseSlackInvoiceCommand("send INV-0001");
  assertIntent(r, "send");
  assert.equal((r as { invoiceNumber?: string }).invoiceNumber, "INV-0001");
}

function testSendWithKeyValue() {
  const r = parseSlackInvoiceCommand("send number:INV-0100");
  assertIntent(r, "send");
  assert.equal((r as { invoiceNumber?: string }).invoiceNumber, "INV-0100");
}

// --- Create: full and minimal ---
function testCreateFull() {
  const r = parseSlackInvoiceCommand(
    'create client:"Acme Corp" project:"Website Revamp" amount:1200 currency:USD due:2026-03-15 email:billing@acme.com phone:+919999999999 item:"Consulting" qty:2 rate:600 notes:Q1 work'
  );
  assertIntent(r, "create");
  const c = r as {
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
  assert.equal(c.clientName, "Acme Corp");
  assert.equal(c.projectName, "Website Revamp");
  assert.equal(c.amount, 1200);
  assert.equal(c.currency, "USD");
  assert.equal(c.dueDate, "2026-03-15");
  assert.equal(c.email, "billing@acme.com");
  assert.equal(c.phone, "+919999999999");
  assert.equal(c.itemTitle, "Consulting");
  assert.equal(c.quantity, 2);
  assert.equal(c.rate, 600);
  assert.ok(c.notes?.includes("Q1"));
}

function testCreateMinimal() {
  const r = parseSlackInvoiceCommand('create client:"Acme" project:"Support" amount:500');
  assertIntent(r, "create");
  const c = r as { clientName?: string; projectName?: string; amount?: number };
  assert.equal(c.clientName, "Acme");
  assert.equal(c.projectName, "Support");
  assert.equal(c.amount, 500);
}

function testCreateSingleWordClient() {
  const r = parseSlackInvoiceCommand("create client:Acme amount:100");
  assertIntent(r, "create");
  assert.equal((r as { clientName?: string }).clientName, "Acme");
}

function testCreateCurrencyVariants() {
  const rInr = parseSlackInvoiceCommand('create client:"X" amount:100 currency:INR');
  assert.equal((rInr as { currency?: string }).currency, "INR");
  const rRs = parseSlackInvoiceCommand('create client:"X" amount:100 currency:Rs');
  assert.equal((rRs as { currency?: string }).currency, "INR");
  const rUsd = parseSlackInvoiceCommand('create client:"X" amount:100 currency:$');
  assert.equal((rUsd as { currency?: string }).currency, "USD");
}

function testCreateInferClientFromSentence() {
  const r = parseSlackInvoiceCommand('create for "Beta Inc" amount:200');
  assertIntent(r, "create");
  assert.equal((r as { clientName?: string }).clientName, "Beta Inc");
  assert.equal((r as { amount?: number }).amount, 200);
}

function testCreateInferAmountFromSentence() {
  const r = parseSlackInvoiceCommand('create client:"Y" ₹ 1500');
  assert.equal((r as { amount?: number }).amount, 1500);
}

function testCreateQuantityAndRate() {
  const r = parseSlackInvoiceCommand('create client:"Z" qty:3 rate:100');
  assert.equal((r as { quantity?: number }).quantity, 3);
  assert.equal((r as { rate?: number }).rate, 100);
  assert.equal((r as { amount?: number }).amount, 300);
}

function testCreateUnknownSubcommandFallsBackToHelp() {
  assertIntent(parseSlackInvoiceCommand("list"), "help");
  assertIntent(parseSlackInvoiceCommand("foo bar"), "help");
}

function testSetupFull() {
  const r = parseSlackInvoiceCommand(
    'setup client:"Acme Corp" project:"Website Revamp" email:billing@acme.com phone:+919999999999 notes:"Priority client"'
  );
  assertIntent(r, "setup");
  const s = r as {
    clientName?: string;
    projectName?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
  assert.equal(s.clientName, "Acme Corp");
  assert.equal(s.projectName, "Website Revamp");
  assert.equal(s.email, "billing@acme.com");
  assert.equal(s.phone, "+919999999999");
  assert.ok(s.notes?.includes("Priority"));
}

function run() {
  testHelpEmpty();
  testHelpExplicit();
  testStatusWithNumber();
  testStatusWithKeyValue();
  testStatusNumberOnly();
  testSendWithNumber();
  testSendWithKeyValue();
  testCreateFull();
  testCreateMinimal();
  testCreateSingleWordClient();
  testCreateCurrencyVariants();
  testCreateInferClientFromSentence();
  testCreateInferAmountFromSentence();
  testCreateQuantityAndRate();
  testCreateUnknownSubcommandFallsBackToHelp();
  testSetupFull();
  process.stdout.write("slack-command-parser: ok\n");
}

run();
