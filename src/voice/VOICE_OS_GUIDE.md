# 🎙️ Q Voice OS - Complete Guide

## تجهیزات و قابلیت‌ها

### موتور صوتی (StreamVoiceEngine)
- **Continuous Listening**: شنوایی دائم و بدون توقف
- **Wake Word Detection**: تشخیص کلمه‌ی "کیو" یا "Q"
- **Streaming Response**: پاسخ دادن سریع و بدون تاخیر
- **Latency Tracking**: اندازه‌گیری تاخیر (باید < 1.5s)
- **Error Recovery**: خودکار بازگشت بعد از خطا

### تشخیص‌کننده‌ی کلمه‌ی بیدار (WakeWordDetector)
```
"کیو ایمیل‌هام بخوان"
     ↓
Detector recognizes: "کیو"
     ↓
Extracts command: "ایمیل‌هام بخوان"
```

### Bridge Gmail (Voice-Gmail Bridge)
دستورات صوتی → نقشه گرفتن → اقدام Gmail

| دستور صوتی | عمل | نتیجه |
|-----------|-----|-------|
| "کیو ایمیل‌هام بخوان" | check + read | نمایش آخرین ایمیل |
| "کیو برای علی ایمیل بفرست" | parse + send | ارسال ایمیل |
| "کیو ایمیل‌های جدید چه‌قدر" | check | تعداد ایمیل‌های جدید |

---

## راه‌اندازی

### Option 1: استفاده‌ی کامل (React App)

```jsx
import { QVoiceOS } from "./QVoiceOS";

function App() {
  return <QVoiceOS />;
}
```

### Option 2: استفاده‌ی Widget

```jsx
import VoiceOSWidget from "./components/VoiceOSWidget";

function MyApp() {
  return (
    <div>
      <YourContent />
      <VoiceOSWidget 
        autoStart={true}
        showIndicator={true}
        showTranscript={true}
      />
    </div>
  );
}
```

### Option 3: استفاده‌ی Manual

```typescript
import { voiceEngine } from "./voice/stream-voice-engine";
import { setupVoiceGmailIntegration } from "./voice/voice-gmail-bridge";

// Setup
await voiceEngine.selfTest();
setupVoiceGmailIntegration();
voiceEngine.start();

// Listen to events
voiceEngine.on("wake-word", (data) => {
  console.log("دستور:", data.command);
});

voiceEngine.on("response", (data) => {
  console.log("تاخیر:", data.latency, "ms");
});
```

---

## API Reference

### voiceEngine

```typescript
// شروع گوش‌دادن
voiceEngine.start();

// توقف گوش‌دادن
voiceEngine.stop();

// دریافت وضعیت
const state = voiceEngine.getState();
// {
//   isListening: boolean
//   isProcessing: boolean
//   lastTranscript?: string
//   lastCommand?: string
//   responseTime?: number
// }

// خود‌آزمایی
const test = await voiceEngine.selfTest();
// { recognition: boolean, synthesis: boolean, detectorReady: boolean }

// رویدادها
voiceEngine.on("start", () => {});
voiceEngine.on("wake-word", (data) => {});
voiceEngine.on("transcript", (data) => {});
voiceEngine.on("processing-start", (data) => {});
voiceEngine.on("response", (data) => {});
voiceEngine.on("error", (data) => {});
voiceEngine.on("end", () => {});
```

### voiceGmailBridge

```typescript
// تجزیه دستور
const cmd = voiceGmailBridge.parseVoiceCommand("کیو ایمیل بخوان");
// { action: "read", count: 1 }

// اجرا
const response = await voiceGmailBridge.executeCommand(cmd);

// Setup خودکار
setupVoiceGmailIntegration();
```

---

## مثال‌های دستورات صوتی

### ایمیل
```
"کیو ایمیل‌ها چک کن"
"کیو آخرین ایمیل‌ام بخوان"
"کیو برای علی ایمیل بفرست: سلام"
"کیو اسپم‌ها حذف کن"
```

### مثال‌های آینده
```
"کیو یادآوری تنظیم کن"
"کیو جستجو کن"
"کیو وضعیت سیستم"
```

---

## نکات کارایی

| نکته | اهمیت | توضیح |
|------|--------|-----------|
| Speech Recognition بین‌المللی | ⭐⭐⭐ | فقط بعضی مرورگرها از فارسی پشتیبانی می‌کنند |
| Microphone Permission | ⭐⭐⭐ | کاربر باید اجازه دهد |
| Browser Support | ⭐⭐⭐ | Chrome/Edge: فعال، Safari/Firefox: محدود |
| Network Latency | ⭐⭐ | تاخیر شبکه مؤثر بر latency |

---

## توسعه و تغییر

### افزودن دستور جدید

```typescript
// در stream-voice-engine.ts routeCommand

if (normalized.includes("دستور_جدید")) {
  return "پاسخ برای دستور جدید";
}
```

### ادغام API جدید

```typescript
// ایجاد bridge جدید
class VoiceXBridge {
  parseVoiceCommand(transcript: string) { }
  executeCommand(command: any) { }
}

// افزودن به setupVoiceGmailIntegration
voiceEngine.on("response", async (data) => {
  const xCmd = voiceXBridge.parseVoiceCommand(data.command);
  if (xCmd) {
    await voiceXBridge.executeCommand(xCmd);
  }
});
```

---

## مشکل‌گیری

### "Speech Recognition not available"
```
✅ حل: استفاده از Chrome/Edge
✅ حل: بررسی microphone permissions
```

### Latency بالا (> 2s)
```
✅ حل: تقلیل حجم model
✅ حل: استفاده‌ی local processing
```

### کلمه‌ی بیدار‌کننده‌ی نشناخته
```
✅ حل: افزودن more examples
✅ حل: استفاده‌ی offline model
```

---

## معماری فیزیکی

```
┌──────────────────────────────────────────────┐
│         Q Voice OS Architecture              │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ StreamVoiceEngine (موتور اصلی)        │  │
│  │ - Continuous Recognition               │  │
│  │ - Command Routing                      │  │
│  │ - Response Generation                  │  │
│  └────────────────────────────────────────┘  │
│         ↓              ↓              ↓       │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │ Wake Word│   │  Gmail   │   │ Memory   │  │
│  │ Detector │   │ Bridge   │   │ Graph    │  │
│  └──────────┘   └──────────┘   └──────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Response Layer (نطق، پاسخ)            │  │
│  │ - Streaming TTS                        │  │
│  │ - Widget UI                            │  │
│  └────────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Performance Metrics

قابل‌سنجش‌ها برای monitoring:

```typescript
interface MetricsEvent {
  timestamp: number;
  latency: number;          // پاسخ تا پاسخ
  processingTime: number;   // دستور تا پاسخ
  errorCount: number;       // تعداد خطا
  commandRecognition: number; // دقت تشخیص
}
```

---

## منطق‌های آینده

- [ ] Offline Wake Word Detection (TensorFlow.js)
- [ ] Multi-language Support
- [ ] Voice Profile Learning
- [ ] Privacy Mode (Local-only processing)
- [ ] Integration with More Services

---

**فرمانده سام آرمان - شورای نور**  
"کد صوت‌ی، حالا زندگی دارد."
