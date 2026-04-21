import { z } from "zod";

// ── Shared safe-parse: validates JSON structure, returns fallback on failure ──
export function safeParseJSON<T>(raw: string | null, validator: (data: unknown) => data is T, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return validator(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

// ── Validators ──

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function hasStringProp(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === "string";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ChatMessage[] (ExecutiveChat)
export function isChatMessages(v: unknown): v is Array<{ id: string; role: string; content: string; type: string; timestamp: number }> {
  if (!isArray(v)) return false;
  return v.every(item =>
    isRecord(item) &&
    hasStringProp(item, "id") &&
    hasStringProp(item, "role") &&
    hasStringProp(item, "content") &&
    hasStringProp(item, "type") &&
    typeof item.timestamp === "number"
  );
}

// ForgeChatMsg[] (ForgeChat)
export function isForgeChatMessages(v: unknown): v is Array<{ id: string; role: string; content: string; type: string; timestamp: number }> {
  if (!isArray(v)) return false;
  return v.every(item =>
    isRecord(item) &&
    hasStringProp(item, "id") &&
    hasStringProp(item, "role") &&
    hasStringProp(item, "content") &&
    hasStringProp(item, "type") &&
    typeof item.timestamp === "number"
  );
}

// WorkflowMeta[]
export function isWorkflowIndex(v: unknown): v is Array<{ id: string; name: string; updatedAt: string }> {
  if (!isArray(v)) return false;
  return v.every(item =>
    isRecord(item) &&
    hasStringProp(item, "id") &&
    hasStringProp(item, "name") &&
    hasStringProp(item, "updatedAt")
  );
}

// { nodes: Node[]; edges: Edge[] }
export function isWorkflowData(v: unknown): v is { nodes: any[]; edges: any[] } {
  if (!isRecord(v)) return false;
  return Array.isArray(v.nodes) && Array.isArray(v.edges) &&
    (v.nodes as any[]).every(n => isRecord(n) && hasStringProp(n, "id")) &&
    (v.edges as any[]).every(e => isRecord(e) && hasStringProp(e, "source") && hasStringProp(e, "target"));
}
