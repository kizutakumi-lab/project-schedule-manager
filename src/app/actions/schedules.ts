'use server';

import { revalidatePath } from 'next/cache';
import { getScheduleRepository, getProjectRepository } from '@/lib/repositories';
import { ScheduleItem } from '@/types';
import { recalculateSchedule } from '@/lib/schedule-engine';

export async function fetchScheduleItemsAction(projectId: string) {
  const repo = getScheduleRepository();
  return await repo.getScheduleItems(projectId);
}

export async function createScheduleItemAction(item: Omit<ScheduleItem, 'created_at' | 'updated_at'>) {
  const scheduleRepo = getScheduleRepository();
  const projectRepo = getProjectRepository();

  const newItem = await scheduleRepo.createScheduleItem(item);

  // 追加後、プロジェクト全体のスケジュールを再計算して整合性を保つ
  const project = await projectRepo.getProjectById(item.project_id);
  if (project) {
    const allItems = await scheduleRepo.getScheduleItems(item.project_id);
    const recalculated = recalculateSchedule(allItems, project.start_date);
    await scheduleRepo.updateMultipleScheduleItems(recalculated);
  }

  revalidatePath(`/projects/${item.project_id}`);
  return newItem;
}

export async function updateScheduleItemAction(
  id: string,
  updates: Partial<ScheduleItem>,
  expectedUpdatedAt?: string
) {
  const scheduleRepo = getScheduleRepository();
  const projectRepo = getProjectRepository();

  const updateRes = await scheduleRepo.updateScheduleItem(id, updates, expectedUpdatedAt);
  if (!updateRes.success || !updateRes.data) {
    return updateRes;
  }

  // 後続工程の自動再計算（最重要仕様！）
  const projectId = updateRes.data.project_id;
  const project = await projectRepo.getProjectById(projectId);
  if (project) {
    const allItems = await scheduleRepo.getScheduleItems(projectId);
    const recalculated = recalculateSchedule(allItems, project.start_date);
    await scheduleRepo.updateMultipleScheduleItems(recalculated);
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true, data: updateRes.data };
}

export async function updateMultipleScheduleItemsAction(
  projectId: string,
  items: ScheduleItem[]
) {
  const scheduleRepo = getScheduleRepository();
  const ok = await scheduleRepo.updateMultipleScheduleItems(items);
  revalidatePath(`/projects/${projectId}`);
  return ok;
}

export async function deleteScheduleItemAction(id: string, projectId: string) {
  const scheduleRepo = getScheduleRepository();
  const projectRepo = getProjectRepository();

  const ok = await scheduleRepo.deleteScheduleItem(id);

  // 削除後に後続を再計算
  const project = await projectRepo.getProjectById(projectId);
  if (project) {
    const allItems = await scheduleRepo.getScheduleItems(projectId);
    const recalculated = recalculateSchedule(allItems, project.start_date);
    await scheduleRepo.updateMultipleScheduleItems(recalculated);
  }

  revalidatePath(`/projects/${projectId}`);
  return ok;
}

export async function duplicateScheduleItemAction(id: string, projectId: string) {
  const scheduleRepo = getScheduleRepository();
  const projectRepo = getProjectRepository();

  const copy = await scheduleRepo.duplicateScheduleItem(id);
  if (copy) {
    const project = await projectRepo.getProjectById(projectId);
    if (project) {
      const allItems = await scheduleRepo.getScheduleItems(projectId);
      const recalculated = recalculateSchedule(allItems, project.start_date);
      await scheduleRepo.updateMultipleScheduleItems(recalculated);
    }
  }

  revalidatePath(`/projects/${projectId}`);
  return copy;
}

export async function bulkCreateScheduleItemsAction(
  projectId: string,
  items: Omit<ScheduleItem, 'created_at' | 'updated_at'>[]
) {
  const scheduleRepo = getScheduleRepository();
  const projectRepo = getProjectRepository();

  for (const item of items) {
    await scheduleRepo.createScheduleItem(item);
  }

  const project = await projectRepo.getProjectById(projectId);
  if (project) {
    const allItems = await scheduleRepo.getScheduleItems(projectId);
    const recalculated = recalculateSchedule(allItems, project.start_date);
    await scheduleRepo.updateMultipleScheduleItems(recalculated);
  }

  revalidatePath(`/projects/${projectId}`);
  return true;
}
