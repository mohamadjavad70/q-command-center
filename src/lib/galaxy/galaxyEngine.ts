export type PlanetType = "gallery" | "education" | "game" | "shop";

export interface PlanetPrompt {
  name: string;
  style: string;
  type: PlanetType;
}

export interface Planet {
  id: string;
  name: string;
  style: string;
  type: PlanetType;
  seed: number;
  terrain: {
    mountains: number;
    oceans: number;
    cities: number;
  };
  colorPalette: string[];
  aiAgent: {
    role: PlanetType;
    behavior: "adaptive" | "guided";
  };
  rules: {
    gravity: number;
    interactionLevel: "medium" | "high";
  };
}

export interface Galaxy {
  id: string;
  userId: string;
  planets: Planet[];
  discovered: number;
}

export const defaultGalaxyPrompts: PlanetPrompt[] = [
  { name: "Planet Noor", style: "futuristic", type: "gallery" },
  { name: "Planet Hikmat", style: "organic", type: "education" },
  { name: "Planet Pulse", style: "futuristic", type: "shop" },
];

function hash(input: string) {
  return [...input].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function generateTerrain(seed: number) {
  return {
    mountains: seed % 10,
    oceans: seed % 7,
    cities: seed % 5,
  };
}

function generatePalette(style: string) {
  return style === "futuristic"
    ? ["#00ffcc", "#001122", "#112233"]
    : ["#ffcc00", "#332211", "#445566"];
}

function createPlanetAI(type: PlanetType) {
  return {
    role: type,
    behavior: "adaptive" as const,
  };
}

export function createPlanetFromPrompt(prompt: PlanetPrompt): Planet {
  const seed = hash(`${prompt.name}-${prompt.style}-${prompt.type}`);

  return {
    id: `planet-${seed}`,
    name: prompt.name,
    style: prompt.style,
    type: prompt.type,
    seed,
    terrain: generateTerrain(seed),
    colorPalette: generatePalette(prompt.style),
    aiAgent: createPlanetAI(prompt.type),
    rules: {
      gravity: prompt.type === "game" ? 1.2 : 1.0,
      interactionLevel: prompt.type === "education" ? "medium" : "high",
    },
  };
}

export function createGalaxy(userId: string, prompts: PlanetPrompt[] = defaultGalaxyPrompts): Galaxy {
  const planets = prompts.map(createPlanetFromPrompt);

  return {
    id: `galaxy-${userId}`,
    userId,
    planets,
    discovered: planets.length,
  };
}

export function getGalaxyStats(galaxy: Galaxy) {
  const totalPlanets = galaxy.planets.length;
  const avgGravity = totalPlanets === 0
    ? 0
    : Number((galaxy.planets.reduce((sum, planet) => sum + planet.rules.gravity, 0) / totalPlanets).toFixed(2));

  return {
    totalPlanets,
    avgGravity,
    adaptiveAgents: galaxy.planets.filter((planet) => planet.aiAgent.behavior === "adaptive").length,
  };
}
