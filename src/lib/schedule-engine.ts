import { ScheduleItem } from '@/types';
import { calculateEndDate, getNextBusinessDay, getNextOrCurrentBusinessDay } from './business-days';

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

  // ソート順（sort_order）昇順で並べ替え
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);

  // 計算結果を保持するマップ
  const itemMap = new Map<string, ScheduleItem>();
  for (const item of sorted) {
    itemMap.set(item.schedule_id, { ...item });
  }

  // 親アイテム（category, group）とタスク（task）を識別
  // 基本的にタスク（task）が実際の日程を持ち、後続に連動する
  // ※ もし親項目しか登録されていない場合でもエラーにならないようにする

  let lastCompletedEndDate: string | null = null;
  const baseStartDate = getNextOrCurrentBusinessDay(projectStartDate);

  for (const item of sorted) {
    const current = itemMap.get(item.schedule_id)!;

    if (current.item_type === 'task') {
      let taskStartDate = current.start_date;

      if (current.auto_schedule) {
        if (current.dependency_id && itemMap.has(current.dependency_id)) {
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

      lastCompletedEndDate = taskEndDate;
    }
  }

  // 親グループ（group, category）の開始日・終了日を、子要素の期間から再集計
  // 階層のボトムアップで親の期間を算出
  updateParentItemDates(itemMap);

  return Array.from(itemMap.values()).sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * 子要素の期間から親項目（大項目・中項目）の期間を更新する
 */
function updateParentItemDates(itemMap: Map<string, ScheduleItem>) {
  const items = Array.from(itemMap.values());
  const parentIds = new Set(items.map(i => i.parent_id).filter(Boolean) as string[]);

  // 葉ノードから順に親へ反映するため、子から親へ再帰的に期間を集計
  for (const parentId of parentIds) {
    const parent = itemMap.get(parentId);
    if (!parent) continue;

    const children = items.filter(i => i.parent_id === parentId);
    if (children.length === 0) continue;

    // 子要素の有効な日付を抽出
    const startDates = children.map(c => c.start_date).filter(Boolean);
    const endDates = children.map(c => c.end_date).filter(Boolean);

    if (startDates.length > 0 && endDates.length > 0) {
      startDates.sort();
      endDates.sort();
      parent.start_date = startDates[0];
      parent.end_date = endDates[endDates.length - 1];
    }
  }
}

/**
 * テキストから複数工程を一括生成するユーティリティ
 * 例:
 * シナリオ制作 / 10日
 * 監修 / 3日
 * 動画コンテ制作 / 8日
 */
export function parseBulkScheduleInput(
  input: string,
  projectId: string,
  parentId: string | null,
  startSortOrder: number,
  defaultAssignee: string = ''
): Partial<ScheduleItem>[] {
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
  const items: Partial<ScheduleItem>[] = [];

  let currentSort = startSortOrder;

  for (const line of lines) {
    // 区切り文字: "/", "／", ",", "、", "\t"
    const parts = line.split(/[/／,、\t]/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) continue;

    const name = parts[0];
    let duration = 1;
    let assignee = defaultAssignee;

    if (parts.length > 1) {
      const matchDays = parts[1].match(/\d+/);
      if (matchDays) {
        duration = parseInt(matchDays[0], 10);
      }
    }

    if (parts.length > 2) {
      assignee = parts[2];
    }

    items.push({
      project_id: projectId,
      parent_id: parentId,
      item_type: 'task',
      name,
      duration_business_days: duration,
      assignee,
      sort_order: currentSort++,
      auto_schedule: true,
      dependency_id: null,
      memo: '',
    });
  }

  return items;
}
