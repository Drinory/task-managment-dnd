'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@prisma/client';
import { InlineEdit } from '@/components/ui/InlineEdit';
import { useUpdateTask } from '@/lib/api/tasks';
interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export function TaskCard({ task, isDragging, isOverlay }: TaskCardProps) {
  const updateTask = useUpdateTask(task.columnId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const body = (
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <InlineEdit
              value={task.title}
              onSave={(title) => updateTask.mutate({ id: task.id, title })}
              className="rounded px-1 py-0.5 text-sm font-medium text-gray-900"
              inputClassName="text-sm font-medium"
              disabled={updateTask.isPending}
          />
          {task.description && (
              <InlineEdit
                  value={task.description}
                  onSave={(description) =>
                      updateTask.mutate({ id: task.id, description })
                  }
                  className="mt-1 rounded px-1 py-0.5 text-xs text-gray-500"
                  inputClassName="text-xs"
                  multiline
                  placeholder="Add description..."
                  disabled={updateTask.isPending}
              />
          )}
        </div>
        <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded p-1 opacity-0 transition-opacity hover:bg-gray-100 group-hover:opacity-100"
            aria-label={`Drag ${task.title}`}
        >
          <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
          >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
  )

  if (isOverlay) {
    return (
      <div className="mb-2 cursor-grabbing rounded-lg border bg-white p-3 shadow-sm">
        {body}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group mb-2 rounded-lg border bg-white p-3 shadow-sm hover:shadow-md ${
          isSortableDragging ? 'ring-2 ring-blue-400' : ''
        }`}
      >
        {body}
      </div>
    </div>
  );
}

