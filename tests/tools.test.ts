import { describe, it, expect } from "vitest";
import { create_taskHandler } from "../src/tools/create_task";
import { list_tasksHandler } from "../src/tools/list_tasks";
import { complete_taskHandler } from "../src/tools/complete_task";

describe("create_task", () => {
  it("returns a content array", async () => {
    const result = await create_taskHandler({} as any);
    expect(result).toBeTruthy();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });
});

describe("list_tasks", () => {
  it("returns a content array", async () => {
    const result = await list_tasksHandler({} as any);
    expect(result).toBeTruthy();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });
});

describe("complete_task", () => {
  it("returns a content array", async () => {
    const result = await complete_taskHandler({} as any);
    expect(result).toBeTruthy();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });
});

