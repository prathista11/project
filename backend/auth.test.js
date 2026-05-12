const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hashPassword,
  signJwt,
  verifyJwt,
  verifyPassword,
} = require("./auth");

test("password hashing verifies only the original password", async () => {
  const stored = await hashPassword("correct horse battery staple");

  assert.equal(await verifyPassword("correct horse battery staple", stored), true);
  assert.equal(await verifyPassword("wrong password", stored), false);
});

test("signed JWT rejects tampered payloads", () => {
  const token = signJwt({ sub: "user-1", role: "app_user" }, "test-secret", 60);
  const parts = token.split(".");
  const tampered = `${parts[0]}.${Buffer.from(
    JSON.stringify({ sub: "user-2", role: "app_user" })
  )
    .toString("base64url")}.${parts[2]}`;

  assert.equal(verifyJwt(token, "test-secret").sub, "user-1");
  assert.equal(verifyJwt(tampered, "test-secret"), null);
});
