'use client';

import React from 'react';
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
} from 'lucide-react';
import { ScheduleItem } from '@/types';

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
  visibleItemIds: Set<string>;
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
  visibleItemIds,
}: GanttLeftTreeProps) {
  return (
    <div className="w-[440px] shrink-0 border-r border-slate-300 bg-white select-none z-10 flex flex-col">
      {/* テーブルヘッダー（カレンダーヘッダーと高さを揃える: 7+6+5=18 tailwind h-[72px]） */}
      <div className="h-[72px] border-b border-slate-300 bg-slate-100 flex items-center text-xs font-bold text-slate-700 px-3">
        <div className="w-56 shrink-0 flex items-center space-x-1">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>工程・階層名</span>
        </div>
        <div className="w-20 shrink-0 text-center">担当者</div>
        <div className="w-16 shrink-0 text-center">営業日数</div>
        <div className="flex-1 text-right pr-1">操作</div>
      </div>

      {/* 各行 */}
      <div className="divide-y divide-slate-100">
        {items.map((item, index) => {
          if (!visibleItemIds.has(item.schedule_id)) {
            return null;
          }

          const isCollapsed = collapsedIds.has(item.schedule_id);
          const isCategory = item.item_type === 'category';
          const isGroup = item.item_type === 'group';
          const isTask = item.item_type === 'task';

          // インデント計算
          let paddingLeft = 8;
          if (isGroup) paddingLeft = 24;
          if (isTask) paddingLeft = 40;

          // 背景色スタイル（Excel風）
          let rowBg = 'bg-white hover:bg-slate-50';
          if (isCategory) {
            rowBg = 'bg-slate-200/90 font-bold text-slate-900 border-t border-slate-300';
          } else if (isGroup) {
            rowBg = 'bg-slate-100/70 font-semibold text-slate-800';
          }

          return (
            <div
              key={item.schedule_id}
              className={`h-10 flex items-center px-3 text-xs transition-colors group ${rowBg}`}
            >
              {/* 工程名・開閉アイコン */}
              <div
                style={{ paddingLeft: `${paddingLeft}px` }}
                className="w-56 shrink-0 flex items-center space-x-1.5 truncate pr-2"
              >
                {(isCategory || isGroup) && (
                  <button
                    onClick={() => onToggleCollapse(item.schedule_id)}
                    className="p-0.5 text-slate-500 hover:text-slate-800 rounded-sm cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                <span
                  onClick={() => onEditItem(item)}
                  title={item.name}
                  className={`truncate cursor-pointer hover:underline ${
                    isTask ? 'text-slate-700' : ''
                  }`}
                >
                  {item.name}
                </span>
              </div>

              {/* 担当者 */}
              <div className="w-20 shrink-0 text-center truncate text-[11px] text-slate-600 px-1">
                {item.assignee || '-'}
              </div>

              {/* 営業日数（タスクの場合は直接インライン変更可能） */}
              <div className="w-16 shrink-0 flex items-center justify-center">
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
                      className="w-10 text-center py-0.5 px-1 border border-slate-200 group-hover:border-slate-300 rounded-xs text-[11px] bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                    <span className="text-[10px] text-slate-400">日</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    {item.duration_business_days ? `${item.duration_business_days}日` : '-'}
                  </span>
                )}
              </div>

              {/* 操作ボタン群 */}
              <div className="flex-1 flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* 階層に応じた子要素追加 */}
                {isCategory && (
                  <button
                    onClick={() => onAddItem(item.schedule_id, 'group')}
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-300/50 rounded-xs cursor-pointer"
                    title="中項目を追加"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                )}
                {isGroup && (
                  <button
                    onClick={() => onAddItem(item.schedule_id, 'task')}
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-300/50 rounded-xs cursor-pointer"
                    title="タスクを追加"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* 上下並び替え */}
                <button
                  onClick={() => onMoveItem(item.schedule_id, 'up')}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                  title="上へ移動"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onMoveItem(item.schedule_id, 'down')}
                  disabled={index === items.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                  title="下へ移動"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>

                {/* 複製 */}
                <button
                  onClick={() => onDuplicateItem(item.schedule_id)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xs cursor-pointer"
                  title="複製"
                >
                  <Copy className="w-3 h-3" />
                </button>

                {/* 編集 */}
                <button
                  onClick={() => onEditItem(item)}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-200/50 rounded-xs cursor-pointer"
                  title="編集"
                >
                  <Edit2 className="w-3 h-3" />
                </button>

                {/* 削除 */}
                <button
                  onClick={() => onDeleteItem(item.schedule_id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-200/50 rounded-xs cursor-pointer"
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
