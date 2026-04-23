import { useMemo, useState } from "react";
import { mediaOrchestrator } from "@/lib/media/MediaOrchestrator";

function ProviderState({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-[10px] px-2 py-1 rounded-md border ${ready ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10" : "border-amber-400/40 text-amber-300 bg-amber-500/10"}`}>
        {ready ? "READY" : "PENDING"}
      </span>
    </div>
  );
}

export default function RealtimeMediaConsole() {
  const [roomId, setRoomId] = useState("q-room-001");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const registry = useMemo(() => mediaOrchestrator.getRegistry(), [status]);

  const connect = async () => {
    try {
      setStatus("connecting");
      await mediaOrchestrator.connectRealtime(roomId);
      setStatus("connected");
      setMessage("اتصال آنلاین برقرار شد");
    } catch (err) {
      setStatus("failed");
      setMessage(err instanceof Error ? err.message : "اتصال برقرار نشد");
    }
  };

  const disconnect = async () => {
    await mediaOrchestrator.disconnectRealtime();
    setStatus("idle");
    setMessage("اتصال بسته شد");
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold">کنسول ادغام صوت/ویدیو</h2>
        <p className="text-[12px] text-muted-foreground mt-1">این بخش آماده اتصال فایل‌های جدید گفتار، ویدیو و ارتباط آنلاین است.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ProviderState label="STT" ready={Boolean(registry.stt)} />
        <ProviderState label="TTS" ready={Boolean(registry.tts)} />
        <ProviderState label="Realtime" ready={Boolean(registry.realtime)} />
        <ProviderState label="Video" ready={Boolean(registry.video)} />
      </div>

      <div className="rounded-lg border border-border bg-background p-3 space-y-2">
        <label className="text-xs text-muted-foreground">Room ID</label>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm outline-none focus:border-primary/40"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={connect}
            className="px-3 py-2 rounded-md text-xs font-semibold border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20"
          >
            اتصال آنلاین
          </button>
          <button
            type="button"
            onClick={disconnect}
            className="px-3 py-2 rounded-md text-xs font-semibold border border-border text-muted-foreground hover:text-foreground"
          >
            قطع اتصال
          </button>
          <span className="text-[11px] text-muted-foreground ml-auto">Status: {status}</span>
        </div>
      </div>

      {message && <div className="text-[12px] text-primary">{message}</div>}
    </section>
  );
}
