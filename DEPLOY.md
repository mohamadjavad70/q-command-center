# راهنمای دیپلوی Q Command Center

## وضعیت فعلی

| چک | وضعیت |
|---|---|
| Build محلی (`npm run build`) | ✅ موفق - 17.73s |
| تست‌ها (`vitest run`) | ✅ 799/799 |
| PWA (manifest + sw.js + icons) | ✅ آماده |
| Vercel project config | ✅ `.vercel/project.json` |
| Git remote URL | ❌ نیاز به اصلاح |
| Vercel deploy | ❌ نیاز به اقدام |

---

## روش ۱: دیپلوی از WSL (سریع‌ترین)

چون Vercel در WSL احراز هویت شده، در WSL اجرا کن:

```bash
cd "/mnt/c/Users/KUNIGO/Downloads/مرکز فرماندهی کیو"
bash deploy-from-wsl.sh
```

یا دستی:

```bash
cd "/mnt/c/Users/KUNIGO/Downloads/مرکز فرماندهی کیو"
vercel build --prod
vercel deploy --prebuilt --prod
```

---

## روش ۲: دیپلوی از GitHub Actions (ماندگار)

### گام ۱: ساخت GitHub repo

```bash
# در WSL یا PowerShell:
# ابتدا در https://github.com/new یک repo به نام q-command-center بساز
# سپس:

cd "C:\Users\KUNIGO\Downloads\مرکز فرماندهی کیو"
git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/q-command-center.git
git push origin master
```

### گام ۲: افزودن Secrets به GitHub

در GitHub repo → Settings → Secrets → Actions → New secret:

| نام Secret | مقدار |
|---|---|
| `VERCEL_TOKEN` | از https://vercel.com/account/tokens بساز |
| `VERCEL_ORG_ID` | `team_t8NJWPnWE6fNJdSb6XOjlM5L` |
| `VERCEL_PROJECT_ID` | `prj_5NAGzaJAhcRR0AUGiF2D58E3TkRc` |

### گام ۳: Push → Auto Deploy

بعد از push به `master`، GitHub Actions به صورت خودکار دیپلوی می‌کند.

---

## روش ۳: دیپلوی از PowerShell (نیاز به login)

```powershell
cd "C:\Users\KUNIGO\Downloads\مرکز فرماندهی کیو"
vercel login   # login با مرورگر
vercel build --prod
vercel deploy --prebuilt --prod
```

---

## تنظیم DNS برای qmetaram.ch

در Swizzonic → Zone Editor → qmetaram.ch:

| نوع | نام | مقدار |
|---|---|---|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

بعد از دیپلوی در Vercel Dashboard → Project → Settings → Domains:
- اضافه کن: `qmetaram.ch`
- اضافه کن: `www.qmetaram.ch`

---

## اطلاعات پروژه Vercel

```json
{
  "projectId": "prj_5NAGzaJAhcRR0AUGiF2D58E3TkRc",
  "orgId": "team_t8NJWPnWE6fNJdSb6XOjlM5L",
  "projectName": "q-command-center"
}
```

---

## وضعیت Git

```
Branch: master
Last commit: b614474 - feat(phase5): self-learning feedback engine + live agent connectors
Remote: https://github.com/YOUR_USERNAME/q-command-center.git  ← اصلاح نشده
```

برای اصلاح remote:
```bash
git remote set-url origin https://github.com/REAL_USERNAME/q-command-center.git
```
