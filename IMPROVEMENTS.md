# Potential Improvements

## ✅ Already Complete
- TypeScript strict mode (no `any` types)
- tRPC v11 compatibility
- React hooks rules compliance
- Core DnD functionality
- Optimistic updates
- Error handling with toasts
- Sparse ordering with renormalization
- Smoke tests passing

## 🔧 Minor Issues
### 1. Unused Variable Warning
**File**: `src/components/board/Board.tsx:69`
```
Warning: 'createTask' is assigned a value but never used.
```
**Fix**: Either use it or remove it.

## 📋 Nice-to-Have Improvements

### 1. Database Migrations
**Status**: Currently using `db:push` (dev-only approach)
**Improvement**: Add proper migrations for production readiness
```bash
pnpm prisma migrate dev --name init
```

### 2. Error Boundary
**Status**: Missing
**Improvement**: Add React Error Boundary for graceful error handling
```tsx
// src/components/ErrorBoundary.tsx
```

### 3. Loading States
**Status**: Basic loading states present
**Improvement**: Add skeleton loaders for better UX

### 4. Environment Variables
**Status**: Hardcoded in code
**Improvement**: Add `.env` file with proper validation
```
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Task Creation UI
**Status**: Missing - `createTask` hook exists but no UI
**Improvement**: Add "+ Add task" button in each column

### 6. Column/Task Editing
**Status**: Update mutations exist but no inline editing UI
**Improvement**: Add inline editing for titles/descriptions

### 7. Keyboard Shortcuts
**Status**: Only DnD keyboard support
**Improvement**: Add shortcuts like:
- `N` - New column
- `T` - New task
- `?` - Show shortcuts help

### 8. Accessibility Enhancements
**Status**: Basic a11y (focus rings, aria-labels)
**Improvements**:
- Announce drag start/end to screen readers
- Add proper ARIA live regions for updates
- Keyboard focus management after operations

### 9. Persistence Indicator
**Status**: Optimistic updates with silent background sync
**Improvement**: Show sync status indicator

### 10. Empty States
**Status**: Basic empty column message
**Improvement**: Better empty states with illustrations/CTAs

### 11. Mobile Support
**Status**: Touch sensor present but not optimized
**Improvement**: Mobile-specific UI adjustments

### 12. Tests
**Status**: Only smoke test exists
**Potential additions**:
- Unit tests for ordering logic
- Integration tests for API routes
- E2E tests with Playwright

## 🎨 Polish

### 13. Animations
- Smooth transitions between states
- Better drag feedback

### 14. Dark Mode
- Add theme toggle
- Persist user preference

### 15. Undo/Redo
- Add undo/redo for move operations

## 🚀 Performance

### 16. Memoization
- Already using useMemo for tasksByColumn
- Could add more strategic memoization

### 17. Virtualization
- For boards with 100+ tasks
- Use `@tanstack/react-virtual`

## Priority Recommendations

**High Priority** (Production-ready):
1. ✅ Fix unused variable warning
2. Add database migrations
3. Add task creation UI (since hook exists)
4. Add environment variables

**Medium Priority** (UX):
5. Add error boundary
6. Add skeleton loaders
7. Add inline editing

**Low Priority** (Nice-to-have):
8. Keyboard shortcuts
9. Dark mode
10. Enhanced accessibility

