'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type UniqueIdentifier,
  type DropAnimation,
} from '@dnd-kit/core';
import {SortableContext, horizontalListSortingStrategy, arrayMove} from '@dnd-kit/sortable';
import type { Column, Task } from '@prisma/client';
import { trpc } from '@/lib/trpc/client';
import { useMoveColumn, useCreateColumn } from '@/lib/api/columns';
import { useMoveTask, useRemoveTask } from '@/lib/api/tasks';
import { ColumnContainer } from './ColumnContainer';
import { TaskCard } from './TaskCard';
import { TrashZone } from './TrashZone';
import { createContainerCollisionDetection } from './dnd/collision';
import { multipleContainersCoordinateGetter } from './dnd/coordinateGetter';
import { showToast } from '../ui/toast';
import { useDragStore } from '@/store/dragStore';

const PLACEHOLDER_ID = 'placeholder';

interface BoardProps {
  projectId: string;
}

export function Board({ projectId }: BoardProps) {
  // Zustand drag store - replaces local useState for drag state
  const activeId = useDragStore((state) => state.activeId);
  const setActiveId = useDragStore((state) => state.setActiveId);
  const draggedTasks = useDragStore((state) => state.draggedTasks);
  const setDraggedTasks = useDragStore((state) => state.setDraggedTasks);
  const updateDraggedTasks = useDragStore((state) => state.updateDraggedTasks);
  const draggedColumns = useDragStore((state) => state.draggedColumns);
  const setDraggedColumns = useDragStore((state) => state.setDraggedColumns);
  const resetDragState = useDragStore((state) => state.resetDragState);

  // Local refs and mounted state
  const [mounted, setMounted] = useState(false);
  const lastOverIdRef = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedRef = useRef(false);
  const clonedTasksRef = useRef<Record<string, Task[]> | null>(null);

  // Queries
  const { data: serverColumns = [] } = trpc.columns.listByProject.useQuery({
    projectId,
  });

  const columns = draggedColumns ?? serverColumns;

  // Use useQueries for dynamic parallel queries (avoids hooks in loops)
  const tasksQueries = trpc.useQueries((t) =>
    columns.map((col) =>
      t.tasks.listByColumn({ columnId: col.id }, { enabled: !!col.id })
    )
  );

  // Mutations
  const moveColumn = useMoveColumn(projectId);
  const createColumn = useCreateColumn(projectId);
  const moveTask = useMoveTask(projectId);
  const removeTask = useRemoveTask(projectId);

  // Build tasks by column map - memoized to prevent animation issues
  const serverTasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach((col, idx) => {
      map[col.id] = tasksQueries[idx]?.data || [];
    });
    return map;
  }, [columns, tasksQueries]);

  // Use dragged state during drag, server state otherwise
  const tasksByColumn = draggedTasks ?? serverTasksByColumn;

  // Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: multipleContainersCoordinateGetter,
    })
  );

  const columnIds = columns.map((c) => c.id);
  const containerIds = new Set<UniqueIdentifier>([...columnIds, PLACEHOLDER_ID, 'trash']);

  // Transform tasksByColumn to just IDs for collision detection
  const taskIdsByColumn: Record<string, UniqueIdentifier[]> = {};
  Object.entries(tasksByColumn).forEach(([colId, tasks]) => {
    taskIdsByColumn[colId] = tasks.map((t) => t.id);
  });

  const collisionDetection = createContainerCollisionDetection(
    activeId,
    containerIds,
    lastOverIdRef,
    recentlyMovedRef,
    taskIdsByColumn
  );

  const findContainer = useCallback(
    (id: UniqueIdentifier): UniqueIdentifier | undefined => {
      if (columnIds.includes(id as string)) return id;
      for (const colId of columnIds) {
        if (tasksByColumn[colId]?.some((t) => t.id === id)) {
          return colId;
        }
      }
      return undefined;
    },
    [columnIds, tasksByColumn]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedRef.current = false;
    });
  }, [tasksByColumn]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    // Clone the current state for potential rollback
    clonedTasksRef.current = JSON.parse(JSON.stringify(serverTasksByColumn));
    setDraggedTasks(clonedTasksRef.current);
    setDraggedColumns([...serverColumns]);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId || overId === 'trash' || columnIds.includes(active.id as string)) {
      return;
    }

    const overContainer = findContainer(overId);
    const activeContainer = findContainer(active.id);

    if (!overContainer || !activeContainer) {
      return;
    }

    // If moving within the same container, don't update here (SortableContext handles it)
    if (activeContainer === overContainer) {
      return;
    }

    // Move task between containers (optimistic UI update during drag)
    updateDraggedTasks((current) => {
      if (!current) return current;

      const activeItems = current[activeContainer] || [];
      const overItems = current[overContainer] || [];

      const activeIndex = activeItems.findIndex((t) => t.id === active.id);
      if (activeIndex === -1) return current;

      const overIndex = overItems.findIndex((t) => t.id === overId);
      const task = activeItems[activeIndex];

      // Calculate insertion index
      let newIndex: number;
      if (overId === overContainer) {
        // Dropping on the container itself - append to end
        newIndex = overItems.length;
      } else if (overIndex >= 0) {
        // Dropping on a specific task - determine if above or below
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex + modifier;
      } else {
        // Fallback - append to end
        newIndex = overItems.length;
      }

      recentlyMovedRef.current = true;

      return {
        ...current,
        [activeContainer]: activeItems.filter((t) => t.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, newIndex),
          { ...task, columnId: overContainer as string },
          ...overItems.slice(newIndex),
        ],
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const overId = over?.id;

    setActiveId(null); // Clear activeId immediately for overlay

    if (!overId) {
      resetDragState();
      clonedTasksRef.current = null;
      return;
    }

    // Handle column reorder
    if (columnIds.includes(active.id as string)) {
      if (columnIds.includes(overId as string)) {
        const fromIndex = columns.findIndex((c) => c.id === active.id);
        const toIndex = columns.findIndex((c) => c.id === overId);

        if (fromIndex !== toIndex) {
          // Update draggedColumns to show the reordered state
          const reorderedColumns = arrayMove(columns, fromIndex, toIndex);
          setDraggedColumns(reorderedColumns); // CHANGE THIS

          moveColumn.mutate(
              {
                projectId,
                columnId: active.id as string,
                toIndex,
              },
              {
                onSettled: () => {
                  resetDragState();
                  clonedTasksRef.current = null;
                },
                onError: (error) => {
                  showToast(`Failed to move column: ${error.message}`, 'error');
                },
              }
          );
        } else {
          resetDragState();
          clonedTasksRef.current = null;
        }
      }
      return;
    }

    // Handle task operations
    const activeContainer = findContainer(active.id);
    if (!activeContainer) {
      resetDragState();
      clonedTasksRef.current = null;
      return;
    }

    // Trash
    if (overId === 'trash') {
      // Manually remove task from draggedTasks immediately
      const taskToRemove = tasksByColumn[activeContainer]?.find((t) => t.id === active.id);

      updateDraggedTasks((current) => {
        if (!current || !activeContainer) return current;

        return {
          ...current,
          [activeContainer]: (current[activeContainer] || []).filter(
              (t) => t.id !== active.id
          ),
        };
      });

      removeTask.mutate(
          { taskId: active.id as string },
          {
            onSettled: () => {
              resetDragState();
              clonedTasksRef.current = null;
            },
            onError: (error) => {
              // Restore the task on error
              if (taskToRemove && activeContainer) {
                updateDraggedTasks((current) => {
                  if (!current) return current;
                  return {
                    ...current,
                    [activeContainer]: [...(current[activeContainer] || []), taskToRemove],
                  };
                });
              }
              showToast(`Failed to delete task: ${error.message}`, 'error');
            },
          }
      );
      return;
    }

    // Placeholder
    if (overId === PLACEHOLDER_ID) {
      showToast('Create a column first by clicking the placeholder', 'info');
      resetDragState();
      clonedTasksRef.current = null;
      return;
    }

    // Task move
    const overContainer = findContainer(overId);
    if (overContainer) {
      const tasks = tasksByColumn[overContainer] || [];
      let toIndex = tasks.findIndex((t) => t.id === overId);

      if (overId === overContainer) {
        toIndex = tasks.length;
      } else if (toIndex === -1) {
        toIndex = 0;
      }

      // If reordering within same container, update draggedTasks to match final position
      if (activeContainer === overContainer) {
        const currentTasks = tasks;
        const fromIndex = currentTasks.findIndex((t) => t.id === active.id);

        if (fromIndex !== toIndex && fromIndex !== -1) {
          // Update draggedTasks to show final reordered state
          updateDraggedTasks((current) => {
            if (!current) return current;

            const reorderedTasks = [...currentTasks];
            const [movedTask] = reorderedTasks.splice(fromIndex, 1);
            reorderedTasks.splice(toIndex, 0, movedTask);

            return {
              ...current,
              [overContainer]: reorderedTasks,
            };
          });
        }
      }

      moveTask.mutate(
          {
            taskId: active.id as string,
            toColumnId: overContainer as string,
            toIndex,
          },
          {
            onSettled: () => {
              resetDragState();
              clonedTasksRef.current = null;
            },
            onError: (error) => {
              showToast(`Failed to move task: ${error.message}`, 'error');
            },
          }
      );
    } else {
      resetDragState();
      clonedTasksRef.current = null;
    }
  };

  const handleDragCancel = () => {
    // Clear drag state and restore to server state
    resetDragState();
    clonedTasksRef.current = null;
  };

  const handleAddColumn = () => {
    createColumn.mutate(
      {
        projectId,
        name: `Column ${columns.length + 1}`,
      },
      {
        onError: (error) => {
          showToast(`Failed to create column: ${error.message}`, 'error');
        },
      }
    );
  };

  const renderActiveOverlay = () => {
    if (!activeId) return null;

    // Column overlay
    if (columnIds.includes(activeId as string)) {
      const column = columns.find((c) => c.id === activeId);
      if (!column) return null;
      const tasks = tasksByColumn[activeId] || [];
      return <ColumnContainer column={column} tasks={tasks} isOverlay projectId={projectId} />;
    }

    // Task overlay
    for (const colId of columnIds) {
      const task = tasksByColumn[colId]?.find((t) => t.id === activeId);
      if (task) {
        return <TaskCard task={task} isOverlay />;
      }
    }

    return null;
  };

  const isDraggingTask = activeId && !columnIds.includes(activeId as string);

  if (!mounted) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="inline-flex gap-4 p-8">
        <SortableContext
          items={[...columnIds, PLACEHOLDER_ID]}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <ColumnContainer
              key={column.id}
              column={column}
              tasks={tasksByColumn[column.id] || []}
              projectId={projectId}
            />
          ))}

          <button
            onClick={handleAddColumn}
            disabled={createColumn.isPending}
            className="flex h-[500px] w-[300px] items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            + Add column
          </button>
        </SortableContext>
      </div>

      {mounted &&
        createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {renderActiveOverlay()}
          </DragOverlay>,
          document.body
        )}

      {isDraggingTask && <TrashZone />}
    </DndContext>
  );
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

