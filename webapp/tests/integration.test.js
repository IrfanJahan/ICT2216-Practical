const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const baseUrl = process.env.APP_URL || "https://127.0.0.1";

test("home page loads", async () => {
  const response = await fetch(baseUrl);
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /Login Page/);
});

test("weak password remains on create account page", async () => {
  const response = await fetch(`${baseUrl}/create-account`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: "weakuser",
      password: "password"
    })
  });
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /Create Account/);
});

test("strong password creates account and reaches welcome page", async () => {
  const response = await fetch(`${baseUrl}/create-account`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: `student_${Date.now()}`,
      password: "MySecurePassword2026"
    })
  });
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /Welcome/);
  assert.match(body, /MySecurePassword2026/);
});