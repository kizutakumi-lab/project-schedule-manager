'use client';

import React, { useState, useMemo } from 'react';
import { X, Printer, LayoutGrid, Table, Calendar, Shrink, ZoomIn, ZoomOut } from 'lucide-react';
import { Project, ScheduleItem, Todo } from '@/types';
import {
  CalendarDay,
  getBarPosition,
  getTaskColorTheme,
  generateCalendarWeeks,
  groupWeeksByMonth,
  getWeekBarPosition,
  groupCalendarByMonth,
} from '@/lib/date-utils';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  items: ScheduleItem[];
  todos: Todo[];
  calendarDays: CalendarDay[];
}

export function ExportPdfModal({
  isOpen,
  onClose,
  project,
  items,
  todos,
  calendarDays,
}: ExportPdfModalProps) {
  // 出力モード: 'gantt' (ガントチャート) | 'table' (工程一覧表)
  const [exportMode, setExportMode] = useState<'gantt' | 'table'>('gantt');
  // 時間軸単位: 'week' (週単位・A4横圧縮) | 'day' (1日単位・詳細)
  const [timeUnit, setTimeUnit] = useState<'week' | 'day'>('week');
  // 日単位の場合のセル幅圧縮 (14px, 18px, 22px)
  const [dayCellWidth, setDayCellWidth] = useState<number>(16);

  const [showAssignee, setShowAssignee] = useState(false); // クライアント提出のためデフォルト非表示
  const [showTodos, setShowTodos] = useState(true);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  // カレンダー全期間
  const calendarStart = calendarDays[0]?.dateStr || project.start_date;
  const calendarEnd = calendarDays[calendarDays.length - 1]?.dateStr || project.end_date;

  // 週単位カレンダーデータ
  const calendarWeeks = useMemo(() => {
    return generateCalendarWeeks(calendarStart, calendarEnd);
  }, [calendarStart, calendarEnd]);

  const weekMonthGroups = useMemo(() => {
    return groupWeeksByMonth(calendarWeeks);
  }, [calendarWeeks]);

  const dayMonthGroups = useMemo(() => {
    return groupCalendarByMonth(calendarDays);
  }, [calendarDays]);

  // 週セル幅（A4横にスッキリ収まる約40px）
  const weekCellWidth = 42;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="no-print flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <span>進行管理表 PDF / A4横向き印刷</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              クライアント提出用・社内配布用のA4横向きレイアウト
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 出力設定バー */}
        <div className="no-print px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* モード切替 */}
            <div className="inline-flex rounded-md shadow-2xs border border-slate-300 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setExportMode('gantt')}
                className={`px-3 py-1 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                  exportMode === 'gantt'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>ガントチャート（右タブ含む）</span>
              </button>
              <button
                type="button"
                onClick={() => setExportMode('table')}
                className={`px-3 py-1 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                  exportMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>工程一覧表のみ</span>
              </button>
            </div>

            {/* ガントチャートモード時のみ: 時間軸（週単位 / 日単位）の選択（横幅圧縮の最重要機能！） */}
            {exportMode === 'gantt' && (
              <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-300 shadow-2xs">
                <Shrink className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-slate-800">時間軸:</span>
                <button
                  type="button"
                  onClick={() => setTimeUnit('week')}
                  className={`px-2 py-0.5 rounded-xs text-[11px] font-bold cursor-pointer transition-colors ${
                    timeUnit === 'week'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="1週間を1セルにまとめて横幅を大幅圧縮（A4横1枚に綺麗に収まります）"
                >
                  週単位（圧縮・推奨）
                </button>
                <button
                  type="button"
                  onClick={() => setTimeUnit('day')}
                  className={`px-2 py-0.5 rounded-xs text-[11px] font-medium cursor-pointer transition-colors ${
                    timeUnit === 'day'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="1日単位で詳細表示"
                >
                  日単位（詳細）
                </button>

                {timeUnit === 'day' && (
                  <div className="flex items-center space-x-1 pl-1 border-l border-slate-200">
                    <span className="text-[10px] text-slate-500">幅:</span>
                    <button
                      onClick={() => setDayCellWidth(14)}
                      className={`px-1.5 py-0.2 rounded-xs text-[10px] ${dayCellWidth === 14 ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
                    >
                      極小
                    </button>
                    <button
                      onClick={() => setDayCellWidth(18)}
                      className={`px-1.5 py-0.2 rounded-xs text-[10px] ${dayCellWidth === 18 ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
                    >
                      標準
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="h-4 w-px bg-slate-300" />

            <label className="flex items-center space-x-1.5 cursor-pointer select-none text-slate-700">
              <input
                type="checkbox"
                checked={showAssignee}
                onChange={e => setShowAssignee(e.target.checked)}
                className="rounded-xs text-blue-600 focus:ring-blue-500"
              />
              <span>担当者名を表示</span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer select-none text-slate-700">
              <input
                type="checkbox"
                checked={showTodos}
                onChange={e => setShowTodos(e.target.checked)}
                className="rounded-xs text-blue-600 focus:ring-blue-500"
              />
              <span>TODOを表示</span>
            </label>
          </div>

          <div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>A4横向きで印刷 / PDF保存</span>
            </button>
          </div>
        </div>

        {/* 印刷・プレビュー対象領域 */}
        <div className="flex-1 overflow-auto p-6 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            id="printable-schedule"
            className="bg-white p-6 rounded-lg shadow-sm border border-slate-300 mx-auto text-xs text-slate-800 print:border-none print:shadow-none print:p-0 print:max-w-none w-fit min-w-[920px]"
          >
            {/* 提出用ヘッダー */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {project.project_name} 進行管理表
                </h1>
                <div className="flex items-center space-x-4 text-[11px] text-slate-600 mt-0.5">
                  <span>クライアント: <strong>{project.client_name}</strong> 御中</span>
                  <span>案件期間: {project.start_date} 〜 {project.end_date}</span>
                  {exportMode === 'gantt' && (
                    <span className="text-slate-400">（タイムスケール: {timeUnit === 'week' ? '週単位圧縮版' : '日単位詳細版'}）</span>
                  )}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div>発行日: {todayStr}</div>
                {showAssignee && <div>案件担当: {project.owner}</div>}
              </div>
            </div>

            {/* モードA: ガントチャート（週単位圧縮 or 日単位） */}
            {exportMode === 'gantt' && (
              <div className="border border-slate-400 rounded-xs overflow-hidden mb-4">
                <div className="flex overflow-x-auto print:overflow-visible">
                  {/* 1. 左側: 工程一覧列 */}
                  <div className="shrink-0 border-r-2 border-slate-700 bg-white">
                    {/* 左側ヘッダー */}
                    <div className="h-[46px] border-b-2 border-slate-600 bg-slate-100 flex items-center text-[10px] font-bold text-slate-800">
                      <div className="w-[190px] px-2 border-r border-slate-300">工程・階層名</div>
                      {showAssignee && <div className="w-[65px] text-center border-r border-slate-300">担当</div>}
                      <div className="w-[45px] text-center">営業日</div>
                    </div>

                    {/* 各行 */}
                    {items.map(item => {
                      const isCat = item.item_type === 'category';
                      const isGrp = item.item_type === 'group';

                      let paddingLeft = 4;
                      if (isGrp) paddingLeft = 14;
                      if (item.item_type === 'task') paddingLeft = 24;

                      let bgClass = 'bg-white';
                      let borderClass = 'border-b border-slate-300';
                      if (isCat) {
                        bgClass = 'bg-slate-200/90 font-bold text-slate-900';
                        borderClass = 'border-t-2 border-t-slate-700 border-b border-slate-300';
                      } else if (isGrp) {
                        bgClass = 'bg-slate-100/80 font-semibold text-slate-800';
                      }

                      return (
                        <div
                          key={item.schedule_id}
                          className={`h-7 box-border flex items-center text-[10px] ${bgClass} ${borderClass}`}
                        >
                          <div
                            style={{ paddingLeft: `${paddingLeft}px` }}
                            className="w-[190px] shrink-0 truncate pr-1 border-r border-slate-300 h-full flex items-center"
                            title={item.name}
                          >
                            {isGrp && '└ '}
                            {item.item_type === 'task' && '・'}
                            {item.name}
                          </div>
                          {showAssignee && (
                            <div className="w-[65px] shrink-0 text-center truncate px-1 border-r border-slate-300 h-full flex items-center justify-center text-[9px] text-slate-600">
                              {item.assignee || '-'}
                            </div>
                          )}
                          <div className="w-[45px] shrink-0 text-center font-medium h-full flex items-center justify-center text-[9px]">
                            {item.duration_business_days ? `${item.duration_business_days}日` : '-'}
                          </div>
                        </div>
                      );
                    })}

                    {/* TODO行（左側） */}
                    {showTodos && todos.length > 0 && (
                      <>
                        <div className="h-6 border-t-2 border-t-slate-700 border-b border-slate-300 bg-slate-200 px-2 flex items-center font-bold text-[9px] text-slate-800">
                          ✓ 主要TODO
                        </div>
                        {Array.from(new Set(todos.map(t => t.assignee || '未設定'))).map(assignee => (
                          <div
                            key={assignee}
                            className="h-7 border-b border-slate-300 bg-slate-50 flex items-center text-[9px]"
                          >
                            <div className="w-[190px] px-3 font-semibold text-slate-800 truncate border-r border-slate-300 h-full flex items-center">
                              TODO: {assignee}
                            </div>
                            {showAssignee && (
                              <div className="w-[65px] text-center text-slate-500 border-r border-slate-300 h-full flex items-center justify-center">
                                {assignee}
                              </div>
                            )}
                            <div className="w-[45px] text-center text-slate-500 h-full flex items-center justify-center">
                              {todos.filter(t => (t.assignee || '未設定') === assignee).length}件
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* 2. 右側: カレンダー ＋ ガントバー */}
                  <div className="overflow-x-auto print:overflow-visible bg-white">
                    {/* A. 週単位モード（横幅大幅圧縮・A4横向き1枚に最適） */}
                    {timeUnit === 'week' ? (
                      <>
                        {/* 週カレンダーヘッダー */}
                        <div className="h-[46px] border-b-2 border-slate-600 select-none bg-slate-50">
                          {/* 1段目: 年月 */}
                          <div className="h-[22px] flex border-b border-slate-300 font-bold text-[9px] text-slate-800 bg-slate-100">
                            {weekMonthGroups.map((mg, idx) => (
                              <div
                                key={`${mg.year}-${mg.month}-${idx}`}
                                style={{ width: `${mg.daysCount * weekCellWidth}px` }}
                                className="px-1.5 flex items-center border-r border-slate-300 shrink-0 truncate"
                              >
                                {mg.label}
                              </div>
                            ))}
                          </div>
                          {/* 2段目: 各週の開始日（例: 4/7週） */}
                          <div className="h-[24px] flex font-semibold text-[8px] text-slate-600 bg-white">
                            {calendarWeeks.map(w => (
                              <div
                                key={w.startDateStr}
                                style={{ width: `${weekCellWidth}px` }}
                                className="shrink-0 flex items-center justify-center border-r border-slate-300"
                                title={`${w.startDateStr} 〜 ${w.endDateStr}`}
                              >
                                {w.label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 週単位タイムライン行 */}
                        <div className="relative">
                          {/* 縦グリッド */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {calendarWeeks.map(w => (
                              <div
                                key={w.startDateStr}
                                style={{ width: `${weekCellWidth}px` }}
                                className="h-full border-r border-slate-200 shrink-0"
                              />
                            ))}
                          </div>

                          {/* ガントバー（週単位位置） */}
                          <div className="relative z-10">
                            {items.map(item => {
                              const isCat = item.item_type === 'category';
                              const isGrp = item.item_type === 'group';

                              const { leftIndex, span, isVisible } = getWeekBarPosition(
                                item.start_date,
                                item.end_date,
                                calendarWeeks
                              );

                              const colorTheme = getTaskColorTheme(item.name, item.item_type);

                              let rowClass = 'h-7 box-border relative flex items-center border-b border-slate-300';
                              if (isCat) {
                                rowClass += ' bg-slate-200/40 border-t-2 border-t-slate-700 font-bold';
                              } else if (isGrp) {
                                rowClass += ' bg-slate-100/30';
                              }

                              return (
                                <div key={item.schedule_id} className={rowClass}>
                                  {isVisible && leftIndex >= 0 && (
                                    <div
                                      style={{
                                        left: `${leftIndex * weekCellWidth}px`,
                                        width: `${span * weekCellWidth}px`,
                                      }}
                                      className={`absolute top-1 bottom-1 rounded-xs border shadow-2xs flex items-center px-1 text-[8px] truncate ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
                                      title={`${item.name} (${item.start_date} 〜 ${item.end_date})`}
                                    >
                                      <span className="truncate">{item.name}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* 週単位 TODO行 */}
                            {showTodos && todos.length > 0 && (
                              <>
                                <div className="h-6 border-t-2 border-t-slate-700 border-b border-slate-300 bg-slate-200/80 px-2 flex items-center font-bold text-[9px] text-slate-600">
                                  期日週
                                </div>
                                {Array.from(new Set(todos.map(t => t.assignee || '未設定'))).map(assignee => {
                                  const assigneeTodos = todos.filter(t => (t.assignee || '未設定') === assignee);
                                  return (
                                    <div
                                      key={assignee}
                                      className="h-7 border-b border-slate-300 bg-slate-50/50 relative flex items-center"
                                    >
                                      {calendarWeeks.map(w => {
                                        // その週の期間内にあるTODOを抽出
                                        const match = assigneeTodos.filter(
                                          t => t.due_date >= w.startDateStr && t.due_date <= w.endDateStr
                                        );
                                        return (
                                          <div
                                            key={w.startDateStr}
                                            style={{ width: `${weekCellWidth}px` }}
                                            className="h-full shrink-0 flex items-center justify-center p-0.5"
                                          >
                                            {match.length > 0 && (
                                              <div
                                                className="w-full text-center py-0.5 rounded-xs bg-blue-600 text-white font-bold text-[8px]"
                                                title={match.map(m => m.title).join(', ')}
                                              >
                                                ✓ {match.length > 1 ? match.length : ''}
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
                      </>
                    ) : (
                      /* B. 日単位モード（詳細版） */
                      <>
                        {/* 日カレンダーヘッダー */}
                        <div className="h-[46px] border-b-2 border-slate-600 select-none bg-slate-50">
                          {/* 日付行 */}
                          <div className="h-[24px] flex border-b border-slate-300 font-bold text-[9px] text-slate-700">
                            {calendarDays.map(day => (
                              <div
                                key={day.dateStr}
                                style={{ width: `${dayCellWidth}px` }}
                                className={`shrink-0 flex items-center justify-center border-r border-slate-300 ${
                                  day.isWeekend || day.isHoliday ? 'bg-slate-200 text-slate-500' : ''
                                }`}
                              >
                                {day.day}
                              </div>
                            ))}
                          </div>
                          {/* 曜日行 */}
                          <div className="h-[20px] flex text-[8px] text-slate-500">
                            {calendarDays.map(day => {
                              let col = 'text-slate-600';
                              if (day.dayOfWeek === 0 || day.isHoliday) col = 'text-rose-600 font-bold bg-rose-50';
                              if (day.dayOfWeek === 6) col = 'text-blue-600 font-bold bg-blue-50';

                              return (
                                <div
                                  key={day.dateStr}
                                  style={{ width: `${dayCellWidth}px` }}
                                  className={`shrink-0 flex items-center justify-center border-r border-slate-300 ${col}`}
                                >
                                  {day.dayOfWeekStr}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 日単位タイムライン行 */}
                        <div className="relative">
                          {/* 背景グリッド縦線 */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {calendarDays.map(day => (
                              <div
                                key={day.dateStr}
                                style={{ width: `${dayCellWidth}px` }}
                                className={`h-full border-r border-slate-200 shrink-0 ${
                                  day.isWeekend || day.isHoliday ? 'bg-slate-100/70' : ''
                                }`}
                              />
                            ))}
                          </div>

                          {/* ガントバー */}
                          <div className="relative z-10">
                            {items.map(item => {
                              const isCat = item.item_type === 'category';
                              const isGrp = item.item_type === 'group';

                              const { leftIndex, span, isVisible } = getBarPosition(
                                item.start_date,
                                item.end_date,
                                calendarStart,
                                calendarEnd,
                                calendarDays.length
                              );

                              const colorTheme = getTaskColorTheme(item.name, item.item_type);

                              let rowClass = 'h-7 box-border relative flex items-center border-b border-slate-300';
                              if (isCat) {
                                rowClass += ' bg-slate-200/40 border-t-2 border-t-slate-700 font-bold';
                              } else if (isGrp) {
                                rowClass += ' bg-slate-100/30';
                              }

                              return (
                                <div key={item.schedule_id} className={rowClass}>
                                  {isVisible && leftIndex >= 0 && (
                                    <div
                                      style={{
                                        left: `${leftIndex * dayCellWidth}px`,
                                        width: `${span * dayCellWidth}px`,
                                      }}
                                      className={`absolute top-1 bottom-1 rounded-xs border shadow-2xs flex items-center px-1 text-[8px] truncate ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text}`}
                                    >
                                      <span className="truncate">{item.name}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* 日単位 TODO行 */}
                            {showTodos && todos.length > 0 && (
                              <>
                                <div className="h-6 border-t-2 border-t-slate-700 border-b border-slate-300 bg-slate-200/80 px-2 flex items-center font-bold text-[9px] text-slate-600">
                                  期日
                                </div>
                                {Array.from(new Set(todos.map(t => t.assignee || '未設定'))).map(assignee => {
                                  const assigneeTodos = todos.filter(t => (t.assignee || '未設定') === assignee);
                                  return (
                                    <div
                                      key={assignee}
                                      className="h-7 border-b border-slate-300 bg-slate-50/50 relative flex items-center"
                                    >
                                      {calendarDays.map(day => {
                                        const match = assigneeTodos.filter(t => t.due_date === day.dateStr);
                                        return (
                                          <div
                                            key={day.dateStr}
                                            style={{ width: `${dayCellWidth}px` }}
                                            className="h-full shrink-0 flex items-center justify-center p-0.5"
                                          >
                                            {match.length > 0 && (
                                              <div className="w-full text-center py-0.5 rounded-xs bg-blue-600 text-white font-bold text-[8px]">
                                                ✓
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* モードB: 工程一覧テーブル（テキストリスト） */}
            {exportMode === 'table' && (
              <div className="border border-slate-400 rounded-xs overflow-hidden mb-6">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-500 text-slate-700 font-bold">
                      <th className="p-2 border-r border-slate-300 w-16">種別</th>
                      <th className="p-2 border-r border-slate-300">工程名</th>
                      <th className="p-2 border-r border-slate-300 w-16 text-center">営業日数</th>
                      <th className="p-2 border-r border-slate-300 w-24 text-center">開始日</th>
                      <th className="p-2 border-r border-slate-300 w-24 text-center">終了予定日</th>
                      {showAssignee && (
                        <th className="p-2 border-r border-slate-300 w-24 text-center">担当</th>
                      )}
                      <th className="p-2">備考</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map(item => {
                      const isCat = item.item_type === 'category';
                      const isGrp = item.item_type === 'group';

                      return (
                        <tr
                          key={item.schedule_id}
                          className={
                            isCat
                              ? 'bg-slate-200/90 font-bold text-slate-900 border-t-2 border-slate-700'
                              : isGrp
                              ? 'bg-slate-50 font-semibold text-slate-800'
                              : ''
                          }
                        >
                          <td className="p-2 border-r border-slate-300 text-slate-500">
                            {isCat ? '大項目' : isGrp ? '中項目' : '工程'}
                          </td>
                          <td className="p-2 border-r border-slate-300">
                            <span
                              style={{
                                paddingLeft: isCat ? '0px' : isGrp ? '12px' : '24px',
                              }}
                            >
                              {isGrp && '└ '}
                              {item.item_type === 'task' && '・ '}
                              {item.name}
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center font-medium">
                            {item.duration_business_days ? `${item.duration_business_days}日` : '-'}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center text-slate-600">
                            {item.start_date || '-'}
                          </td>
                          <td className="p-2 border-r border-slate-300 text-center text-slate-600">
                            {item.end_date || '-'}
                          </td>
                          {showAssignee && (
                            <td className="p-2 border-r border-slate-300 text-center text-slate-600">
                              {item.assignee || '-'}
                            </td>
                          )}
                          <td className="p-2 text-slate-500 truncate max-w-[150px]">
                            {item.memo || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
