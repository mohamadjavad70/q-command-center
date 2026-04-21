import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";
import { getNavigationStats, navigationMap } from "@/lib/NavigationMap";

describe("project architecture smoke checks", () => {
  it("keeps a non-empty navigation registry", () => {
    expect(navigationMap.length).toBeGreaterThan(0);
    expect(getNavigationStats().total).toBeGreaterThan(0);
  });

  it("merges class names predictably", () => {
    expect(cn("px-2", "py-1", "px-4")).toContain("px-4");
  });
});
