'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Layers,
  FolderPlus,
  FilePlus,
  Check,
} from 'lucide-react';
import { ScheduleItem, Todo } from '@/types';
import { GridBorderStrength } from './GanttCalendarHeader';

interface GanttLeftTreeProps {
  items: ScheduleItem[];
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  onEditItem: (item: ScheduleItem) => void;
  onDuplicateItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem: (id: string, direction: 'up' | 'down') => void;
  onAddItem: (parentId: string | null, type: 'category' | 'group' | 'task') => void;
  onDurationChange: (id: string, newDuration: number) => void;
  onNameChange: (id: string, newName: string) => void;
  onAssigneeChange: (id: string, newAssignee: string) => void;
  visibleItemIds: Set<string>;
  borderStrength: GridBorderStrength;
  assigneeGroups: [string, Todo[]][];
  onAddTodoForAssignee: (assignee: string) => void;
}

export function GanttLeftTree({
  items,
  collapsedIds,
  onToggleCollapse,
  onEditItem,
  onDuplicateItem,
  onDeleteItem,
  onMoveItem,
  onAddItem,
  onDurationChange,
  onNameChange,
  onAssigneeChange,
  visibleItemIds,
  borderStrength,
  assigneeGroups,
  onAddTodoForAssignee,
}: GanttLeftTreeProps) {
  // インライン編集中のID（name, assignee）
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');

  const [editingAssigneeId, setEditingAssigneeId] = useState<string | null>(null);
  const [editingAssigneeValue, setEditingAssigneeValue] = useState<string>('');

  // 罫線カラー
  const borderCol = {
    normal: 'border-slate-300',
    strong: 'border-slate-400',
    bold: 'border-slate-600',
  }[borderStrength];

  const handleStartEditName = (item: ScheduleItem) => {
    setEditingNameId(item.schedule_id);
    setEditingNameValue(item.name);
  };

  const handleFinishEditName = (id: string) => {
    if (editingNameId === id) {
      if (editingNameValue.trim()) {
        onNameChange(id, editingNameValue.trim());
      }
      setEditingNameId(null);
    }
  };

  const handleStartEditAssignee = (item: ScheduleItem) => {
    setEditingAssigneeId(item.schedule_id);
    setEditingAssigneeValue(item.assignee || '');
  };

  const handleFinishEditAssignee = (id: string) => {
    if (editingAssigneeId === id) {
      onAssigneeChange(id, editingAssigneeValue.trim());
      setEditingAssigneeId(null);
    }
  };

  return (
    <div className={`w-[440px] shrink-0 border-r-2 ${borderCol} bg-white select-none z-10 flex flex-col`}>
      {/* テーブルヘッダー（カレンダーヘッダーと高さを完全に揃える: h-[70px] box-border） */}
      <div className={`h-[70px] box-border border-b-2 ${borderCol} bg-slate-100 flex items-center text-xs font-bold text-slate-800 px-3`}>
        <div className="w-[240px] shrink-0 flex items-center space-x-1">
          <Layers className="w-3.5 h-3.5 text-slate-600" />
          <span>工程・階層名（直接編集可）</span>
        </div>
        <div className={`w-20 shrink-0 text-center border-l ${borderCol}`}>担当者</div>
        <div className={`w-16 shrink-0 text-center border-l ${borderCol}`}>営業日数</div>
        <div className={`w-14 shrink-0 text-center border-l ${borderCol}`}>操作</div>
      </div>

      {/* 各行（divide-yを排除し、右タイムラインと完全同一のh-10 border-bで同期） */}
      <div>
        {items.map((item, index) => {
          if (!visibleItemIds.has(item.schedule_id)) {
            return null;
          }

          const isCollapsed = collapsedIds.has(item.schedule_id);
          const isCategory = item.item_type === 'category';
          const isGroup = item.item_type === 'group';
          const isTask = item.item_type === 'task';

          // インデント計算
          let paddingLeft = 6;
          if (isGroup) paddingLeft = 18;
          if (isTask) paddingLeft = 32;

          // 背景色 & 境界線スタイル（左右で1pxのズレも出ないよう完全固定）
          let rowBg = 'bg-white hover:bg-slate-50/90';
          let borderClass = `border-b ${borderCol}`;

          if (isCategory) {
            rowBg = 'bg-slate-200/90 font-bold text-slate-900';
            borderClass = `border-t-2 border-t-slate-700 border-b ${borderCol}`;
          } else if (isGroup) {
            rowBg = 'bg-slate-100/75 font-semibold text-slate-800';
          }

          return (
            <div
              key={item.schedule_id}
              className={`h-10 box-border flex items-center px-2 text-xs transition-colors group ${rowBg} ${borderClass}`}
            >
              {/* 1. 工程名（直接表上でインライン編集可能） */}
              <div
                style={{ paddingLeft: `${paddingLeft}px` }}
                className="w-[240px] shrink-0 flex items-center space-x-1.5 pr-2"
              >
                {(isCategory || isGroup) ? (
                  <button
                    onClick={() => onToggleCollapse(item.schedule_id)}
                    className="p-0.5 text-slate-600 hover:text-slate-900 rounded-sm cursor-pointer shrink-0"
                    title={isCollapsed ? '展開する' : '折りたたむ'}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-blue-600 font-bold" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-700" />
                    )}
                  </button>
                ) : (
                  <span className="w-4 shrink-0 text-slate-400 text-center">・</span>
                )}

                {editingNameId === item.schedule_id ? (
                  <div className="flex items-center space-x-1 flex-1">
                    <input
                      type="text"
                      autoFocus
                      value={editingNameValue}
                      onChange={e => setEditingNameValue(e.target.value)}
                      onBlur={() => handleFinishEditName(item.schedule_id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleFinishEditName(item.schedule_id);
                        if (e.key === 'Escape') setEditingNameId(null);
                      }}
                      className="w-full px-1.5 py-0.5 text-xs border-2 border-blue-500 rounded-xs bg-white text-slate-900 focus:outline-hidden"
                    />
                    <button
                      onMouseDown={() => handleFinishEditName(item.schedule_id)}
                      className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span
                    onClick={() => handleStartEditName(item)}
                    title="クリックして名前を直接変更"
                    className="truncate cursor-text hover:bg-amber-100/60 px-1 py-0.5 rounded-xs flex-1 transition-colors border border-transparent hover:border-amber-300"
                  >
                    {item.name}
                  </span>
                )}
              </div>

              {/* 2. 担当者（直接インライン編集可能） */}
              <div className={`w-20 shrink-0 px-1 text-center border-l ${borderCol}`}>
                {editingAssigneeId === item.schedule_id ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingAssigneeValue}
                    onChange={e => setEditingAssigneeValue(e.target.value)}
                    onBlur={() => handleFinishEditAssignee(item.schedule_id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleFinishEditAssignee(item.schedule_id);
                      if (e.key === 'Escape') setEditingAssigneeId(null);
                    }}
                    className="w-full px-1 py-0.5 text-[11px] border border-blue-500 rounded-xs bg-white text-center focus:outline-hidden"
                  />
                ) : (
                  <span
                    onClick={() => handleStartEditAssignee(item)}
                    title="クリックして担当者を変更"
                    className="truncate block cursor-text hover:bg-amber-100/60 px-1 py-0.5 rounded-xs text-[11px] text-slate-700 transition-colors border border-transparent hover:border-amber-300"
                  >
                    {item.assignee || '-'}
                  </span>
                )}
              </div>

              {/* 3. 営業日数 */}
              <div className={`w-16 shrink-0 flex items-center justify-center border-l ${borderCol}`}>
                {isTask ? (
                  <div className="flex items-center space-x-0.5">
                    <input
                      type="number"
                      min="1"
                      value={item.duration_business_days || 1}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          onDurationChange(item.schedule_id, val);
                        }
                      }}
                      className="w-9 text-center py-0.5 px-0.5 border border-slate-300 group-hover:border-slate-400 rounded-xs text-[11px] bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">日</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {item.duration_business_days ? `${item.duration_business_days}日` : '-'}
                  </span>
                )}
              </div>

              {/* 4. 操作（ご要望通り削除ボタンのみ配置し、営業日数との重なりを完全排除） */}
              <div className={`w-14 shrink-0 flex items-center justify-center border-l ${borderCol}`}>
                <button
                  onClick={() => onDeleteItem(item.schedule_id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xs cursor-pointer transition-colors"
                  title="行を削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* 担当者別 TODO セクション（工程と同じテーブル形式で配置） */}
        {assigneeGroups.length > 0 && (
          <>
            {/* TODOセクションヘッダー（大項目と同じ太線スタイル、高さh-8固定） */}
            <div className={`h-8 box-border flex items-center px-3 text-xs font-bold text-slate-800 bg-slate-200/90 border-t-2 border-t-slate-700 border-b ${borderCol}`}>
              <div className="flex items-center space-x-1.5 flex-1">
                <span className="text-blue-600 font-extrabold">✓</span>
                <span>担当者別 TODO</span>
              </div>
              <span className="text-[10px] text-slate-500 font-normal">
                {assigneeGroups.reduce((acc, [, list]) => acc + list.length, 0)} 件
              </span>
            </div>

            {/* 各担当者のTODO行（工程と同じ高さh-10固定） */}
            {assigneeGroups.map(([assignee, list]) => (
              <div
                key={assignee}
                className={`h-10 box-border flex items-center px-2 text-xs bg-slate-50/70 hover:bg-slate-100 transition-colors border-b ${borderCol}`}
              >
                {/* 工程名列: TODO: 担当者名 */}
                <div className="w-[240px] shrink-0 pl-6 flex items-center space-x-1.5 truncate pr-2 font-medium text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="truncate">TODO: {assignee}</span>
                </div>

                {/* 担当者列 */}
                <div className={`w-20 shrink-0 px-1 text-center text-[11px] text-slate-600 border-l ${borderCol} truncate`}>
                  {assignee}
                </div>

                {/* 件数列 */}
                <div className={`w-16 shrink-0 flex items-center justify-center border-l ${borderCol}`}>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {list.length} 件
                  </span>
                </div>

                {/* 操作列: TODO追加ボタン */}
                <div className={`w-14 shrink-0 flex items-center justify-center border-l ${borderCol}`}>
                  <button
                    onClick={() => onAddTodoForAssignee(assignee)}
                    className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xs border border-blue-200 cursor-pointer transition-colors"
                    title={`${assignee} にTODOを追加`}
                  >
                    + 追加
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
