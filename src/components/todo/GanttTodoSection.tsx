'use client';

import React, { useMemo } from 'react';
import { CalendarDay } from '@/lib/date-utils';
import { Todo } from '@/types';
import { GridBorderStrength } from '../gantt/GanttCalendarHeader';

interface GanttTodoSectionProps {
  todos: Todo[];
  calendarDays: CalendarDay[];
  onTodoClick: (todo: Todo) => void;
  dayCellWidth: number;
  borderStrength: GridBorderStrength;
}

export function GanttTodoSection({
  todos,
  calendarDays,
  onTodoClick,
  dayCellWidth,
  borderStrength,
}: GanttTodoSectionProps) {
  // 担当者ごとにTODOをグループ化
  const assigneeGroups = useMemo(() => {
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

  if (assigneeGroups.length === 0) {
    return null;
  }

  const borderColClass = ({
    normal: 'border-slate-300',
    strong: 'border-slate-400',
    bold: 'border-slate-600',
  } as Record<GridBorderStrength, string>)[borderStrength];

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className={`border-t-4 border-slate-700 bg-slate-50/50`}>
      <div className={`bg-slate-200/90 px-4 py-1.5 border-b-2 ${borderColClass} text-[11px] font-bold text-slate-800 flex items-center justify-between`}>
        <div className="flex items-center space-x-2">
          <span>担当者別 TODO（期限カレンダー）</span>
          <span className="text-[10px] text-slate-600 font-normal">期日セルをクリックして編集</span>
        </div>
      </div>

      {assigneeGroups.map(([assignee, assigneeTodos]) => (
        <div key={assignee} className={`flex border-b ${borderColClass} text-xs hover:bg-slate-50/80 transition-colors`}>
          {/* 左側：担当者ヘッダー（左ツリーと同じ幅 520px） */}
          <div className={`w-[520px] shrink-0 px-4 py-2 border-r-2 ${borderColClass} bg-slate-100/60 flex items-center justify-between`}>
            <span className="font-bold text-slate-800 text-[11px]">
              TODO: {assignee}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
              {assigneeTodos.length} 件
            </span>
          </div>

          {/* 右側：タイムライン日付セル */}
          <div className="flex relative">
            {calendarDays.map(day => {
              const dayTodos = assigneeTodos.filter(t => t.due_date === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  style={{ width: `${dayCellWidth}px` }}
                  className={`h-10 shrink-0 border-r ${borderColClass} flex items-center justify-center relative p-0.5 ${
                    day.isWeekend || day.isHoliday ? 'bg-slate-200/50' : ''
                  } ${day.isToday ? 'bg-blue-50/60' : ''}`}
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
                          badgeColor = 'bg-rose-600 text-white font-extrabold';
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
        </div>
      ))}
    </div>
  );
}
