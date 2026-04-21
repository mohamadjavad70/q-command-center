/**
 * Global Guards — فیلتر خطاهای افزونه‌ها و اکستنشن‌های مرورگر
 * جلوگیری از WSOD (صفحه سفید مرگ)
 */

const EXTENSION_PATTERNS = [
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^safari-extension:\/\//,
  /metamask/i,
  /phantom/i,
  /content\.js/,
  /inpage\.js/,
];

function isExtensionError(source?: string, message?: string): boolean {
  const text = `${source || ""} ${message || ""}`;
  return EXTENSION_PATTERNS.some((p) => p.test(text));
}

export function installGlobalGuards() {
  // فیلتر خطاهای unhandled از افزونه‌ها
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (isExtensionError(source as string, message as string)) {
      console.warn("[Guard] Blocked extension error:", message);
      return true; // جلوگیری از propagation
    }
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // فیلتر Promise rejection‌های افزونه‌ها
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    if (reason && isExtensionError(reason?.stack, reason?.message)) {
      console.warn("[Guard] Blocked extension rejection:", reason?.message);
      event.preventDefault();
    }
  });

  console.info("[Guard] ✅ Global safety guards installed");
}
