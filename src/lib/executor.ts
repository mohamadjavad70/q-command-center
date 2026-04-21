import type { Node, Edge } from "reactflow";

export type RunLog = {
  nodeId: string;
  nodeType: string;
  label: string;
  startedAt: number;
  endedAt: number;
  ok: boolean;
  input: any;
  output: any;
  error?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runWorkflowLinear(
  nodes: Node[],
  edges: Edge[],
  onStep?: (log: RunLog) => void
): Promise<{ logs: RunLog[] }> {
  const nextMap = new Map<string, string>();
  edges.forEach((e) => nextMap.set(e.source, e.target));

  const targets = new Set(edges.map((e) => e.target));
  const start = nodes.find((n) => !targets.has(n.id)) ?? nodes[0];
  if (!start) return { logs: [] };

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const logs: RunLog[] = [];
  const memory: Record<string, any> = {};

  let cur: string | undefined = start.id;
  const visited = new Set<string>();

  while (cur && !visited.has(cur)) {
    visited.add(cur);
    const n = nodeById.get(cur);
    if (!n) break;

    const nodeType = (n.data as any)?.nodeType ?? "unknown";
    const label = (n.data as any)?.label ?? nodeType;
    const cfg = (n.data as any)?.config ?? {};
    const input = { cfg, memory };
    const startedAt = Date.now();

    try {
      const output = await runNodeMock(nodeType, input);
      const endedAt = Date.now();
      memory[cur] = output;
      const log: RunLog = { nodeId: cur, nodeType, label, startedAt, endedAt, ok: true, input, output };
      logs.push(log);
      onStep?.(log);
    } catch (err: any) {
      const endedAt = Date.now();
      const log: RunLog = {
        nodeId: cur, nodeType, label, startedAt, endedAt, ok: false,
        input, output: null, error: err?.message ?? String(err),
      };
      logs.push(log);
      onStep?.(log);
      break;
    }

    cur = nextMap.get(cur) ?? undefined;
    await sleep(200);
  }

  return { logs };
}

async function runNodeMock(nodeType: string, input: any) {
  if (nodeType === "tool_instagram") {
    return {
      items: [
        { from: "user123", text: "سلام، قیمت چنده؟", ts: Date.now() - 20000 },
        { from: "user555", text: "ارسال داری؟", ts: Date.now() - 10000 },
        { from: "user999", text: "تخفیف دارید؟", ts: Date.now() - 5000 },
      ].slice(0, Number(input.cfg?.limit ?? 2)),
      meta: { account: input.cfg?.account ?? "@qmetaram", mode: input.cfg?.mode ?? "read_dm" },
    };
  }
  if (nodeType === "tool_telegram") {
    return { sent: true, messageId: `tg-${Date.now()}`, chatId: input.cfg?.chatId };
  }
  if (nodeType.startsWith("ai_")) {
    return { analysis: "mock-analysis-result", suggestion: "پیشنهاد هوشمند شبیه‌سازی‌شده", basedOn: Object.keys(input.memory) };
  }
  if (nodeType === "storage_db") {
    return { saved: true, count: 1, table: input.cfg?.table ?? "records" };
  }
  if (nodeType.startsWith("trigger_")) {
    return { received: true, payload: { source: "mock", ts: Date.now() } };
  }
  if (nodeType.startsWith("output_")) {
    return { delivered: true, at: new Date().toISOString() };
  }
  if (nodeType.startsWith("logic_")) {
    return { result: true, branch: "main" };
  }
  if (nodeType === "tool_http") {
    return { status: 200, body: { ok: true } };
  }
  if (nodeType === "tool_scraper") {
    return { content: "محتوای شبیه‌سازی‌شده", links: ["https://example.com"] };
  }
  if (nodeType === "tool_email") {
    return { sent: true, messageId: `em-${Date.now()}` };
  }
  return { ok: true, nodeType };
}
