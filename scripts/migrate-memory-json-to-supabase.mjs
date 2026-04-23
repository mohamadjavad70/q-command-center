import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = path.resolve(__dirname, "..", "memory-db.json");

async function migrate() {
  const raw = await fs.readFile(dbFile, "utf8");
  const parsed = JSON.parse(raw);
  const users = Array.isArray(parsed?.users) ? parsed.users : [];

  for (const user of users) {
    const userId = String(user.userId || "guest");
    const profile = user.profile && typeof user.profile === "object" ? user.profile : {};
    const interests = Array.isArray(user.interests) ? user.interests : [];
    const memory = Array.isArray(user.memory) ? user.memory : [];
    const updatedAt = Number(user.updatedAt || Date.now());

    const { error: userErr } = await supabase.from("user_memory").upsert(
      {
        user_id: userId,
        profile,
        interests,
        memory,
        updated_at: updatedAt,
      },
      { onConflict: "user_id" }
    );
    if (userErr) throw userErr;

    const chatMessages = memory
      .filter((m) => m?.type === "utterance" || m?.type === "assistant")
      .map((m) => ({
        role: m.type === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 2000),
        timestamp: Number(m.timestamp || Date.now()),
      }))
      .slice(-200);

    const { error: convErr } = await supabase.from("conversations").upsert(
      {
        user_id: userId,
        title: "default",
        messages: chatMessages,
        updated_at: new Date(updatedAt).toISOString(),
      },
      { onConflict: "user_id,title" }
    );
    if (convErr) throw convErr;
  }

  console.log(`Migrated ${users.length} users from memory-db.json to Supabase.`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
