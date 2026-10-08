import { ScheduleItem } from '@/types';
import {
  calculateEndDate,
  getNextBusinessDay,
  getNextOrCurrentBusinessDay,
  countBusinessDays,
  addBusinessDays,
} from './business-days';

/**
 * 階層構造に基づいてアイテムを並び替える（親が必ず子の上にくることを保証）
 */
export function sortItemsHierarchically(items: ScheduleItem[]): ScheduleItem[] {
  if (items.length <= 1) return items;

  const itemMap = new Map<string, ScheduleItem>();
  for (const item of items) {
    itemMap.set(item.schedule_id, { ...item });
  }

  // 親IDごとの子要素マップ
  const childrenMap = new Map<string | null, ScheduleItem[]>();
  for (const item of items) {
    // 親が存在しない、または親IDが無効な場合は null（ルート）扱い
    const parentKey = item.parent_id && itemMap.has(item.parent_id) ? item.parent_id : null;
    if (!childrenMap.has(parentKey)) {
      childrenMap.set(parentKey, []);
    }
    childrenMap.get(parentKey)!.push(item);
  }

  // 各ノード（親）の有効ソートキー（自身または配下の子孫の最小 sort_order）を計算
  const getMinSortOrder = (item: ScheduleItem): number => {
    let minSort = item.sort_order ?? 999999;
    const children = childrenMap.get(item.schedule_id) || [];
    for (const child of children) {
      minSort = Math.min(minSort, getMinSortOrder(child));
    }
    return minSort;
  };

  // 各階層内のアイテムを並べ替えるソーター
  const sortList = (list: ScheduleItem[]): ScheduleItem[] => {
    return [...list].sort((a, b) => {
      const aMin = getMinSortOrder(a);
      const bMin = getMinSortOrder(b);
      if (aMin !== bMin) return aMin - bMin;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  };

  // 深さ優先探索（DFS）で親 -> 子 -> 孫 の順序で配列を構築
  const result: ScheduleItem[] = [];
  const traverse = (parentId: string | null) => {
    const directChildren = childrenMap.get(parentId) || [];
    const sortedChildren = sortList(directChildren);

    for (const child of sortedChildren) {
      result.push(child);
      // そのアイテムを親とする子要素を直下に展開
      traverse(child.schedule_id);
    }
  };

  traverse(null);

  // 孤立したアイテム（もしあれば末尾に追加）
  const addedIds = new Set(result.map(r => r.schedule_id));
  for (const item of items) {
    if (!addedIds.has(item.schedule_id)) {
      result.push(item);
    }
  }

  // sort_order を 1, 2, 3... で正規化
  result.forEach((item, index) => {
    item.sort_order = index + 1;
  });

  return result;
}

/**
 * 工程リストを受け取り、auto_schedule や依存関係に基づいて
 * 全工程の start_date, end_date を自動再計算して返す
 *
 * @param items 対象案件の全工程リスト
 * @param projectStartDate 案件開始日
 * @returns 日付が再計算された全工程リスト
 */
export function recalculateSchedule(
  items: ScheduleItem[],
  projectStartDate: string
): ScheduleItem[] {
  if (items.length === 0) return [];

  // まず親が必ず子の上に来るように階層的ツリーソートを実行
  const sorted = sortItemsHierarchically(items);

  // 計算結果を保持するマップ
  const itemMap = new Map<string, ScheduleItem>();
  for (const item of sorted) {
    itemMap.set(item.schedule_id, { ...item });
  }

  let lastCompletedEndDate: string | null = null;
  const baseStartDate = getNextOrCurrentBusinessDay(projectStartDate);

  let prevTask: ScheduleItem | null = null;
  let parallelGroupMaxEnd: string | null = null;

  for (const item of sorted) {
    const current = itemMap.get(item.schedule_id)!;

    if (current.item_type === 'task') {
      let taskStartDate = current.start_date;

      if (current.auto_schedule) {
        if (current.is_parallel && prevTask) {
          // 直前の工程と並行作業：直前タスクと同じ開始日！
          taskStartDate = prevTask.start_date;
        } else if (current.dependency_id && itemMap.has(current.dependency_id)) {
          // 明示的な依存関係がある場合：依存先工程の終了日の翌営業日
          const depItem = itemMap.get(current.dependency_id)!;
          taskStartDate = getNextBusinessDay(depItem.end_date);
        } else if (lastCompletedEndDate) {
          // 前の工程に連続する場合：直前の工程の終了日の翌営業日
          taskStartDate = getNextBusinessDay(lastCompletedEndDate);
        } else {
          // 最初の工程の場合：案件開始日（営業日）
          taskStartDate = baseStartDate;
        }

        // 余白・バッファ日数（営業日）が指定されている場合、その分だけ開始日を後ろ倒し
        if (current.buffer_days && current.buffer_days > 0) {
          taskStartDate = addBusinessDays(taskStartDate, current.buffer_days);
        }
      } else {
        // 手動日程の場合：指定された開始日を営業日調整（もし土日祝日なら直近営業日）
        taskStartDate = current.start_date
          ? getNextOrCurrentBusinessDay(current.start_date)
          : baseStartDate;
      }

      const duration = Math.max(1, current.duration_business_days || 1);
      const taskEndDate = calculateEndDate(taskStartDate, duration);

      current.start_date = taskStartDate;
      current.end_date = taskEndDate;
      current.duration_business_days = duration;

      if (current.is_parallel) {
        // 並行タスクの場合、並行グループ内で最大の終了日を保持
        if (!parallelGroupMaxEnd || taskEndDate > parallelGroupMaxEnd) {
          parallelGroupMaxEnd = taskEndDate;
        }
        if (parallelGroupMaxEnd && (!lastCompletedEndDate || parallelGroupMaxEnd > lastCompletedEndDate)) {
          lastCompletedEndDate = parallelGroupMaxEnd;
        }
      } else {
        parallelGroupMaxEnd = taskEndDate;
        lastCompletedEndDate = taskEndDate;
      }

      prevTask = current;
    }
  }

  // 親グループ（group, category）の開始日・終了日を、子要素の期間から再集計
  updateParentItemDates(itemMap);

  // 最終的な階層ソート済み配列を返す
  return Array.from(itemMap.values()).sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * 子要素の期間から親項目（中項目・大項目）の期間および営業日数を再集計
 */
function updateParentItemDates(itemMap: Map<string, ScheduleItem>) {
  const items = Array.from(itemMap.values());

  // 複数階層（task -> group -> category）に対応するため複数パスで確実に反映
  for (let pass = 0; pass < 3; pass++) {
    for (const item of items) {
      if (item.item_type === 'category' || item.item_type === 'group') {
        const children = items.filter(c => c.parent_id === item.schedule_id);
        if (children.length === 0) continue;

        const validStartDates = children.map(c => c.start_date).filter(Boolean);
        const validEndDates = children.map(c => c.end_date).filter(Boolean);

        if (validStartDates.length > 0 && validEndDates.length > 0) {
          validStartDates.sort();
          validEndDates.sort();

          const earliestStart = validStartDates[0];
          const latestEnd = validEndDates[validEndDates.length - 1];

          item.start_date = earliestStart;
          item.end_date = latestEnd;
          item.duration_business_days = countBusinessDays(earliestStart, latestEnd);
        }
      }
    }
  }
}

/**
 * テキストから一括スケジュール工程を解析
 * 書式: 「工程名 / 営業日数 / 担当者(任意) / 並行(任意)」
 */
export function parseBulkScheduleInput(
  rawText: string,
  projectId: string,
  parentId: string | null = null,
  startSortOrder: number = 1,
  specifiedStartDate?: string | null
): Partial<ScheduleItem>[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const items: Partial<ScheduleItem>[] = [];

  let curSort = startSortOrder;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const parts = line.split(/[\/／]/).map(p => p.trim());
    const name = parts[0] || '未定工程';

    let duration = 3; // デフォルト3日
    if (parts[1]) {
      const match = parts[1].match(/\d+/);
      if (match) {
        duration = parseInt(match[0], 10);
      }
    }

    let assignee = parts[2] || '';
    let isParallel = false;

    // 第3・第4パートから「並行」「同時」判定
    const parallelKeywords = ['並行', '並行作業', '同時', 'parallel', 'p'];
    if (parallelKeywords.includes(assignee.toLowerCase())) {
      isParallel = true;
      assignee = '';
    }

    if (parts[3] && parallelKeywords.includes(parts[3].toLowerCase())) {
      isParallel = true;
    }

    // 先頭タスクで指定開始日がある場合、手動開始日として固定
    const isFirstWithSpecifiedStart = idx === 0 && Boolean(specifiedStartDate);

    items.push({
      schedule_id: `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      project_id: projectId,
      parent_id: parentId,
      item_type: 'task',
      name,
      duration_business_days: duration,
      start_date: isFirstWithSpecifiedStart ? (specifiedStartDate as string) : undefined,
      assignee,
      sort_order: curSort++,
      auto_schedule: !isFirstWithSpecifiedStart,
      dependency_id: null,
      is_parallel: isParallel,
      memo: '',
    });
  }

  return items;
}
