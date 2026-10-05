'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FolderPlus,
  Sparkles,
  CheckSquare,
  Printer,
  Calendar,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  RefreshCw,
  Building,
  User,
  Sliders,
  Grid,
} from 'lucide-react';
import { Project } from '@/types';
import { GridBorderStrength } from './GanttCalendarHeader';

interface GanttToolbarProps {
  project: Project;
  onAddCategory: () => void;
  onOpenBulkAdd: () => void;
  onOpenTodoList: () => void;
  onOpenExportPdf: () => void;
  onScrollToToday: () => void;
  dayCellWidth: number;
  setDayCellWidth: (width: number) => void;
  borderStrength: GridBorderStrength;
  setBorderStrength: (strength: GridBorderStrength) => void;
  isSaving: boolean;
  uncompletedTodoCount: number;
}

export function GanttToolbar({
  project,
  onAddCategory,
  onOpenBulkAdd,
  onOpenTodoList,
  onOpenExportPdf,
  onScrollToToday,
  dayCellWidth,
  setDayCellWidth,
  borderStrength,
  setBorderStrength,
  isSaving,
  uncompletedTodoCount,
}: GanttToolbarProps) {
  return (
    <div className="no-print bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between gap-3 text-xs shadow-md border-b border-slate-800 shrink-0 select-none h-12">
      {/* 左エリア: 戻るリンク + 案件名・クライアント・期間（横一列コンパクト） */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <Link
          href="/"
          className="inline-flex items-center space-x-1 text-slate-300 hover:text-white px-2 py-1 rounded-md hover:bg-slate-800 transition-colors shrink-0"
          title="案件一覧へ戻る"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-semibold text-[11px] hidden sm:inline">案件一覧</span>
        </Link>

        <div className="h-4 w-px bg-slate-700 shrink-0" />

        <div className="flex items-center space-x-2 truncate">
          <span className="font-bold text-sm text-white tracking-tight truncate max-w-[260px] xl:max-w-[360px]" title={project.project_name}>
            {project.project_name}
          </span>
          <span className="text-slate-400 text-[11px] truncate hidden md:inline">
            ({project.client_name})
          </span>
          <span className="text-slate-500 text-[10px] hidden lg:inline">
            [{project.start_date}〜{project.end_date}]
          </span>
        </div>
      </div>

      {/* 中央エリア: 各種操作ボタン */}
      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          onClick={onAddCategory}
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border border-slate-700 shadow-2xs"
          title="大項目を追加"
        >
          <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
          <span>大項目追加</span>
        </button>

        <button
          onClick={onOpenBulkAdd}
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
          title="複数工程を一括生成"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">一括入力</span>
        </button>

        <button
          onClick={onOpenTodoList}
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border border-slate-700 shadow-2xs relative"
          title="TODO管理"
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>TODO</span>
          {uncompletedTodoCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[9px] font-bold">
              {uncompletedTodoCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenExportPdf}
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border border-slate-700 shadow-2xs"
          title="PDF・印刷出力"
        >
          <Printer className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden md:inline">PDF出力</span>
        </button>
      </div>

      {/* 右エリア: 罫線濃さ調整 + 今日へ + ズーム + 保存状態 */}
      <div className="flex items-center space-x-2 shrink-0 text-slate-300 text-[11px]">
        {/* 罫線の濃さ切り替え（ご要望対応） */}
        <div className="flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700" title="縦横の罫線の濃さを調整">
          <Grid className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] text-slate-400 hidden xl:inline">罫線:</span>
          <select
            value={borderStrength}
            onChange={e => setBorderStrength(e.target.value as GridBorderStrength)}
            className="bg-transparent text-white text-[10px] font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="normal" className="bg-slate-800 text-white">普通</option>
            <option value="strong" className="bg-slate-800 text-white">くっきり</option>
            <option value="bold" className="bg-slate-800 text-white">濃いめ</option>
          </select>
        </div>

        {/* 今日へ */}
        <button
          onClick={onScrollToToday}
          className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-md border border-slate-700 cursor-pointer"
          title="今日の日付へスクロール"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">今日へ</span>
        </button>

        {/* ズーム */}
        <div className="flex items-center border border-slate-700 rounded-md overflow-hidden bg-slate-800">
          <button
            onClick={() => setDayCellWidth(Math.max(22, dayCellWidth - 4))}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="縮小"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="px-1.5 text-[10px] font-mono text-slate-300">
            {dayCellWidth}px
          </span>
          <button
            onClick={() => setDayCellWidth(Math.min(60, dayCellWidth + 4))}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="拡大"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* 保存ステータス */}
        <div className="flex items-center space-x-1 text-[10px] text-slate-400 pl-1">
          {isSaving ? (
            <>
              <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
              <span className="hidden lg:inline text-blue-400">保存中</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="hidden lg:inline text-emerald-400">同期済</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
