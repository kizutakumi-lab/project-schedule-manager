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
import { ScheduleItem } from '@/types';
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
    <div className={`w-[520px] shrink-0 border-r-2 ${borderCol} bg-white select-none z-10 flex flex-col`}>
      {/* テーブルヘッダー（カレンダーヘッダーと高さを揃える: 24+24+20 = 68px） */}
      <div className={`h-[68px] border-b-2 ${borderCol} bg-slate-100 flex items-center text-xs font-bold text-slate-800 px-3`}>
        <div className="w-[230px] shrink-0 flex items-center space-x-1">
          <Layers className="w-3.5 h-3.5 text-slate-600" />
          <span>工程・階層名（直接編集可）</span>
        </div>
        <div className="w-24 shrink-0 text-center border-l border-slate-300">担当者</div>
        <div className="w-16 shrink-0 text-center border-l border-slate-300">営業日数</div>
        <div className="w-28 shrink-0 text-center border-l border-slate-300">操作</div>
      </div>

      {/* 各行 */}
      <div className="divide-y divide-slate-200">
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
          if (isGroup) paddingLeft = 20;
          if (isTask) paddingLeft = 36;

          // 背景色 & 境界線スタイル
          let rowBg = 'bg-white hover:bg-slate-50/90';
          let borderTopClass = `border-b ${borderCol}`;

          if (isCategory) {
            // 要件: 特に大項目の上には太線を入れて区切って見えるように
            rowBg = 'bg-slate-200/90 font-bold text-slate-900';
            borderTopClass = `border-t-2 border-t-slate-700 border-b ${borderCol}`;
          } else if (isGroup) {
            rowBg = 'bg-slate-100/75 font-semibold text-slate-800';
          }

          return (
            <div
              key={item.schedule_id}
              className={`h-10 flex items-center px-2 text-xs transition-colors group ${rowBg} ${borderTopClass}`}
            >
              {/* 1. 工程名（直接表上でインライン編集可能） */}
              <div
                style={{ paddingLeft: `${paddingLeft}px` }}
                className="w-[230px] shrink-0 flex items-center space-x-1.5 pr-2"
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
              <div className={`w-24 shrink-0 px-1 text-center border-l ${borderCol}`}>
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

              {/* 4. 操作ボタン群（右側に埋もれない固定幅エリア w-28） */}
              <div className={`w-28 shrink-0 flex items-center justify-center space-x-1 border-l ${borderCol} px-1`}>
                {/* 階層に応じた子要素追加 */}
                {isCategory && (
                  <button
                    onClick={() => onAddItem(item.schedule_id, 'group')}
                    className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-300/60 rounded-xs cursor-pointer"
                    title="中項目を追加"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                )}
                {isGroup && (
                  <button
                    onClick={() => onAddItem(item.schedule_id, 'task')}
                    className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-300/60 rounded-xs cursor-pointer"
                    title="タスクを追加"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* 上下並び替え */}
                <button
                  onClick={() => onMoveItem(item.schedule_id, 'up')}
                  disabled={index === 0}
                  className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-20 cursor-pointer"
                  title="上へ移動"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onMoveItem(item.schedule_id, 'down')}
                  disabled={index === items.length - 1}
                  className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-20 cursor-pointer"
                  title="下へ移動"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>

                {/* 複製 */}
                <button
                  onClick={() => onDuplicateItem(item.schedule_id)}
                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xs cursor-pointer"
                  title="複製"
                >
                  <Copy className="w-3 h-3" />
                </button>

                {/* 詳細モーダル編集 */}
                <button
                  onClick={() => onEditItem(item)}
                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200 rounded-xs cursor-pointer"
                  title="詳細設定モーダルを開く"
                >
                  <Edit2 className="w-3 h-3" />
                </button>

                {/* 削除 */}
                <button
                  onClick={() => onDeleteItem(item.schedule_id)}
                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-100 rounded-xs cursor-pointer"
                  title="削除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
