'use client';

import React from 'react';
import { CalendarDay, MonthGroup } from '@/lib/date-utils';

export type GridBorderStrength = 'normal' | 'strong' | 'bold';

interface GanttCalendarHeaderProps {
  calendarDays: CalendarDay[];
  monthGroups: MonthGroup[];
  dayCellWidth: number;
  borderStrength: GridBorderStrength;
}

export function GanttCalendarHeader({
  calendarDays,
  monthGroups,
  dayCellWidth,
  borderStrength,
}: GanttCalendarHeaderProps) {
  // 罫線の濃さマッピング
  const borderCol = {
    normal: 'border-slate-300',
    strong: 'border-slate-400',
    bold: 'border-slate-600',
  }[borderStrength];

  const headerBorderCol = {
    normal: 'border-slate-400',
    strong: 'border-slate-500',
    bold: 'border-slate-700',
  }[borderStrength];

  const totalDays = calendarDays.length;
  const headerWidth = totalDays * dayCellWidth;

  return (
    <div
      style={{ width: `${headerWidth}px` }}
      className={`sticky top-0 z-20 bg-white border-b-2 ${headerBorderCol} shadow-xs select-none h-[70px] box-border`}
    >
      {/* 1行目: 年月 */}
      <div className={`flex border-b ${borderCol} bg-slate-100 text-xs font-bold text-slate-800 h-[26px] box-border`}>
        {monthGroups.map((group, idx) => (
          <div
            key={`${group.year}-${group.month}-${idx}`}
            style={{ width: `${group.daysCount * dayCellWidth}px` }}
            className={`px-2 flex items-center border-r ${borderCol} shrink-0 truncate`}
          >
            {group.label}
          </div>
        ))}
      </div>

      {/* 2行目: 日付 */}
      <div className={`flex border-b ${borderCol} bg-white text-[11px] font-semibold text-slate-800 h-[24px] box-border`}>
        {calendarDays.map(day => (
          <div
            key={day.dateStr}
            style={{ width: `${dayCellWidth}px` }}
            className={`flex items-center justify-center border-r ${borderCol} shrink-0 font-medium ${
              day.isWeekend || day.isHoliday ? 'bg-slate-200/70 text-slate-600' : ''
            } ${day.isToday ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}
            title={day.holidayName ? `${day.dateStr}: ${day.holidayName}` : day.dateStr}
          >
            {day.day}
          </div>
        ))}
      </div>

      {/* 3行目: 曜日 */}
      <div className="flex bg-slate-50 text-[10px] text-slate-600 h-[18px] box-border">
        {calendarDays.map(day => {
          let colorClass = 'text-slate-700';
          if (day.dayOfWeek === 0 || day.isHoliday) {
            colorClass = 'text-rose-600 font-bold bg-rose-100/60';
          } else if (day.dayOfWeek === 6) {
            colorClass = 'text-blue-600 font-bold bg-blue-100/60';
          }

          return (
            <div
              key={day.dateStr}
              style={{ width: `${dayCellWidth}px` }}
              className={`flex items-center justify-center border-r ${borderCol} shrink-0 ${colorClass}`}
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
