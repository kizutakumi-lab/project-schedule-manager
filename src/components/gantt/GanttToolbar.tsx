'use client';

import React from 'react';
import {
  FolderPlus,
  Sparkles,
  CheckSquare,
  Printer,
  Calendar,
  ZoomIn,
  ZoomOut,
  Save,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface GanttToolbarProps {
  onAddCategory: () => void;
  onOpenBulkAdd: () => void;
  onOpenTodoList: () => void;
  onOpenExportPdf: () => void;
  onScrollToToday: () => void;
  dayCellWidth: number;
  setDayCellWidth: (width: number) => void;
  isSaving: boolean;
  uncompletedTodoCount: number;
}

export function GanttToolbar({
  onAddCategory,
  onOpenBulkAdd,
  onOpenTodoList,
  onOpenExportPdf,
  onScrollToToday,
  dayCellWidth,
  setDayCellWidth,
  isSaving,
  uncompletedTodoCount,
}: GanttToolbarProps) {
  return (
    <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
      {/* 左側操作アクション */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onAddCategory}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>大項目を追加</span>
        </button>

        <button
          onClick={onOpenBulkAdd}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>スケジュール一括入力</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <button
          onClick={onOpenTodoList}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-semibold transition-colors cursor-pointer relative"
        >
          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
          <span>TODO管理</span>
          {uncompletedTodoCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {uncompletedTodoCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenExportPdf}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-semibold transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-slate-600" />
          <span>PDF / 印刷出力</span>
        </button>
      </div>

      {/* 右側表示コントロール */}
      <div className="flex items-center space-x-3 text-xs text-slate-600">
        {/* 保存ステータス */}
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span>保存中...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">同期済み</span>
            </>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* 今日へジャンプ */}
        <button
          onClick={onScrollToToday}
          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer"
          title="今日の日付へスクロール"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>今日へ</span>
        </button>

        {/* ズーム切り替え */}
        <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-slate-50">
          <button
            onClick={() => setDayCellWidth(Math.max(24, dayCellWidth - 4))}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            title="縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-[10px] font-mono text-slate-600">
            {dayCellWidth}px
          </span>
          <button
            onClick={() => setDayCellWidth(Math.min(60, dayCellWidth + 4))}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            title="拡大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
