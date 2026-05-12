import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { create_taskHandler } from "./tools/create_task.js";
import { list_tasksHandler } from "./tools/list_tasks.js";
import { complete_taskHandler } from "./tools/complete_task.js";

/**
 * Build a fresh MCP server instance.
 *
 * We export a FACTORY rather than a singleton so the HTTP
 * transport can hand each new session its own `McpServer`.
 * The MCP SDK rejects a second `initialize` on the same
 * Server instance, so a per-session factory is mandatory
 * for the streamable-http transport.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "Task Tracker MCP",
    version: "0.1.0",
  });

  // ---------- Tools ----------
  server.registerTool("create_task", {
    description: "Creates a new task with title, optional description, and priority. Returns the task ID",
    inputSchema: { title: z.string(), description: z.string().optional(), priority: z.string().optional() },
  }, create_taskHandler);

  server.registerTool("list_tasks", {
    description: "Lists all tasks, optionally filtered by status",
    inputSchema: { status: z.string().optional() },
  }, list_tasksHandler);

  server.registerTool("complete_task", {
    description: "Marks a task as done by ID",
    inputSchema: { id: z.string() },
  }, complete_taskHandler);

  // ---------- Resources ----------
  server.registerResource("Task summary", "tasks://summary", {
    description: "Aggregate counts: total, todo, in-progress, done",
    mimeType: "application/json",
  }, async (uri) => ({
    contents: [{ uri: uri.href, text: "TODO: return resource contents" }]
  }));

  // ---------- Prompts ----------
  server.registerPrompt("daily_standup", {
    description: "Generates a standup summary from current task list",
    argsSchema: {assignee: z.string().optional()},
  }, async (args) => ({
    messages: [{ role: "user", content: { type: "text", text: `Generate a 3-bullet standup summary for {{assignee}}'s tasks:
1. What's in progress (status='in-progress')
2. What was completed yesterday (status='done')
3. Top priority blocker (highest priority 'todo' task)

Keep each bullet to one sentence.
` } }]
  }));

  return server;
}
