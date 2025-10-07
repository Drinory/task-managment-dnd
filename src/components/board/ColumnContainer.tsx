'use client';

import { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import type { Column, Task } from '@prisma/client';
import { TaskCard } from './TaskCard';
import { AddTaskButton } from './AddTaskButton';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUpdateColumn, useRemoveColumn } from '@/lib/api/columns';
interface ColumnContainerProps {
  column: Column;
  tasks: Task[];
  isDragging?: boolean;
  isOverlay?: boolean;
  projectId: string;
}

export function ColumnContainer({
  column,
  tasks,
  isDragging,
  isOverlay,
  projectId,
}: ColumnContainerProps) {
  const updateColumn = useUpdateColumn(projectId);
  const removeColumn = useRemoveColumn(projectId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTasksWarning, setShowTasksWarning] = useState(false);

  const handleDeleteClick = () => {
    if (tasks.length > 0) {
      setShowTasksWarning(true);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = () => {
    removeColumn.mutate({ id: column.id });
  };

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
      <div className="flex h-[500px] w-[300px] flex-col rounded-xl border-2 border-blue-400 bg-gradient-to-b from-white to-gray-50 shadow-2xl">
        <div className="flex rounded-xl items-center justify-between gap-2 border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
          <div className="flex-1">
            <InlineEdit
                value={column.name}
                onSave={(name) => updateColumn.mutate({ id: column.id, name })}
                className="rounded px-2 py-1 font-semibold text-gray-900"
                inputClassName="font-semibold"
                disabled={updateColumn.isPending}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {tasks.length}
            </span>
            <button
                onClick={handleDeleteClick}
                disabled={removeColumn.isPending}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Delete ${column.name} column`}
            >
              🗑️
            </button>
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow active:cursor-grabbing"
                aria-label={`Drag ${column.name} column`}
            >
              ⋮⋮
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-auto p-3">
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
        className={`flex h-[500px] w-[300px] flex-col rounded-xl border bg-gradient-to-b from-white to-gray-50 shadow-md transition-all duration-200 hover:shadow-lg ${
          isOver ? 'ring-2 ring-blue-400 shadow-xl' : ''
        }`}
      >
        <div className="flex items-center justify-between rounded-xl gap-2 border-b bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-3">
          <div className="flex-1">
            <InlineEdit
              value={column.name}
              onSave={(name) => updateColumn.mutate({ id: column.id, name })}
              className="rounded px-2 py-1 font-semibold text-gray-900"
              inputClassName="font-semibold"
              disabled={updateColumn.isPending}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
              {tasks.length}
            </span>
            <button
              onClick={handleDeleteClick}
              disabled={removeColumn.isPending}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Delete ${column.name} column`}
            >
              🗑️
            </button>
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow active:cursor-grabbing"
              aria-label={`Drag ${column.name} column`}
            >
              ⋮⋮
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-auto p-3">
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.length === 0 ? (
              <div className="mb-2 flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 text-sm text-gray-400">
                Drop tasks here
              </div>
            ) : (
              tasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </SortableContext>
          <AddTaskButton columnId={column.id} />
        </div>
      </div>

      {/* Modals */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Column"
        message={`Are you sure you want to delete "${column.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showTasksWarning}
        onClose={() => setShowTasksWarning(false)}
        onConfirm={() => setShowTasksWarning(false)}
        title="Cannot Delete Column"
        message="This column contains tasks. Please move or delete all tasks before deleting the column."
        confirmText="OK"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}

