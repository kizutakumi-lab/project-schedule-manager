'use server';

import { revalidatePath } from 'next/cache';
import { getProjectRepository } from '@/lib/repositories';
import { Project } from '@/types';

export async function fetchProjectsAction() {
  const repo = getProjectRepository();
  return await repo.getProjects();
}

export async function fetchProjectByIdAction(id: string) {
  const repo = getProjectRepository();
  return await repo.getProjectById(id);
}

export async function createProjectAction(data: {
  project_name: string;
  client_name: string;
  owner: string;
  start_date: string;
  end_date: string;
  status: Project['status'];
}) {
  const repo = getProjectRepository();
  const newProject = await repo.createProject({
    project_id: `prj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...data,
  });

  revalidatePath('/');
  return newProject;
}

export async function updateProjectAction(
  id: string,
  updates: Partial<Project>,
  expectedUpdatedAt?: string
) {
  const repo = getProjectRepository();
  const res = await repo.updateProject(id, updates, expectedUpdatedAt);

  revalidatePath('/');
  revalidatePath(`/projects/${id}`);
  return res;
}

export async function deleteProjectAction(id: string) {
  const repo = getProjectRepository();
  const ok = await repo.deleteProject(id);

  revalidatePath('/');
  return ok;
}
