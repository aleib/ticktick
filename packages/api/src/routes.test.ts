import test from "node:test";
import assert from "node:assert/strict";

import Fastify from "fastify";

import { registerRoutes } from "./routes.js";

test("GET /api/health", async () => {
  const app = Fastify();
  await registerRoutes(app);

  const res = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(res.statusCode, 200);

  const json = res.json() as any;
  assert.equal(json.ok, true);
});


