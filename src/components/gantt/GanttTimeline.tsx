'use client';

import React, { useState } from 'react';
import { ScheduleItem, Todo } from '@/types';
import {
  CalendarDay,
  CalendarWeek,
  getBarPosition,
  getWeekBarPosition,
  getTaskColorTheme,
} from '@/lib/date-utils';
import { GridBorderStrength } from './GanttCalendarHeader';

interface GanttTimelineProps {
  viewMode?: 'day' | 'week';
  items: ScheduleItem[];
  calendarDays: CalendarDay[];
  dayCellWidth: number;
  calendarWeeks?: CalendarWeek[];
  weekCellWidth?: number;
  visibleItemIds: Set<string>;
  collapsedIds: Set<string>;
  onEditItem: (item: ScheduleItem) => void;
  borderStrength: GridBorderStrength;
  assigneeGroups: [string, Todo[]][];
  onTodoClick: (todo: Todo) => void;
  onCellClick?: (item: ScheduleItem, dateStr: string) => void;
  onDragMoveItem?: (item: ScheduleItem, deltaDays: number) => void;
}

export function GanttTimeline({
  viewMode = 'day',
  items,
  calendarDays,
  dayCellWidth,
  calendarWeeks = [],
  weekCellWidth = 48,
  visibleItemIds,
  collapsedIds,
  onEditItem,
  borderStrength,
  assigneeGroups,
  onTodoClick,
  onCellClick,
  onDragMoveItem,
}: GanttTimelineProps) {
  // ドラッグ＆ドロップ状態管理（日単位モード時）
  const [activeDrag, setActiveDrag] = useState<{
    itemId: string;
    startX: number;
    deltaDays: number;
    hasMoved: boolean;
  } | null>(null);

  if (viewMode === 'day' && calendarDays.length === 0) return null;
  if (viewMode === 'week' && calendarWeeks.length === 0) return null;

  const calendarStart = calendarDays[0]?.dateStr || '';
  const calendarEnd = calendarDays[calendarDays.length - 1]?.dateStr || '';
  const totalDays = calendarDays.length;

  const isWeekMode = viewMode === 'week';
  const currentCellWidth = isWeekMode ? weekCellWidth : dayCellWidth;
  const timelineWidth = isWeekMode
    ? calendarWeeks.length * weekCellWidth
    : totalDays * dayCellWidth;

  // 罫線の濃さ
  const borderCol = {
    normal: 'border-slate-300',
    strong: 'border-slate-400',
    bold: 'border-slate-600',
  }[borderStrength];

  // 全アイテムマップ
  const itemMap = new Map<string, ScheduleItem>();
  for (const item of items) {
    itemMap.set(item.schedule_id, item);
  }

  // 指定した親アイテム配下の子孫タスク群を取得するヘルパー
  const getDescendantTasks = (parentId: string): ScheduleItem[] => {
    const tasks: ScheduleItem[] = [];
    const directChildren = items.filter(i => i.parent_id === parentId);
    for (const child of directChildren) {
      if (child.item_type === 'task') {
        tasks.push(child);
      } else {
        tasks.push(...getDescendantTasks(child.schedule_id));
      }
    }
    return tasks;
  };

  // ドラッグ開始ハンドラ（日単位モードのみドラッグ移動有効）
  const handleBarMouseDown = (e: React.MouseEvent, item: ScheduleItem) => {
    e.stopPropagation();
    if (isWeekMode || item.item_type !== 'task') {
      onEditItem(item);
      return;
    }

    const startX = e.clientX;
    let hasMoved = false;
    let currentDelta = 0;

    setActiveDrag({
      itemId: item.schedule_id,
      startX,
      deltaDays: 0,
      hasMoved: false,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diffX = moveEvent.clientX - startX;
      if (Math.abs(diffX) > 4) {
        hasMoved = true;
      }
      currentDelta = Math.round(diffX / dayCellWidth);
      setActiveDrag({
        itemId: item.schedule_id,
        startX,
        deltaDays: currentDelta,
        hasMoved,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setActiveDrag(null);

      if (hasMoved && currentDelta !== 0 && onDragMoveItem) {
        onDragMoveItem(item, currentDelta);
      } else if (!hasMoved) {
        onEditItem(item);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      style={{ width: `${timelineWidth}px` }}
      className="relative select-none"
    >
      {/* 背景グリッド縦線 */}
      <div className="absolute inset-0 flex pointer-events-none">
        {isWeekMode ? (
          /* 週単位の背景グリッド */
          calendarWeeks.map(week => {
            const isCurrentWeek = week.startDateStr <= todayStr && todayStr <= week.endDateStr;
            return (
              <div
                key={week.weekIndex}
                style={{ width: `${weekCellWidth}px` }}
                className={`h-full border-r ${borderCol} shrink-0 ${
                  isCurrentWeek ? 'bg-blue-50/60' : ''
                }`}
              >
                {isCurrentWeek && (
                  <div className="w-[2px] h-full bg-blue-600 mx-auto opacity-80" />
                )}
              </div>
            );
          })
        ) : (
          /* 日単位の背景グリッド */
          calendarDays.map(day => (
            <div
              key={day.dateStr}
              style={{ width: `${dayCellWidth}px` }}
              className={`h-full border-r ${borderCol} shrink-0 ${
                day.isWeekend || day.isHoliday ? 'bg-slate-200/50' : ''
              } ${day.isToday ? 'bg-blue-50/60' : ''}`}
            >
              {day.isToday && (
                <div className="w-[2px] h-full bg-blue-600 mx-auto opacity-80" />
              )}
            </div>
          ))
        )}
      </div>

      {/* 各行のタスクバー描画レイヤー */}
      <div className="relative z-10">
        {items.map(item => {
          if (!visibleItemIds.has(item.schedule_id)) {
            return null;
          }

          const isCollapsed = collapsedIds.has(item.schedule_id);
          const isCategory = item.item_type === 'category';
          const isGroup = item.item_type === 'group';

          let rowBgClass = `h-10 box-border relative flex items-center border-b ${borderCol}`;
          if (isCategory) {
            rowBgClass += ' bg-slate-200/40 border-t-2 border-t-slate-700 font-bold';
          } else if (isGroup) {
            rowBgClass += ' bg-slate-100/35';
          }

          // 折りたたまれている親アイテムの場合：配下の子タスクを「横一列」に並べて描画
          if ((isCategory || isGroup) && isCollapsed) {
            const childTasks = getDescendantTasks(item.schedule_id);

            return (
              <div key={item.schedule_id} className={rowBgClass}>
                {childTasks.map(task => {
                  const { leftIndex, span, isVisible } = isWeekMode
                    ? getWeekBarPosition(task.start_date, task.end_date, calendarWeeks)
                    : getBarPosition(task.start_date, task.end_date, calendarStart, calendarEnd, totalDays);

                  if (!isVisible || leftIndex < 0) return null;

                  const colorTheme = getTaskColorTheme(task.name, task.item_type);

                  return (
                    <div
                      key={task.schedule_id}
                      style={{
                        left: `${leftIndex * currentCellWidth}px`,
                        width: `${span * currentCellWidth}px`,
                      }}
                      onClick={() => onEditItem(task)}
                      className={`absolute top-1.5 bottom-1.5 rounded-xs border shadow-2xs cursor-pointer flex items-center justify-between px-1.5 text-[10px] truncate transition-all hover:brightness-95 hover:z-20 group/bar ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
                      title={`[折りたたみサマリー] ${task.name} (${task.start_date} 〜 ${task.end_date} : ${task.duration_business_days}営業日)`}
                    >
                      <span className="truncate pr-0.5 font-medium">
                        {task.name}
                      </span>
                      {task.duration_business_days > 0 && span * currentCellWidth > 38 && (
                        <span className="shrink-0 text-[9px] opacity-80">
                          {task.duration_business_days}d
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          // 通常行の描画
          const { leftIndex, span, isVisible } = isWeekMode
            ? getWeekBarPosition(item.start_date, item.end_date, calendarWeeks)
            : getBarPosition(item.start_date, item.end_date, calendarStart, calendarEnd, totalDays);

          const colorTheme = getTaskColorTheme(item.name, item.item_type);
          const isDraggingThis = activeDrag?.itemId === item.schedule_id;
          const currentLeft = (leftIndex + (isDraggingThis ? activeDrag.deltaDays : 0)) * currentCellWidth;

          return (
            <div key={item.schedule_id} className={rowBgClass}>
              {/* 各日付セルのクリック領域（特定日付または特定週をクリックして作業IN日に設定） */}
              {onCellClick && item.item_type === 'task' && !activeDrag && (
                <div className="absolute inset-0 flex pointer-events-auto">
                  {isWeekMode
                    ? calendarWeeks.map(week => (
                        <div
                          key={week.weekIndex}
                          style={{ width: `${weekCellWidth}px` }}
                          onClick={() => onCellClick(item, week.startDateStr)}
                          className="h-full shrink-0 hover:bg-blue-100/40 cursor-pointer transition-colors"
                          title={`${item.name}: ${week.label}（${week.startDateStr}）を作業IN日に指定`}
                        />
                      ))
                    : calendarDays.map(day => (
                        <div
                          key={day.dateStr}
                          style={{ width: `${dayCellWidth}px` }}
                          onClick={() => onCellClick(item, day.dateStr)}
                          className="h-full shrink-0 hover:bg-blue-100/40 cursor-pointer transition-colors"
                          title={`${item.name}: ${day.dateStr} を作業IN日に指定`}
                        />
                      ))}
                </div>
              )}

              {/* ガントバー（ドラッグ＆ドロップで横移動可能 ＆ クリックで日程調整） */}
              {isVisible && leftIndex >= 0 && (
                <div
                  style={{
                    left: `${currentLeft}px`,
                    width: `${span * currentCellWidth}px`,
                  }}
                  onMouseDown={(e) => handleBarMouseDown(e, item)}
                  className={`absolute top-1.5 bottom-1.5 rounded-xs border shadow-2xs flex items-center justify-between px-2 text-[11px] truncate transition-all group/bar z-10 ${
                    isDraggingThis
                      ? 'opacity-80 ring-2 ring-blue-500 z-30 cursor-grabbing'
                      : isWeekMode
                      ? 'cursor-pointer hover:brightness-95 hover:z-20'
                      : 'cursor-grab active:cursor-grabbing hover:brightness-95 hover:z-20'
                  } ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
                  title={`${item.name} (${item.start_date} 〜 ${item.end_date} : ${item.duration_business_days}営業日) ${
                    item.is_parallel ? '【並行作業】' : ''
                  }`}
                >
                  <div className="flex items-center space-x-1 truncate font-medium">
                    {item.is_parallel && (
                      <span className="shrink-0 px-1 py-0.2 bg-purple-600 text-white rounded text-[8px] font-bold">
                        並行
                      </span>
                    )}
                    <span className="truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-1 text-[10px] opacity-90 font-mono">
                    {item.duration_business_days > 0 && span * currentCellWidth > 45 && (
                      <span>{item.duration_business_days}d</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 担当者別TODO 期日カレンダー描画行 */}
      {assigneeGroups.length > 0 && (
        <div className="relative z-10">
          {assigneeGroups.map(([assignee, todoList]) => (
            <div
              key={assignee}
              className={`h-10 box-border relative flex items-center border-b ${borderCol} bg-slate-50/40`}
            >
              {todoList.map(todo => {
                const isCompleted = todo.status === 'completed';
                const { leftIndex, span, isVisible } = isWeekMode
                  ? getWeekBarPosition(todo.due_date, todo.due_date, calendarWeeks)
                  : getBarPosition(todo.due_date, todo.due_date, calendarStart, calendarEnd, totalDays);

                if (!isVisible || leftIndex < 0) return null;

                return (
                  <div
                    key={todo.todo_id}
                    style={{
                      left: `${leftIndex * currentCellWidth + 4}px`,
                    }}
                    onClick={() => onTodoClick(todo)}
                    className={`absolute top-2 bottom-2 z-20 cursor-pointer flex items-center px-1.5 rounded-sm border text-[10px] shadow-2xs transition-all hover:scale-105 ${
                      isCompleted
                        ? 'bg-slate-100 border-slate-300 text-slate-400 line-through'
                        : 'bg-emerald-500 border-emerald-600 text-white font-bold hover:bg-emerald-600'
                    }`}
                    title={`[TODO期日: ${todo.due_date}] ${todo.title} (${assignee})`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white mr-1 shrink-0" />
                    <span className="truncate max-w-[120px]">{todo.title}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
