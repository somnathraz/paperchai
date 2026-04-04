import assert from "node:assert/strict";
import { signupSchema, passwordResetSchema, verifyEmailSchema } from "../lib/api-schemas";
import { buildAppUrl } from "../lib/app-url";
import { authPolicy, isActiveUserStatus } from "../lib/security/auth-policy";

function testSignupRequiresName() {
  const result = signupSchema.safeParse({
    email: "user@example.com",
    password: "Abcd1234!",
  });
  assert.equal(result.success, false);
}

function testSignupAcceptsValidPayload() {
  const result = signupSchema.safeParse({
    name: "Alex Doe",
    email: "user@example.com",
    password: "Abcd1234!",
  });
  assert.equal(result.success, true);
}

function testResetAndVerifyTokenValidation() {
  const resetBad = passwordResetSchema.safeParse({ token: "short", password: "Abcd1234!" });
  assert.equal(resetBad.success, false);

  const verifyBad = verifyEmailSchema.safeParse({ token: "tiny" });
  assert.equal(verifyBad.success, false);
}

function testPolicyAndStatusGuards() {
  assert.equal(authPolicy.messages.invalidCredentials.length > 0, true);
  assert.equal(isActiveUserStatus("ACTIVE"), true);
  assert.equal(isActiveUserStatus("SUSPENDED"), false);
}

function testBuildAppUrlNormalization() {
  process.env.NEXTAUTH_URL = "https://paperchaiapp.com/";
  assert.equal(
    buildAppUrl("/verify-email?token=abc"),
    "https://paperchaiapp.com/verify-email?token=abc"
  );
}

function run() {
  testSignupRequiresName();
  testSignupAcceptsValidPayload();
  testResetAndVerifyTokenValidation();
  testPolicyAndStatusGuards();
  testBuildAppUrlNormalization();
  process.stdout.write("auth-contract: ok\n");
}

run();
