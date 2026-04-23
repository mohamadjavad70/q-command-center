# ASYNC_QUEUE.md

## هدف
ایجاد صف وظایف غیرهمزمان برای مدیریت کارهای سنگین و مقیاس‌پذیری.

## ویژگی‌ها
- اجرای وظایف به صورت async
- ذخیره وضعیت هر job
- قابلیت توزیع بار

## ابزار پیشنهادی
- TypeScript: bullmq, bee-queue
- Python: celery, rq

## نمونه ساختار job
```json
{
  "job_id": "xyz789",
  "type": "transcribe_audio",
  "payload": {
    "file": "audio.wav"
  },
  "status": "pending"
}
```

## مسیر بعدی
- راه‌اندازی bullmq/celery
- اتصال به هسته مرکزی
- مانیتورینگ وضعیت jobها
