'use server';

import { revalidatePath } from 'next/cache';
import { getTodoRepository } from '@/lib/repositories';
import { Todo } from '@/types';

export async function fetchTodosAction(projectId: string) {
  const repo = getTodoRepository();
  return await repo.getTodos(projectId);
}

export async function createTodoAction(todo: {
  project_id: string;
  title: string;
  assignee: string;
  due_date: string;
  status: Todo['status'];
  memo: string;
}) {
  const repo = getTodoRepository();
  const newTodo = await repo.createTodo({
    todo_id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...todo,
  });

  revalidatePath(`/projects/${todo.project_id}`);
  return newTodo;
}

export async function updateTodoAction(
  id: string,
  projectId: string,
  updates: Partial<Todo>,
  expectedUpdatedAt?: string
) {
  const repo = getTodoRepository();
  const res = await repo.updateTodo(id, updates, expectedUpdatedAt);

  revalidatePath(`/projects/${projectId}`);
  return res;
}

export async function deleteTodoAction(id: string, projectId: string) {
  const repo = getTodoRepository();
  const ok = await repo.deleteTodo(id);

  revalidatePath(`/projects/${projectId}`);
  return ok;
}
