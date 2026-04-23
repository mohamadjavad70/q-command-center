export type ChatRole = "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

export type UserMemory = {
  name?: string;
  language?: "fa" | "de" | "tr" | "en";
  interests: string[];
  personality?: string;
};

const PROFILE_KEY = "q_memory_profile";
const HISTORY_KEY = "q_memory_history";
const MAX_HISTORY = 16;

export function loadUserMemory(): UserMemory {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { interests: [] };
    const parsed = JSON.parse(raw) as UserMemory;
    return { interests: parsed.interests ?? [], ...parsed };
  } catch {
    return { interests: [] };
  }
}

export function saveUserMemory(memory: UserMemory): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(memory));
}

export function loadConversationHistory(): ChatTurn[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatTurn[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function saveConversationHistory(history: ChatTurn[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
}

function pushUniqueInterest(memory: UserMemory, interest: string): UserMemory {
  const clean = interest.trim();
  if (!clean) return memory;
  if (memory.interests.some((i) => i.toLowerCase() === clean.toLowerCase())) return memory;
  return { ...memory, interests: [...memory.interests, clean] };
}

export function extractUserMemory(userText: string, current: UserMemory): UserMemory {
  const text = userText.trim();
  const lower = text.toLowerCase();
  let next = { ...current, interests: [...current.interests] };

  const nameMatch = text.match(/(?:اسم من|name is|ich hei(?:s|ß)e|benim ad(?:ı|im))\s+([^.!؟?\n]{2,32})/i);
  if (nameMatch?.[1]) next.name = nameMatch[1].trim();

  if (/[\u0600-\u06FF]/.test(text)) next.language = "fa";
  else if (/[äöüß]/i.test(text) || /\bdeutsch\b|\bhallo\b/i.test(text)) next.language = "de";
  else if (/[ğüşöçıİĞÜŞÖÇ]/.test(text) || /\bturk(?:ce|ish)?\b|\bmerhaba\b/i.test(text)) next.language = "tr";
  else if (/\benglish\b|\bhello\b|\bhi\b/i.test(text)) next.language = "en";

  const interestMatch = text.match(/(?:علاقه دارم به|i like|i am interested in|ich mag|interessiere mich f[üu]r|ilgi alan[ıi]m)\s+([^.!؟?\n]{2,60})/i);
  if (interestMatch?.[1]) next = pushUniqueInterest(next, interestMatch[1]);

  return next;
}

export function buildMemoryContext(memory: UserMemory): string {
  return [
    "User Memory:",
    `Name: ${memory.name ?? "unknown"}`,
    `Language: ${memory.language ?? "unknown"}`,
    `Interests: ${memory.interests.length ? memory.interests.join(", ") : "unknown"}`,
    `Personality: ${memory.personality ?? "unknown"}`,
  ].join("\n");
}
