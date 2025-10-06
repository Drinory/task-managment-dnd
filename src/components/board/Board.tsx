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
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column, Task } from '@prisma/client';
import { trpc } from '@/lib/trpc/client';
import { useMoveColumn, useCreateColumn } from '@/lib/api/columns';
import { useMoveTask, useRemoveTask, useCreateTask } from '@/lib/api/tasks';
import { ColumnContainer } from './ColumnContainer';
import { TaskCard } from './TaskCard';
import { TrashZone } from './TrashZone';
import { createContainerCollisionDetection } from './dnd/collision';
import { multipleContainersCoordinateGetter } from './dnd/coordinateGetter';
import { showToast } from '../ui/toast';

const PLACEHOLDER_ID = 'placeholder';

interface BoardProps {
  projectId: string;
}

export function Board({ projectId }: BoardProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [mounted, setMounted] = useState(false);
  const lastOverIdRef = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedRef = useRef(false);

  // Queries
  const { data: columns = [] } = trpc.columns.listByProject.useQuery({
    projectId,
  });

  // Use useQueries for dynamic parallel queries (avoids hooks in loops)
  const tasksQueries = trpc.useQueries((t) =>
    columns.map((col) =>
      t.tasks.listByColumn({ columnId: col.id }, { enabled: !!col.id })
    )
  );

  // Mutations
  const moveColumn = useMoveColumn(projectId);
  const createColumn = useCreateColumn();
  const moveTask = useMoveTask(projectId);
  const removeTask = useRemoveTask();
  const createTask = useCreateTask();

  // Build tasks by column map - memoized to prevent animation issues
  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach((col, idx) => {
      map[col.id] = tasksQueries[idx]?.data || [];
    });
    return map;
  }, [columns, tasksQueries]);

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
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId || overId === 'trash' || columnIds.includes(active.id as string)) {
      return;
    }

    const overContainer = findContainer(overId);
    const activeContainer = findContainer(active.id);

    if (!overContainer || !activeContainer || activeContainer === overContainer) {
      return;
    }

    recentlyMovedRef.current = true;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId) {
      setActiveId(null);
      return;
    }

    // Handle column reorder
    if (columnIds.includes(active.id as string)) {
      if (columnIds.includes(overId as string)) {
        const fromIndex = columns.findIndex((c) => c.id === active.id);
        const toIndex = columns.findIndex((c) => c.id === overId);

        if (fromIndex !== toIndex) {
          moveColumn.mutate(
            {
              projectId,
              columnId: active.id as string,
              toIndex,
            },
            {
              onError: (error) => {
                showToast(`Failed to move column: ${error.message}`, 'error');
              },
            }
          );
        }
      }
      setActiveId(null);
      return;
    }

    // Handle task operations
    const activeContainer = findContainer(active.id);
    if (!activeContainer) {
      setActiveId(null);
      return;
    }

    // Trash
    if (overId === 'trash') {
      removeTask.mutate(
        { taskId: active.id as string },
        {
          onError: (error) => {
            showToast(`Failed to delete task: ${error.message}`, 'error');
          },
        }
      );
      setActiveId(null);
      return;
    }

    // Placeholder - move to new column (not implemented: just show message)
    if (overId === PLACEHOLDER_ID) {
      showToast('Create a column first by clicking the placeholder', 'info');
      setActiveId(null);
      return;
    }

    // Task move
    const overContainer = findContainer(overId);
    if (overContainer) {
      const tasks = tasksByColumn[overContainer] || [];
      let toIndex = tasks.findIndex((t) => t.id === overId);

      // If dropping on the container itself, append
      if (overId === overContainer) {
        toIndex = tasks.length;
      } else if (toIndex === -1) {
        toIndex = 0;
      }

      moveTask.mutate(
        {
          taskId: active.id as string,
          toColumnId: overContainer as string,
          toIndex,
        },
        {
          onError: (error) => {
            showToast(`Failed to move task: ${error.message}`, 'error');
          },
        }
      );
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
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
      return <ColumnContainer column={column} tasks={tasks} isOverlay />;
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

