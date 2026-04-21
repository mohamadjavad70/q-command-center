# Qmetaram OS — Consolidation Plan

**Generated:** 2026-02-28  
**Scope:** 67 registered pages, 5 dedicated, 62 placeholders, 8 duplicate clusters

---

## Source of Truth Hierarchy

| Source | Role | Pages |
|--------|------|-------|
| `this-project` | **Canonical** — pages built here with real components | `/sam-arman`, `/q-network` |
| `q-metaram` | Original core project | `/sun-core`, `/command-center`, `/q-core`, `/star-world` |
| `qmetaram-hub` | Hub aggregator (most entries) | 42 pages |
| `samir-exchange` | Exchange module | 9 pages |
| `unified` | Merged from multiple projects | `/auth`, `/war-room` |
| Various idea projects | Single-concept repos | 7 pages under `/ideas/*` |

**Verdict:** `qmetaram-hub` is the largest contributor but all its pages are placeholders. The only real implementations are in `this-project` and `q-metaram`.

---

## Phase 1: Inventory & Freeze (NOW — No Code Changes)

**Goal:** Lock the current route structure. No new pages, no route changes.

### Actions:
1. ✅ **DONE** — Created `docs/page-inventory.json` as machine-readable single source of truth
2. ✅ **DONE** — Created `docs/page-inventory.md` as human-readable summary
3. **Freeze NavigationMap.ts** — No new entries until Phase 2 is complete
4. **Tag NotFound.tsx as dead code** — Not routed, can be removed in Phase 3
5. **Document access control state** — Current overrides are in localStorage, volatile

### Risks Mitigated:
- No more "ghost pages" added without review
- Clear visibility into what exists vs what is placeholder

---

## Phase 2: Deprecate Duplicates (Soft Redirects)

**Goal:** For each duplicate cluster, mark non-canonical pages as deprecated. Add soft redirects in NavigationMap (not in router).

### Cluster Resolution Table

| Cluster | Keep (Canonical) | Deprecate | Action |
|---------|-----------------|-----------|--------|
| Security Dashboards | `/security` | `/security/unified`, `/sentinel` | Merge into `/security` with tabs |
| Security Guardian | `/security/guardian` | `/ideas/guardian-core` | Redirect idea to security sub-page |
| AI Tools | `/ai-tools` | `/ai-assistant` | Merge, keep `/ai-tools` |
| Command Centers | `/sam-arman` ✅ | `/command-center`, `/dashboard/noor`, `/dashboard/sovereign` | Redirect all to `/sam-arman` |
| Network | `/q-network` ✅ | `/network` | Remove `/network` from nav |
| Agent Forge | `/q-core` ✅ | `/agent-forge` | Remove `/agent-forge` from nav |
| AI Marketplace | `/exchange/ai-galaxy` | `/exchange/ai-market` | Merge into `/exchange/ai` |
| Module Browsing | `/marketplace` | `/modules` | Remove `/modules` from nav |
| Private Hubs | `/private-hub` | `/sovereign-hub` | Merge into `/private-hub` |
| Galaxy Views | `/star-world` | `/galaxy`, `/ideas/galaxy-planet` | Redirect to `/star-world` |
| Messaging | `/chat` | `/qpn/messenger` | Redirect messenger to `/chat` |

### Implementation Steps:
1. Add `deprecated: true` field to `PageEntry` interface
2. Mark deprecated pages in NavigationMap
3. In SovereignPage, if page is deprecated, show "redirecting to canonical" message
4. Hide deprecated pages from nav by default (toggle in AccessControlPanel)
5. Update `/sam-arman` panel to show deprecation warnings

### Pages to Remove from NavigationMap (10 entries):
```
/command-center → redirect to /sam-arman
/agent-forge → redirect to /q-core
/network → redirect to /q-network
/ai-assistant → redirect to /ai-tools
/modules → redirect to /marketplace
/sovereign-hub → redirect to /private-hub
/security/unified → merge into /security
/sentinel → merge into /security
/dashboard/noor → redirect to /sam-arman
/dashboard/sovereign → redirect to /sam-arman
```

**After Phase 2: 57 active pages (down from 67)**

---

## Phase 3: Merge & Clean (Future — Only After Content Is Built)

**Goal:** Build real content for canonical pages and remove dead code.

### Priority Build Order (by impact):

| Priority | Page | Why |
|----------|------|-----|
| 1 | `/auth` | Foundation — all private pages depend on real authentication |
| 2 | `/security` | Core governance — merge 4 security pages into one tabbed view |
| 3 | `/exchange` | Revenue — needs real trading UI, not placeholder |
| 4 | `/ai-tools` | User-facing — merge AI assistant into unified tools page |
| 5 | `/chat` | Engagement — standalone chat (currently embedded in /sam-arman) |
| 6 | `/marketplace` | Discovery — module browsing for users |
| 7 | `/admin` | Operations — real admin panel |
| 8 | `/studio/*` | Creative — each studio needs its own real implementation |

### Dead Code Removal:
- Delete `src/pages/NotFound.tsx` (orphan, never rendered)
- Remove deprecated nav entries after 30-day grace period
- Clean up unused imports

### Lazy Loading (Performance):
```tsx
// Future App.tsx pattern
const QCore = lazy(() => import("./pages/QCore")); // ReactFlow is heavy
const QNetwork = lazy(() => import("./pages/QNetwork"));
```

### Authentication Gate:
- Phase 3 requires Lovable Cloud for real auth
- Replace localStorage access control with database-backed ACL
- Private pages should require login, not just show "restricted" message

---

## Summary Timeline

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Inventory + freeze | ✅ Complete |
| Phase 2 | Deprecate 10 duplicates | 🔲 Ready to execute on command |
| Phase 3 | Build real content + auth | 🔲 Requires Lovable Cloud |
