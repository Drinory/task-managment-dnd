'use client';

import { useState } from 'react';
import { useCreateTask } from '@/lib/api/tasks';

interface AddTaskButtonProps {
  columnId: string;
}

export function AddTaskButton({ columnId }: AddTaskButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const createTask = useCreateTask();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTask.mutate(
      {
        columnId,
        title: title.trim(),
      },
      {
        onSuccess: () => {
          setTitle('');
          setIsAdding(false);
        },
        onError: (error) => {
          console.error('Failed to create task:', error.message);
        },
      }
    );
  };

  const handleCancel = () => {
    setTitle('');
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <form onSubmit={handleSubmit} className="mb-2">
        <textarea
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
          }}
          placeholder="Task title..."
          className="mb-2 w-full resize-none rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
          disabled={createTask.isPending}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!title.trim() || createTask.isPending}
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createTask.isPending ? 'Adding...' : 'Add'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={createTask.isPending}
            className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Tip: Press Enter (Cmd/Ctrl) to save, Esc to cancel
        </p>
      </form>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="w-full rounded-lg border-2 border-dashed border-gray-300 p-2 text-left text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-600"
    >
      + Add task
    </button>
  );
}

