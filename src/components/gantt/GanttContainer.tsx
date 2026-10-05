'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Project, ScheduleItem, Todo, ScheduleItemType } from '@/types';
import { parseISO, format, addDays } from 'date-fns';
import {
  generateCalendarDays,
  groupCalendarByMonth,
  CalendarDay,
} from '@/lib/date-utils';
import { recalculateSchedule } from '@/lib/schedule-engine';
import { GanttToolbar } from './GanttToolbar';
import { GanttCalendarHeader, GridBorderStrength } from './GanttCalendarHeader';
import { GanttLeftTree } from './GanttLeftTree';
import { GanttTimeline } from './GanttTimeline';
import { GanttMemoSummaryBar } from './GanttMemoSummaryBar';
import { ItemEditModal } from './ItemEditModal';
import { TaskScheduleModal } from './TaskScheduleModal';
import { BulkAddModal } from './BulkAddModal';
import { ConflictWarningModal } from './ConflictWarningModal';
import { TodoListModal } from '../todo/TodoListModal';
import { TodoEditModal } from '../todo/TodoEditModal';
import { ExportPdfModal } from '../pdf/ExportPdfModal';
import {
  createScheduleItemAction,
  updateScheduleItemAction,
  updateMultipleScheduleItemsAction,
  deleteScheduleItemAction,
  duplicateScheduleItemAction,
  bulkCreateScheduleItemsAction,
} from '@/app/actions/schedules';
import {
  createTodoAction,
  updateTodoAction,
  deleteTodoAction,
} from '@/app/actions/todos';
import { updateProjectAction } from '@/app/actions/projects';
import { useRouter } from 'next/navigation';

interface GanttContainerProps {
  project: Project;
  initialItems: ScheduleItem[];
  initialTodos: Todo[];
}

export function GanttContainer({
  project,
  initialItems,
  initialTodos,
}: GanttContainerProps) {
  const router = useRouter();

  // 状態管理
  const [items, setItems] = useState<ScheduleItem[]>(() =>
    recalculateSchedule(initialItems, project.start_date)
  );
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [dayCellWidth, setDayCellWidth] = useState<number>(36);
  // 罫線の濃さ設定（デフォルト: くっきり strong）
  const [borderStrength, setBorderStrength] = useState<GridBorderStrength>('strong');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [conflictModalOpen, setConflictModalOpen] = useState<boolean>(false);
  const [conflictMessage, setConflictMessage] = useState<string>('');

  // モーダル管理
  const [isItemEditOpen, setIsItemEditOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
  const [newItemType, setNewItemType] = useState<ScheduleItemType>('task');

  const [isBulkAddOpen, setIsBulkAddOpen] = useState<boolean>(false);
  const [isTodoListOpen, setIsTodoListOpen] = useState<boolean>(false);
  const [isTodoEditOpen, setIsTodoEditOpen] = useState<boolean>(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState<boolean>(false);

  // 作業日程・余白（バッファ）調整モーダル
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [scheduleModalItem, setScheduleModalItem] = useState<ScheduleItem | null>(null);
  const [scheduleModalClickedDate, setScheduleModalClickedDate] = useState<string | null>(null);

  // スクロール同期用参照
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const leftTreeScrollRef = useRef<HTMLDivElement>(null);

  // 担当者ごとのTODOグループ化
  const assigneeGroups = useMemo<[string, Todo[]][]>(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of todos) {
      const key = todo.assignee || '未設定';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(todo);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [todos]);

  // 上下スクロール同期ハンドラ
  const handleLeftScroll = () => {
    if (leftTreeScrollRef.current && timelineScrollRef.current) {
      timelineScrollRef.current.scrollTop = leftTreeScrollRef.current.scrollTop;
    }
  };

  const handleTimelineScroll = () => {
    if (leftTreeScrollRef.current && timelineScrollRef.current) {
      leftTreeScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop;
    }
  };

  // カレンダー表示期間のカスタム設定
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);

  // カレンダー日付の範囲を算出（カスタム指定があればそれを優先）
  const calendarDays = useMemo(() => {
    if (customRange && customRange.start && customRange.end && customRange.start <= customRange.end) {
      return generateCalendarDays(customRange.start, customRange.end);
    }

    let minDate = project.start_date || '2025-04-01';
    let maxDate = project.end_date || '2025-08-31';

    for (const item of items) {
      if (item.start_date && item.start_date < minDate) minDate = item.start_date;
      if (item.end_date && item.end_date > maxDate) maxDate = item.end_date;
    }

    for (const todo of todos) {
      if (todo.due_date && todo.due_date > maxDate) maxDate = todo.due_date;
    }

    return generateCalendarDays(minDate, maxDate);
  }, [project, items, todos, customRange]);

  const monthGroups = useMemo(() => {
    return groupCalendarByMonth(calendarDays);
  }, [calendarDays]);

  // 現在の有効なカレンダー期間
  const activeRange = useMemo(() => {
    if (calendarDays.length > 0) {
      return {
        start: calendarDays[0].dateStr,
        end: calendarDays[calendarDays.length - 1].dateStr,
      };
    }
    return {
      start: project.start_date || '2025-04-01',
      end: project.end_date || '2025-08-31',
    };
  }, [calendarDays, project]);

  // Googleスプレッドシートへの一括保存ハンドラ
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await updateMultipleScheduleItemsAction(project.project_id, items);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      alert('Googleスプレッドシートへの保存に失敗しました: ' + (err?.message || '不明なエラー'));
    } finally {
      setIsSaving(false);
    }
  };

  // Ctrl+S / Cmd+S ショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && !isSaving) {
          handleSaveAll();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, isSaving, items]);

  // 離脱防止警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 直後に紐付けされた後続工程を新規挿入（0ms即時反映）
  const handleInsertItemAfter = (currentItem: ScheduleItem) => {
    const currentIdx = items.findIndex(i => i.schedule_id === currentItem.schedule_id);
    const nextSortOrder = currentIdx >= 0 ? currentItem.sort_order + 0.5 : items.length + 1;

    // 直前工程がcategoryならその直下の子、taskやgroupなら同じ階層
    const targetParentId = currentItem.item_type === 'category'
      ? currentItem.schedule_id
      : currentItem.parent_id;

    const newItem: ScheduleItem = {
      schedule_id: `item-${Date.now()}`,
      project_id: project.project_id,
      parent_id: targetParentId,
      item_type: 'task',
      name: '新規工程',
      duration_business_days: 3,
      start_date: currentItem.end_date || project.start_date,
      end_date: currentItem.end_date || project.start_date,
      assignee: currentItem.assignee || '',
      sort_order: nextSortOrder,
      auto_schedule: true,
      dependency_id: currentItem.schedule_id,
      memo: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextList = [...items, newItem].sort((a, b) => a.sort_order - b.sort_order);
    nextList.forEach((it, idx) => {
      it.sort_order = idx + 1;
    });
    const recalculated = recalculateSchedule(nextList, project.start_date);
    setItems(recalculated);
    setHasUnsavedChanges(true);
  };

  // 開閉（折りたたみ）に応じた表示アイテム判定
  const visibleItemIds = useMemo(() => {
    const visible = new Set<string>();
    const itemMap = new Map<string, ScheduleItem>();
    for (const item of items) {
      itemMap.set(item.schedule_id, item);
    }

    for (const item of items) {
      let isVisible = true;
      let curParentId = item.parent_id;

      while (curParentId) {
        if (collapsedIds.has(curParentId)) {
          isVisible = false;
          break;
        }
        const parent = itemMap.get(curParentId);
        curParentId = parent ? parent.parent_id : null;
      }

      if (isVisible) {
        visible.add(item.schedule_id);
      }
    }

    return visible;
  }, [items, collapsedIds]);

  // 折りたたみトグル
  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 今日の日付へスクロール
  const handleScrollToToday = useCallback(() => {
    const todayIndex = calendarDays.findIndex(d => d.isToday);
    if (todayIndex >= 0 && timelineScrollRef.current) {
      const scrollPos = Math.max(0, todayIndex * dayCellWidth - 200);
      timelineScrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [calendarDays, dayCellWidth]);

  // 初回マウント時に今日へスクロール
  useEffect(() => {
    const timer = setTimeout(() => {
      handleScrollToToday();
    }, 150);
    return () => clearTimeout(timer);
  }, [handleScrollToToday]);

  // 営業日数のインライン変更ハンドラ (0ms即時反映)
  const handleDurationChange = (itemId: string, newDuration: number) => {
    const updatedItems = items.map(item =>
      item.schedule_id === itemId
        ? { ...item, duration_business_days: newDuration }
        : item
    );
    const recalculated = recalculateSchedule(updatedItems, project.start_date);
    setItems(recalculated);
    setHasUnsavedChanges(true);
  };

  // 工程名の直接インライン変更ハンドラ (0ms即時反映)
  const handleNameChange = (itemId: string, newName: string) => {
    const updatedItems = items.map(item =>
      item.schedule_id === itemId ? { ...item, name: newName } : item
    );
    setItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  // 担当者の直接インライン変更ハンドラ (0ms即時反映)
  const handleAssigneeChange = (itemId: string, newAssignee: string) => {
    const updatedItems = items.map(item =>
      item.schedule_id === itemId ? { ...item, assignee: newAssignee } : item
    );
    setItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  // 工程の編集・新規作成ハンドラ（モーダル経由・0ms即時反映）
  const handleSaveItem = async (data: Partial<ScheduleItem>) => {
    if (editingItem) {
      const updatedItems = items.map(i =>
        i.schedule_id === editingItem.schedule_id ? { ...i, ...data } : i
      );
      const recalculated = recalculateSchedule(updatedItems, project.start_date);
      setItems(recalculated);
    } else {
      const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) : 0;
      const newItem: ScheduleItem = {
        schedule_id: `item-${Date.now()}`,
        project_id: project.project_id,
        parent_id: data.parent_id || null,
        item_type: data.item_type || 'task',
        name: data.name || '新規工程',
        duration_business_days: data.duration_business_days || 1,
        start_date: data.start_date || project.start_date,
        end_date: data.end_date || project.start_date,
        assignee: data.assignee || '',
        sort_order: maxSort + 1,
        auto_schedule: data.auto_schedule ?? true,
        dependency_id: data.dependency_id || null,
        memo: data.memo || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const nextList = [...items, newItem];
      const recalculated = recalculateSchedule(nextList, project.start_date);
      setItems(recalculated);
    }
    setHasUnsavedChanges(true);
  };

  // 一括スケジュール入力ハンドラ (0ms即時反映)
  const handleBulkAdd = async (bulkItems: Partial<ScheduleItem>[]) => {
    const itemsToCreate = bulkItems.map((b, idx) => ({
      schedule_id: `item-${Date.now()}-${idx}`,
      project_id: project.project_id,
      parent_id: b.parent_id || null,
      item_type: 'task' as ScheduleItemType,
      name: b.name || '工程',
      duration_business_days: b.duration_business_days || 1,
      start_date: project.start_date,
      end_date: project.start_date,
      assignee: b.assignee || '',
      sort_order: b.sort_order || items.length + idx + 1,
      auto_schedule: true,
      dependency_id: null,
      memo: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const nextList = [...items, ...(itemsToCreate as ScheduleItem[])];
    const recalculated = recalculateSchedule(nextList, project.start_date);
    setItems(recalculated);
    setHasUnsavedChanges(true);
  };

  // 工程の削除 (0ms即時反映)
  const handleDeleteItem = (id: string) => {
    const item = items.find(i => i.schedule_id === id);
    if (!item) return;

    if (!confirm(`「${item.name}」を削除してもよろしいですか？`)) {
      return;
    }

    const nextList = items.filter(i => i.schedule_id !== id && i.parent_id !== id);
    const recalculated = recalculateSchedule(nextList, project.start_date);
    setItems(recalculated);
    setHasUnsavedChanges(true);
  };

  // 工程の複製 (0ms即時反映)
  const handleDuplicateItem = (id: string) => {
    const original = items.find(i => i.schedule_id === id);
    if (!original) return;

    const copy: ScheduleItem = {
      ...original,
      schedule_id: `item-${Date.now()}`,
      name: `${original.name} (コピー)`,
      sort_order: original.sort_order + 0.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const nextList = [...items, copy];
    const recalculated = recalculateSchedule(nextList, project.start_date);
    setItems(recalculated);
    setHasUnsavedChanges(true);
  };

  // 並べ替え（上下・0ms即時反映）
  const handleMoveItem = (id: string, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.schedule_id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === items.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const nextList = [...items];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;

    nextList.forEach((item, i) => {
      item.sort_order = i + 1;
    });

    const recalculated = recalculateSchedule(nextList, project.start_date);
    setItems(recalculated);
    setHasUnsavedChanges(true);
  };

  // TODO関連
  const handleCreateTodo = async (todoData: Partial<Todo>) => {
    const created = await createTodoAction({
      project_id: project.project_id,
      title: todoData.title || '',
      assignee: todoData.assignee || '',
      due_date: todoData.due_date || project.start_date,
      status: todoData.status || 'open',
      memo: todoData.memo || '',
    });
    setTodos(prev => [...prev, created]);
  };

  const handleUpdateTodo = async (id: string, updates: Partial<Todo>) => {
    const current = todos.find(t => t.todo_id === id);
    const res = await updateTodoAction(id, project.project_id, updates, current?.updated_at);
    if (res.conflict) {
      setConflictMessage(res.message || '');
      setConflictModalOpen(true);
      return;
    }
    if (res.data) {
      setTodos(prev => prev.map(t => (t.todo_id === id ? res.data! : t)));
    }
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodoAction(id, project.project_id);
    setTodos(prev => prev.filter(t => t.todo_id !== id));
  };

  // 担当者単位での全TODO削除
  const handleDeleteAssigneeTodos = async (assignee: string) => {
    const targetTodos = todos.filter(t => (t.assignee || '未設定') === assignee);
    if (targetTodos.length === 0) return;

    const ok = window.confirm(`${assignee} さんのTODO（${targetTodos.length}件）をすべて削除してもよろしいですか？`);
    if (!ok) return;

    setIsSaving(true);
    try {
      for (const t of targetTodos) {
        await deleteTodoAction(t.todo_id, project.project_id);
      }
      setTodos(prev => prev.filter(t => (t.assignee || '未設定') !== assignee));
    } catch (err: any) {
      alert('TODOの削除に失敗しました: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 案件メモ帳スペース
  const [projectMemo, setProjectMemo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem(`project_memo_${project.project_id}`);
      if (local !== null) return local;
    }
    return project.memo || '';
  });

  const memoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleProjectMemoChange = (newMemo: string) => {
    setProjectMemo(newMemo);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`project_memo_${project.project_id}`, newMemo);
    }
    if (memoTimerRef.current) clearTimeout(memoTimerRef.current);
    memoTimerRef.current = setTimeout(async () => {
      try {
        await updateProjectAction(project.project_id, { memo: newMemo });
      } catch (e) {
        console.error('Memo auto-save failed', e);
      }
    }, 1000);
  };

  // 作業日程・余白（バッファ）の調整ハンドラ (0ms即時反映)
  const handleSaveTaskSchedule = (scheduleId: string, updates: Partial<ScheduleItem>) => {
    const nextList = items.map(i => (i.schedule_id === scheduleId ? { ...i, ...updates } : i));
    const recalculated = recalculateSchedule(nextList, project.start_date);
    setItems(recalculated);
    setHasUnsavedChanges(true);
  };

  // 親階層（フォルダ）の紐付け変更（個別または一括移動・0ms即時反映）
  const handleChangeParent = (itemIds: string[], newParentId: string | null) => {
    const nextList = items.map(item => {
      if (itemIds.includes(item.schedule_id)) {
        return { ...item, parent_id: newParentId };
      }
      return item;
    });

    const recalculated = recalculateSchedule(nextList, project.start_date);
    setItems(recalculated);
    setHasUnsavedChanges(true);
  };

  // カレンダーガントバーのドラッグ＆ドロップ横移動ハンドラ (0ms即時反映)
  const handleDragMoveItem = (item: ScheduleItem, deltaDays: number) => {
    if (deltaDays === 0) return;
    try {
      const curStart = parseISO(item.start_date || project.start_date);
      const newStartDate = addDays(curStart, deltaDays);
      const newStartStr = format(newStartDate, 'yyyy-MM-dd');

      const nextList = items.map(i =>
        i.schedule_id === item.schedule_id
          ? { ...i, start_date: newStartStr, auto_schedule: false }
          : i
      );
      const recalculated = recalculateSchedule(nextList, project.start_date);
      setItems(recalculated);
      setHasUnsavedChanges(true);
    } catch (err: any) {
      console.error('Drag move failed', err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* 統合1行ヘッダーツールバー */}
      <GanttToolbar
        project={project}
        onAddCategory={() => {
          setEditingItem(null);
          setNewItemParentId(null);
          setNewItemType('category');
          setIsItemEditOpen(true);
        }}
        onOpenBulkAdd={() => setIsBulkAddOpen(true)}
        onOpenTodoList={() => setIsTodoListOpen(true)}
        onOpenExportPdf={() => setIsExportPdfOpen(true)}
        onScrollToToday={handleScrollToToday}
        dayCellWidth={dayCellWidth}
        setDayCellWidth={setDayCellWidth}
        borderStrength={borderStrength}
        setBorderStrength={setBorderStrength}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSaveAll}
        uncompletedTodoCount={todos.filter(t => t.status === 'open').length}
        calendarRange={activeRange}
        setCalendarRange={setCustomRange}
        onResetCalendarRange={() => setCustomRange(null)}
      />

      {/* ご要望対応: ヘッダーと工程の間にメモ・日程消化率サマリーバーを設置（スケジュール3行分相当・リサイズ可能） */}
      <GanttMemoSummaryBar
        project={project}
        startDate={activeRange.start}
        endDate={activeRange.end}
        memo={projectMemo}
        onMemoChange={handleProjectMemoChange}
        borderStrength={borderStrength}
      />

      {/* ガントチャートメインボディ（左ツリー固定 ＋ 右タイムライン横スクロール） */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側ツリー */}
        <div
          ref={leftTreeScrollRef}
          onScroll={handleLeftScroll}
          className="h-full overflow-y-auto shrink-0 bg-white"
        >
          <GanttLeftTree
            items={items}
            collapsedIds={collapsedIds}
            onToggleCollapse={handleToggleCollapse}
            onEditItem={item => {
              setEditingItem(item);
              setIsItemEditOpen(true);
            }}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onMoveItem={handleMoveItem}
            onAddItem={(parentId, type) => {
              setEditingItem(null);
              setNewItemParentId(parentId);
              setNewItemType(type);
              setIsItemEditOpen(true);
            }}
            onInsertItemAfter={handleInsertItemAfter}
            onChangeParent={handleChangeParent}
            onDurationChange={handleDurationChange}
            onNameChange={handleNameChange}
            onAssigneeChange={handleAssigneeChange}
            visibleItemIds={visibleItemIds}
            borderStrength={borderStrength}
            assigneeGroups={assigneeGroups}
            onAddTodoForAssignee={assignee => {
              setEditingTodo(null);
              setIsTodoEditOpen(true);
            }}
            onDeleteAssigneeTodos={handleDeleteAssigneeTodos}
          />
        </div>

        {/* 右側タイムライン（横スクロール可能） */}
        <div
          ref={timelineScrollRef}
          onScroll={handleTimelineScroll}
          className="flex-1 overflow-auto bg-slate-50/20"
        >
          {/* カレンダーヘッダー */}
          <GanttCalendarHeader
            calendarDays={calendarDays}
            monthGroups={monthGroups}
            dayCellWidth={dayCellWidth}
            borderStrength={borderStrength}
          />

          {/* ガントバー（折りたたみ時は横一列サマリー描画、最下部に担当者別TODO期日セルを描画、ドラッグ移動対応） */}
          <GanttTimeline
            items={items}
            calendarDays={calendarDays}
            dayCellWidth={dayCellWidth}
            visibleItemIds={visibleItemIds}
            collapsedIds={collapsedIds}
            onEditItem={item => {
              if (item.item_type === 'task') {
                setScheduleModalItem(item);
                setScheduleModalClickedDate(null);
                setIsScheduleModalOpen(true);
              } else {
                setEditingItem(item);
                setIsItemEditOpen(true);
              }
            }}
            onCellClick={(item, dateStr) => {
              setScheduleModalItem(item);
              setScheduleModalClickedDate(dateStr);
              setIsScheduleModalOpen(true);
            }}
            onDragMoveItem={handleDragMoveItem}
            borderStrength={borderStrength}
            assigneeGroups={assigneeGroups}
            onTodoClick={todo => {
              setEditingTodo(todo);
              setIsTodoEditOpen(true);
            }}
          />
        </div>
      </div>

      {/* 作業日程・余白（バッファ）調整モーダル */}
      <TaskScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setScheduleModalItem(null);
          setScheduleModalClickedDate(null);
        }}
        item={scheduleModalItem}
        clickedDateStr={scheduleModalClickedDate}
        onSave={handleSaveTaskSchedule}
      />

      {/* 各種モーダル */}
      <ItemEditModal
        isOpen={isItemEditOpen}
        onClose={() => {
          setIsItemEditOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSaveItem}
        initialData={editingItem}
        allItems={items}
        defaultParentId={newItemParentId}
        defaultType={newItemType}
      />

      <BulkAddModal
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        onSubmit={handleBulkAdd}
        projectId={project.project_id}
        allItems={items}
      />

      <TodoListModal
        isOpen={isTodoListOpen}
        onClose={() => setIsTodoListOpen(false)}
        todos={todos}
        projectId={project.project_id}
        onCreateTodo={handleCreateTodo}
        onUpdateTodo={handleUpdateTodo}
        onDeleteTodo={handleDeleteTodo}
      />

      <TodoEditModal
        isOpen={isTodoEditOpen}
        onClose={() => {
          setIsTodoEditOpen(false);
          setEditingTodo(null);
        }}
        onSubmit={async data => {
          if (editingTodo) {
            await handleUpdateTodo(editingTodo.todo_id, data);
          } else {
            await handleCreateTodo(data);
          }
        }}
        initialData={editingTodo}
        projectId={project.project_id}
      />

      <ExportPdfModal
        isOpen={isExportPdfOpen}
        onClose={() => setIsExportPdfOpen(false)}
        project={project}
        items={items}
        todos={todos}
        calendarDays={calendarDays}
      />

      <ConflictWarningModal
        isOpen={conflictModalOpen}
        onRefresh={() => {
          setConflictModalOpen(false);
          router.refresh();
        }}
        message={conflictMessage}
      />
    </div>
  );
}
