'use client';

import { useState } from 'react';
import { useCreateTask } from '@/lib/api/tasks';

interface AddTaskButtonProps {
  columnId: string;
}

export function AddTaskButton({ columnId }: AddTaskButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const createTask = useCreateTask();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTask.mutate(
      {
        columnId,
        title: title.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
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
    setDescription('');
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <form onSubmit={handleSubmit} className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              // Move to description field
              const descriptionField = e.currentTarget.form?.querySelector('textarea');
              descriptionField?.focus();
            }
          }}
          placeholder="Task title..."
          className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={createTask.isPending}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Description (optional)..."
          className="mb-2 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
          disabled={createTask.isPending}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            <kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">Enter</kbd> next field · 
            <kbd className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-xs">⌘↵</kbd> save · 
            <kbd className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-xs">Esc</kbd> cancel
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={createTask.isPending}
              className="rounded bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || createTask.isPending}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createTask.isPending ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </div>
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

