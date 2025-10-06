# SAD — Mini Kanban (DnD Multiple Containers)

**Version:** 1.1 • **Date:** 2025-10-05 • **Owner:** You

## 1. Executive Summary
Next.js (App Router) + Node 20 + TypeScript strict, tRPC for type-safe API, Prisma + SQLite for storage, Tailwind UI.  
**dnd-kit** provides client-side DnD with **Mouse/Touch/Keyboard** sensors, **container-first collision**, **Always** measuring, and a `DragOverlay`.  
React Query handles server cache; Zustand covers UI-only state (modals, filters, active drag). Ordering uses **sparse Int** with **renormalization**.

## 2. Context & Scope
- **In scope:** Columns and tasks reordering; optimistic updates; “+ Add column”; optional Trash for tasks.  
- **Out of scope:** Virtualization, auth, multi-user.

## 3. Architecture (C4-lite)
- **Browser (UI):** DnD UI components (`DroppableContainer`, `SortableItem`), keyboard coordinate getter, overlay.  
- **Client data layer:** React Query queries + mutations; optimistic reducers for `tasks.move`, `columns.move`, `tasks.remove`.  
- **API:** tRPC routers (`TasksRouter`, `ColumnsRouter` including `move`).  
- **Data:** Prisma models: `Project`, `Column(order)`, `Task(order)`; indexes: `(projectId, order)`, `(columnId, order)`.

## 4. Key Decisions
- Multi-sensor DnD with keyboard support → better accessibility and parity with the reference behavior.  
- Collision strategy: container-first with `lastOverId` fallback to reduce jitter crossing container edges.  
- Measuring: `MeasuringStrategy.Always` to keep hitboxes accurate during layout shifts.  
- Sparse Int orders for both tasks and columns for simple, O(1) inserts.

## 5. Ordering & Renormalization
- Start/Between/End formulas (see Ordering spec).  
- Renorm when min gap < 2 or after 50 moves (scope-local), within a single transaction.

## 6. Error Handling
- Toasts on failure; rollback optimistic cache.  
- Error taxonomy: `BAD_REQUEST`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`.

## 7. Deployment & DX
- SQLite dev DB (`prisma/dev.db`) is `.gitignore`d.  
- `db:reset` resets schema + seeds.  
- Smoke script exercises random moves across tasks and columns and validates invariants.

## 8. Risks
- Keyboard interaction differences across platforms → manual validation.  
- Potential drag perf on low-end devices → acceptable for M1.

## 9. References
- Specs in `/docs/specs/*`  
- Reference code: `/docs/ref/dnd/MultipleContainers.demo.tsx`
