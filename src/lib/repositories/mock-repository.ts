import { Project, ScheduleItem, Todo, Member } from '@/types';
import {
  IProjectRepository,
  IScheduleRepository,
  ITodoRepository,
  IMemberRepository,
  UpdateResult,
} from './interfaces';
import { recalculateSchedule } from '../schedule-engine';

// 初期メンバー
let mockMembers: Member[] = [
  { member_id: 'm-1', name: '山田 太郎', email: 'yamada@example.com', active: true },
  { member_id: 'm-2', name: '佐藤 花子', email: 'sato@example.com', active: true },
  { member_id: 'm-3', name: '田中 一郎', email: 'tanaka@example.com', active: true },
  { member_id: 'm-4', name: '鈴木 次郎', email: 'suzuki@example.com', active: true },
];

// 初期案件（Excel画像を模したリッチなサンプル）
let mockProjects: Project[] = [
  {
    project_id: 'prj-sample-01',
    project_name: '2025年度 クリエイティブ総合プロデュース案件',
    client_name: '株式会社グローバルメディア',
    owner: '山田 太郎',
    start_date: '2025-04-01',
    end_date: '2025-08-31',
    status: 'in_progress',
    created_at: new Date('2025-03-01T00:00:00Z').toISOString(),
    updated_at: new Date('2025-03-15T10:00:00Z').toISOString(),
  },
  {
    project_id: 'prj-sample-02',
    project_name: '新商品プロモーションLP & 短尺動画制作',
    client_name: 'フューチャーテック株式会社',
    owner: '佐藤 花子',
    start_date: '2025-05-12',
    end_date: '2025-07-25',
    status: 'planning',
    created_at: new Date('2025-04-01T00:00:00Z').toISOString(),
    updated_at: new Date('2025-04-01T10:00:00Z').toISOString(),
  },
];

// 初期スケジュール工程（添付画像の「アニメ制作」「報道イベント」「配信期間」をモデル化）
let mockScheduleItems: ScheduleItem[] = [
  // 大項目: アニメ制作
  {
    schedule_id: 'item-cat-1',
    project_id: 'prj-sample-01',
    parent_id: null,
    item_type: 'category',
    name: 'アニメ制作',
    duration_business_days: 45,
    start_date: '2025-04-01',
    end_date: '2025-06-03',
    assignee: '山田 太郎',
    sort_order: 1,
    auto_schedule: true,
    dependency_id: null,
    memo: '主要アニメーション3ライン進行',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // 中項目: 事業紹介アニメ 3本 各2分
  {
    schedule_id: 'item-grp-1',
    project_id: 'prj-sample-01',
    parent_id: 'item-cat-1',
    item_type: 'group',
    name: '事業紹介アニメ 3本 各2分',
    duration_business_days: 40,
    start_date: '2025-04-01',
    end_date: '2025-05-27',
    assignee: '佐藤 花子',
    sort_order: 2,
    auto_schedule: true,
    dependency_id: null,
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // タスク群: 事業紹介アニメ
  {
    schedule_id: 'item-task-1',
    project_id: 'prj-sample-01',
    parent_id: 'item-grp-1',
    item_type: 'task',
    name: '#1#2#3 シナリオ制作',
    duration_business_days: 10,
    start_date: '2025-04-01',
    end_date: '2025-04-14',
    assignee: '佐藤 花子',
    sort_order: 3,
    auto_schedule: true,
    dependency_id: null,
    memo: '初期プロット確定後着手',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-2',
    project_id: 'prj-sample-01',
    parent_id: 'item-grp-1',
    item_type: 'task',
    name: '確認（クライアント監修）',
    duration_business_days: 3,
    start_date: '2025-04-15',
    end_date: '2025-04-17',
    assignee: 'クライアント',
    sort_order: 4,
    auto_schedule: true,
    dependency_id: 'item-task-1',
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-3',
    project_id: 'prj-sample-01',
    parent_id: 'item-grp-1',
    item_type: 'task',
    name: '#1#2#3 シナリオ修正',
    duration_business_days: 5,
    start_date: '2025-04-18',
    end_date: '2025-04-24',
    assignee: '佐藤 花子',
    sort_order: 5,
    auto_schedule: true,
    dependency_id: 'item-task-2',
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-4',
    project_id: 'prj-sample-01',
    parent_id: 'item-grp-1',
    item_type: 'task',
    name: '確認（最終決定）',
    duration_business_days: 3,
    start_date: '2025-04-25',
    end_date: '2025-04-30',
    assignee: 'クライアント',
    sort_order: 6,
    auto_schedule: true,
    dependency_id: 'item-task-3',
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-5',
    project_id: 'prj-sample-01',
    parent_id: 'item-grp-1',
    item_type: 'task',
    name: '#1 コンテ制作',
    duration_business_days: 8,
    start_date: '2025-05-01',
    end_date: '2025-05-13',
    assignee: '田中 一郎',
    sort_order: 7,
    auto_schedule: true,
    dependency_id: 'item-task-4',
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-6',
    project_id: 'prj-sample-01',
    parent_id: 'item-grp-1',
    item_type: 'task',
    name: '確認（コンテ監修）',
    duration_business_days: 3,
    start_date: '2025-05-14',
    end_date: '2025-05-16',
    assignee: 'クライアント',
    sort_order: 8,
    auto_schedule: true,
    dependency_id: 'item-task-5',
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-7',
    project_id: 'prj-sample-01',
    parent_id: 'item-grp-1',
    item_type: 'task',
    name: '#1 アニメ清書・仕上げ',
    duration_business_days: 12,
    start_date: '2025-05-19',
    end_date: '2025-06-03',
    assignee: '鈴木 次郎',
    sort_order: 9,
    auto_schedule: true,
    dependency_id: 'item-task-6',
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 中項目: タレントコラボアニメ 1本 30秒
  {
    schedule_id: 'item-grp-2',
    project_id: 'prj-sample-01',
    parent_id: 'item-cat-1',
    item_type: 'group',
    name: 'タレントコラボアニメ 1本 30秒',
    duration_business_days: 35,
    start_date: '2025-04-01',
    end_date: '2025-05-20',
    assignee: '山田 太郎',
    sort_order: 10,
    auto_schedule: true,
    dependency_id: null,
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-8',
    project_id: 'prj-sample-01',
    parent_id: 'item-grp-2',
    item_type: 'task',
    name: 'シナリオ制作',
    duration_business_days: 10,
    start_date: '2025-04-01',
    end_date: '2025-04-14',
    assignee: '山田 太郎',
    sort_order: 11,
    auto_schedule: true,
    dependency_id: null,
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-9',
    project_id: 'prj-sample-01',
    parent_id: 'item-grp-2',
    item_type: 'task',
    name: '確認',
    duration_business_days: 3,
    start_date: '2025-04-15',
    end_date: '2025-04-17',
    assignee: 'クライアント',
    sort_order: 12,
    auto_schedule: true,
    dependency_id: 'item-task-8',
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // 大項目: 報道イベント
  {
    schedule_id: 'item-cat-2',
    project_id: 'prj-sample-01',
    parent_id: null,
    item_type: 'category',
    name: '報道イベント',
    duration_business_days: 40,
    start_date: '2025-04-10',
    end_date: '2025-06-05',
    assignee: '山田 太郎',
    sort_order: 20,
    auto_schedule: false,
    dependency_id: null,
    memo: '詳細別タブに掲載',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-10',
    project_id: 'prj-sample-01',
    parent_id: 'item-cat-2',
    item_type: 'task',
    name: 'タレント交渉',
    duration_business_days: 15,
    start_date: '2025-04-10',
    end_date: '2025-04-30',
    assignee: '山田 太郎',
    sort_order: 21,
    auto_schedule: false,
    dependency_id: null,
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-11',
    project_id: 'prj-sample-01',
    parent_id: 'item-cat-2',
    item_type: 'task',
    name: '会場候補・下見',
    duration_business_days: 20,
    start_date: '2025-04-15',
    end_date: '2025-05-14',
    assignee: '田中 一郎',
    sort_order: 22,
    auto_schedule: false,
    dependency_id: null,
    memo: '並行作業',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    schedule_id: 'item-task-12',
    project_id: 'prj-sample-01',
    parent_id: 'item-cat-2',
    item_type: 'task',
    name: '報道資料作成',
    duration_business_days: 10,
    start_date: '2025-05-01',
    end_date: '2025-05-15',
    assignee: '佐藤 花子',
    sort_order: 23,
    auto_schedule: false,
    dependency_id: null,
    memo: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// 初期TODO（山田、佐藤、田中などの担当者別）
let mockTodos: Todo[] = [
  {
    todo_id: 'todo-1',
    project_id: 'prj-sample-01',
    title: 'クライアントからロゴデータ受領',
    assignee: '山田 太郎',
    due_date: '2025-04-08',
    status: 'completed',
    memo: 'AI形式とPNG形式を受領済み',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    todo_id: 'todo-2',
    project_id: 'prj-sample-01',
    title: '声優オーディション選定シート送付',
    assignee: '山田 太郎',
    due_date: '2025-04-18',
    status: 'open',
    memo: '候補者3名のボイスサンプル添付',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    todo_id: 'todo-3',
    project_id: 'prj-sample-01',
    title: 'シナリオ初稿クライアント送付',
    assignee: '佐藤 花子',
    due_date: '2025-04-14',
    status: 'open',
    memo: 'メールにてPDF送付予定',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    todo_id: 'todo-4',
    project_id: 'prj-sample-01',
    title: '会場候補見積もり受領',
    assignee: '田中 一郎',
    due_date: '2025-04-25',
    status: 'open',
    memo: '2会場の比較資料を作成',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export class MockProjectRepository implements IProjectRepository {
  async getProjects(): Promise<Project[]> {
    return [...mockProjects].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async getProjectById(id: string): Promise<Project | null> {
    const p = mockProjects.find(item => item.project_id === id);
    return p ? { ...p } : null;
  }

  async createProject(project: Omit<Project, 'created_at' | 'updated_at'>): Promise<Project> {
    const now = new Date().toISOString();
    const newProj: Project = {
      ...project,
      created_at: now,
      updated_at: now,
    };
    mockProjects.unshift(newProj);
    return newProj;
  }

  async updateProject(
    id: string,
    updates: Partial<Project>,
    expectedUpdatedAt?: string
  ): Promise<UpdateResult<Project>> {
    const idx = mockProjects.findIndex(p => p.project_id === id);
    if (idx === -1) {
      return { success: false, message: 'Project not found' };
    }

    const current = mockProjects[idx];
    if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
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
    mockProjects[idx] = updated;
    return { success: true, data: updated };
  }

  async deleteProject(id: string): Promise<boolean> {
    const before = mockProjects.length;
    mockProjects = mockProjects.filter(p => p.project_id !== id);
    mockScheduleItems = mockScheduleItems.filter(s => s.project_id !== id);
    mockTodos = mockTodos.filter(t => t.project_id !== id);
    return mockProjects.length < before;
  }
}

export class MockScheduleRepository implements IScheduleRepository {
  async getScheduleItems(projectId: string): Promise<ScheduleItem[]> {
    return mockScheduleItems
      .filter(i => i.project_id === projectId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async createScheduleItem(item: Omit<ScheduleItem, 'created_at' | 'updated_at'>): Promise<ScheduleItem> {
    const now = new Date().toISOString();
    const newItem: ScheduleItem = {
      ...item,
      created_at: now,
      updated_at: now,
    };
    mockScheduleItems.push(newItem);
    return newItem;
  }

  async updateScheduleItem(
    id: string,
    updates: Partial<ScheduleItem>,
    expectedUpdatedAt?: string
  ): Promise<UpdateResult<ScheduleItem>> {
    const idx = mockScheduleItems.findIndex(i => i.schedule_id === id);
    if (idx === -1) {
      return { success: false, message: 'Item not found' };
    }

    const current = mockScheduleItems[idx];
    if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
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
    mockScheduleItems[idx] = updated;
    return { success: true, data: updated };
  }

  async updateMultipleScheduleItems(items: ScheduleItem[]): Promise<boolean> {
    const now = new Date().toISOString();
    for (const item of items) {
      const idx = mockScheduleItems.findIndex(i => i.schedule_id === item.schedule_id);
      if (idx !== -1) {
        mockScheduleItems[idx] = {
          ...mockScheduleItems[idx],
          ...item,
          updated_at: now,
        };
      } else {
        mockScheduleItems.push({
          ...item,
          created_at: now,
          updated_at: now,
        });
      }
    }
    return true;
  }

  async deleteScheduleItem(id: string): Promise<boolean> {
    // 削除対象とその子要素を再帰的に削除
    const toDeleteIds = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const item of mockScheduleItems) {
        if (item.parent_id && toDeleteIds.has(item.parent_id) && !toDeleteIds.has(item.schedule_id)) {
          toDeleteIds.add(item.schedule_id);
          added = true;
        }
      }
    }

    mockScheduleItems = mockScheduleItems.filter(i => !toDeleteIds.has(i.schedule_id));
    return true;
  }

  async duplicateScheduleItem(id: string): Promise<ScheduleItem | null> {
    const original = mockScheduleItems.find(i => i.schedule_id === id);
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

    mockScheduleItems.push(copy);
    return copy;
  }
}

export class MockTodoRepository implements ITodoRepository {
  async getTodos(projectId: string): Promise<Todo[]> {
    return mockTodos.filter(t => t.project_id === projectId);
  }

  async createTodo(todo: Omit<Todo, 'created_at' | 'updated_at'>): Promise<Todo> {
    const now = new Date().toISOString();
    const newTodo: Todo = {
      ...todo,
      created_at: now,
      updated_at: now,
    };
    mockTodos.push(newTodo);
    return newTodo;
  }

  async updateTodo(
    id: string,
    updates: Partial<Todo>,
    expectedUpdatedAt?: string
  ): Promise<UpdateResult<Todo>> {
    const idx = mockTodos.findIndex(t => t.todo_id === id);
    if (idx === -1) {
      return { success: false, message: 'Todo not found' };
    }

    const current = mockTodos[idx];
    if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
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
    mockTodos[idx] = updated;
    return { success: true, data: updated };
  }

  async deleteTodo(id: string): Promise<boolean> {
    const before = mockTodos.length;
    mockTodos = mockTodos.filter(t => t.todo_id !== id);
    return mockTodos.length < before;
  }
}

export class MockMemberRepository implements IMemberRepository {
  async getMembers(): Promise<Member[]> {
    return [...mockMembers];
  }

  async createMember(member: Omit<Member, 'member_id'>): Promise<Member> {
    const newMember: Member = {
      ...member,
      member_id: `m-${Date.now()}`,
    };
    mockMembers.push(newMember);
    return newMember;
  }
}
