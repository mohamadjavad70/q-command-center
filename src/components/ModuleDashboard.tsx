import { navigationMap, getNavigationStats } from "@/lib/NavigationMap";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import SovereignEye from "./SovereignEye";

const STATUS_COLORS: Record<string, string> = {
  ready: "hsl(142, 76%, 45%)",
  partial: "hsl(45, 93%, 58%)",
  stub: "hsl(0, 0%, 50%)",
  planned: "hsl(0, 0%, 30%)",
};

export default function ModuleDashboard() {
  const stats = getNavigationStats();

  const pieData = [
    { name: "عملیاتی", value: stats.ready, color: STATUS_COLORS.ready },
    { name: "نیمه‌فعال", value: stats.partial, color: STATUS_COLORS.partial },
    { name: "پیش‌نویس", value: stats.stub, color: STATUS_COLORS.stub },
    { name: "برنامه‌ریزی", value: stats.planned, color: STATUS_COLORS.planned },
  ].filter((d) => d.value > 0);

  const barData = navigationMap.map((g) => {
    const ready = g.pages.filter((p) => p.status === "ready").length;
    const partial = g.pages.filter((p) => p.status === "partial").length;
    const total = g.pages.length;
    const pct = total > 0 ? Math.round(((ready * 100 + partial * 50) / (total * 100)) * 100) : 0;
    return { name: g.icon + " " + g.labelFa, pct, total };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Sovereign Eye */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center justify-center">
        <SovereignEye progress={stats.readinessPercent} />
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          قدرت یکپارچگی سیستم
        </p>
      </div>

      {/* Pie Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-bold text-primary mb-2">توزیع وضعیت صفحات</h3>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
              formatter={(value: number, name: string) => [`${value} صفحه`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 mt-1 justify-center">
          {pieData.map((d) => (
            <div key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name} ({d.value})
            </div>
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-bold text-primary mb-2">آمادگی ماژول‌ها (٪)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
              formatter={(value: number) => [`${value}٪`, "آمادگی"]}
            />
            <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
