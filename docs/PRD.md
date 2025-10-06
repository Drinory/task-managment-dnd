# PRD — Mini Kanban (Local, Single-User)

**Version:** 1.0 • **Date:** 2025-10-05 • **Owner:** You  
**Docs:** SAD `/docs/SAD.md` · NFR `/docs/NFR.md` · Specs `/docs/specs/*`  
**Reference:** `/docs/ref/dnd/MultipleContainers.demo.tsx`

## 1. Problem
We need a compact, local Kanban to showcase full-stack craft: type-safe CRUD, robust DnD with optimistic updates, and stable ordering persisted to SQLite.

## 2. Goals
- Fluid drag-and-drop for tasks **and** columns with keyboard support.
- Persisted, deterministic ordering using sparse Ints + renormalization.
- Clear optimistic UX with safe rollback on errors.
- Simple seed/reset and a smoke test that proves core invariants.

## 3. Non-Goals
- Multi-user collaboration, auth, or real-time presence.  
- Mobile-first polish or virtualization (out of scope for M1).

## 4. Personas (brief)
- **Engineer/Reviewer:** Evaluates code quality, UX polish, and architectural clarity.  
- **Hiring Manager/Stakeholder:** Wants to see end-to-end completeness, reliability, and testability.

## 5. User Stories (M1)
- As a user, I can reorder **columns** horizontally.  
- As a user, I can move **tasks** within/between columns.  
- As a user, I can create a **new column** via “+ Add column”.  
- As a user, I can **delete a task** by dropping it into a **Trash** area (optional flag).  
- As a user, I see instant feedback while the app saves, with rollback on failure.

## 6. Scope In / Out
- **In:** dnd-kit Multiple Containers behavior; optimistic UI; sparse ordering; DX smoke.  
- **Out:** auth, multi-project navigation, avatars, advanced filtering, pagination.

## 7. Success Metrics (targets)
- p95 TFR ≤ 300 ms on seeded data.  
- ≤ 150 ms perceived settle after a drag (optimistic to settled).  
- 0 unhandled promise rejections; 0 console errors in happy path.  
- Smoke test passes 100% of runs locally.

## 8. Constraints
- Node 20 / Next.js App Router / TypeScript strict.  
- tRPC + Prisma + SQLite; `dev.db` git-ignored.  
- Error codes: `BAD_REQUEST`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`.

## 9. Acceptance Criteria
- Drag with mouse, touch, **and keyboard**.  
- Columns reorder, tasks reorder; placeholder creates a new column; trash deletes tasks only.  
- Orders persisted and strictly increasing after arbitrary sequences of moves.
