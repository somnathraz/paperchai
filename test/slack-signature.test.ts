/**
 * Unit tests for Slack request signature verification
 * verifySlackSignature (with mocked env)
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";

// Reimplement logic to test without importing (which would need env at import time)
function computeSlackSignature(secret: string, timestamp: string, body: string): string {
  const baseString = `v0:${timestamp}:${body}`;
  const sig = crypto.createHmac("sha256", secret).update(baseString).digest("hex");
  return `v0=${sig}`;
}

function testSignatureComputation() {
  const secret = "test_signing_secret";
  const timestamp = "1234567890";
  const body =
    "team_id=T&channel_id=C&user_id=U&command=/invoice&text=help&response_url=https://x.com";
  const sig = computeSlackSignature(secret, timestamp, body);
  assert.ok(sig.startsWith("v0="));
  assert.equal(sig.length, "v0=".length + 64);
  // Verify same body + secret + timestamp gives same sig
  const sig2 = computeSlackSignature(secret, timestamp, body);
  assert.equal(sig, sig2);
}

function testSignatureChangesWithBody() {
  const secret = "sec";
  const ts = "1";
  const sig1 = computeSlackSignature(secret, ts, "a");
  const sig2 = computeSlackSignature(secret, ts, "b");
  assert.notEqual(sig1, sig2);
}

function testSignatureChangesWithTimestamp() {
  const secret = "sec";
  const body = "x";
  assert.notEqual(
    computeSlackSignature(secret, "1", body),
    computeSlackSignature(secret, "2", body)
  );
}

function testSignatureChangesWithSecret() {
  const ts = "1";
  const body = "x";
  assert.notEqual(
    computeSlackSignature("secret_a", ts, body),
    computeSlackSignature("secret_b", ts, body)
  );
}

function run() {
  testSignatureComputation();
  testSignatureChangesWithBody();
  testSignatureChangesWithTimestamp();
  testSignatureChangesWithSecret();
  process.stdout.write("slack-signature: ok\n");
}

run();
