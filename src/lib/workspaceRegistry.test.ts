تimport { describe, expect, it } from "vitest";
import { getWorkspaceSummary, workspaceProjects } from "@/lib/workspaceRegistry";

describe("workspaceRegistry", () => {
  it("should expose a stable central workspace summary", () => {
    const summary = getWorkspaceSummary();

    expect(workspaceProjects.length).toBe(9);
    expect(summary.total).toBe(9);
    expect(summary.active).toBe(4);
    expect(summary.support).toBe(2);
    expect(summary.archive).toBe(3);
    expect(summary.core).toBe("مرکز فرماندهی کیو");
  });
});
