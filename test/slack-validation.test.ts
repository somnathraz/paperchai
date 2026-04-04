/**
 * Unit tests for Slack command validation and sanitization
 * slackCommandSchema, sanitizeInput
 */

import assert from "node:assert/strict";
import { slackCommandSchema, sanitizeInput } from "../lib/validation/integration-schemas";

const validPayload = {
  team_id: "TTESTTEAM",
  channel_id: "C01234567",
  user_id: "UTESTUSER",
  command: "/invoice",
  text: "help",
  response_url: "https://hooks.slack.com/actions/TEST/123",
};

function testValidPayload() {
  const r = slackCommandSchema.safeParse(validPayload);
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.team_id, "TTESTTEAM");
    assert.equal(r.data.user_id, "UTESTUSER");
    assert.equal(r.data.text, "help");
  }
}

function testTeamIdFormat() {
  assert.equal(
    slackCommandSchema.safeParse({ ...validPayload, team_id: "invalid" }).success,
    false
  );
  assert.equal(slackCommandSchema.safeParse({ ...validPayload, team_id: "T123" }).success, true);
}

function testChannelIdFormat() {
  assert.equal(slackCommandSchema.safeParse({ ...validPayload, channel_id: "X99" }).success, false);
  assert.equal(slackCommandSchema.safeParse({ ...validPayload, channel_id: "C99" }).success, true);
  assert.equal(slackCommandSchema.safeParse({ ...validPayload, channel_id: "D99" }).success, true);
  assert.equal(slackCommandSchema.safeParse({ ...validPayload, channel_id: "G99" }).success, true);
}

function testUserIdFormat() {
  assert.equal(
    slackCommandSchema.safeParse({ ...validPayload, user_id: "invalid" }).success,
    false
  );
  assert.equal(slackCommandSchema.safeParse({ ...validPayload, user_id: "U123" }).success, true);
}

function testCommandStartsWithSlash() {
  assert.equal(
    slackCommandSchema.safeParse({ ...validPayload, command: "invoice" }).success,
    false
  );
  assert.equal(
    slackCommandSchema.safeParse({ ...validPayload, command: "/invoice" }).success,
    true
  );
}

function testResponseUrlMustBeUrl() {
  assert.equal(
    slackCommandSchema.safeParse({ ...validPayload, response_url: "not-a-url" }).success,
    false
  );
  assert.equal(
    slackCommandSchema.safeParse({ ...validPayload, response_url: "https://example.com/cb" })
      .success,
    true
  );
}

function testTextMaxLength() {
  const long = "x".repeat(3001);
  assert.equal(slackCommandSchema.safeParse({ ...validPayload, text: long }).success, false);
  assert.equal(
    slackCommandSchema.safeParse({ ...validPayload, text: "x".repeat(3000) }).success,
    true
  );
}

function testSanitizeRemovesScript() {
  const out = sanitizeInput("hello <script>alert(1)</script> world");
  assert.ok(!out.includes("script"));
  assert.ok(!out.includes("alert"));
}

function testSanitizeRemovesHtml() {
  const out = sanitizeInput("<b>bold</b> and <img src=x>");
  assert.equal(out, "bold and");
}

function testSanitizeRemovesDangerousChars() {
  const out = sanitizeInput("a'b\"c`d;e\\f");
  assert.equal(out, "abcdef");
}

function testSanitizeTrims() {
  assert.equal(sanitizeInput("  text  "), "text");
}

function testSanitizeEmpty() {
  assert.equal(sanitizeInput(""), "");
}

function run() {
  testValidPayload();
  testTeamIdFormat();
  testChannelIdFormat();
  testUserIdFormat();
  testCommandStartsWithSlash();
  testResponseUrlMustBeUrl();
  testTextMaxLength();
  testSanitizeRemovesScript();
  testSanitizeRemovesHtml();
  testSanitizeRemovesDangerousChars();
  testSanitizeTrims();
  testSanitizeEmpty();
  process.stdout.write("slack-validation: ok\n");
}

run();
