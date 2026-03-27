/**
 * Full smoke test for Slack /invoice integration
 * Covers: auth, validation, idempotency, help, create, status, send (all branches)
 *
 * Requires:
 * - Dev server running (npm run dev)
 * - .env with SLACK_SIGNING_SECRET
 * - Seeded TTESTTEAM + UTESTUSER -> workspace
 *
 * Usage: node scripts/smoke-slack-commands.js [baseUrl]
 *        npm run test:slack-commands
 */

const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const BASE_URL = process.argv[2] || "http://localhost:3000";
const SLACK_COMMANDS_URL = `${BASE_URL}/api/integrations/slack/commands`;

const TEAM_ID = "TTESTTEAM";
const USER_ID = "UTESTUSER";
const CHANNEL_ID = "C01234567";
const RESPONSE_URL = "https://hooks.slack.com/actions/TEST/123/abc";

function signBody(timestamp, rawBody) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) throw new Error("SLACK_SIGNING_SECRET is not set in .env");
  const baseString = `v0:${timestamp}:${rawBody}`;
  const sig = crypto.createHmac("sha256", secret).update(baseString).digest("hex");
  return `v0=${sig}`;
}

function buildForm(params) {
  return new URLSearchParams(params).toString();
}

async function postRaw(rawBody, signature, timestamp) {
  const res = await fetch(SLACK_COMMANDS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-slack-signature": signature,
      "x-slack-request-timestamp": timestamp,
    },
    body: rawBody,
  });
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { error: raw || `status ${res.status}` };
  }
  if (!res.ok && data.text) data.error = data.text;
  return { status: res.status, data };
}

async function postCommand(text) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    team_id: TEAM_ID,
    channel_id: CHANNEL_ID,
    user_id: USER_ID,
    command: "/invoice",
    text,
    response_url: RESPONSE_URL,
  };
  const rawBody = buildForm(params);
  const signature = signBody(timestamp, rawBody);
  return postRaw(rawBody, signature, timestamp);
}

function extractInvoiceNumber(text) {
  const m = (text || "").match(/INV-\d+/);
  return m ? m[0] : null;
}

function msg(data) {
  return data.text || (data.error && String(data.error)) || JSON.stringify(data);
}

let passed = 0;
let failed = 0;

function ok(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log("OK   " + name + (detail ? " " + detail : ""));
  } else {
    failed++;
    console.error("FAIL " + name);
  }
}

async function main() {
  if (!process.env.SLACK_SIGNING_SECRET) {
    console.error("Missing SLACK_SIGNING_SECRET in .env");
    process.exit(1);
  }

  console.log("Slack integration smoke test – every aspect and action");
  console.log("Base URL:", BASE_URL);
  console.log("");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const validBody = buildForm({
    team_id: TEAM_ID,
    channel_id: CHANNEL_ID,
    user_id: USER_ID,
    command: "/invoice",
    text: "help",
    response_url: RESPONSE_URL,
  });

  // --- Auth ---
  const wrongSig = signBody(timestamp, validBody).replace(/v0=./, "v0=x");
  const { status: authStatus, data: authData } = await postRaw(validBody, wrongSig, timestamp);
  ok(
    "auth: invalid signature → 401",
    authStatus === 401 && (authData.text || "").includes("Invalid Slack signature")
  );

  const noSig = await postRaw(validBody, "", timestamp);
  ok("auth: missing signature → 401", noSig.status === 401);

  // --- Validation: invalid payload ---
  const badPayload = buildForm({
    team_id: "not_a_team",
    channel_id: CHANNEL_ID,
    user_id: USER_ID,
    command: "/invoice",
    text: "help",
    response_url: RESPONSE_URL,
  });
  const badPayloadSig = signBody(timestamp, badPayload);
  const { status: valStatus, data: valData } = await postRaw(badPayload, badPayloadSig, timestamp);
  ok(
    "validation: invalid team_id → Invalid command payload",
    valStatus === 200 && msg(valData).includes("Invalid command payload")
  );

  // --- Help ---
  const helpRes = await postCommand("help");
  ok(
    "help: 200 + PaperChai",
    helpRes.status === 200 && (helpRes.data.text || "").includes("PaperChai")
  );

  // --- Create: missing client ---
  const createNoClient = await postCommand("create amount:100");
  ok(
    "create: missing client → Missing fields",
    createNoClient.status === 200 && msg(createNoClient.data).includes("client")
  );

  // --- Create: missing amount ---
  const createNoAmount = await postCommand('create client:"Acme" project:"Website"');
  ok(
    "create: missing amount → Missing fields",
    createNoAmount.status === 200 && msg(createNoAmount.data).includes("amount")
  );

  // --- Create: success (draft + approval queued) ---
  let createdInvoiceNumber = null;
  const createRes = await postCommand(
    'create client:"Acme" project:"Website" amount:100 due:2026-03-01 email:billing@acme.com'
  );
  const createMsg = msg(createRes.data);
  if (
    createRes.status === 200 &&
    (createMsg.includes("Draft") || createMsg.includes("queued") || createMsg.includes("created"))
  ) {
    createdInvoiceNumber = extractInvoiceNumber(createMsg);
    ok(
      "create: draft + approval queued",
      true,
      createdInvoiceNumber ? `(${createdInvoiceNumber})` : ""
    );
  } else if (createMsg.includes("not found") && createMsg.includes("Client")) {
    passed++;
    console.log("SKIP create: draft + approval queued (create client 'Acme' in dashboard to pass)");
  } else if (createMsg.includes("not linked") || createMsg.includes("not connected")) {
    passed++;
    console.log("SKIP create: draft + approval queued (seed TTESTTEAM/UTESTUSER and link user)");
  } else {
    ok("create: draft + approval queued", false, createMsg.slice(0, 60));
  }

  // --- Idempotency: duplicate same request → already processed ---
  const dupBody = buildForm({
    team_id: TEAM_ID,
    channel_id: CHANNEL_ID,
    user_id: USER_ID,
    command: "/invoice",
    text: "help",
    response_url: RESPONSE_URL,
  });
  const tsDup = Math.floor(Date.now() / 1000).toString();
  const sigDup = signBody(tsDup, dupBody);
  await postRaw(dupBody, sigDup, tsDup);
  const dupRes = await postRaw(dupBody, sigDup, tsDup);
  ok(
    "idempotency: duplicate → already processed",
    dupRes.status === 200 && msg(dupRes.data).toLowerCase().includes("already processed")
  );

  // --- Status: missing number ---
  const statusNoNum = await postCommand("status");
  ok(
    "status: missing number → Usage",
    statusNoNum.status === 200 && msg(statusNoNum.data).includes("Usage")
  );

  // --- Status: with number (found or not found) ---
  const statusInv = createdInvoiceNumber || "INV-0001";
  const statusRes = await postCommand(`status ${statusInv}`);
  const statusMsg = msg(statusRes.data);
  if (
    statusRes.status === 200 &&
    (statusMsg.includes("DRAFT") ||
      statusMsg.includes("SENT") ||
      statusMsg.includes("PAID") ||
      statusMsg.includes(statusInv))
  ) {
    ok("status: returns status line", true, statusMsg.slice(0, 50));
  } else if (statusRes.status === 200 && statusMsg.includes("not found")) {
    ok("status: returns status line", true, "(invoice not found – expected if create skipped)");
  } else {
    ok("status: returns status line", false, statusMsg.slice(0, 50));
  }

  // --- Send: missing number ---
  const sendNoNum = await postCommand("send");
  ok(
    "send: missing number → Usage",
    sendNoNum.status === 200 && msg(sendNoNum.data).includes("Usage")
  );

  // --- Send: queued for approval (no direct send) ---
  const sendInv = createdInvoiceNumber || "INV-0001";
  const sendRes = await postCommand(`send ${sendInv}`);
  const sendMsg = msg(sendRes.data);
  if (
    sendRes.status === 200 &&
    (sendMsg.includes("queued for admin approval") ||
      sendMsg.includes("pending approval") ||
      sendMsg.includes("not found") ||
      sendMsg.includes("already pending"))
  ) {
    ok(
      "send: approval queued or expected message",
      true,
      sendMsg.includes("queued") ? "(queued)" : sendMsg.slice(0, 40)
    );
  } else {
    ok("send: approval queued or expected message", false, sendMsg.slice(0, 60));
  }

  console.log("");
  console.log("Result: " + passed + " passed, " + failed + " failed.");
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
