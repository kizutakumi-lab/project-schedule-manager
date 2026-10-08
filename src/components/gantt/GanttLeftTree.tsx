'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Layers,
  Check,
  PlusCircle,
  FolderInput,
  Folder,
  X,
} from 'lucide-react';
import { ScheduleItem, Todo } from '@/types';
import { GridBorderStrength } from './GanttCalendarHeader';

interface GanttLeftTreeProps {
  items: ScheduleItem[];
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  onEditItem: (item: ScheduleItem) => void;
  onDuplicateItem?: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem?: (id: string, direction: 'up' | 'down') => void;
  onAddItem: (parentId: string | null, type: 'category' | 'group' | 'task') => void;
  onInsertItemAfter: (item: ScheduleItem) => void;
  onChangeParent: (itemIds: string[], newParentId: string | null) => void;
  onDurationChange: (id: string, newDuration: number) => void;
  onNameChange: (id: string, newName: string) => void;
  onAssigneeChange: (id: string, newAssignee: string) => void;
  visibleItemIds: Set<string>;
  borderStrength: GridBorderStrength;
  assigneeGroups: [string, Todo[]][];
  onAddTodoForAssignee: (assignee: string) => void;
  onDeleteAssigneeTodos: (assignee: string) => void;
  onToggleParallel?: (id: string) => void;
  clientName?: string;
}

export function GanttLeftTree({
  items,
  collapsedIds,
  onToggleCollapse,
  onEditItem,
  onDeleteItem,
  onInsertItemAfter,
  onChangeParent,
  onDurationChange,
  onNameChange,
  onAssigneeChange,
  visibleItemIds,
  borderStrength,
  assigneeGroups,
  onAddTodoForAssignee,
  onDeleteAssigneeTodos,
  onToggleParallel,
  clientName = 'クライアント',
}: GanttLeftTreeProps) {
  // インライン編集中のID（name, assignee）
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');

  const [editingAssigneeId, setEditingAssigneeId] = useState<string | null>(null);
  const [editingAssigneeValue, setEditingAssigneeValue] = useState<string>('');

  // 複数行選択機能（ご要望: 親階層なしで作った行を一括でフォルダに紐付け）
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetParentForSelected, setTargetParentForSelected] = useState<string>('');

  // 個別行の親変更ポップアップ
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  // 罫線カラー
  const borderCol = {
    normal: 'border-slate-300',
    strong: 'border-slate-400',
    bold: 'border-slate-600',
  }[borderStrength];

  const dividerCol = {
    normal: 'border-slate-400',
    strong: 'border-slate-600',
    bold: 'border-slate-800',
  }[borderStrength];

  // 親になれる候補（大項目・中項目）
  const potentialParents = items.filter(
    i => i.item_type === 'category' || i.item_type === 'group'
  );

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

  // チェックボックス選択
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkMove = () => {
    if (selectedIds.size === 0) return;
    onChangeParent(Array.from(selectedIds), targetParentForSelected || null);
    setSelectedIds(new Set());
  };

  return (
    <div className={`w-[470px] shrink-0 border-r-2 ${dividerCol} bg-white select-none z-10 flex flex-col`}>
      {/* テーブルヘッダー（通常ヘッダー ＆ 一括移動アクションバー切り替え） */}
      {selectedIds.size > 0 ? (
        /* 一括移動バー（複数選択時） */
        <div className={`h-[70px] box-border border-b-2 ${borderCol} bg-blue-50 px-3 flex items-center justify-between text-xs animate-in fade-in duration-100`}>
          <div className="flex items-center space-x-2 truncate">
            <span className="font-bold text-blue-900 shrink-0">
              {selectedIds.size}件 選択中
            </span>
            <select
              value={targetParentForSelected}
              onChange={e => setTargetParentForSelected(e.target.value)}
              className="bg-white border border-blue-400 rounded-md px-2 py-1 text-xs text-slate-800 font-medium focus:outline-hidden max-w-[170px] truncate"
            >
              <option value="">📁 移動先: ルート(親なし)</option>
              {potentialParents.map(p => (
                <option key={p.schedule_id} value={p.schedule_id}>
                  {p.item_type === 'category' ? '📁 ' : '└ 📂 '} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={handleBulkMove}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-[11px] shadow-xs cursor-pointer"
            >
              移動
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-blue-100 cursor-pointer"
              title="選択解除"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* 通常ヘッダー */
        <div className={`h-[70px] box-border border-b-2 ${borderCol} bg-slate-100 flex items-center text-xs font-bold text-slate-800`}>
          <div className={`w-[220px] shrink-0 px-3 flex items-center space-x-1 border-r ${borderCol}`}>
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>工程・階層名（直接編集可）</span>
          </div>
          <div className={`w-[85px] shrink-0 text-center border-r ${borderCol}`}>担当者</div>
          <div className={`w-[65px] shrink-0 text-center border-r ${borderCol}`}>営業日数</div>
          <div className="w-[100px] shrink-0 text-center">操作</div>
        </div>
      )}

      {/* 各行 */}
      <div>
        {items.map(item => {
          if (!visibleItemIds.has(item.schedule_id)) {
            return null;
          }

          const isCollapsed = collapsedIds.has(item.schedule_id);
          const isCategory = item.item_type === 'category';
          const isGroup = item.item_type === 'group';
          const isTask = item.item_type === 'task';
          const isSelected = selectedIds.has(item.schedule_id);

          // インデント計算
          let paddingLeft = 6;
          if (isGroup) paddingLeft = 18;
          if (isTask) paddingLeft = 32;

          // 背景色 & 境界線スタイル
          let rowBg = isSelected ? 'bg-blue-50/90' : 'bg-white hover:bg-slate-50/90';
          let borderClass = `border-b ${borderCol}`;

          if (isCategory) {
            rowBg = isSelected ? 'bg-blue-100' : 'bg-slate-200/90 font-bold text-slate-900';
            borderClass = `border-t-2 border-t-slate-700 border-b ${borderCol}`;
          } else if (isGroup) {
            rowBg = isSelected ? 'bg-blue-50' : 'bg-slate-100/75 font-semibold text-slate-800';
          }

          return (
            <div
              key={item.schedule_id}
              className={`h-10 box-border flex items-center text-xs transition-colors group ${rowBg} ${borderClass}`}
            >
              {/* 1. 工程名（チェックボックス + 開閉アイコン + 直接インライン編集 + 並行バッジ） */}
              <div
                style={{ paddingLeft: `${paddingLeft}px` }}
                className={`w-[220px] shrink-0 flex items-center space-x-1.5 pr-2 h-full border-r ${borderCol}`}
              >
                {/* 選択チェックボックス（一括移動用） */}
                {isTask && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.schedule_id)}
                    className="w-3.5 h-3.5 rounded-xs text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                    title="チェックを入れて上部バーから親階層（フォルダ）へ一括移動"
                  />
                )}

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
                  !isTask && <span className="w-3 shrink-0 text-slate-400 text-center">・</span>
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
                  <div className="flex items-center space-x-1 truncate flex-1">
                    {item.is_parallel && (
                      <span className="shrink-0 px-1 py-0.2 bg-purple-100 text-purple-700 rounded text-[9px] font-bold border border-purple-200" title="並行作業工程">
                        並行
                      </span>
                    )}
                    <span
                      onClick={() => handleStartEditName(item)}
                      title="クリックして名前を直接変更"
                      className="truncate cursor-text hover:bg-amber-100/60 px-1 py-0.5 rounded-xs flex-1 transition-colors border border-transparent hover:border-amber-300"
                    >
                      {item.name}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. 担当者（直接インライン編集可能 ＋ クイック選択） */}
              <div className={`w-[85px] shrink-0 px-1 text-center border-r ${borderCol} h-full flex items-center justify-center relative`}>
                {editingAssigneeId === item.schedule_id ? (
                  <div className="relative w-full">
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
                    {/* クイック選択メニュー */}
                    <div className="absolute left-0 top-7 z-50 bg-white border border-slate-300 rounded shadow-md p-1 text-[10px] flex flex-col gap-1 w-24 text-left">
                      <button
                        type="button"
                        onMouseDown={() => {
                          onAssigneeChange(item.schedule_id, 'DLE');
                          setEditingAssigneeId(null);
                        }}
                        className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded cursor-pointer"
                      >
                        DLE
                      </button>
                      <button
                        type="button"
                        onMouseDown={() => {
                          onAssigneeChange(item.schedule_id, clientName);
                          setEditingAssigneeId(null);
                        }}
                        className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded cursor-pointer truncate"
                        title={clientName}
                      >
                        {clientName}
                      </button>
                    </div>
                  </div>
                ) : (
                  <span
                    onClick={() => handleStartEditAssignee(item)}
                    title="クリックして担当者を変更（DLE / クライアント）"
                    className="truncate block w-full cursor-text hover:bg-amber-100/60 px-1 py-0.5 rounded-xs text-[11px] text-slate-700 transition-colors border border-transparent hover:border-amber-300"
                  >
                    {item.assignee || '-'}
                  </span>
                )}
              </div>

              {/* 3. 営業日数 */}
              <div className={`w-[65px] shrink-0 flex items-center justify-center border-r ${borderCol} h-full`}>
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

              {/* 4. 操作: 「並行切替」＋「親階層へ移動」＋「直後へ挿入」＋「削除」 */}
              <div className="w-[100px] shrink-0 flex items-center justify-center space-x-1 h-full px-0.5 relative">
                {/* 並行切り替えボタン */}
                {isTask && onToggleParallel && (
                  <button
                    onClick={() => onToggleParallel(item.schedule_id)}
                    className={`px-1 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      item.is_parallel
                        ? 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200'
                        : 'text-slate-400 hover:text-purple-600 hover:bg-slate-100 border border-transparent'
                    }`}
                    title={item.is_parallel ? '並行作業中（クリックで通常直列に戻す）' : '直前の工程と並行作業にする'}
                  >
                    {item.is_parallel ? '並行' : '直列'}
                  </button>
                )}

                {/* 親階層移動ボタン（ご要望対応: 間違えて親なしで作った行を後からフォルダに紐付け） */}
                {isTask && (
                  <div className="relative">
                    <button
                      onClick={() => setMovingItemId(movingItemId === item.schedule_id ? null : item.schedule_id)}
                      className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xs cursor-pointer transition-colors"
                      title="親階層（フォルダ）へ移動・紐付け"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                    </button>

                    {/* 個別移動ミニポップオーバー */}
                    {movingItemId === item.schedule_id && (
                      <div className="absolute right-0 top-8 bg-white border border-slate-300 rounded-md shadow-xl p-2 w-48 z-40 text-left text-xs animate-in fade-in duration-75">
                        <div className="font-bold text-[11px] text-slate-800 mb-1 flex items-center justify-between">
                          <span>親階層へ紐付け</span>
                          <button
                            onClick={() => setMovingItemId(null)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1 max-h-40 overflow-y-auto pt-1">
                          <button
                            onClick={() => {
                              onChangeParent([item.schedule_id], null);
                              setMovingItemId(null);
                            }}
                            className={`w-full text-left px-2 py-1 rounded-xs hover:bg-slate-100 text-[11px] ${
                              !item.parent_id ? 'font-bold text-blue-600 bg-blue-50' : 'text-slate-700'
                            }`}
                          >
                            📁 (親なし・ルート)
                          </button>
                          {potentialParents.map(p => (
                            <button
                              key={p.schedule_id}
                              onClick={() => {
                                onChangeParent([item.schedule_id], p.schedule_id);
                                setMovingItemId(null);
                              }}
                              className={`w-full text-left px-2 py-1 rounded-xs hover:bg-slate-100 text-[11px] truncate ${
                                item.parent_id === p.schedule_id ? 'font-bold text-blue-600 bg-blue-50' : 'text-slate-700'
                              }`}
                            >
                              {p.item_type === 'category' ? '📁 ' : '└ 📂 '} {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 紐付けした次の行を直後に挿入するボタン */}
                <button
                  onClick={() => onInsertItemAfter(item)}
                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xs cursor-pointer transition-colors"
                  title="この直後に連動工程を挿入"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                </button>

                {/* 行削除ボタン */}
                <button
                  onClick={() => onDeleteItem(item.schedule_id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xs cursor-pointer transition-colors"
                  title="この行を削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* 担当者別 TODO セクション */}
        {assigneeGroups.length > 0 && (
          <>
            {/* TODOセクションヘッダー */}
            <div className={`h-8 box-border flex items-center px-3 text-xs font-bold text-slate-800 bg-slate-200/90 border-t-2 border-t-slate-700 border-b ${borderCol}`}>
              <div className="flex items-center space-x-1.5 flex-1">
                <span className="text-blue-600 font-extrabold">✓</span>
                <span>担当者別 TODO</span>
              </div>
              <span className="text-[10px] text-slate-600 font-semibold mr-1">
                {assigneeGroups.reduce((acc, [, list]) => acc + list.length, 0)} 件
              </span>
            </div>

            {/* 各担当者のTODO行 */}
            {assigneeGroups.map(([assignee, list]) => (
              <div
                key={assignee}
                className={`h-10 box-border flex items-center text-xs bg-slate-50/70 hover:bg-slate-100 transition-colors border-b ${borderCol}`}
              >
                {/* 工程名列: TODO: 担当者名 ＋ 氏名の横の削除マーク */}
                <div className={`w-[240px] shrink-0 pl-6 flex items-center justify-between space-x-1.5 truncate pr-2 font-medium text-slate-800 h-full border-r ${borderCol}`}>
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate">TODO: {assignee}</span>
                  </div>
                  <button
                    onClick={() => onDeleteAssigneeTodos(assignee)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xs cursor-pointer transition-colors shrink-0"
                    title={`${assignee} さんのTODOを削除`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 担当者列 */}
                <div className={`w-[90px] shrink-0 px-1 text-center text-[11px] text-slate-600 border-r ${borderCol} truncate h-full flex items-center justify-center`}>
                  {assignee}
                </div>

                {/* 件数列 */}
                <div className={`w-[70px] shrink-0 flex items-center justify-center border-r ${borderCol} h-full`}>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {list.length} 件
                  </span>
                </div>

                {/* 操作列: TODO追加ボタン */}
                <div className="w-[70px] shrink-0 flex items-center justify-center h-full px-1">
                  <button
                    onClick={() => onAddTodoForAssignee(assignee)}
                    className="inline-flex items-center justify-center space-x-0.5 px-2 py-1 text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xs border border-blue-200 cursor-pointer transition-colors shadow-2xs"
                    title={`${assignee} にTODOを追加`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>追加</span>
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
