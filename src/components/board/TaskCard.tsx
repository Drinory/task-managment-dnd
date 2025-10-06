'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@prisma/client';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export function TaskCard({ task, isDragging, isOverlay }: TaskCardProps) {
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

  const cardContent = (
    <div
      className={`mb-2 rounded-lg border bg-white p-3 shadow-sm ${
        isOverlay ? 'cursor-grabbing shadow-lg' : 'cursor-grab'
      } ${isSortableDragging ? 'ring-2 ring-blue-400' : ''}`}
    >
      <div className="text-sm font-medium text-gray-900">{task.title}</div>
      {task.description && (
        <div className="mt-1 text-xs text-gray-500">{task.description}</div>
      )}
    </div>
  );

  if (isOverlay) {
    return cardContent;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {cardContent}
    </div>
  );
}

