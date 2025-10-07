# Mini Kanban

A full-stack Kanban board application with drag-and-drop, multi-project support, and modern Next.js 14 architecture.

> **Built for a test assignment** showcasing Next.js 14, TypeScript, Prisma, tRPC, and Zustand expertise.

## Features

### Core Functionality
- 🎯 **Drag-and-drop** - Move tasks within/across columns and reorder columns horizontally
- 🖱️ **Multi-input support** - Works with mouse, touch, and keyboard (Arrow keys for navigation)
- 🗑️ **Delete tasks** - Drag tasks to trash zone for quick deletion
- 🔢 **Smart ordering** - Persistent sparse integer ordering with automatic renormalization

### Project & Task Management
- 📋 **Project selection** - Manage multiple projects with full CRUD operations
- ➕ **Create tasks** - Add tasks with title and description (optional)
- ✏️ **Inline editing** - Click any task title, description, or column name to edit in place
- 📝 **Rich task details** - Each task can have a title and multi-line description
- ➕ **Add columns** - Create new columns with the "+ Add column" button

### User Experience
- ⚡ **Optimistic updates** - Instant UI feedback with automatic rollback on errors
- ⌨️ **Keyboard shortcuts** - Enter to navigate, Cmd/Ctrl+Enter to save, Esc to cancel
- 🎨 **Skeleton loaders** - Beautiful loading states while data is fetching
- 🛡️ **Error handling** - Graceful error boundary with helpful error messages
- 📱 **Touch support** - Works seamlessly on touch devices

### Developer Experience
- 💾 **Database migrations** - Proper version control for database schema
- 🔧 **Environment variables** - Easy configuration for different environments
- ✅ **Type-safe** - Full TypeScript strict mode, no `any` types
- 🧪 **Smoke tests** - Automated tests validate ordering invariants
- 📊 **tRPC integration** - End-to-end type safety from client to server
- 🏗️ **Server/Client Components** - Hybrid Next.js 14 architecture with SSR
- 🎨 **Zustand state management** - Global UI state with localStorage persistence

## Tech Stack

- **Frontend:** Next.js 14 (App Router with Server/Client Components), React 18, TypeScript
- **UI:** Tailwind CSS, dnd-kit
- **API:** tRPC with Zod validation
- **Database:** Prisma + SQLite
- **State:** React Query (server cache), Zustand (UI state)
- **Architecture:** Hybrid SSR/CSR with optimized data fetching

## Architecture Highlights

This project demonstrates **modern Next.js 14 best practices**:

### Server Components (SSR)
- **`/`** - Server-rendered project list with Prisma
- **`/[id]`** - Server-rendered project board wrapper
- Direct database access for optimal performance
- SEO-friendly with full HTML in initial response

### Client Components (Interactivity)
- **`ProjectList`** - Interactive CRUD with tRPC mutations
- **`Board`** - Drag & drop with dnd-kit + Zustand drag state
- Hydrated with interactivity after initial render

### State Management Strategy
- **React Query (tRPC)** - Server state, caching, mutations
- **Zustand** - Ephemeral drag state (activeId, optimistic positions)
- **React State** - Local component state
- **URL** - Source of truth for routing (projectId)
- Clear separation: routing state vs. UI state vs. server state

📖 See [`SERVER_CLIENT_ARCHITECTURE.md`](./SERVER_CLIENT_ARCHITECTURE.md) for detailed explanation  
📖 See [`ZUSTAND_IMPLEMENTATION.md`](./ZUSTAND_IMPLEMENTATION.md) for Zustand patterns

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client and run migrations
pnpm db:generate

# Create database 
pnpm db:reset

# (Optional) Seed database with sample data
pnpm db:seed 

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage Guide

### Application Flow

1. **Project Selection** (`/`)
   - View all your projects on the landing page
   - Create new projects with the "+ New Project" button
   - Edit or delete existing projects (hover to reveal actions)
   - Click "Open →" or click on a project to view its board

2. **Board View** (`/[projectId]`)
   - Manage columns and tasks for the selected project
   - Use "← Projects" link to return to project list
   - Selected project is persisted in Zustand + localStorage

### Managing Projects

1. **Create project**: Click "+ New Project" on the home page
   - Enter project name and press "Create"
   - Automatically navigates to the new project's board

2. **Edit project**: Hover over a project card and click "Edit"
   - Update the name and save

3. **Delete project**: Hover over a project card and click "Delete"
   - Requires confirmation before deletion

### Creating and Managing Tasks

1. **Add a task**: Click the "+ Add task" button at the bottom of any column
   - Enter a title (required)
   - Optionally add a description
   - Press `Enter` to move to description field, `Cmd/Ctrl+Enter` to save

2. **Edit a task**: Click on any task's title or description to edit inline
   - Press `Enter` to save (or `Cmd/Ctrl+Enter` for multi-line fields)
   - Press `Esc` to cancel

3. **Move a task**: Drag and drop tasks within or across columns
   - Or use keyboard: Select task, use Arrow keys, press `Space` to pick up/drop

4. **Delete a task**: Drag a task to the trash zone at the bottom of the screen

### Managing Columns

1. **Add a column**: Click the "+ Add column" button on the right
2. **Rename a column**: Click on the column name to edit inline
3. **Reorder columns**: Drag column headers horizontally to reorder

### Keyboard Shortcuts

- `Enter` - Move to next field / Save single-line edits
- `Cmd/Ctrl+Enter` - Save multi-line edits
- `Esc` - Cancel editing
- `Arrow keys` - Navigate during drag (when item is picked up)
- `Space` - Pick up / Drop item during keyboard navigation

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript compiler
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema to database
- `pnpm db:reset` - Reset database and run seed
- `pnpm db:seed` - Run seed
- `pnpm db:studio` - Open Prisma Studio
- `pnpm smoke` - Run smoke test (validates ordering invariants)

### Smoke Test

The smoke test validates ordering invariants after random moves:

```bash
pnpm smoke
```

This performs:
- 10 random task moves (within and across columns)
- 3 random column moves
- Validates that all orders remain strictly increasing

## Architecture

See `/docs/SAD.md` and `/docs/PRD.md` for detailed architecture and requirements.

### Key Architectural Concepts

**Sparse Int Ordering:** Tasks and columns use sparse integer `order` fields (1000, 2000, 3000...) for efficient reordering without updating all siblings. This allows O(1) inserts and moves.

**Renormalization:** When gaps become too small (< 2) or after 50 moves, orders are automatically reset to 1000, 2000, 3000... within a single database transaction.

**Optimistic Updates:** UI updates immediately while the mutation is in flight using React Query's optimistic update pattern. On error, changes are automatically rolled back and an error toast is shown.

**Type Safety:** Full end-to-end type safety from database (Prisma) → server (tRPC) → client (React Query), ensuring data integrity and excellent developer experience.

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with tRPC/React Query providers
│   ├── page.tsx             # 🟢 Server Component - Project list (/)
│   ├── loading.tsx          # Loading state for project list
│   ├── [id]/                # Dynamic project routes
│   │   ├── page.tsx         # 🟢 Server Component - Project board wrapper
│   │   ├── loading.tsx      # Loading state for board
│   │   └── not-found.tsx    # Custom 404 for projects
│   └── api/trpc/[trpc]/    # tRPC API route handler
├── components/
│   ├── board/               # Kanban board components
│   │   ├── Board.tsx        # 🔵 Client Component - Main board with DnD
│   │   ├── ColumnContainer.tsx  # Sortable column
│   │   ├── TaskCard.tsx     # Sortable task card
│   │   ├── AddTaskButton.tsx    # Task creation form
│   │   ├── TrashZone.tsx    # Delete dropzone
│   │   └── dnd/             # dnd-kit utilities
│   │       ├── collision.ts      # Container-first collision detection
│   │       └── coordinateGetter.ts  # Keyboard navigation
│   ├── projects/            # Project management components
│   │   └── ProjectList.tsx  # 🔵 Client Component - Interactive CRUD
│   ├── ui/                  # Reusable UI components
│   │   ├── InlineEdit.tsx   # Inline editing component
│   │   ├── ConfirmDialog.tsx # Confirmation dialog
│   │   ├── Skeleton.tsx     # Loading skeletons
│   │   └── toast.tsx        # Toast notifications
│   └── ErrorBoundary.tsx    # Error boundary
├── lib/
│   ├── api/                 # React Query hooks with optimistic updates
│   │   ├── columns.ts       # Column mutations (move, create, update, remove)
│   │   └── tasks.ts         # Task mutations (move, create, update, remove)
│   ├── trpc/                # tRPC client setup
│   │   ├── client.ts        # tRPC React client
│   │   └── Provider.tsx     # tRPC + React Query provider
│   ├── queryKeys.ts         # Centralized cache keys
│   └── utils.ts             # Utility functions
├── store/                   # Zustand state management
│   └── dragStore.ts         # Drag & drop ephemeral state
└── server/
    ├── routers/             # tRPC API routers
    │   ├── _app.ts          # Root router
    │   ├── projects.ts      # Project CRUD
    │   ├── columns.ts       # Column operations
    │   └── tasks.ts         # Task operations
    ├── services/            # Business logic layer
    │   ├── columns.ts       # Column ordering & renormalization
    │   └── tasks.ts         # Task ordering & renormalization
    ├── db.ts                # Prisma client singleton
    └── trpc.ts              # tRPC initialization & error handling

🟢 = Server Component (SSR, direct Prisma access)
🔵 = Client Component (interactivity, hooks, Zustand)
```

## Error Handling

The API uses standardized tRPC error codes:

- `BAD_REQUEST` - Invalid input (e.g., invalid index, malformed data)
- `NOT_FOUND` - Resource not found (project, column, or task)
- `CONFLICT` - Concurrent modification conflict (rare due to optimistic updates)
- `INTERNAL_SERVER_ERROR` - Unexpected server error

All errors are:
- Caught by the error boundary at the root level
- Displayed as toast notifications for mutation failures
- Automatically trigger optimistic update rollbacks
- Logged to console in development mode

## Performance

- **Time to First Row (TFR)**: < 300ms on seeded data
- **Drag Settle Time**: < 150ms perceived (optimistic updates)
- **Memory**: < 150MB heap on seed dataset
- **No Memory Leaks**: Tested with 200+ consecutive drag operations

## Testing

```bash
# Run smoke test (validates ordering invariants)
pnpm smoke

# The smoke test:
# - Performs 10 random task moves
# - Performs 3 random column moves
# - Validates strictly increasing order values
# - Completes in ~30ms
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

Touch and keyboard navigation work on all supported browsers.

## Test Assignment Requirements ✅

This project was built to demonstrate proficiency with the following technologies:

| Requirement | Implementation | Location |
|------------|----------------|----------|
| **Next.js 14** | ✅ App Router with Server/Client Components | `src/app/` |
| **TypeScript** | ✅ Strict mode, no `any` types | All `.ts`/`.tsx` files |
| **Prisma** | ✅ Schema, migrations, direct server access | `prisma/`, Server Components |
| **tRPC** | ✅ Type-safe API with Zod validation | `src/server/routers/` |
| **Zustand** | ✅ Global UI state management | `src/store/` |
| **CRUD Operations** | ✅ Full CRUD for Projects, Columns, Tasks | All routers + UI |
| **Database** | ✅ SQLite (PostgreSQL-compatible schema) | `prisma/dev.db` |

### Key Implementation Highlights

1. **Hybrid Architecture** - Server Components for data fetching, Client Components for interactivity
2. **State Management Split** - React Query (server state) + Zustand (UI state)
3. **Advanced Features** - Drag & drop, optimistic updates, keyboard navigation
4. **Production-Ready** - Error handling, loading states, migrations, tests

📖 **Detailed Documentation:**
- [`SERVER_CLIENT_ARCHITECTURE.md`](./SERVER_CLIENT_ARCHITECTURE.md) - Next.js 14 patterns
- [`ZUSTAND_IMPLEMENTATION.md`](./ZUSTAND_IMPLEMENTATION.md) - State management strategy
- [`docs/SAD.md`](./docs/SAD.md) - System architecture decisions
- [`docs/PRD.md`](./docs/PRD.md) - Product requirements

## Contributing

This is a test assignment / portfolio project. Feel free to fork and modify for your own use!

## License

MIT

