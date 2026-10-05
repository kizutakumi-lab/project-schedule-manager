'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, ArrowRight, Sparkles, Check, AlertCircle } from 'lucide-react';
import { ScheduleItem } from '@/types';
import { calculateEndDate, getNextOrCurrentBusinessDay, countBusinessDays, addBusinessDays } from '@/lib/business-days';

interface TaskScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ScheduleItem | null;
  clickedDateStr?: string | null; // カレンダーセルをクリックして開いた場合の日付
  onSave: (scheduleId: string, updates: Partial<ScheduleItem>) => void;
}

export function TaskScheduleModal({
  isOpen,
  onClose,
  item,
  clickedDateStr,
  onSave,
}: TaskScheduleModalProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(1);
  const [bufferDays, setBufferDays] = useState<number>(0);
  const [scheduleMode, setScheduleMode] = useState<'fixed' | 'auto'>('fixed');

  useEffect(() => {
    if (item) {
      // クリックされた日付があればそれを優先、なければ現在の開始日
      const initStart = clickedDateStr || item.start_date || new Date().toISOString().split('T')[0];
      setStartDate(initStart);
      setDuration(item.duration_business_days || 1);
      setBufferDays(item.buffer_days || 0);
      // クリック日付指定や手動指定なら 'fixed'、自動連動なら 'auto'
      setScheduleMode(clickedDateStr ? 'fixed' : (item.auto_schedule ? 'auto' : 'fixed'));
    }
  }, [item, clickedDateStr, isOpen]);

  // 終了予定日のリアルタイム計算
  const calculatedEndDate = useMemo(() => {
    if (!startDate || duration <= 0) return '';
    return calculateEndDate(startDate, duration);
  }, [startDate, duration]);

  if (!isOpen || !item) return null;

  const handleApply = () => {
    if (!startDate) {
      alert('開始日を入力してください');
      return;
    }

    onSave(item.schedule_id, {
      start_date: startDate,
      end_date: calculatedEndDate,
      duration_business_days: duration,
      buffer_days: bufferDays,
      auto_schedule: scheduleMode === 'auto',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">
              作業日程・余白（バッファ）の調整
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ボディ */}
        <div className="p-5 space-y-4 text-xs">
          {/* 対象タスク情報 */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
            <div className="text-[11px] text-blue-700 font-semibold mb-0.5">対象工程</div>
            <div className="font-bold text-sm text-slate-900 truncate">{item.name}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2">
              <span>担当: {item.assignee || '未設定'}</span>
              <span>•</span>
              <span>現在: {item.start_date} 〜 {item.end_date} ({item.duration_business_days}営業日)</span>
            </div>
          </div>

          {/* 1. 日程モードの選択 */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">日程調整モード</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleMode('fixed')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                  scheduleMode === 'fixed'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold ring-1 ring-blue-500'
                    : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs">📅 作業IN日を指定</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  8日スタートなど日程を前倒し・固定
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScheduleMode('auto')}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                  scheduleMode === 'auto'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold ring-1 ring-blue-500'
                    : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs">🔄 前工程に自動連動</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  余白（バッファ日数）を設定して連動
                </div>
              </button>
            </div>
          </div>

          {/* 2. モード別の設定入力 */}
          {scheduleMode === 'fixed' ? (
            /* 開始日固定モード */
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  作業IN日（開始日）
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {clickedDateStr && clickedDateStr !== item.start_date && (
                <div className="flex items-center space-x-1.5 text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-md border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>クリックした日付（{clickedDateStr}）を作業IN日に設定しました</span>
                </div>
              )}
            </div>
          ) : (
            /* 自動連動 ＋ 余白（バッファ）設定モード */
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  前工程終了からの待機・余白日数（バッファ）
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={bufferDays}
                    onChange={e => setBufferDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs text-center font-bold text-slate-800"
                  />
                  <span className="text-slate-600 font-medium">営業日空けて作業IN</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  ※ 前工程が終わってから準備やクライアント確認等で少し期間を空けたい場合に指定します。
                </p>
              </div>
            </div>
          )}

          {/* 3. 営業日数（所要日数） */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <div>
              <span className="font-bold text-slate-700 block">営業日数</span>
              <span className="text-[10px] text-slate-500">土日祝日を除いた実働日数</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <input
                type="number"
                min="1"
                max="365"
                value={duration}
                onChange={e => setDuration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-center font-bold text-slate-800"
              />
              <span className="text-slate-600">日</span>
            </div>
          </div>

          {/* 4. 更新後の予定期間プレビュー */}
          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-700 space-y-1">
            <div className="text-[10px] font-semibold text-slate-500">更新後の作業予定期間</div>
            <div className="flex items-center space-x-2 font-bold text-slate-900 text-xs">
              <span>{startDate}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span>{calculatedEndDate}</span>
              <span className="text-[11px] text-blue-700 font-semibold">({duration}営業日)</span>
            </div>
            <div className="text-[10px] text-slate-500 pt-0.5">
              💡 後続の工程もこの変更に合わせて自動的に連動・スライドします。
            </div>
          </div>
        </div>

        {/* フッターボタン */}
        <div className="flex items-center justify-end space-x-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>日程を更新・適用</span>
          </button>
        </div>
      </div>
    </div>
  );
}
