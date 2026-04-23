# Onboarding Guide

## 1) Prerequisites

- Node.js 20+
- npm 10+
- Supabase project credentials
- OpenAI API key

## 2) Install

```bash
npm install
```

## 3) Environment

Create `.env` from `.env.example` and set:
- OPENAI_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## 4) Run Locally

Frontend:
```bash
npm run dev
```

Backend API:
```bash
node server.js
```

## 5) Quality Checks

```bash
npm run lint
npm run test
npm run build
```

## 6) Deployment Flow (Current)

- Push to main branch
- GitHub Actions runs deploy workflow
- Validate `/health`, `/health/runtime`, `/health/db`

## 7) Security Basics

- Rate limiting enabled for `/api/*`
- Stronger limits on `/api/chat`, `/api/transcribe`, `/api/tts`
- Sensitive paths blocked (`/.env`, `/wp-admin`, ...)

## 8) First Tasks for New Engineers

- Read `SECURITY.md`
- Read migration files in `supabase/migrations/`
- Run health endpoints and verify API keys are configured
