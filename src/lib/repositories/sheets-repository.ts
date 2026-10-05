import { Project, ScheduleItem, Todo, Member } from '@/types';
import {
  IProjectRepository,
  IScheduleRepository,
  ITodoRepository,
  IMemberRepository,
  UpdateResult,
} from './interfaces';
import {
  SHEET_NAMES,
  fetchSheetRows,
  appendSheetRow,
  updateSheetRow,
  deleteSheetRow,
} from '../google-sheets/sheets-service';
import {
  MockProjectRepository,
  MockScheduleRepository,
  MockTodoRepository,
  MockMemberRepository,
} from './mock-repository';

export class GoogleSheetsProjectRepository implements IProjectRepository {
  private fallbackMock = new MockProjectRepository();

  async getProjects(): Promise<Project[]> {
    try {
      const { data } = await fetchSheetRows<Project>(SHEET_NAMES.PROJECTS);
      if (data.length === 0) {
        return await this.fallbackMock.getProjects();
      }
      return data.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    } catch (e) {
      console.error('[GoogleSheetsProjectRepository] getProjects error, fallback:', e);
      return await this.fallbackMock.getProjects();
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const { data } = await fetchSheetRows<Project>(SHEET_NAMES.PROJECTS);
      const p = data.find(item => item.project_id === id);
      if (p) return p;
      return await this.fallbackMock.getProjectById(id);
    } catch (e) {
      console.error('[GoogleSheetsProjectRepository] getProjectById error, fallback:', e);
      return await this.fallbackMock.getProjectById(id);
    }
  }

  async createProject(project: Omit<Project, 'created_at' | 'updated_at'>): Promise<Project> {
    const now = new Date().toISOString();
    const newProj: Project = {
      ...project,
      created_at: now,
      updated_at: now,
    };
    await appendSheetRow(SHEET_NAMES.PROJECTS, newProj);
    return newProj;
  }

  async updateProject(
    id: string,
    updates: Partial<Project>,
    expectedUpdatedAt?: string
  ): Promise<UpdateResult<Project>> {
    const { data } = await fetchSheetRows<Project>(SHEET_NAMES.PROJECTS);
    const current = data.find(p => p.project_id === id);
    if (!current) {
      return { success: false, message: 'Project not found' };
    }

    if (expectedUpdatedAt && current.updated_at && current.updated_at !== expectedUpdatedAt) {
      return {
        success: false,
        conflict: true,
        data: current,
        message: '他のユーザーによって更新されています。最新の内容を確認してください。',
      };
    }

    const updated: Project = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const ok = await updateSheetRow(SHEET_NAMES.PROJECTS, id, updated);
    return { success: ok, data: updated };
  }

  async deleteProject(id: string): Promise<boolean> {
    return await deleteSheetRow(SHEET_NAMES.PROJECTS, id);
  }
}

export class GoogleSheetsScheduleRepository implements IScheduleRepository {
  private fallbackMock = new MockScheduleRepository();

  async getScheduleItems(projectId: string): Promise<ScheduleItem[]> {
    try {
      const { data } = await fetchSheetRows<ScheduleItem>(SHEET_NAMES.SCHEDULE_ITEMS);
      const filtered = data.filter(i => i.project_id === projectId);
      if (filtered.length === 0) {
        return await this.fallbackMock.getScheduleItems(projectId);
      }
      return filtered.sort((a, b) => a.sort_order - b.sort_order);
    } catch (e) {
      console.error('[GoogleSheetsScheduleRepository] getScheduleItems error, fallback:', e);
      return await this.fallbackMock.getScheduleItems(projectId);
    }
  }

  async createScheduleItem(item: Omit<ScheduleItem, 'created_at' | 'updated_at'>): Promise<ScheduleItem> {
    const now = new Date().toISOString();
    const newItem: ScheduleItem = {
      ...item,
      created_at: now,
      updated_at: now,
    };
    await appendSheetRow(SHEET_NAMES.SCHEDULE_ITEMS, newItem);
    return newItem;
  }

  async updateScheduleItem(
    id: string,
    updates: Partial<ScheduleItem>,
    expectedUpdatedAt?: string
  ): Promise<UpdateResult<ScheduleItem>> {
    const { data } = await fetchSheetRows<ScheduleItem>(SHEET_NAMES.SCHEDULE_ITEMS);
    const current = data.find(i => i.schedule_id === id);
    if (!current) {
      return { success: false, message: 'Item not found' };
    }

    if (expectedUpdatedAt && current.updated_at && current.updated_at !== expectedUpdatedAt) {
      return {
        success: false,
        conflict: true,
        data: current,
        message: '他のユーザーによって更新されています。最新の内容を確認してください。',
      };
    }

    const updated: ScheduleItem = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const ok = await updateSheetRow(SHEET_NAMES.SCHEDULE_ITEMS, id, updated);
    return { success: ok, data: updated };
  }

  async updateMultipleScheduleItems(items: ScheduleItem[]): Promise<boolean> {
    const now = new Date().toISOString();
    for (const item of items) {
      await updateSheetRow(SHEET_NAMES.SCHEDULE_ITEMS, item.schedule_id, {
        ...item,
        updated_at: now,
      });
    }
    return true;
  }

  async deleteScheduleItem(id: string): Promise<boolean> {
    const { data } = await fetchSheetRows<ScheduleItem>(SHEET_NAMES.SCHEDULE_ITEMS);
    // 子要素も再帰的に削除
    const toDeleteIds = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const item of data) {
        if (item.parent_id && toDeleteIds.has(item.parent_id) && !toDeleteIds.has(item.schedule_id)) {
          toDeleteIds.add(item.schedule_id);
          added = true;
        }
      }
    }

    for (const delId of toDeleteIds) {
      await deleteSheetRow(SHEET_NAMES.SCHEDULE_ITEMS, delId);
    }
    return true;
  }

  async duplicateScheduleItem(id: string): Promise<ScheduleItem | null> {
    const { data } = await fetchSheetRows<ScheduleItem>(SHEET_NAMES.SCHEDULE_ITEMS);
    const original = data.find(i => i.schedule_id === id);
    if (!original) return null;

    const newId = `item-${Date.now()}`;
    const copy: ScheduleItem = {
      ...original,
      schedule_id: newId,
      name: `${original.name} (コピー)`,
      sort_order: original.sort_order + 0.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await appendSheetRow(SHEET_NAMES.SCHEDULE_ITEMS, copy);
    return copy;
  }
}

export class GoogleSheetsTodoRepository implements ITodoRepository {
  private fallbackMock = new MockTodoRepository();

  async getTodos(projectId: string): Promise<Todo[]> {
    try {
      const { data } = await fetchSheetRows<Todo>(SHEET_NAMES.TODOS);
      const filtered = data.filter(t => t.project_id === projectId);
      if (filtered.length === 0) {
        return await this.fallbackMock.getTodos(projectId);
      }
      return filtered;
    } catch (e) {
      console.error('[GoogleSheetsTodoRepository] getTodos error, fallback:', e);
      return await this.fallbackMock.getTodos(projectId);
    }
  }

  async createTodo(todo: Omit<Todo, 'created_at' | 'updated_at'>): Promise<Todo> {
    const now = new Date().toISOString();
    const newTodo: Todo = {
      ...todo,
      created_at: now,
      updated_at: now,
    };
    await appendSheetRow(SHEET_NAMES.TODOS, newTodo);
    return newTodo;
  }

  async updateTodo(
    id: string,
    updates: Partial<Todo>,
    expectedUpdatedAt?: string
  ): Promise<UpdateResult<Todo>> {
    const { data } = await fetchSheetRows<Todo>(SHEET_NAMES.TODOS);
    const current = data.find(t => t.todo_id === id);
    if (!current) {
      return { success: false, message: 'Todo not found' };
    }

    if (expectedUpdatedAt && current.updated_at && current.updated_at !== expectedUpdatedAt) {
      return {
        success: false,
        conflict: true,
        data: current,
        message: '他のユーザーによって更新されています。最新の内容を確認してください。',
      };
    }

    const updated: Todo = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const ok = await updateSheetRow(SHEET_NAMES.TODOS, id, updated);
    return { success: ok, data: updated };
  }

  async deleteTodo(id: string): Promise<boolean> {
    return await deleteSheetRow(SHEET_NAMES.TODOS, id);
  }
}

export class GoogleSheetsMemberRepository implements IMemberRepository {
  private fallbackMock = new MockMemberRepository();

  async getMembers(): Promise<Member[]> {
    try {
      const { data } = await fetchSheetRows<Member>(SHEET_NAMES.MEMBERS);
      if (data.length === 0) {
        return await this.fallbackMock.getMembers();
      }
      return data;
    } catch (e) {
      console.error('[GoogleSheetsMemberRepository] getMembers error, fallback:', e);
      return await this.fallbackMock.getMembers();
    }
  }

  async createMember(member: Omit<Member, 'member_id'>): Promise<Member> {
    const newMember: Member = {
      ...member,
      member_id: `m-${Date.now()}`,
    };
    await appendSheetRow(SHEET_NAMES.MEMBERS, newMember);
    return newMember;
  }
}
