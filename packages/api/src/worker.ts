import type { D1Database } from "@cloudflare/workers-types";

import { createD1Client } from "./db/d1Client.js";
import { createApiHandlers } from "./handlers.js";
import { createD1Repos } from "./repos/d1Repos.js";

type Env = {
  DB: D1Database;
  CORS_ALLOW_ORIGIN?: string;
};

const jsonHeaders = {
  "Content-Type": "application/json"
};

function corsHeaders(origin: string | undefined) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Device-Id"
  };
}

function jsonResponse(body: unknown, init?: ResponseInit, corsOrigin?: string): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...corsHeaders(corsOrigin),
      ...(init?.headers ?? {})
    }
  });
}

async function readJsonBody(request: Request): Promise<unknown> {
  if (request.body == null) return null;
  return request.json();
}

function getQueryParams(url: URL): Record<string, string> {
  return Object.fromEntries(url.searchParams.entries());
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    const corsOrigin = env.CORS_ALLOW_ORIGIN;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(corsOrigin) });
    }

    const db = createD1Client(env.DB);
    const handlers = createApiHandlers(createD1Repos(db));

    try {
      if (method === "GET" && path === "/api/health") {
        return jsonResponse(await handlers.health(), undefined, corsOrigin);
      }

      if (method === "GET" && path === "/api/tasks") {
        return jsonResponse(await handlers.listTasks(), undefined, corsOrigin);
      }

      if (path.startsWith("/api/tasks/")) {
        const id = path.replace("/api/tasks/", "");
        if (method === "PUT") {
          return jsonResponse(await handlers.upsertTask(await readJsonBody(request)), undefined, corsOrigin);
        }
        if (method === "DELETE") {
          return jsonResponse(await handlers.deleteTask(id), undefined, corsOrigin);
        }
      }

      if (method === "GET" && path === "/api/sessions") {
        return jsonResponse(await handlers.listSessions(getQueryParams(url)), undefined, corsOrigin);
      }

      if (path.startsWith("/api/sessions/")) {
        const id = path.replace("/api/sessions/", "");
        if (method === "PUT") {
          return jsonResponse(await handlers.upsertSession(await readJsonBody(request)), undefined, corsOrigin);
        }
        if (method === "DELETE") {
          return jsonResponse(await handlers.deleteSession(id), undefined, corsOrigin);
        }
      }

      if (method === "GET" && path === "/api/settings") {
        return jsonResponse(await handlers.getSettings(), undefined, corsOrigin);
      }

      if (method === "PUT" && path === "/api/settings") {
        return jsonResponse(await handlers.upsertSettings(await readJsonBody(request)), undefined, corsOrigin);
      }

      if (method === "POST" && path === "/api/timer/start") {
        return jsonResponse(await handlers.timerStart(await readJsonBody(request)), undefined, corsOrigin);
      }

      if (method === "POST" && path === "/api/timer/stop") {
        return jsonResponse(await handlers.timerStop(await readJsonBody(request)), undefined, corsOrigin);
      }

      if (method === "POST" && path === "/api/sync/push") {
        return jsonResponse(await handlers.syncPush(await readJsonBody(request)), undefined, corsOrigin);
      }

      if (method === "POST" && path === "/api/sync/pull") {
        return jsonResponse(await handlers.syncPull(await readJsonBody(request)), undefined, corsOrigin);
      }

      if (method === "GET" && path === "/api/reports/daily") {
        return jsonResponse(await handlers.dailyReport(getQueryParams(url)), undefined, corsOrigin);
      }

      if (method === "GET" && path === "/api/reports/weekly") {
        return jsonResponse(await handlers.weeklyReport(getQueryParams(url)), undefined, corsOrigin);
      }

      return jsonResponse({ error: "Not found" }, { status: 404 }, corsOrigin);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return jsonResponse({ error: message }, { status: 400 }, corsOrigin);
    }
  }
};
