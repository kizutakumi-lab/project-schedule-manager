'use client';

import React from 'react';
import { CalendarDay, getBarPosition, getTaskColorTheme } from '@/lib/date-utils';
import { ScheduleItem } from '@/types';

interface GanttTimelineProps {
  items: ScheduleItem[];
  calendarDays: CalendarDay[];
  dayCellWidth: number;
  visibleItemIds: Set<string>;
  onEditItem: (item: ScheduleItem) => void;
}

export function GanttTimeline({
  items,
  calendarDays,
  dayCellWidth,
  visibleItemIds,
  onEditItem,
}: GanttTimelineProps) {
  if (calendarDays.length === 0) return null;

  const calendarStart = calendarDays[0].dateStr;
  const calendarEnd = calendarDays[calendarDays.length - 1].dateStr;
  const totalDays = calendarDays.length;
  const timelineWidth = totalDays * dayCellWidth;

  return (
    <div
      style={{ width: `${timelineWidth}px` }}
      className="relative divide-y divide-slate-100 select-none bg-white"
    >
      {/* 土日祝日・今日の縦グリッド背景レイヤー */}
      <div className="absolute inset-0 flex pointer-events-none z-0">
        {calendarDays.map(day => (
          <div
            key={day.dateStr}
            style={{ width: `${dayCellWidth}px` }}
            className={`h-full border-r border-slate-100 shrink-0 ${
              day.isWeekend || day.isHoliday ? 'bg-slate-100/60' : ''
            } ${day.isToday ? 'bg-blue-50/50' : ''}`}
          >
            {day.isToday && (
              <div className="w-[2px] h-full bg-blue-500 mx-auto opacity-70" />
            )}
          </div>
        ))}
      </div>

      {/* 各行のタスクバー描画レイヤー */}
      {items.map(item => {
        if (!visibleItemIds.has(item.schedule_id)) {
          return null;
        }

        const isCategory = item.item_type === 'category';
        const isGroup = item.item_type === 'group';

        const { leftIndex, span, isVisible } = getBarPosition(
          item.start_date,
          item.end_date,
          calendarStart,
          calendarEnd,
          totalDays
        );

        const colorTheme = getTaskColorTheme(item.name, item.item_type);

        let rowBgClass = 'h-10 relative flex items-center z-10';
        if (isCategory) {
          rowBgClass += ' bg-slate-200/20';
        } else if (isGroup) {
          rowBgClass += ' bg-slate-100/20';
        }

        return (
          <div key={item.schedule_id} className={rowBgClass}>
            {isVisible && leftIndex >= 0 && (
              <div
                style={{
                  left: `${leftIndex * dayCellWidth}px`,
                  width: `${span * dayCellWidth}px`,
                }}
                onClick={() => onEditItem(item)}
                className={`absolute top-1.5 bottom-1.5 rounded-sm border shadow-2xs cursor-pointer flex items-center justify-between px-2 text-[11px] truncate transition-all hover:brightness-95 hover:shadow-xs group/bar ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
                title={`${item.name} (${item.start_date} 〜 ${item.end_date} : ${item.duration_business_days || 0}営業日)`}
              >
                <span className="truncate pr-1 font-medium">
                  {item.name}
                </span>
                {item.duration_business_days > 0 && span * dayCellWidth > 45 && (
                  <span className="shrink-0 text-[10px] opacity-80">
                    {item.duration_business_days}日
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
