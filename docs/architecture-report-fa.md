# گزارش معماری پروژه

## وضعیت نهایی
پروژه به ساختار استاندارد Vite + React + TypeScript منتقل شد و همه اجزای اصلی در پوشه `src` سازمان‌دهی شدند.

## ساختار جدید
- `src/app` برای لایه برنامه، مسیرها و providerها
- `src/pages` برای صفحات اصلی
- `src/components/ui` برای کامپوننت‌های عمومی و shadcn
- `src/components/forge` برای اجزای حوزه Forge
- `src/components` برای کامپوننت‌های اشتراکی
- `src/lib` برای منطق، نقشه‌ها، validation و utilityها
- `src/hooks` برای هوک‌ها
- `src/test` برای تست‌ها
- `src/assets` برای فایل‌های استاتیک
- `archive/duplicates` برای نسخه‌های تکراری و فایل‌های دانلودی

## اصلاحات انجام‌شده
1. انتقال فایل‌های پراکنده ریشه به پوشه‌های تخصصی
2. ساخت فایل‌های کمبوددار مانند hook مربوط به toast و کامپوننت label
3. شکستن لایه App به بخش‌های مجزا در `app/providers.tsx` و `app/routes.tsx`
4. اضافه شدن route-based code splitting برای کاهش حجم bundle اولیه
5. پاک‌سازی ریشه پروژه و انتقال نسخه‌های تکراری به آرشیو
6. افزودن smoke test برای اعتبارسنجی نقشه ناوبری

## اعتبارسنجی
- Production build: موفق
- Test suite: 3 فایل تست، 4 تست، همگی موفق

## پیشنهاد مرحله بعد
- ادامه ماژولار کردن صفحات بزرگ مثل SamArman و QCore
- افزودن لایه state management در صورت رشد پروژه
- تعریف lint rule و import order rule برای پایداری بیشتر
