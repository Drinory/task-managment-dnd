'use client';

import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import type { Column, Task } from '@prisma/client';
import { TaskCard } from './TaskCard';
import { AddTaskButton } from './AddTaskButton';

interface ColumnContainerProps {
  column: Column;
  tasks: Task[];
  isDragging?: boolean;
  isOverlay?: boolean;
}

export function ColumnContainer({
  column,
  tasks,
  isDragging,
  isOverlay,
}: ColumnContainerProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  // For overlay, don't use refs
  if (isOverlay) {
    return (
      <div className="flex h-[500px] w-[300px] flex-col rounded-xl border bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-gray-900">{column.name}</h3>
          <span className="text-xs text-gray-500">{tasks.length}</span>
        </div>
        <div className="flex-1 overflow-auto p-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} isOverlay />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={setSortableRef} style={style}>
      <div
        ref={setDroppableRef}
        className={`flex h-[500px] w-[300px] flex-col rounded-xl border bg-white shadow-sm ${
          isOver ? 'ring-2 ring-blue-400' : ''
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-gray-900">{column.name}</h3>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded-md border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            aria-label={`Drag ${column.name} column`}
          >
            ⋮⋮
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-auto p-3">
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.length === 0 ? (
              <div className="mb-2 flex flex-1 items-center justify-center text-sm text-gray-400">
                Drop tasks here
              </div>
            ) : (
              tasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </SortableContext>
          <AddTaskButton columnId={column.id} />
        </div>
      </div>
    </div>
  );
}

