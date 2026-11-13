'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Printer,
  LayoutGrid,
  Table,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Maximize2,
  Info,
  Sparkles,
  Sliders,
  Calendar as CalendarIcon,
  Layers,
} from 'lucide-react';
import { Project, ScheduleItem, Todo } from '@/types';
import {
  CalendarDay,
  CalendarWeek,
  CalendarHalfWeek,
  getBarPosition,
  getWeekBarPosition,
  getHalfWeekBarPosition,
  getTaskColorTheme,
  generateCalendarWeeks,
  groupWeeksByMonth,
  generateCalendarHalfWeeks,
  groupHalfWeeksByMonth,
} from '@/lib/date-utils';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  items: ScheduleItem[];
  todos: Todo[];
  calendarDays: CalendarDay[];
  initialCollapsedIds?: Set<string>;
}

export function ExportPdfModal({
  isOpen,
  onClose,
  project,
  items,
  todos,
  calendarDays,
  initialCollapsedIds,
}: ExportPdfModalProps) {
  // 出力モード: 'gantt' (ガントチャート) | 'table' (工程一覧表)
  const [exportMode, setExportMode] = useState<'gantt' | 'table'>('gantt');
  // 用紙の向き: 'landscape' (A4横向き) | 'portrait' (A4縦向き)
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  // 時間軸単位: 'half-week' (1/2週・半週) | 'week' (週単位) | 'day' (1日単位)
  const [timeUnit, setTimeUnit] = useState<'half-week' | 'week' | 'day'>('half-week');

  // 用紙横幅100%自動フィットモード（デフォルトON: 右余白ゼロ・端から端まで全幅ストレッチ）
  const [autoFitWidth, setAutoFitWidth] = useState<boolean>(true);
  // 手動ズーム倍率 (70%〜220%)
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // 用紙の余白設定（PDF書き出し画面側で調整）
  const [marginSize, setMarginSize] = useState<'minimal' | 'narrow' | 'normal' | 'wide'>('narrow');

  // 行の高さ（'auto': 用紙縦一杯に自動最大化・上下余白ゼロ | 'max': 特大80px | 'large': 大56px | 'normal': 標準38px | 'compact': 極小24px）
  const [rowDensity, setRowDensity] = useState<'auto' | 'max' | 'large' | 'normal' | 'compact'>('auto');

  // ★新機能: 折りたたみ行の2段（千鳥）配置モード（文字隠れを根本解消・初期ON）
  const [enableDualLane, setEnableDualLane] = useState<boolean>(true);

  const [showAssignee, setShowAssignee] = useState(false);
  const [showTodos, setShowTodos] = useState(true);

  // PDF出力画面での折りたたみ状態
  const [pdfCollapsedIds, setPdfCollapsedIds] = useState<Set<string>>(() =>
    initialCollapsedIds ? new Set(initialCollapsedIds) : new Set()
  );

  // モーダルが開かれた際に、通常画面の折りたたみ状態を同期
  useEffect(() => {
    if (isOpen && initialCollapsedIds) {
      setPdfCollapsedIds(new Set(initialCollapsedIds));
    }
  }, [isOpen, initialCollapsedIds]);

  // 今日の日付文字列 (YYYY-MM-DD)
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // 全アイテムマップ
  const itemMap = useMemo(() => {
    const map = new Map<string, ScheduleItem>();
    for (const item of items) {
      map.set(item.schedule_id, item);
    }
    return map;
  }, [items]);

  // 子要素を持つアイテムのID一覧
  const hasChildrenSet = useMemo(() => {
    const parentIdSet = new Set<string>();
    for (const item of items) {
      if (item.parent_id) {
        parentIdSet.add(item.parent_id);
      }
    }
    return parentIdSet;
  }, [items]);

  // 指定した親アイテム配下の子孫タスク群を取得するヘルパー
  const getDescendantTasks = useCallback(
    (parentId: string): ScheduleItem[] => {
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
    },
    [items]
  );

  // すべての小項目を折りたたんで中項目だけで表示
  const handleCollapseToGroups = () => {
    const nextCollapsed = new Set<string>();
    const childrenMap = new Map<string, ScheduleItem[]>();
    for (const item of items) {
      if (item.parent_id) {
        if (!childrenMap.has(item.parent_id)) childrenMap.set(item.parent_id, []);
        childrenMap.get(item.parent_id)!.push(item);
      }
    }

    for (const item of items) {
      if (item.item_type === 'group') {
        nextCollapsed.add(item.schedule_id);
      } else if (item.item_type === 'category') {
        const children = childrenMap.get(item.schedule_id) || [];
        const hasTaskDirectly = children.some(c => c.item_type === 'task');
        const hasGroup = children.some(c => c.item_type === 'group');
        if (hasTaskDirectly && !hasGroup) {
          nextCollapsed.add(item.schedule_id);
        }
      }
    }
    setPdfCollapsedIds(nextCollapsed);
    setRowDensity('auto');
  };

  // すべて展開
  const handleExpandAll = () => {
    setPdfCollapsedIds(new Set());
    setRowDensity('normal');
  };

  // 個別開閉トグル
  const handleToggleCollapse = (id: string) => {
    setPdfCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 折りたたみ判定後の表示対象アイテム（親行のみ表示）
  const visibleItems = useMemo(() => {
    return items.filter(item => {
      let curParentId = item.parent_id;
      while (curParentId) {
        if (pdfCollapsedIds.has(curParentId)) {
          return false;
        }
        const parent = itemMap.get(curParentId);
        curParentId = parent ? parent.parent_id : null;
      }
      return true;
    });
  }, [items, pdfCollapsedIds, itemMap]);

  // カレンダー全期間（開始日・終了日）
  const calendarStart = calendarDays[0]?.dateStr || project.start_date || '2025-04-01';
  const calendarEnd = calendarDays[calendarDays.length - 1]?.dateStr || project.end_date || '2025-08-31';

  // 週単位カレンダーデータ
  const calendarWeeks = useMemo(() => {
    return generateCalendarWeeks(calendarStart, calendarEnd);
  }, [calendarStart, calendarEnd]);

  const weekMonthGroups = useMemo(() => {
    return groupWeeksByMonth(calendarWeeks);
  }, [calendarWeeks]);

  // 1/2週（半週）カレンダーデータ
  const calendarHalfWeeks = useMemo(() => {
    return generateCalendarHalfWeeks(calendarStart, calendarEnd);
  }, [calendarStart, calendarEnd]);

  const halfWeekMonthGroups = useMemo(() => {
    return groupHalfWeeksByMonth(calendarHalfWeeks);
  }, [calendarHalfWeeks]);

  const isLandscape = orientation === 'landscape';

  // 余白ミリメートル値
  const marginMm = useMemo(() => {
    switch (marginSize) {
      case 'minimal': return 3;
      case 'narrow': return 6;
      case 'normal': return 12;
      case 'wide': return 18;
      default: return 6;
    }
  }, [marginSize]);

  // 左側幅（工程名列・担当列・営業日列）
  const leftNameWidth = isLandscape ? 200 : 155;
  const leftAssigneeWidth = isLandscape ? 60 : 50;
  const leftDurationWidth = 44;
  const totalLeftWidth = leftNameWidth + (showAssignee ? leftAssigneeWidth : 0) + leftDurationWidth;

  // カレンダー総セル数
  const totalCols = useMemo(() => {
    if (timeUnit === 'half-week') return Math.max(1, calendarHalfWeeks.length);
    if (timeUnit === 'week') return Math.max(1, calendarWeeks.length);
    return Math.max(1, calendarDays.length);
  }, [timeUnit, calendarHalfWeeks.length, calendarWeeks.length, calendarDays.length]);

  // 手動ズーム時のセル幅
  const manualCellWidth = useMemo(() => {
    const base = timeUnit === 'half-week' ? 42 : timeUnit === 'week' ? 52 : 20;
    return Math.max(14, Math.round(base * (zoomPercent / 100)));
  }, [timeUnit, zoomPercent]);

  // タイムライン全体の幅（手動ズーム時用）
  const manualTimelineWidth = totalCols * manualCellWidth;

  // 表示対象の総行数（アイテム行 ＋ TODO行）
  const totalVisibleRowCount = useMemo(() => {
    let count = visibleItems.length;
    if (showTodos && todos.length > 0) {
      const todoAssignees = new Set(todos.map(t => t.assignee || '未設定'));
      count += todoAssignees.size + 1;
    }
    return Math.max(1, count);
  }, [visibleItems.length, showTodos, todos]);

  // 余白（marginMm）を考慮した用紙縦一杯フィットの正確な計算
  const autoRowHeight = useMemo(() => {
    const paperHeightPx = isLandscape ? 794 : 1123;
    const marginPx = Math.round(marginMm * 2 * 3.78);
    const headerFooterPx = 140;
    const availablePrintHeight = Math.max(250, paperHeightPx - marginPx - headerFooterPx);
    const computed = Math.floor(availablePrintHeight / totalVisibleRowCount);
    return Math.min(130, Math.max(26, computed));
  }, [isLandscape, marginMm, totalVisibleRowCount]);

  // 実際の行の高さ（px）
  const currentRowHeight = useMemo(() => {
    if (rowDensity === 'auto') return autoRowHeight;
    if (rowDensity === 'max') return 80;
    if (rowDensity === 'large') return 56;
    if (rowDensity === 'normal') return 38;
    return 24;
  }, [rowDensity, autoRowHeight]);

  // 行の高さに応じたスタイル
  const rowStyleConfig = useMemo(() => {
    const h = currentRowHeight;
    if (h >= 85) {
      return {
        heightPx: h,
        fontSize: 'text-sm font-semibold',
        barHeight: Math.min(52, Math.round(h * 0.58)),
        titleSize: 'text-xs font-bold',
        subSize: 'text-[11px]',
        py: 'py-2',
      };
    }
    if (h >= 58) {
      return {
        heightPx: h,
        fontSize: 'text-xs font-semibold',
        barHeight: Math.min(40, Math.round(h * 0.6)),
        titleSize: 'text-[11px] font-bold',
        subSize: 'text-[9.5px]',
        py: 'py-1.5',
      };
    }
    if (h >= 44) {
      return {
        heightPx: h,
        fontSize: 'text-[11px]',
        barHeight: Math.round(h * 0.62),
        titleSize: 'text-[10px] font-bold',
        subSize: 'text-[8.5px]',
        py: 'py-1',
      };
    }
    if (h >= 32) {
      return {
        heightPx: h,
        fontSize: 'text-[10px]',
        barHeight: Math.round(h * 0.65),
        titleSize: 'text-[9px] font-bold',
        subSize: 'text-[7.5px]',
        py: 'py-0.5',
      };
    }
    return {
      heightPx: h,
      fontSize: 'text-[9px]',
      barHeight: Math.round(h * 0.65),
      titleSize: 'text-[8px] font-bold',
      subSize: 'text-[6.5px]',
      py: 'py-0',
    };
  }, [currentRowHeight]);

  // バー位置計算ヘルパー
  const calculateBar = useCallback(
    (start: string, end: string) => {
      if (timeUnit === 'half-week') {
        return getHalfWeekBarPosition(start, end, calendarHalfWeeks);
      }
      if (timeUnit === 'week') {
        return getWeekBarPosition(start, end, calendarWeeks);
      }
      return getBarPosition(start, end, calendarStart, calendarEnd, calendarDays.length);
    },
    [timeUnit, calendarHalfWeeks, calendarWeeks, calendarStart, calendarEnd, calendarDays.length]
  );

  // 本日（Today）のタイムライン内でのパーセンテージ位置（0〜100%）
  const todayPosition = useMemo(() => {
    if (todayDateStr < calendarStart || todayDateStr > calendarEnd) return null;
    const { leftIndex, isVisible } = calculateBar(todayDateStr, todayDateStr);
    if (!isVisible || leftIndex < 0) return null;
    return ((leftIndex + 0.5) / totalCols) * 100;
  }, [todayDateStr, calendarStart, calendarEnd, calculateBar, totalCols]);

  // 現在進行中のタスク（本日が該当期間内のタスク一覧）
  const activeTodayTasks = useMemo(() => {
    return items.filter(
      item => item.item_type === 'task' && item.start_date <= todayDateStr && todayDateStr <= item.end_date
    );
  }, [items, todayDateStr]);

  // 行高さ同期
  const [pdfRowHeights, setPdfRowHeights] = useState<Record<string, number>>({});
  const pdfRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastPdfHeightsRef = useRef<Record<string, number>>({});

  const measurePdfRowHeights = useCallback(() => {
    const nextHeights: Record<string, number> = {};
    let changed = false;
    const baseH = currentRowHeight;

    pdfRowRefs.current.forEach((el, id) => {
      if (!el) return;
      const h = Math.max(baseH, Math.round(el.getBoundingClientRect().height));
      nextHeights[id] = h;
      if (lastPdfHeightsRef.current[id] !== h) {
        changed = true;
      }
    });

    if (
      !changed &&
      Object.keys(lastPdfHeightsRef.current).length !== Object.keys(nextHeights).length
    ) {
      changed = true;
    }

    if (changed) {
      lastPdfHeightsRef.current = nextHeights;
      setPdfRowHeights(nextHeights);
    }
  }, [currentRowHeight]);

  useEffect(() => {
    if (!isOpen || exportMode !== 'gantt') return;
    measurePdfRowHeights();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measurePdfRowHeights());
    pdfRowRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isOpen, exportMode, visibleItems, showAssignee, currentRowHeight, measurePdfRowHeights]);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pdf-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      {/* 印刷ダイアログ用の動的@page & 印刷完全隔離スタイル */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'} !important;
            margin: 0mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${isLandscape ? '297mm' : '210mm'} !important;
            height: ${isLandscape ? '210mm' : '297mm'} !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          .pdf-modal-overlay,
          .pdf-modal-container,
          .pdf-modal-scroll-area {
            position: static !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }
          #printable-schedule {
            display: block !important;
            box-sizing: border-box !important;
            width: ${isLandscape ? '297mm' : '210mm'} !important;
            height: ${isLandscape ? '210mm' : '297mm'} !important;
            max-width: ${isLandscape ? '297mm' : '210mm'} !important;
            padding: ${marginMm}mm !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            transform: none !important;
            overflow: hidden !important;
          }
          .timeline-stretch-container {
            width: 100% !important;
            flex: 1 1 0% !important;
            min-width: 0 !important;
          }
        }
      ` }} />

      <div className="pdf-modal-container bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="no-print flex items-center justify-between px-6 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <span>進行管理表 PDF / 印刷出力</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {isLandscape ? 'A4横向き' : 'A4縦向き'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {timeUnit === 'half-week' ? '1/2週表示' : timeUnit === 'week' ? '週単位' : '日単位'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                余白: {marginMm}mm
              </span>
              {enableDualLane && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-rose-600" />
                  <span>2段千鳥配置（文字埋もれ防止中）</span>
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">
              クライアント提出用資料（文字埋もれ防止・本日マーカー・余白調整・用紙1枚収まり）
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 出力設定バー */}
        <div className="no-print px-6 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* モード切替 */}
            <div className="inline-flex rounded-md shadow-2xs border border-slate-300 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setExportMode('gantt')}
                className={`px-2.5 py-1 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                  exportMode === 'gantt'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>ガントチャート</span>
              </button>
              <button
                type="button"
                onClick={() => setExportMode('table')}
                className={`px-2.5 py-1 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                  exportMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>一覧表</span>
              </button>
            </div>

            {/* 用紙の向き */}
            <div className="inline-flex rounded-md shadow-2xs border border-slate-300 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  isLandscape
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title="A4横向き"
              >
                A4 横向き
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                  !isLandscape
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title="A4縦向き"
              >
                A4 縦向き
              </button>
            </div>

            {/* 時間軸 */}
            {exportMode === 'gantt' && (
              <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs">
                <span className="font-bold text-slate-800 text-[11px]">時間軸:</span>
                <button
                  type="button"
                  onClick={() => setTimeUnit('half-week')}
                  className={`px-2 py-0.5 rounded-xs text-[11px] font-bold cursor-pointer transition-colors ${
                    timeUnit === 'half-week'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  }`}
                  title="1/2週単位（月〜水・木〜日）：週の倍の縦行で適度な幅に展開（推奨）"
                >
                  1/2週（推奨）
                </button>
                <button
                  type="button"
                  onClick={() => setTimeUnit('week')}
                  className={`px-2 py-0.5 rounded-xs text-[11px] font-semibold cursor-pointer transition-colors ${
                    timeUnit === 'week'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  }`}
                  title="週単位で圧縮"
                >
                  週単位
                </button>
                <button
                  type="button"
                  onClick={() => setTimeUnit('day')}
                  className={`px-2 py-0.5 rounded-xs text-[11px] font-semibold cursor-pointer transition-colors ${
                    timeUnit === 'day'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  }`}
                  title="1日単位で詳細表示"
                >
                  日単位
                </button>
              </div>
            )}

            {/* 用紙余白調整 */}
            <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-slate-700 font-bold text-[11px]">余白:</span>
              <button
                type="button"
                onClick={() => setMarginSize('narrow')}
                className={`px-1.5 py-0.5 rounded-xs text-[11px] cursor-pointer font-bold transition-colors ${
                  marginSize === 'narrow'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="狭い (6mm)：端が切れず表を最大化（推奨）"
              >
                狭い(6mm)
              </button>
              <button
                type="button"
                onClick={() => setMarginSize('normal')}
                className={`px-1.5 py-0.5 rounded-xs text-[11px] cursor-pointer font-semibold transition-colors ${
                  marginSize === 'normal'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="標準 (12mm)"
              >
                標準(12mm)
              </button>
              <button
                type="button"
                onClick={() => setMarginSize('wide')}
                className={`px-1.5 py-0.5 rounded-xs text-[11px] cursor-pointer font-semibold transition-colors ${
                  marginSize === 'wide'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="広め (18mm)"
              >
                広め(18mm)
              </button>
              <button
                type="button"
                onClick={() => setMarginSize('minimal')}
                className={`px-1.5 py-0.5 rounded-xs text-[11px] cursor-pointer font-semibold transition-colors ${
                  marginSize === 'minimal'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="極小 (3mm)"
              >
                極小(3mm)
              </button>
            </div>

            {/* 階層折りたたみ制御 */}
            <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs">
              <FolderTree className="w-3.5 h-3.5 text-slate-600" />
              <button
                type="button"
                onClick={handleCollapseToGroups}
                className="px-2 py-0.5 rounded-xs text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer transition-colors shadow-2xs"
                title="小項目をすべて折りたたみ、中項目・大項目を1行ずつコンパクトに表示します"
              >
                中項目で折りたたみ
              </button>
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2 py-0.5 rounded-xs text-[11px] font-medium hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
                title="すべての工程を展開して表示します"
              >
                すべて展開
              </button>
            </div>

            {/* ★文字埋もれ防止：2段（千鳥）配置トグル */}
            {exportMode === 'gantt' && (
              <button
                type="button"
                onClick={() => setEnableDualLane(prev => !prev)}
                className={`px-2 py-1 rounded-md border text-[11px] font-bold flex items-center space-x-1 shadow-2xs cursor-pointer transition-colors ${
                  enableDualLane
                    ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
                title="折りたたんだ行内のタスクを上段（作業）と下段（確認）の2段に振り分け、狭い日程の文字が重なって隠れるのを防止します"
              >
                <Layers className="w-3.5 h-3.5 text-rose-600" />
                <span>文字埋もれ防止（2段千鳥配置）: {enableDualLane ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* 行の高さ（用紙縦一杯・上下の余白解消） */}
            <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs">
              <span className="text-slate-700 font-bold text-[11px]">行高:</span>
              <button
                type="button"
                onClick={() => setRowDensity('auto')}
                className={`px-2 py-0.5 rounded-xs text-[11px] cursor-pointer font-bold transition-colors ${
                  rowDensity === 'auto'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="用紙の縦サイズに合わせて1行の高さを自動最大化（上下余白ゼロ・推奨）"
              >
                用紙一杯（{autoRowHeight}px）
              </button>
              <button
                type="button"
                onClick={() => setRowDensity('max')}
                className={`px-1.5 py-0.5 rounded-xs text-[11px] cursor-pointer ${
                  rowDensity === 'max'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="特大（80px）"
              >
                特大
              </button>
              <button
                type="button"
                onClick={() => setRowDensity('large')}
                className={`px-1.5 py-0.5 rounded-xs text-[11px] cursor-pointer ${
                  rowDensity === 'large'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="大（56px）"
              >
                大
              </button>
              <button
                type="button"
                onClick={() => setRowDensity('normal')}
                className={`px-1.5 py-0.5 rounded-xs text-[11px] cursor-pointer ${
                  rowDensity === 'normal'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="標準（38px）"
              >
                標準
              </button>
              <button
                type="button"
                onClick={() => setRowDensity('compact')}
                className={`px-1.5 py-0.5 rounded-xs text-[11px] cursor-pointer ${
                  rowDensity === 'compact'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="極小（24px）"
              >
                極小
              </button>
            </div>

            {/* 表の横幅制御（用紙全幅フィット / 手動ズーム） */}
            <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-md border border-slate-300 shadow-2xs">
              <span className="text-slate-700 font-bold text-[11px]">表幅:</span>
              <button
                type="button"
                onClick={() => {
                  setAutoFitWidth(true);
                  setZoomPercent(100);
                }}
                className={`px-2 py-0.5 rounded-xs text-[11px] font-bold cursor-pointer transition-colors ${
                  autoFitWidth
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="全幅フィット（推奨）"
              >
                全幅フィット（推奨）
              </button>

              <div className="flex items-center space-x-0.5 pl-1 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setAutoFitWidth(false);
                    setZoomPercent(prev => Math.max(70, prev - 15));
                  }}
                  className="p-0.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                  title="幅を手動縮小"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-800 w-12 text-center">
                  {autoFitWidth ? '100%' : `${manualCellWidth}px`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAutoFitWidth(false);
                    setZoomPercent(prev => Math.min(220, prev + 15));
                  }}
                  className="p-0.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
                  title="縦行の幅を手動拡大"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <label className="flex items-center space-x-1 cursor-pointer select-none text-slate-700">
              <input
                type="checkbox"
                checked={showAssignee}
                onChange={e => setShowAssignee(e.target.checked)}
                className="rounded-xs text-blue-600 focus:ring-blue-500"
              />
              <span>担当</span>
            </label>

            <label className="flex items-center space-x-1 cursor-pointer select-none text-slate-700">
              <input
                type="checkbox"
                checked={showTodos}
                onChange={e => setShowTodos(e.target.checked)}
                className="rounded-xs text-blue-600 focus:ring-blue-500"
              />
              <span>TODO</span>
            </label>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isLandscape ? 'A4横向きで印刷 / PDF保存' : 'A4縦向きで印刷 / PDF保存'}</span>
            </button>
          </div>
        </div>

        {/* 印刷・プレビュー対象領域 */}
        <div className="pdf-modal-scroll-area flex-1 overflow-auto p-4 bg-slate-200/60 print:p-0 print:bg-white print:overflow-visible flex justify-center">
          <div
            id="printable-schedule"
            style={{
              padding: `${marginMm}mm`,
              maxWidth: isLandscape ? '1120px' : '820px',
            }}
            className="bg-white rounded-lg shadow-sm border border-slate-300 text-xs text-slate-800 print:border-none print:shadow-none print:max-w-none w-full min-w-0"
          >
            {/* 提出用ヘッダー */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {project.project_name} 進行管理表
                </h1>
                <div className="flex items-center space-x-4 text-[11px] text-slate-600 mt-0.5">
                  <span>クライアント: <strong>{project.client_name}</strong> 御中</span>
                  <span>案件期間: {project.start_date} 〜 {project.end_date}</span>
                  {exportMode === 'gantt' && (
                    <span className="text-slate-500 font-medium">
                      （{isLandscape ? 'A4横' : 'A4縦'} /{' '}
                      {timeUnit === 'half-week'
                        ? '1/2週（半週）表示'
                        : timeUnit === 'week'
                        ? '週単位表示'
                        : '日単位表示'}
                      {pdfCollapsedIds.size > 0 ? '・中項目折りたたみサマリー' : ''}）
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <div>発行日: {todayStr}</div>
                {activeTodayTasks.length > 0 && (
                  <div className="mt-0.5 font-bold text-rose-600 flex items-center justify-end space-x-1">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse inline-block" />
                    <span>本日進行中の工程: {activeTodayTasks.map(t => t.name).join(' / ')}</span>
                  </div>
                )}
                {showAssignee && <div className="text-slate-500">案件担当: {project.owner}</div>}
              </div>
            </div>

            {/* モードA: ガントチャート */}
            {exportMode === 'gantt' && (
              <div className="border border-slate-400 rounded-xs overflow-hidden mb-2 w-full">
                <div className="flex overflow-x-auto print:overflow-visible w-full">
                  {/* 1. 左側: 工程一覧列 */}
                  <div
                    style={{ width: `${totalLeftWidth}px` }}
                    className="shrink-0 border-r-2 border-slate-700 bg-white"
                  >
                    {/* 左側ヘッダー */}
                    <div className="h-[46px] border-b-2 border-slate-600 bg-slate-100 flex items-center text-[11px] font-bold text-slate-800">
                      <div style={{ width: `${leftNameWidth}px` }} className="px-2 border-r border-slate-300">
                        工程・階層名
                      </div>
                      {showAssignee && (
                        <div style={{ width: `${leftAssigneeWidth}px` }} className="text-center border-r border-slate-300">
                          担当
                        </div>
                      )}
                      <div style={{ width: `${leftDurationWidth}px` }} className="text-center">
                        営業日
                      </div>
                    </div>

                    {/* 各行 */}
                    {visibleItems.map(item => {
                      const isCat = item.item_type === 'category';
                      const isGrp = item.item_type === 'group';
                      const isParent = isCat || isGrp;
                      const hasKids = hasChildrenSet.has(item.schedule_id);
                      const isCollapsed = pdfCollapsedIds.has(item.schedule_id);

                      let paddingLeft = 6;
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
                          ref={el => {
                            if (el) pdfRowRefs.current.set(item.schedule_id, el);
                            else pdfRowRefs.current.delete(item.schedule_id);
                          }}
                          style={{ minHeight: `${rowStyleConfig.heightPx}px`, height: `${rowStyleConfig.heightPx}px` }}
                          className={`box-border flex items-stretch ${rowStyleConfig.fontSize} ${bgClass} ${borderClass}`}
                        >
                          <div
                            style={{
                              width: `${leftNameWidth}px`,
                              paddingLeft: `${paddingLeft}px`,
                            }}
                            className={`shrink-0 pr-1 ${rowStyleConfig.py} border-r border-slate-300 flex items-center min-w-0`}
                            title={item.name}
                          >
                            {/* 開閉アイコン（親項目の場合） */}
                            {isParent && hasKids && (
                              <button
                                type="button"
                                onClick={() => handleToggleCollapse(item.schedule_id)}
                                className="no-print p-0.5 mr-1 hover:bg-slate-300 rounded cursor-pointer shrink-0 text-slate-600"
                                title={isCollapsed ? '展開する' : '折りたたむ'}
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                                )}
                              </button>
                            )}
                            <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-snug">
                              {isGrp && '└ '}
                              {item.item_type === 'task' && '・'}
                              {item.name}
                            </span>
                          </div>
                          {showAssignee && (
                            <div
                              style={{ width: `${leftAssigneeWidth}px` }}
                              className="shrink-0 text-center truncate px-1 border-r border-slate-300 flex items-center justify-center text-[10px] text-slate-600"
                            >
                              {item.assignee || '-'}
                            </div>
                          )}
                          <div
                            style={{ width: `${leftDurationWidth}px` }}
                            className="shrink-0 text-center font-bold flex items-center justify-center text-[10px]"
                          >
                            {item.duration_business_days ? `${item.duration_business_days}日` : '-'}
                          </div>
                        </div>
                      );
                    })}

                    {/* TODO行（左側） */}
                    {showTodos && todos.length > 0 && (
                      <>
                        <div className="h-6 border-t-2 border-t-slate-700 border-b border-slate-300 bg-slate-200 px-2 flex items-center font-bold text-[10px] text-slate-800">
                          ✓ 主要TODO
                        </div>
                        {Array.from(new Set(todos.map(t => t.assignee || '未設定'))).map(assignee => (
                          <div
                            key={assignee}
                            style={{ minHeight: `${rowStyleConfig.heightPx}px`, height: `${rowStyleConfig.heightPx}px` }}
                            className={`border-b border-slate-300 bg-slate-50 flex items-center text-[10px]`}
                          >
                            <div
                              style={{ width: `${leftNameWidth}px` }}
                              className="px-3 font-semibold text-slate-800 truncate border-r border-slate-300 h-full flex items-center"
                            >
                              TODO: {assignee}
                            </div>
                            {showAssignee && (
                              <div
                                style={{ width: `${leftAssigneeWidth}px` }}
                                className="text-center text-slate-500 border-r border-slate-300 h-full flex items-center justify-center"
                              >
                                {assignee}
                              </div>
                            )}
                            <div
                              style={{ width: `${leftDurationWidth}px` }}
                              className="text-center text-slate-500 h-full flex items-center justify-center"
                            >
                              {todos.filter(t => (t.assignee || '未設定') === assignee).length}件
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* 2. 右側: カレンダー ＋ ガントバー（用紙幅100%均等ストレッチ） */}
                  <div
                    style={autoFitWidth ? undefined : { width: `${manualTimelineWidth}px` }}
                    className={`timeline-stretch-container overflow-x-auto print:overflow-visible bg-white relative ${
                      autoFitWidth ? 'flex-1 w-full min-w-0' : 'shrink-0'
                    }`}
                  >
                    {/* カレンダーヘッダー */}
                    {timeUnit === 'half-week' ? (
                      /* A. 1/2週（半週）ヘッダー */
                      <div className="h-[46px] border-b-2 border-slate-600 select-none bg-slate-50 w-full relative">
                        <div className="h-[22px] flex border-b border-slate-300 font-bold text-[10px] text-slate-800 bg-slate-100 w-full">
                          {halfWeekMonthGroups.map((mg, idx) => (
                            <div
                              key={`${mg.year}-${mg.month}-${idx}`}
                              style={{
                                width: autoFitWidth
                                  ? `${(mg.daysCount / totalCols) * 100}%`
                                  : `${mg.daysCount * manualCellWidth}px`,
                              }}
                              className="px-1.5 flex items-center border-r border-slate-300 shrink-0 truncate"
                            >
                              {mg.label}
                            </div>
                          ))}
                        </div>
                        <div className="h-[24px] flex font-semibold text-[8px] text-slate-600 bg-white w-full">
                          {calendarHalfWeeks.map(hw => (
                            <div
                              key={hw.index}
                              style={{
                                width: autoFitWidth
                                  ? `${(1 / totalCols) * 100}%`
                                  : `${manualCellWidth}px`,
                              }}
                              className={`shrink-0 flex flex-col items-center justify-center border-r border-slate-300 leading-none ${
                                hw.part === 'second' ? 'bg-slate-50/70' : ''
                              }`}
                              title={`${hw.weekLabel} ${hw.subLabel} (${hw.startDateStr} 〜 ${hw.endDateStr})`}
                            >
                              <span className="font-bold">{hw.label}</span>
                              <span className="text-[7px] text-slate-400">{hw.subLabel}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : timeUnit === 'week' ? (
                      /* B. 週単位ヘッダー */
                      <div className="h-[46px] border-b-2 border-slate-600 select-none bg-slate-50 w-full relative">
                        <div className="h-[22px] flex border-b border-slate-300 font-bold text-[10px] text-slate-800 bg-slate-100 w-full">
                          {weekMonthGroups.map((mg, idx) => (
                            <div
                              key={`${mg.year}-${mg.month}-${idx}`}
                              style={{
                                width: autoFitWidth
                                  ? `${(mg.daysCount / totalCols) * 100}%`
                                  : `${mg.daysCount * manualCellWidth}px`,
                              }}
                              className="px-1.5 flex items-center border-r border-slate-300 shrink-0 truncate"
                            >
                              {mg.label}
                            </div>
                          ))}
                        </div>
                        <div className="h-[24px] flex font-semibold text-[8px] text-slate-600 bg-white w-full">
                          {calendarWeeks.map(w => (
                            <div
                              key={w.startDateStr}
                              style={{
                                width: autoFitWidth
                                  ? `${(1 / totalCols) * 100}%`
                                  : `${manualCellWidth}px`,
                              }}
                              className="shrink-0 flex items-center justify-center border-r border-slate-300 font-bold"
                              title={`${w.startDateStr} 〜 ${w.endDateStr}`}
                            >
                              {w.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* C. 日単位ヘッダー */
                      <div className="h-[46px] border-b-2 border-slate-600 select-none bg-slate-50 w-full relative">
                        <div className="h-[24px] flex border-b border-slate-300 font-bold text-[9px] text-slate-700 w-full">
                          {calendarDays.map(day => (
                            <div
                              key={day.dateStr}
                              style={{
                                width: autoFitWidth
                                  ? `${(1 / totalCols) * 100}%`
                                  : `${manualCellWidth}px`,
                              }}
                              className={`shrink-0 flex items-center justify-center border-r border-slate-300 ${
                                day.isWeekend || day.isHoliday ? 'bg-slate-200 text-slate-500' : ''
                              }`}
                            >
                              {day.day}
                            </div>
                          ))}
                        </div>
                        <div className="h-[20px] flex text-[8px] text-slate-500 w-full">
                          {calendarDays.map(day => {
                            let col = 'text-slate-600';
                            if (day.dayOfWeek === 0 || day.isHoliday) col = 'text-rose-600 font-bold bg-rose-50';
                            if (day.dayOfWeek === 6) col = 'text-blue-600 font-bold bg-blue-50';
                            return (
                              <div
                                key={day.dateStr}
                                style={{
                                  width: autoFitWidth
                                    ? `${(1 / totalCols) * 100}%`
                                    : `${manualCellWidth}px`,
                                }}
                                className={`shrink-0 flex items-center justify-center border-r border-slate-300 ${col}`}
                              >
                                {day.dayOfWeekStr}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ★本日マーカー（赤い縦線 ＋ 上部フラグ） */}
                    {todayPosition !== null && (
                      <div
                        style={{ left: `${todayPosition}%` }}
                        className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
                      >
                        <div className="bg-rose-600 text-white font-bold text-[8px] px-1 py-0.2 rounded-b-xs shadow-xs uppercase tracking-tight whitespace-nowrap">
                          本日 {todayDateStr.slice(5)}
                        </div>
                        <div className="w-[2px] h-full bg-rose-500/80 border-r border-dashed border-rose-300" />
                      </div>
                    )}

                    {/* タイムライン本体 */}
                    <div className="relative w-full">
                      {/* 背景グリッド縦線 */}
                      <div className="absolute inset-0 flex pointer-events-none w-full">
                        {timeUnit === 'half-week'
                          ? calendarHalfWeeks.map(hw => (
                              <div
                                key={hw.index}
                                style={{
                                  width: autoFitWidth
                                    ? `${(1 / totalCols) * 100}%`
                                    : `${manualCellWidth}px`,
                                }}
                                className={`h-full border-r border-slate-200 shrink-0 ${
                                  hw.part === 'second' ? 'bg-slate-50/40' : ''
                                }`}
                              />
                            ))
                          : timeUnit === 'week'
                          ? calendarWeeks.map(w => (
                              <div
                                key={w.startDateStr}
                                style={{
                                  width: autoFitWidth
                                    ? `${(1 / totalCols) * 100}%`
                                    : `${manualCellWidth}px`,
                                }}
                                className="h-full border-r border-slate-200 shrink-0"
                              />
                            ))
                          : calendarDays.map(day => (
                              <div
                                key={day.dateStr}
                                style={{
                                  width: autoFitWidth
                                    ? `${(1 / totalCols) * 100}%`
                                    : `${manualCellWidth}px`,
                                }}
                                className={`h-full border-r border-slate-200 shrink-0 ${
                                  day.isWeekend || day.isHoliday ? 'bg-slate-100/70' : ''
                                }`}
                              />
                            ))}
                      </div>

                      {/* ガントバー描画レイヤー */}
                      <div className="relative z-10 w-full">
                        {visibleItems.map(item => {
                          const isCat = item.item_type === 'category';
                          const isGrp = item.item_type === 'group';
                          const isCollapsed = pdfCollapsedIds.has(item.schedule_id);

                          let rowClass = `box-border relative flex items-center border-b border-slate-300 w-full`;
                          if (isCat) {
                            rowClass += ' bg-slate-200/40 border-t-2 border-t-slate-700 font-bold';
                          } else if (isGrp) {
                            rowClass += ' bg-slate-100/30';
                          }
                          const syncedHeight = pdfRowHeights[item.schedule_id] || rowStyleConfig.heightPx;

                          // ★重要: 折りたたまれている親行の場合
                          // 2段千鳥配置（上段: 作業系 / 下段: 確認系・偶数）＋ はみ出しクリアバッジで「文字埋もれを完全撲滅」！
                          if ((isCat || isGrp) && isCollapsed) {
                            const childTasks = getDescendantTasks(item.schedule_id);
                            const isDual = enableDualLane && syncedHeight >= 46;

                            return (
                              <div
                                key={item.schedule_id}
                                style={{ height: `${syncedHeight}px`, minHeight: `${syncedHeight}px` }}
                                className={rowClass}
                              >
                                {childTasks.map((task, taskIdx) => {
                                  const { leftIndex, span, isVisible } = calculateBar(
                                    task.start_date,
                                    task.end_date
                                  );

                                  if (!isVisible || leftIndex < 0) return null;

                                  const colorTheme = getTaskColorTheme(task.name, task.item_type);
                                  const leftStyle = autoFitWidth
                                    ? `${(leftIndex / totalCols) * 100}%`
                                    : `${leftIndex * manualCellWidth}px`;
                                  const widthStyle = autoFitWidth
                                    ? `${(span / totalCols) * 100}%`
                                    : `${span * manualCellWidth}px`;

                                  // 本日進行中のタスク判定
                                  const isTodayActive =
                                    task.start_date <= todayDateStr && todayDateStr <= task.end_date;

                                  // 2段千鳥レーン振り分け:
                                  // 「確認」「チェック」「レビュー」等の確認タスク、または偶数番目を下段(lane=1)に
                                  const isReviewTask = /確認|チェック|レビュー/.test(task.name);
                                  const lane = isDual ? (isReviewTask ? 1 : (taskIdx % 2)) : 0;

                                  const barH = isDual
                                    ? Math.min(36, Math.max(26, Math.round(syncedHeight * 0.44)))
                                    : rowStyleConfig.barHeight;
                                  const barTop = isDual
                                    ? (lane === 0 ? 5 : Math.round(syncedHeight * 0.50))
                                    : Math.round((syncedHeight - barH) / 2);

                                  return (
                                    <div
                                      key={task.schedule_id}
                                      style={{
                                        left: leftStyle,
                                        width: widthStyle,
                                        top: `${barTop}px`,
                                        height: `${barH}px`,
                                        zIndex: isTodayActive ? 25 : (lane === 0 ? 12 : 14),
                                      }}
                                      className={`absolute rounded-xs border shadow-2xs flex items-center transition-all ${colorTheme.bg} ${colorTheme.border} ${
                                        isTodayActive ? 'ring-2 ring-amber-500 shadow-md font-extrabold' : ''
                                      }`}
                                      title={`${task.name} (${task.start_date} 〜 ${task.end_date} : ${task.duration_business_days}営業日)`}
                                    >
                                      {/* テキストラベルコンテナ: overflow-visible で文字が絶対に隠れない！ */}
                                      <div className="absolute left-1 flex items-center whitespace-nowrap z-20 pointer-events-none pr-1">
                                        <div
                                          className={`flex items-center space-x-1 px-1 py-0.5 rounded-xs leading-none ${
                                            span <= 2
                                              ? 'bg-slate-900/85 text-white shadow-xs font-bold'
                                              : colorTheme.text
                                          }`}
                                        >
                                          <span className="font-bold text-[10px] leading-tight">
                                            {task.name}
                                          </span>
                                          {task.duration_business_days > 0 && (
                                            <span className="text-[8.5px] font-mono opacity-90 leading-tight">
                                              {task.duration_business_days}d
                                            </span>
                                          )}
                                          {isTodayActive && (
                                            <span className="bg-amber-500 text-white text-[8px] font-black px-1 py-0.2 rounded-xs leading-none">
                                              今日
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          // 通常行（展開時またはタスク単体）の描画
                          const { leftIndex, span, isVisible } = calculateBar(
                            item.start_date,
                            item.end_date
                          );

                          const colorTheme = getTaskColorTheme(item.name, item.item_type);
                          const leftStyle = autoFitWidth
                            ? `${(leftIndex / totalCols) * 100}%`
                            : `${leftIndex * manualCellWidth}px`;
                          const widthStyle = autoFitWidth
                            ? `${(span / totalCols) * 100}%`
                            : `${span * manualCellWidth}px`;

                          const isTodayActive =
                            item.start_date <= todayDateStr && todayDateStr <= item.end_date;

                          return (
                            <div
                              key={item.schedule_id}
                              style={{ height: `${syncedHeight}px`, minHeight: `${syncedHeight}px` }}
                              className={rowClass}
                            >
                              {isVisible && leftIndex >= 0 && (
                                <div
                                  style={{
                                    left: leftStyle,
                                    width: widthStyle,
                                    height: `${rowStyleConfig.barHeight}px`,
                                  }}
                                  className={`absolute top-1/2 -translate-y-1/2 rounded-sm border shadow-2xs flex items-center px-1.5 py-0.5 transition-all ${colorTheme.bg} ${colorTheme.border} ${colorTheme.text} ${
                                    isTodayActive ? 'ring-2 ring-amber-500 shadow-md font-extrabold z-20' : ''
                                  }`}
                                  title={`${item.name} (${item.start_date} 〜 ${item.end_date})`}
                                >
                                  {/* テキスト表示: 幅が狭いときはオーバーフローさせて全文字表示 */}
                                  <div className="absolute left-1 flex items-center whitespace-nowrap z-20 pointer-events-none">
                                    <div
                                      className={`flex items-center space-x-1 px-1 py-0.5 rounded-xs leading-none ${
                                        span <= 2
                                          ? 'bg-slate-900/85 text-white shadow-xs font-bold'
                                          : colorTheme.text
                                      }`}
                                    >
                                      <span className="font-bold text-[10px] leading-tight">
                                        {item.name}
                                      </span>
                                      {item.duration_business_days > 0 && (
                                        <span className="text-[8.5px] font-mono opacity-90 leading-tight">
                                          {item.duration_business_days}営業日（{item.duration_business_days}d）
                                        </span>
                                      )}
                                      {isTodayActive && (
                                        <span className="bg-amber-500 text-white text-[8px] font-black px-1 py-0.2 rounded-xs leading-none">
                                          今日
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* TODO行 */}
                        {showTodos && todos.length > 0 && (
                          <>
                            <div className="h-6 border-t-2 border-t-slate-700 border-b border-slate-300 bg-slate-200/80 px-2 flex items-center font-bold text-[9px] text-slate-600 w-full">
                              期日
                            </div>
                            {Array.from(new Set(todos.map(t => t.assignee || '未設定'))).map(assignee => {
                              const assigneeTodos = todos.filter(t => (t.assignee || '未設定') === assignee);
                              return (
                                <div
                                  key={assignee}
                                  style={{ height: `${rowStyleConfig.heightPx}px`, minHeight: `${rowStyleConfig.heightPx}px` }}
                                  className={`border-b border-slate-300 bg-slate-50/50 relative flex items-center w-full`}
                                >
                                  {timeUnit === 'half-week'
                                    ? calendarHalfWeeks.map(hw => {
                                        const match = assigneeTodos.filter(
                                          t => t.due_date >= hw.startDateStr && t.due_date <= hw.endDateStr
                                        );
                                        return (
                                          <div
                                            key={hw.index}
                                            style={{
                                              width: autoFitWidth
                                                ? `${(1 / totalCols) * 100}%`
                                                : `${manualCellWidth}px`,
                                            }}
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
                                      })
                                    : timeUnit === 'week'
                                    ? calendarWeeks.map(w => {
                                        const match = assigneeTodos.filter(
                                          t => t.due_date >= w.startDateStr && t.due_date <= w.endDateStr
                                        );
                                        return (
                                          <div
                                            key={w.startDateStr}
                                            style={{
                                              width: autoFitWidth
                                                ? `${(1 / totalCols) * 100}%`
                                                : `${manualCellWidth}px`,
                                            }}
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
                                      })
                                    : calendarDays.map(d => {
                                        const match = assigneeTodos.filter(t => t.due_date === d.dateStr);
                                        return (
                                          <div
                                            key={d.dateStr}
                                            style={{
                                              width: autoFitWidth
                                                ? `${(1 / totalCols) * 100}%`
                                                : `${manualCellWidth}px`,
                                            }}
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
                  </div>
                </div>
              </div>
            )}

            {/* モードB: 一覧表形式 */}
            {exportMode === 'table' && (
              <div className="border border-slate-400 rounded-xs overflow-hidden mb-4 w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 border-b-2 border-slate-600 font-bold text-slate-800">
                    <tr>
                      <th className="py-2 px-3 border-r border-slate-300">階層 / 工程名</th>
                      {showAssignee && (
                        <th className="py-2 px-2 text-center border-r border-slate-300 w-24">担当</th>
                      )}
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-24">開始日</th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-24">終了日</th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-20">営業日数</th>
                      <th className="py-2 px-3">備考 / 状況</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map(item => {
                      const isCat = item.item_type === 'category';
                      const isGrp = item.item_type === 'group';
                      const isCollapsed = pdfCollapsedIds.has(item.schedule_id);

                      let rowBg = 'bg-white';
                      if (isCat) rowBg = 'bg-slate-200/90 font-bold';
                      else if (isGrp) rowBg = 'bg-slate-100/80 font-semibold';

                      let pl = 'pl-3';
                      if (isGrp) pl = 'pl-7';
                      if (item.item_type === 'task') pl = 'pl-11';

                      return (
                        <tr
                          key={item.schedule_id}
                          style={{ height: `${Math.max(28, Math.round(rowStyleConfig.heightPx * 0.65))}px` }}
                          className={`border-b border-slate-300 ${rowBg}`}
                        >
                          <td className={`py-1.5 pr-2 ${pl} border-r border-slate-300`}>
                            {isGrp && '└ '}
                            {item.item_type === 'task' && '・'}
                            {item.name}
                            {isCollapsed && '（折りたたみ中）'}
                          </td>
                          {showAssignee && (
                            <td className="py-1 px-2 text-center border-r border-slate-300 text-slate-600">
                              {item.assignee || '-'}
                            </td>
                          )}
                          <td className="py-1 px-2 text-center font-mono border-r border-slate-300 text-slate-700">
                            {item.start_date || '-'}
                          </td>
                          <td className="py-1 px-2 text-center font-mono border-r border-slate-300 text-slate-700">
                            {item.end_date || '-'}
                          </td>
                          <td className="py-1 px-2 text-center font-bold border-r border-slate-300">
                            {item.duration_business_days ? `${item.duration_business_days}日` : '-'}
                          </td>
                          <td className="py-1 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                            {item.memo || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* フッターメモ */}
            <div className="flex justify-between items-center text-[10px] text-slate-600 pt-2 border-t border-slate-300">
              <div>
                ※ 本資料は社内進行管理およびクライアント様との工程確認用サマリー資料です。
              </div>
              <div className="font-mono">
                {project.project_name} | {isLandscape ? 'A4横' : 'A4縦'} 1枚出力
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
