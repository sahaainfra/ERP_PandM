# ConstructERP — Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|-----------|--------|------------|-------|
| R-001 | **No data persistence** — All data lost on page refresh. Users cannot rely on the system for production use. | Certain (100%) | Critical | Part 02 must deliver database + API layer. Until then, clearly label all data as "demo/mock". | Backend Lead |
| R-002 | **No authentication** — Anyone can access all modules. No audit trail of who did what. | Certain (100%) | Critical | Part 02 must deliver auth (JWT/session) + RBAC before any business-critical module goes live. | Backend Lead |
| R-003 | **No backend API** — Frontend cannot communicate with any server. All business logic is in the browser. | Certain (100%) | Critical | Part 02 must establish API framework (Express/Fastify) + database (PostgreSQL). | Backend Lead |
| R-004 | **Bundle size exceeds 500 kB** — Single JS chunk may cause slow initial load on mobile networks (common in Indian construction sites with poor connectivity). | High (70%) | High | Implement route-based code splitting with `React.lazy()` + `Suspense`. Target <200 kB per chunk. | Frontend Lead |
| R-005 | **Misleading encryption claim** — Chat UI says "🔒 End-to-end encrypted" but no encryption is implemented. Legal risk if relied upon. | High (80%) | High | Remove misleading text immediately. Add clear "Demo — encryption not yet implemented" label. Part 08 will add real E2E encryption. | Frontend Lead |
| R-006 | **No test suite** — Zero automated tests. Regressions will go undetected. | Certain (100%) | High | Part 02 must set up Vitest + Testing Library. Every subsequent part must include tests. | QA Lead |
| R-007 | **No linting** — Code style inconsistencies, potential bugs undetected. | High (70%) | Medium | Part 02 must configure ESLint + Prettier. | Frontend Lead |
| R-008 | **Supabase client installed but unused** — Dead dependency adds to bundle size and may confuse developers. | Medium (50%) | Low | Either integrate Supabase (Part 02) or remove from `package.json`. | Backend Lead |
| R-009 | **No error boundaries** — Unhandled React errors crash the entire app. | High (80%) | High | Part 02 must add error boundaries per module and a global fallback. | Frontend Lead |
| R-010 | **No offline capability** — Construction sites often have poor connectivity. Users cannot work offline. | High (70%) | High | Part 12+ must add PWA + IndexedDB + sync queue. Until then, show clear "online required" notice. | Frontend Lead |
| R-011 | **Mock data may be mistaken for real** — Users may believe displayed data is production data. | Medium (40%) | Medium | Add prominent "DEMO MODE" banner. Part 02 will replace with real data. | Product |
| R-012 | **Indian statutory compliance not verified** — GST rates, labour laws, transport rules are not encoded. | Medium (50%) | High | Part 18 (Finance) must verify current GST rates against cbic.gov.in. Encode as configurable rules with source references. | Finance Lead |
| R-013 | **Schema conflicts between parts** — Multiple parts may create overlapping tables or fields. | Medium (40%) | High | Part 01 establishes canonical schema design. Each part must check GAP_ANALYSIS.md before creating new tables. | Architect |
| R-014 | **No CI/CD pipeline** — Manual builds, no automated testing, no deployment automation. | Certain (100%) | Medium | Part 02 must set up GitHub Actions with build + typecheck + test + lint. | DevOps |
| R-015 | **Accessibility gaps** — Construction workforce may include users with disabilities. WCAG compliance not verified. | Medium (50%) | Medium | Part 02 must add axe-core testing. Each part must verify keyboard navigation. | QA Lead |

## Risk Heat Map

```
Impact →    Low    Medium   High    Critical
Likelihood ↓
Certain      .       .       R-006   R-001, R-002, R-003
High         .       R-007   R-004, R-009, R-010
Medium       R-008   R-011   R-012, R-013, R-015
Low          .       .       .
```

## Critical Path Risks (Must resolve before Part 03)
1. R-001: Data persistence
2. R-002: Authentication
3. R-003: Backend API
4. R-006: Test suite
