import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, Globe, Home, Rocket, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createGalaxy, defaultGalaxyPrompts, getGalaxyStats } from "@/lib/galaxy/galaxyEngine";
import { ShipController, type ShipPosition } from "@/lib/galaxy/shipController";

export default function Galaxy() {
  const galaxy = useMemo(() => createGalaxy("sam-arman", defaultGalaxyPrompts), []);
  const stats = useMemo(() => getGalaxyStats(galaxy), [galaxy]);
  const [ship] = useState(() => new ShipController());
  const [position, setPosition] = useState<ShipPosition>(ship.getPosition());
  const [selectedPlanetId, setSelectedPlanetId] = useState(galaxy.planets[0]?.id ?? "");

  const selectedPlanet = galaxy.planets.find((planet) => planet.id === selectedPlanetId) ?? galaxy.planets[0];

  const moveShip = (dx: number, dy: number, dz: number) => {
    ship.move(dx, dy, dz);
    setPosition(ship.getPosition());
  };

  const warpToPlanet = (planetId: string) => {
    ship.warpToPlanet(planetId);
    setSelectedPlanetId(planetId);
    setPosition(ship.getPosition());
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border glass-panel">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center glow-gold"
              style={{ background: "hsl(var(--neon-gold) / 0.12)", border: "1px solid hsl(var(--neon-gold) / 0.25)" }}
            >
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-[0.2em] uppercase text-primary text-glow-gold">Q GALAXY</h1>
              <p className="text-[10px] text-muted-foreground">Galaxy Guided Exploration · فاز MVP</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/q-core" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-accent">
              <Cpu className="w-3 h-3" /> Q-Core
            </Link>
            <Link to="/sam-arman" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-accent">
              <Shield className="w-3 h-3" /> سام آرمان
            </Link>
            <Link to="/" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-accent">
              <Home className="w-3 h-3" /> خانه
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <section className="rounded-2xl border border-border bg-card p-8 md:p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]" style={{ background: "radial-gradient(circle at 20% 20%, hsl(var(--neon-gold)), transparent 60%)" }} />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3 text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Universe Expansion</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">Q Galaxy Layer</h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
                یک لایه اجرایی برای کشف هدایت‌شده سیاره‌ها، امتیازدهی AI و حرکت سفینه در کهکشان شخصی.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 min-w-[280px]">
              {[
                { label: "سیاره‌ها", value: stats.totalPlanets },
                { label: "AI فعال", value: stats.adaptiveAgents },
                { label: "جاذبه میانگین", value: stats.avgGravity },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background/70 p-4 text-center">
                  <div className="text-2xl font-black text-primary">{item.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">نقشه اولیه کهکشان</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {galaxy.planets.map((planet) => (
                <button
                  key={planet.id}
                  onClick={() => warpToPlanet(planet.id)}
                  className={`rounded-xl border p-4 text-left transition-all hover:border-primary/40 ${planet.id === selectedPlanetId ? "border-primary bg-primary/5" : "border-border bg-secondary/20"}`}
                >
                  <div className="text-sm font-bold">{planet.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{planet.type} · {planet.style}</div>
                  <div className="mt-3 flex gap-1.5">
                    {planet.colorPalette.map((color) => (
                      <span key={color} className="h-3 w-3 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {selectedPlanet && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="text-sm font-bold text-primary">{selectedPlanet.name}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-[11px]">
                  <div><span className="text-muted-foreground">کوه:</span> {selectedPlanet.terrain.mountains}</div>
                  <div><span className="text-muted-foreground">اقیانوس:</span> {selectedPlanet.terrain.oceans}</div>
                  <div><span className="text-muted-foreground">شهر:</span> {selectedPlanet.terrain.cities}</div>
                  <div><span className="text-muted-foreground">AI:</span> {selectedPlanet.aiAgent.role}</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">کنترل سفینه</h3>
            </div>

            <div className="rounded-lg border border-border bg-secondary/20 p-4 font-mono text-sm space-y-1">
              <div>X: {position.x}</div>
              <div>Y: {position.y}</div>
              <div>Z: {position.z}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => moveShip(5, 0, 0)}>حرکت X+</Button>
              <Button variant="outline" onClick={() => moveShip(-5, 0, 0)}>حرکت X-</Button>
              <Button variant="outline" onClick={() => moveShip(0, 5, 0)}>حرکت Y+</Button>
              <Button variant="outline" onClick={() => moveShip(0, 0, -5)}>Warp Z</Button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-5">
              این نسخه، MVP مرحله دوم است: Galaxy هدایت‌شده با سه سیاره نمونه، AI نقش‌دار و حرکت اولیه سفینه.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
