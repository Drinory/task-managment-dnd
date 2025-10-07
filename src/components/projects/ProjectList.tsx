'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@prisma/client';
import { trpc } from '@/lib/trpc/client';
import { showToast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ProjectListProps {
  initialProjects: Project[];
}

/**
 * Client Component for interactive project CRUD operations
 * Uses tRPC for mutations
 * Receives initial data from Server Component parent
 */
export function ProjectList({ initialProjects }: ProjectListProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Use initialProjects as fallback, then sync with tRPC
  const { data: projects = initialProjects } = trpc.projects.list.useQuery(undefined, {
    initialData: initialProjects,
  });

  // Mutations
  const utils = trpc.useUtils();
  
  const createProject = trpc.projects.create.useMutation({
    onSuccess: (newProject) => {
      setIsCreating(false);
      setNewProjectName('');
      showToast('Project created successfully', 'success');
      utils.projects.list.invalidate();
      // Navigate to new project (URL is source of truth)
      router.push(`/${newProject.id}`);
    },
    onError: (error) => {
      showToast(`Failed to create project: ${error.message}`, 'error');
    },
  });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setEditingName('');
      showToast('Project updated successfully', 'success');
      utils.projects.list.invalidate();
    },
    onError: (error) => {
      showToast(`Failed to update project: ${error.message}`, 'error');
    },
  });

  const deleteProject = trpc.projects.remove.useMutation({
    onSuccess: () => {
      showToast('Project deleted successfully', 'success');
      utils.projects.list.invalidate();
    },
    onError: (error) => {
      showToast(`Failed to delete project: ${error.message}`, 'error');
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createProject.mutate({ name: newProjectName.trim() });
  };

  const handleUpdateProject = (id: string) => {
    if (!editingName.trim()) return;
    updateProject.mutate({ id, name: editingName.trim() });
  };

  const handleDeleteProject = (project: Project) => {
    setDeleteConfirm({ id: project.id, name: project.name });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteProject.mutate({ id: deleteConfirm.id });
      setDeleteConfirm(null);
    }
  };

  const handleOpenProject = (id: string) => {
    router.push(`/${id}`);
  };

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your kanban board projects
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          + New Project
        </button>
      </div>

      {/* Create new project form */}
      {isCreating && (
        <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
          <form onSubmit={handleCreateProject}>
            <label htmlFor="new-project" className="mb-2 block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <div className="flex gap-2">
              <input
                id="new-project"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newProjectName.trim() || createProject.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first project to get started
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {editingId === project.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdateProject(project.id)}
                    disabled={!editingName.trim() || updateProject.isPending}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditingName('');
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => handleOpenProject(project.id)}
                    className="flex-1 cursor-pointer"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                      {project.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(project.id);
                        setEditingName(project.name);
                      }}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project);
                      }}
                      disabled={deleteProject.isPending}
                      className="rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleOpenProject(project.id)}
                      className="rounded-lg bg-blue-600 px-4 py-1 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Open →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}

