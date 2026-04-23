import { useState } from "react";

interface FAQItem {
  q: string;
  a: string;
}

const faqItems: FAQItem[] = [
  {
    q: "How do I check system health quickly?",
    a: "Open /health for service checks, latency, and dependency status in one screen.",
  },
  {
    q: "What happens if AI providers fail?",
    a: "QNativeChat falls back to local rule-based responses and can attempt local Ollama first.",
  },
  {
    q: "Is auth enforced for sensitive APIs?",
    a: "Yes. Guardian middleware and token-based validation protect restricted endpoints.",
  },
  {
    q: "Can modules work in unstable network conditions?",
    a: "Yes. Service worker queue and offline-ready patterns support delayed sync behavior.",
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-sm font-bold tracking-wide text-foreground">Operator FAQ</h3>
        <span className="text-[10px] text-muted-foreground">Onboarding and support answers</span>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {faqItems.map((item, idx) => {
          const open = openIndex === idx;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? -1 : idx)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
              >
                <span className="text-sm font-medium text-foreground">{item.q}</span>
                <span className="text-primary text-lg leading-none">{open ? "-" : "+"}</span>
              </button>
              {open && <p className="px-4 pb-4 text-[12px] text-muted-foreground leading-5">{item.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
