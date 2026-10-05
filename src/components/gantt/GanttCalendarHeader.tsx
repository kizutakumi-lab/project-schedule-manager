'use client';

import React from 'react';
import { CalendarDay, MonthGroup } from '@/lib/date-utils';

interface GanttCalendarHeaderProps {
  calendarDays: CalendarDay[];
  monthGroups: MonthGroup[];
  dayCellWidth: number;
}

export function GanttCalendarHeader({
  calendarDays,
  monthGroups,
  dayCellWidth,
}: GanttCalendarHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-300 shadow-2xs select-none">
      {/* 1行目: 年月 */}
      <div className="flex border-b border-slate-200 bg-slate-100/90 text-xs font-bold text-slate-800 h-7">
        {monthGroups.map((group, idx) => (
          <div
            key={`${group.year}-${group.month}-${idx}`}
            style={{ width: `${group.daysCount * dayCellWidth}px` }}
            className="px-2 flex items-center border-r border-slate-300 shrink-0 truncate"
          >
            {group.label}
          </div>
        ))}
      </div>

      {/* 2行目: 日付 */}
      <div className="flex border-b border-slate-200 bg-white text-[11px] font-semibold text-slate-700 h-6">
        {calendarDays.map(day => (
          <div
            key={day.dateStr}
            style={{ width: `${dayCellWidth}px` }}
            className={`flex items-center justify-center border-r border-slate-200 shrink-0 ${
              day.isWeekend || day.isHoliday ? 'bg-slate-100 text-slate-400' : ''
            } ${day.isToday ? 'bg-blue-100 text-blue-800 font-bold' : ''}`}
            title={day.holidayName ? `${day.dateStr}: ${day.holidayName}` : day.dateStr}
          >
            {day.day}
          </div>
        ))}
      </div>

      {/* 3行目: 曜日 */}
      <div className="flex bg-slate-50 text-[10px] text-slate-500 h-5">
        {calendarDays.map(day => {
          let colorClass = 'text-slate-600';
          if (day.dayOfWeek === 0 || day.isHoliday) {
            colorClass = 'text-rose-600 font-bold bg-rose-50/50';
          } else if (day.dayOfWeek === 6) {
            colorClass = 'text-blue-600 font-bold bg-blue-50/40';
          }

          return (
            <div
              key={day.dateStr}
              style={{ width: `${dayCellWidth}px` }}
              className={`flex items-center justify-center border-r border-slate-200 shrink-0 ${colorClass}`}
              title={day.holidayName || undefined}
            >
              {day.dayOfWeekStr}
            </div>
          );
        })}
      </div>
    </div>
  );
}
