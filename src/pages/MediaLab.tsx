import RealtimeMediaConsole from "@/components/media/RealtimeMediaConsole";

export default function MediaLab() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-black tracking-tight">Q Media Lab</h1>
          <p className="text-sm text-muted-foreground mt-2">
            آزمایشگاه آماده ادغام فایل‌های صوت، ویدیو و گفت‌وگوی آنلاین.
          </p>
        </header>

        <RealtimeMediaConsole />

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold">گام بعدی ادغام</h2>
          <ol className="mt-3 text-[12px] text-muted-foreground space-y-2 list-decimal pl-5">
            <li>ثبت Provider جدید در MediaOrchestrator</li>
            <li>اتصال کلیدها در env و مسیر API</li>
            <li>فعال‌سازی تست smoke برای STT/TTS/Realtime/Video</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
