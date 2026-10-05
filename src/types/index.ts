export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';

export interface Project {
  project_id: string;
  project_name: string;
  client_name: string;
  owner: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  status: ProjectStatus;
  memo?: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export type ScheduleItemType = 'category' | 'group' | 'task';

export interface ScheduleItem {
  schedule_id: string;
  project_id: string;
  parent_id: string | null;
  item_type: ScheduleItemType;
  name: string;
  duration_business_days: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  assignee: string;
  sort_order: number;
  auto_schedule: boolean;
  dependency_id: string | null;
  buffer_days?: number; // 前工程との余白・バッファ日数（営業日）
  memo: string;
  created_at: string;
  updated_at: string;
}

export type TodoStatus = 'open' | 'completed';

export interface Todo {
  todo_id: string;
  project_id: string;
  title: string;
  assignee: string;
  due_date: string; // YYYY-MM-DD
  status: TodoStatus;
  memo: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  member_id: string;
  name: string;
  email: string;
  active: boolean;
}

export interface ScheduleItemHierarchy extends ScheduleItem {
  children?: ScheduleItemHierarchy[];
  level?: number;
}
