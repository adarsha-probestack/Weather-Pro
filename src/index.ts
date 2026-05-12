// Load .env BEFORE anything else so `process.env.MCP_AUTH_TOKEN`
// is populated when the auth middleware runs. Without this
// import, every request fails with 401 even though the token
// file is right next to package.json.
import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.js";

const app = express();
app.use(express.json());

// Structured request logging.
app.use((req, _res, next) => {
  const t0 = Date.now();
  _res.on("finish", () => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), method: req.method, path: req.path, status: _res.statusCode, ms: Date.now() - t0 }));
  });
  next();
});

// CORS.
//
// `Mcp-Session-Id` is critical to expose — without it the
// browser refuses to let the JS client read the header,
// so the client can never learn its session id and the
// *second* JSON-RPC call (`tools/list`) bombs with a
// 400 "Mcp-Session-Id header is required" on the server.
const ALLOWED_ORIGINS = "*";
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const allow = ALLOWED_ORIGINS === "*" ? "*" : (ALLOWED_ORIGINS.split(",").map((s: string) => s.trim()).includes(origin) ? origin : "");
  if (allow) res.setHeader("Access-Control-Allow-Origin", allow);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function requireAuth(req: any, res: any, next: any) {
  const header = req.headers["authorization"] || "";
  const expected = `Bearer ${process.env.MCP_AUTH_TOKEN || ""}`;
  if (!process.env.MCP_AUTH_TOKEN || header !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------
// Per-session transport map.
//
// The MCP SDK's `Server` is single-shot: it accepts exactly one
// `initialize` request and then rejects any further ones with
// HTTP 400 "Server already initialized" (JSON-RPC -32600). The
// browser test client (and any well-behaved MCP client) reuses
// its session id across calls, but a *fresh* client (page
// reload, second probe click after the cache was cleared, a
// second tab, etc.) will send `initialize` again. To support
// that we keep a map of transports keyed by session id and
// build a brand-new `McpServer` + transport pair for every
// new initialize. Reusing the same `McpServer` instance for
// multiple sessions is what triggers the "already initialized"
// error — so we call `createServer()` per session.
// ---------------------------------------------------------------
const transports: Record<string, StreamableHTTPServerTransport> = {};

app.use("/mcp", requireAuth);
app.all("/mcp", async (req, res) => {
  try {
    const sid = (req.headers["mcp-session-id"] as string | undefined) || undefined;
    let transport: StreamableHTTPServerTransport | undefined =
      sid ? transports[sid] : undefined;

    if (!transport) {
      // No known session. The only call we accept without a
      // session is `initialize` (POST). Everything else is a
      // protocol violation that the SDK itself would reject
      // with a confusing message, so we short-circuit it here.
      if (req.method !== "POST" || !isInitializeRequest(req.body)) {
        return res.status(400).json({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32000, message: "Bad Request: no active MCP session — send `initialize` first." },
        });
      }
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSid: string) => { transports[newSid] = transport!; },
      });
      transport.onclose = () => {
        if (transport && transport.sessionId) delete transports[transport.sessionId];
      };
      const mcp = createServer();
      await mcp.connect(transport);
    }
    await transport.handleRequest(req, res, req.body);
  } catch (err: any) {
    console.error("/mcp handler error", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: err?.message || "internal server error" },
      });
    }
  }
});

const port = Number(process.env.PORT || 3500);
app.listen(port, () => { console.log(`MCP server listening on http://localhost:${port}/mcp`); });
