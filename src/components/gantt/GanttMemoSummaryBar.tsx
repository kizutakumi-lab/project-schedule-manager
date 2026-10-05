'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { parseISO, isValid, differenceInDays, format } from 'date-fns';
import { Calendar, Clock, FileText, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Project } from '@/types';
import { GridBorderStrength } from './GanttCalendarHeader';

interface GanttMemoSummaryBarProps {
  project: Project;
  startDate: string;
  endDate: string;
  memo: string;
  onMemoChange: (memo: string) => void;
  borderStrength: GridBorderStrength;
}

export function GanttMemoSummaryBar({
  project,
  startDate,
  endDate,
  memo,
  onMemoChange,
  borderStrength,
}: GanttMemoSummaryBarProps) {
  // 高さ管理（デフォルト120px = スケジュール3行分相当）
  const [height, setHeight] = useState<number>(120);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(120);

  const dividerCol = {
    normal: 'border-slate-300',
    strong: 'border-slate-400',
    bold: 'border-slate-600',
  }[borderStrength];

  // 日程消化率（費消率）の計算
  const scheduleStats = useMemo(() => {
    const sDate = parseISO(startDate);
    const eDate = parseISO(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!isValid(sDate) || !isValid(eDate) || sDate > eDate) {
      return {
        formattedPeriod: `${startDate} 〜 ${endDate}`,
        totalDays: 0,
        elapsedDays: 0,
        remainingDays: 0,
        consumptionRate: 0,
        statusText: '期間未設定',
      };
    }

    const totalDays = Math.max(1, differenceInDays(eDate, sDate) + 1);
    const elapsedDays = differenceInDays(today, sDate) + 1;
    const remainingDays = Math.max(0, differenceInDays(eDate, today));

    let consumptionRate = 0;
    let statusText = '進行中';

    if (elapsedDays <= 0) {
      consumptionRate = 0;
      statusText = '開始前';
    } else if (elapsedDays >= totalDays) {
      consumptionRate = 100;
      statusText = '期間終了';
    } else {
      consumptionRate = Math.round((elapsedDays / totalDays) * 1000) / 10;
    }

    const sStr = format(sDate, 'yyyy年M月d日');
    const eStr = format(eDate, 'yyyy年M月d日');

    return {
      formattedPeriod: `${sStr} 〜 ${eStr}`,
      totalDays,
      elapsedDays: Math.max(0, Math.min(totalDays, elapsedDays)),
      remainingDays,
      consumptionRate,
      statusText,
    };
  }, [startDate, endDate]);

  // マウスドラッグによる高さリサイズ
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = moveEvent.clientY - startYRef.current;
      const nextHeight = Math.max(48, Math.min(320, startHeightRef.current + deltaY));
      setHeight(nextHeight);
      if (nextHeight <= 52) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleCollapse = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setHeight(120);
    } else {
      setIsCollapsed(true);
      setHeight(40);
    }
  };

  const currentHeight = isCollapsed ? 40 : height;

  return (
    <div
      style={{ height: `${currentHeight}px` }}
      className={`shrink-0 border-b-2 ${dividerCol} bg-white flex transition-[height] duration-75 relative select-none`}
    >
      {/* 1. 左側: 作業期間全体日程 ＆ 日程費消率（幅 470px: 左ツリーと完全同期） */}
      <div className={`w-[470px] shrink-0 border-r-2 ${dividerCol} bg-slate-50/90 p-2.5 flex flex-col justify-between overflow-hidden`}>
        {/* 上部: 全体日程表示 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800 truncate" title={scheduleStats.formattedPeriod}>
              {scheduleStats.formattedPeriod}
            </span>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 shrink-0">
            全{scheduleStats.totalDays}日間
          </span>
        </div>

        {/* 下部: 日程費消率（プログレスバー ＋ パーセンテージ） */}
        {!isCollapsed && (
          <div className="space-y-1 mt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 flex items-center space-x-1 font-medium">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>日程費消率</span>
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-blue-700 text-xs">
                  {scheduleStats.consumptionRate}%
                </span>
                <span className="text-[10px] text-slate-500">
                  （消化 {scheduleStats.elapsedDays}日 / 残り {scheduleStats.remainingDays}日）
                </span>
              </div>
            </div>

            {/* 進捗プログレスバー */}
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden relative shadow-inner">
              <div
                style={{ width: `${scheduleStats.consumptionRate}%` }}
                className={`h-full transition-all duration-300 rounded-full ${
                  scheduleStats.consumptionRate > 90
                    ? 'bg-rose-500'
                    : scheduleStats.consumptionRate > 70
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. 右側: 案件検討メモ・思考スペース（スケジュール3行分相当、リサイズ可能） */}
      <div className="flex-1 bg-amber-50/40 p-2 flex flex-col overflow-hidden relative">
        <div className="flex items-center justify-between pb-1 shrink-0">
          <div className="flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-bold text-slate-800">
              案件メモ・思考スペース
            </span>
            <span className="text-[10px] text-slate-400">
              （考えなければいけないこと、検討事項、打合せ論点など）
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-emerald-600 font-medium flex items-center space-x-0.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>自動保存</span>
            </span>

            {/* 展開・折りたたみボタン */}
            <button
              onClick={toggleCollapse}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-amber-100 rounded-xs cursor-pointer transition-colors"
              title={isCollapsed ? '展開する（広げる）' : '最小化する'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* テキスト入力エリア */}
        {!isCollapsed && (
          <textarea
            value={memo}
            onChange={e => onMemoChange(e.target.value)}
            placeholder="考えなければいけないこと、検討事項、クライアントへの確認事項、備忘録などを自由にメモ..."
            className="flex-1 w-full text-xs p-2 rounded-xs border border-amber-200/80 bg-white text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500 resize-none leading-relaxed shadow-2xs font-sans"
          />
        )}
      </div>

      {/* 下端のドラッグリサイズ用ハンドル（操作して小さくしたり大きくしたり可能） */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute bottom-0 left-0 right-0 h-1.5 hover:h-2 bg-transparent hover:bg-blue-400/50 cursor-row-resize transition-all z-20"
        title="上下にドラッグして高さを自由に調整"
      />
    </div>
  );
}
