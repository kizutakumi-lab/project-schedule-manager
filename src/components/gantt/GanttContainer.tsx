'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Project, ScheduleItem, Todo, ScheduleItemType } from '@/types';
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
import { ItemEditModal } from './ItemEditModal';
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

  // カレンダー日付の範囲を算出
  const calendarDays = useMemo(() => {
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
  }, [project, items, todos]);

  const monthGroups = useMemo(() => {
    return groupCalendarByMonth(calendarDays);
  }, [calendarDays]);

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

  // 営業日数のインライン変更ハンドラ
  const handleDurationChange = async (itemId: string, newDuration: number) => {
    const updatedItems = items.map(item =>
      item.schedule_id === itemId
        ? { ...item, duration_business_days: newDuration }
        : item
    );
    const recalculated = recalculateSchedule(updatedItems, project.start_date);
    setItems(recalculated);

    try {
      setIsSaving(true);
      await updateMultipleScheduleItemsAction(project.project_id, recalculated);
    } catch (err: any) {
      console.error('Failed to save updated durations:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 工程名の直接インライン変更ハンドラ
  const handleNameChange = async (itemId: string, newName: string) => {
    const updatedItems = items.map(item =>
      item.schedule_id === itemId ? { ...item, name: newName } : item
    );
    setItems(updatedItems);

    try {
      setIsSaving(true);
      await updateScheduleItemAction(itemId, { name: newName });
    } catch (err: any) {
      console.error('Failed to save name:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 担当者の直接インライン変更ハンドラ
  const handleAssigneeChange = async (itemId: string, newAssignee: string) => {
    const updatedItems = items.map(item =>
      item.schedule_id === itemId ? { ...item, assignee: newAssignee } : item
    );
    setItems(updatedItems);

    try {
      setIsSaving(true);
      await updateScheduleItemAction(itemId, { assignee: newAssignee });
    } catch (err: any) {
      console.error('Failed to save assignee:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 工程の編集・新規作成ハンドラ（モーダル経由）
  const handleSaveItem = async (data: Partial<ScheduleItem>) => {
    setIsSaving(true);
    try {
      if (editingItem) {
        const res = await updateScheduleItemAction(
          editingItem.schedule_id,
          data,
          editingItem.updated_at
        );
        if (res.conflict) {
          setConflictMessage(res.message || '');
          setConflictModalOpen(true);
          return;
        }

        const updatedItems = items.map(i =>
          i.schedule_id === editingItem.schedule_id ? { ...i, ...data } : i
        );
        const recalculated = recalculateSchedule(updatedItems, project.start_date);
        setItems(recalculated);
      } else {
        const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) : 0;
        const newItem: Omit<ScheduleItem, 'created_at' | 'updated_at'> = {
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
        };

        await createScheduleItemAction(newItem);
        const nextList = [...items, newItem as ScheduleItem];
        const recalculated = recalculateSchedule(nextList, project.start_date);
        setItems(recalculated);
      }
    } catch (err: any) {
      alert('工程の保存に失敗しました: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 一括スケジュール入力ハンドラ
  const handleBulkAdd = async (bulkItems: Partial<ScheduleItem>[]) => {
    setIsSaving(true);
    try {
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
      }));

      await bulkCreateScheduleItemsAction(project.project_id, itemsToCreate);
      const nextList = [...items, ...(itemsToCreate as ScheduleItem[])];
      const recalculated = recalculateSchedule(nextList, project.start_date);
      setItems(recalculated);
    } catch (err: any) {
      alert('一括追加に失敗しました: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 工程の削除
  const handleDeleteItem = async (id: string) => {
    const item = items.find(i => i.schedule_id === id);
    if (!item) return;

    if (!confirm(`「${item.name}」を削除してもよろしいですか？`)) {
      return;
    }

    setIsSaving(true);
    try {
      await deleteScheduleItemAction(id, project.project_id);
      const nextList = items.filter(i => i.schedule_id !== id && i.parent_id !== id);
      const recalculated = recalculateSchedule(nextList, project.start_date);
      setItems(recalculated);
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 工程の複製
  const handleDuplicateItem = async (id: string) => {
    setIsSaving(true);
    try {
      const copy = await duplicateScheduleItemAction(id, project.project_id);
      if (copy) {
        const nextList = [...items, copy];
        const recalculated = recalculateSchedule(nextList, project.start_date);
        setItems(recalculated);
      }
    } catch (err: any) {
      alert('複製に失敗しました: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 並べ替え（上下）
  const handleMoveItem = async (id: string, direction: 'up' | 'down') => {
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

    setIsSaving(true);
    try {
      await updateMultipleScheduleItemsAction(project.project_id, recalculated);
    } finally {
      setIsSaving(false);
    }
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
        uncompletedTodoCount={todos.filter(t => t.status === 'open').length}
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

          {/* ガントバー（折りたたみ時は横一列サマリー描画、最下部に担当者別TODO期日セルを描画） */}
          <GanttTimeline
            items={items}
            calendarDays={calendarDays}
            dayCellWidth={dayCellWidth}
            visibleItemIds={visibleItemIds}
            collapsedIds={collapsedIds}
            onEditItem={item => {
              setEditingItem(item);
              setIsItemEditOpen(true);
            }}
            borderStrength={borderStrength}
            assigneeGroups={assigneeGroups}
            onTodoClick={todo => {
              setEditingTodo(todo);
              setIsTodoEditOpen(true);
            }}
          />
        </div>
      </div>

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
