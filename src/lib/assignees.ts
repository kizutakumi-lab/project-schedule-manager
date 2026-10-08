const STORAGE_KEY = 'project_schedule_assignees_v1';

export const DEFAULT_ASSIGNEES = ['DLE', 'クライアント'];

/**
 * 担当者候補リストを取得
 */
export function getAssigneeOptions(clientName?: string): string[] {
  if (typeof window === 'undefined') {
    const list = [...DEFAULT_ASSIGNEES];
    if (clientName && !list.includes(clientName)) list.push(clientName);
    return list;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [...DEFAULT_ASSIGNEES];
      if (clientName && !initial.includes(clientName)) {
        initial.push(clientName);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed: string[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_ASSIGNEES;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to get assignee options:', e);
    return DEFAULT_ASSIGNEES;
  }
}

/**
 * 担当者候補リストを保存
 */
export function saveAssigneeOptions(options: string[]): void {
  try {
    const filtered = options.map(o => o.trim()).filter(Boolean);
    const unique = Array.from(new Set(filtered));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save assignee options:', e);
  }
}

/**
 * 新しい担当者候補を追加
 */
export function addAssigneeOption(name: string, clientName?: string): string[] {
  const current = getAssigneeOptions(clientName);
  const trimmed = name.trim();
  if (!trimmed || current.includes(trimmed)) return current;

  const next = [...current, trimmed];
  saveAssigneeOptions(next);
  return next;
}

/**
 * 担当者候補を削除
 */
export function deleteAssigneeOption(name: string, clientName?: string): string[] {
  const current = getAssigneeOptions(clientName);
  const next = current.filter(o => o !== name);
  saveAssigneeOptions(next);
  return next;
}

/**
 * 担当者候補を初期状態に戻す
 */
export function resetAssigneeOptions(clientName?: string): string[] {
  const initial = [...DEFAULT_ASSIGNEES];
  if (clientName && !initial.includes(clientName)) {
    initial.push(clientName);
  }
  saveAssigneeOptions(initial);
  return initial;
}
