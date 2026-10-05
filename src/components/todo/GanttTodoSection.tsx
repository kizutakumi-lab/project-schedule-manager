'use client';

import React, { useMemo } from 'react';
import { CalendarDay } from '@/lib/date-utils';
import { Todo } from '@/types';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface GanttTodoSectionProps {
  todos: Todo[];
  calendarDays: CalendarDay[];
  onTodoClick: (todo: Todo) => void;
  dayCellWidth: number;
}

export function GanttTodoSection({
  todos,
  calendarDays,
  onTodoClick,
  dayCellWidth,
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

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="border-t-2 border-slate-300 bg-slate-50/50">
      <div className="bg-slate-100/80 px-4 py-1.5 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
        <span>担当者別 TODO（期限カレンダー）</span>
        <span className="text-[10px] text-slate-500 font-normal">期日セルをクリックして編集</span>
      </div>

      {assigneeGroups.map(([assignee, assigneeTodos]) => (
        <div key={assignee} className="flex border-b border-slate-200 text-xs hover:bg-slate-50/80 transition-colors">
          {/* 左側：担当者ヘッダー */}
          <div className="w-[380px] shrink-0 px-4 py-2 border-r border-slate-200 bg-slate-50/40 flex items-center justify-between">
            <span className="font-semibold text-slate-800 text-[11px]">
              TODO: {assignee}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600 font-medium">
              {assigneeTodos.length} 件
            </span>
          </div>

          {/* 右側：タイムライン日付セル */}
          <div className="flex relative">
            {calendarDays.map(day => {
              // この日のTODOを抽出
              const dayTodos = assigneeTodos.filter(t => t.due_date === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  style={{ width: `${dayCellWidth}px` }}
                  className={`h-9 shrink-0 border-r border-slate-100 flex items-center justify-center relative p-0.5 ${
                    day.isWeekend || day.isHoliday ? 'bg-slate-100/70' : ''
                  } ${day.isToday ? 'bg-blue-50/50' : ''}`}
                >
                  {dayTodos.length > 0 && (
                    <div className="w-full flex flex-col gap-0.5 items-center justify-center">
                      {dayTodos.map(t => {
                        const isOverdue = t.status === 'open' && t.due_date < todayStr;
                        const isToday = t.status === 'open' && t.due_date === todayStr;
                        const isCompleted = t.status === 'completed';

                        let badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
                        if (isCompleted) {
                          badgeColor = 'bg-slate-100 text-slate-400 border-slate-300 line-through';
                        } else if (isOverdue) {
                          badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                        } else if (isToday) {
                          badgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                        }

                        return (
                          <button
                            key={t.todo_id}
                            onClick={() => onTodoClick(t)}
                            title={`[${t.status === 'completed' ? '完了' : '未完了'}] ${t.title} (${t.due_date})`}
                            className={`w-full max-w-[28px] truncate px-1 py-0.5 text-[9px] rounded-xs border cursor-pointer text-center leading-none shadow-2xs hover:scale-105 transition-transform ${badgeColor}`}
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
