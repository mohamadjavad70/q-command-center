const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const USER_ID_KEY = "q_user_id";

function createLocalUserId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getOrCreateUserId(): string {
  const existing = localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const created = localStorage.getItem("userId") || createLocalUserId();
  localStorage.setItem(USER_ID_KEY, created);
  return created;
}

export async function fetchCloudMemory(userId: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/memory/${encodeURIComponent(userId)}`, {
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveCloudMemory(userId: string, newMemory: { type?: string; content: string; source?: string }): Promise<void> {
  if (!newMemory?.content?.trim()) return;
  try {
    await fetch(`${API_BASE}/memory/${encodeURIComponent(userId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newMemory }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Best-effort persistence; ignore errors.
  }
}
