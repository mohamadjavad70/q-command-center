import { describe, expect, it } from "vitest";
import { createGalaxy, createPlanetFromPrompt } from "@/lib/galaxy/galaxyEngine";

describe("Q Galaxy engine", () => {
  it("creates a personal galaxy with generated planets", () => {
    const galaxy = createGalaxy("sam-arman");
    const planet = createPlanetFromPrompt({
      name: "Planet Noor",
      style: "futuristic",
      type: "gallery",
    });

    expect(galaxy.id).toContain("sam-arman");
    expect(planet.name).toBe("Planet Noor");
    expect(planet.terrain.mountains).toBeGreaterThanOrEqual(0);
    expect(planet.aiAgent.role).toBe("gallery");
  });
});
