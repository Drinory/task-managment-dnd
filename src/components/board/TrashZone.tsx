'use client';

import { useDroppable } from '@dnd-kit/core';

export function TrashZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash',
    data: { type: 'trash' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`fixed bottom-8 left-1/2 z-50 flex h-16 w-80 -translate-x-1/2 items-center justify-center rounded-lg border-2 border-dashed bg-white shadow-lg transition-colors ${
        isOver ? 'border-red-500 bg-red-50' : 'border-gray-300'
      }`}
    >
      <span className={`text-sm font-medium ${isOver ? 'text-red-600' : 'text-gray-600'}`}>
        🗑️ Drop here to delete
      </span>
    </div>
  );
}

