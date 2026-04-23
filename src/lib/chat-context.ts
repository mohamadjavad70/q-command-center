/**
 * chat-context.ts
 * Context minimization utilities for LLM chat requests.
 *
 * Responsibilities:
 *  1. Limit history to last N messages (prevent context bloat)
 *  2. Redact PII (email, phone, IBAN, SSN patterns) from all messages
 *  3. Ensure total estimated token count stays within budget
 */

type ChatTurn = { role: string; content: string }

const MAX_HISTORY_TURNS = 5          // keep last 5 turns (= 10 messages)
const MAX_CHARS_PER_MSG = 2_000      // hard truncate very long single messages
const CHAR_TO_TOKEN_RATIO = 4        // rough approximation: 1 token ≈ 4 chars
const MAX_CONTEXT_TOKENS = 3_000     // budget before sending to LLM

const PII_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b[\w.+%-]+@[\w-]+\.[a-zA-Z]{2,}\b/g,      label: '[EMAIL]' },
  { pattern: /\b(\+?\d[\d\s\-.()]{7,15}\d)\b/g,           label: '[PHONE]' },
  { pattern: /\b[A-Z]{2}\d{2}[\s\dA-Z]{11,30}\b/g,        label: '[IBAN]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g,                    label: '[SSN]' },
  { pattern: /\b(sk-|sb_)[A-Za-z0-9_-]{20,}\b/g,          label: '[API_KEY]' },
]

/**
 * Redact PII patterns from a string.
 */
export function redactPii(text: string): string {
  let out = text
  for (const { pattern, label } of PII_PATTERNS) {
    out = out.replace(pattern, label)
  }
  return out
}

/**
 * Minimise a history array before sending to the LLM:
 * 1. Keep only the last `maxTurns` message pairs
 * 2. Redact PII from every message
 * 3. Truncate individual messages that are too long
 * 4. Drop oldest messages if total token budget exceeded
 */
export function minimiseContext(
  history: ChatTurn[],
  maxTurns = MAX_HISTORY_TURNS
): ChatTurn[] {
  // Step 1: keep last maxTurns pairs
  const recent = history.slice(-maxTurns * 2)

  // Step 2: redact + truncate each message
  const cleaned: ChatTurn[] = recent.map((msg) => ({
    role:    msg.role,
    content: redactPii(msg.content.slice(0, MAX_CHARS_PER_MSG))
  }))

  // Step 3: token budget guard — drop from front until under budget
  let totalChars = cleaned.reduce((s, m) => s + m.content.length, 0)
  const budget   = MAX_CONTEXT_TOKENS * CHAR_TO_TOKEN_RATIO
  let start = 0
  while (totalChars > budget && start < cleaned.length) {
    totalChars -= cleaned[start].content.length
    start++
  }

  return cleaned.slice(start)
}

/**
 * Sanitise a single user message before appending to history.
 */
export function sanitiseMessage(text: string): string {
  return redactPii(text.slice(0, MAX_CHARS_PER_MSG).trim())
}
