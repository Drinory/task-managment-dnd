import { create } from 'zustand';
import type { UniqueIdentifier } from '@dnd-kit/core';
import type { Column, Task } from '@prisma/client';

interface DragState {
  // Active drag item
  activeId: UniqueIdentifier | null;
  setActiveId: (id: UniqueIdentifier | null) => void;

  // Optimistic drag state for tasks
  draggedTasks: Record<string, Task[]> | null;
  setDraggedTasks: (tasks: Record<string, Task[]> | null) => void;
  updateDraggedTasks: (updater: (current: Record<string, Task[]> | null) => Record<string, Task[]> | null) => void;

  // Optimistic drag state for columns
  draggedColumns: Column[] | null;
  setDraggedColumns: (columns: Column[] | null) => void;

  // Reset all drag state
  resetDragState: () => void;
}

/**
 * Drag & Drop state store using Zustand
 * - Manages active drag item
 * - Handles optimistic UI updates during drag
 * - Ephemeral state only (not persisted, cleared on drop)
 */
export const useDragStore = create<DragState>((set) => ({
  activeId: null,
  setActiveId: (id) => set({ activeId: id }),

  draggedTasks: null,
  setDraggedTasks: (tasks) => set({ draggedTasks: tasks }),
  updateDraggedTasks: (updater) => set((state) => ({ draggedTasks: updater(state.draggedTasks) })),

  draggedColumns: null,
  setDraggedColumns: (columns) => set({ draggedColumns: columns }),

  resetDragState: () =>
    set({
      activeId: null,
      draggedTasks: null,
      draggedColumns: null,
    }),
}));

// Selectors
export const selectActiveId = (state: DragState) => state.activeId;
export const selectDraggedTasks = (state: DragState) => state.draggedTasks;
export const selectDraggedColumns = (state: DragState) => state.draggedColumns;

