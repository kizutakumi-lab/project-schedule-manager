import {
  IProjectRepository,
  IScheduleRepository,
  ITodoRepository,
  IMemberRepository,
} from './interfaces';
import {
  GoogleSheetsProjectRepository,
  GoogleSheetsScheduleRepository,
  GoogleSheetsTodoRepository,
  GoogleSheetsMemberRepository,
} from './sheets-repository';
import {
  MockProjectRepository,
  MockScheduleRepository,
  MockTodoRepository,
  MockMemberRepository,
} from './mock-repository';
import { isGoogleConfigured, getSpreadsheetId } from '../google-sheets/client';

// シングルトンインスタンス
let projectRepo: IProjectRepository | null = null;
let scheduleRepo: IScheduleRepository | null = null;
let todoRepo: ITodoRepository | null = null;
let memberRepo: IMemberRepository | null = null;

export function isUsingGoogleSheets(): boolean {
  return isGoogleConfigured();
}

export function getCurrentStorageInfo() {
  const isGoogle = isUsingGoogleSheets();
  return {
    isGoogle,
    spreadsheetId: getSpreadsheetId(),
    storageName: isGoogle ? 'Googleスプレッドシート' : 'ローカルメモリ（Google API未設定）',
  };
}

export function getProjectRepository(): IProjectRepository {
  if (!projectRepo) {
    projectRepo = isUsingGoogleSheets()
      ? new GoogleSheetsProjectRepository()
      : new MockProjectRepository();
  }
  return projectRepo;
}

export function getScheduleRepository(): IScheduleRepository {
  if (!scheduleRepo) {
    scheduleRepo = isUsingGoogleSheets()
      ? new GoogleSheetsScheduleRepository()
      : new MockScheduleRepository();
  }
  return scheduleRepo;
}

export function getTodoRepository(): ITodoRepository {
  if (!todoRepo) {
    todoRepo = isUsingGoogleSheets()
      ? new GoogleSheetsTodoRepository()
      : new MockTodoRepository();
  }
  return todoRepo;
}

export function getMemberRepository(): IMemberRepository {
  if (!memberRepo) {
    memberRepo = isUsingGoogleSheets()
      ? new GoogleSheetsMemberRepository()
      : new MockMemberRepository();
  }
  return memberRepo;
}
