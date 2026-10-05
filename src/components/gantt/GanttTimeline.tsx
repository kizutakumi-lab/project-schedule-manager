'use client';

import React from 'react';
import { CalendarDay, getBarPosition, getTaskColorTheme } from '@/lib/date-utils';
import { ScheduleItem, Todo } from '@/types';
import { GridBorderStrength } from './GanttCalendarHeader';

interface GanttTimelineProps {
  items: ScheduleItem[];
  calendarDays: CalendarDay[];
  dayCellWidth: number;
  visibleItemIds: Set<string>;
  collapsedIds: Set<string>;
  onEditItem: (item: ScheduleItem) => void;
  borderStrength: GridBorderStrength;
  assigneeGroups: [string, Todo[]][];
  onTodoClick: (todo: Todo) => void;
}

export function GanttTimeline({
  items,
  calendarDays,
  dayCellWidth,
  visibleItemIds,
  collapsedIds,
  onEditItem,
  borderStrength,
  assigneeGroups,
  onTodoClick,
}: GanttTimelineProps) {
  if (calendarDays.length === 0) return null;

  const calendarStart = calendarDays[0].dateStr;
  const calendarEnd = calendarDays[calendarDays.length - 1].dateStr;
  const totalDays = calendarDays.length;
  const timelineWidth = totalDays * dayCellWidth;

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
    return tasks.sort((a, b) => a.sort_order - b.sort_order);
  };

  return (
    <div
      style={{ width: `${timelineWidth}px` }}
      className="relative select-none bg-white"
    >
      {/* 縦グリッド線レイヤー（土日祝日背景・今日のライン） */}
      <div className="absolute inset-0 flex pointer-events-none z-0">
        {calendarDays.map(day => (
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
        ))}
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

          let rowBgClass = 'h-10 relative flex items-center border-b ' + borderCol;
          if (isCategory) {
            rowBgClass += ' bg-slate-200/40 border-t-2 border-t-slate-700 font-bold';
          } else if (isGroup) {
            rowBgClass += ' bg-slate-100/35';
          }

          // 折りたたまれている親アイテムの場合：配下の子タスクを「横一列」に並べて描画！
          if ((isCategory || isGroup) && isCollapsed) {
            const childTasks = getDescendantTasks(item.schedule_id);

            return (
              <div key={item.schedule_id} className={rowBgClass}>
                {childTasks.map(task => {
                  const { leftIndex, span, isVisible } = getBarPosition(
                    task.start_date,
                    task.end_date,
                    calendarStart,
                    calendarEnd,
                    totalDays
                  );

                  if (!isVisible || leftIndex < 0) return null;

                  const colorTheme = getTaskColorTheme(task.name, task.item_type);

                  return (
                    <div
                      key={task.schedule_id}
                      style={{
                        left: `${leftIndex * dayCellWidth}px`,
                        width: `${span * dayCellWidth}px`,
                      }}
                      onClick={() => onEditItem(task)}
                      className={`absolute top-1.5 bottom-1.5 rounded-xs border shadow-2xs cursor-pointer flex items-center justify-between px-1.5 text-[10px] truncate transition-all hover:brightness-95 hover:z-20 group/bar ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
                      title={`[折りたたみサマリー] ${task.name} (${task.start_date} 〜 ${task.end_date} : ${task.duration_business_days}営業日)`}
                    >
                      <span className="truncate pr-0.5 font-medium">
                        {task.name}
                      </span>
                      {task.duration_business_days > 0 && span * dayCellWidth > 38 && (
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
          const { leftIndex, span, isVisible } = getBarPosition(
            item.start_date,
            item.end_date,
            calendarStart,
            calendarEnd,
            totalDays
          );

          const colorTheme = getTaskColorTheme(item.name, item.item_type);

          return (
            <div key={item.schedule_id} className={rowBgClass}>
              {isVisible && leftIndex >= 0 && (
                <div
                  style={{
                    left: `${leftIndex * dayCellWidth}px`,
                    width: `${span * dayCellWidth}px`,
                  }}
                  onClick={() => onEditItem(item)}
                  className={`absolute top-1.5 bottom-1.5 rounded-xs border shadow-2xs cursor-pointer flex items-center justify-between px-2 text-[11px] truncate transition-all hover:brightness-95 group/bar ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
                  title={`${item.name} (${item.start_date} 〜 ${item.end_date} : ${item.duration_business_days || 0}営業日)`}
                >
                  <span className="truncate pr-1 font-medium">
                    {item.name}
                  </span>
                  {item.duration_business_days > 0 && span * dayCellWidth > 45 && (
                    <span className="shrink-0 text-[10px] opacity-85">
                      {item.duration_business_days}日
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* 担当者別 TODO タイムライン（左ツリーのTODO行と完全に高さ・行揃え同期） */}
        {assigneeGroups.length > 0 && (
          <>
            {/* TODOセクションヘッダー行（h-8） */}
            <div className={`h-8 relative flex items-center bg-slate-200/90 border-t-2 border-t-slate-700 border-b ${borderCol}`}>
              <div className="px-3 text-[11px] font-semibold text-slate-600">
                期日カレンダー
              </div>
            </div>

            {/* 各担当者のTODO期日セル行（h-10） */}
            {assigneeGroups.map(([assignee, list]) => {
              const todayStr = new Date().toISOString().split('T')[0];

              return (
                <div
                  key={assignee}
                  className={`h-10 relative flex items-center border-b ${borderCol} bg-slate-50/40`}
                >
                  {calendarDays.map(day => {
                    const dayTodos = list.filter(t => t.due_date === day.dateStr);

                    return (
                      <div
                        key={day.dateStr}
                        style={{ width: `${dayCellWidth}px` }}
                        className="h-full shrink-0 flex items-center justify-center p-0.5"
                      >
                        {dayTodos.length > 0 && (
                          <div className="w-full flex flex-col gap-0.5 items-center justify-center">
                            {dayTodos.map(t => {
                              const isOverdue = t.status === 'open' && t.due_date < todayStr;
                              const isToday = t.status === 'open' && t.due_date === todayStr;
                              const isCompleted = t.status === 'completed';

                              let badgeColor = 'bg-blue-600 text-white font-bold';
                              if (isCompleted) {
                                badgeColor = 'bg-slate-200 text-slate-500 line-through';
                              } else if (isOverdue) {
                                badgeColor = 'bg-rose-600 text-white font-extrabold animate-pulse';
                              } else if (isToday) {
                                badgeColor = 'bg-amber-500 text-white font-extrabold';
                              }

                              return (
                                <button
                                  key={t.todo_id}
                                  onClick={() => onTodoClick(t)}
                                  title={`[${t.status === 'completed' ? '完了' : '未完了'}] ${t.title} (${t.due_date})`}
                                  className={`w-full max-w-[28px] truncate px-1 py-0.5 text-[9px] rounded-xs cursor-pointer text-center leading-none shadow-2xs hover:scale-110 transition-transform ${badgeColor}`}
                                >
                                  ✓
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
