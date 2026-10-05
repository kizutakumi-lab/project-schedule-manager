import { Project, ScheduleItem, Todo, Member } from '@/types';

export interface UpdateResult<T> {
  success: boolean;
  data?: T;
  conflict?: boolean;
  message?: string;
}

export interface IProjectRepository {
  getProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | null>;
  createProject(project: Omit<Project, 'created_at' | 'updated_at'>): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>, expectedUpdatedAt?: string): Promise<UpdateResult<Project>>;
  deleteProject(id: string): Promise<boolean>;
}

export interface IScheduleRepository {
  getScheduleItems(projectId: string): Promise<ScheduleItem[]>;
  createScheduleItem(item: Omit<ScheduleItem, 'created_at' | 'updated_at'>): Promise<ScheduleItem>;
  updateScheduleItem(id: string, updates: Partial<ScheduleItem>, expectedUpdatedAt?: string): Promise<UpdateResult<ScheduleItem>>;
  updateMultipleScheduleItems(items: ScheduleItem[]): Promise<boolean>;
  deleteScheduleItem(id: string): Promise<boolean>;
  duplicateScheduleItem(id: string): Promise<ScheduleItem | null>;
}

export interface ITodoRepository {
  getTodos(projectId: string): Promise<Todo[]>;
  createTodo(todo: Omit<Todo, 'created_at' | 'updated_at'>): Promise<Todo>;
  updateTodo(id: string, updates: Partial<Todo>, expectedUpdatedAt?: string): Promise<UpdateResult<Todo>>;
  deleteTodo(id: string): Promise<boolean>;
}

export interface IMemberRepository {
  getMembers(): Promise<Member[]>;
  createMember(member: Omit<Member, 'member_id'>): Promise<Member>;
}
