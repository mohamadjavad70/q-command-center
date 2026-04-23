# STRUCTURED_LOGS.md

## هدف
ساختاردهی لاگ‌ها به صورت JSON برای ردیابی، مانیتورینگ و تحلیل سریع.

## نمونه لاگ
```json
{
  "timestamp": "2026-04-29T12:00:00Z",
  "level": "info",
  "service": "Q-Kernel",
  "event": "decision_made",
  "request_id": "abc123",
  "user_id": "user42",
  "context": {
    "input": "متن ورودی کاربر",
    "output": "پاسخ سیستم"
  }
}
```

## پیاده‌سازی پیشنهادی
- همه سرویس‌ها باید از یک logger مرکزی استفاده کنند.
- هر event یک request_id یکتا داشته باشد.
- سطح لاگ (info, warn, error) مشخص باشد.
- داده حساس log نشود.

## ابزار پیشنهادی
- TypeScript: winston, pino
- Python: structlog, loguru
