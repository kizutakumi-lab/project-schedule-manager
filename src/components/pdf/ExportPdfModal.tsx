'use client';

import React, { useState } from 'react';
import { X, Printer, Eye, EyeOff, FileDown, Check } from 'lucide-react';
import { Project, ScheduleItem, Todo } from '@/types';
import { CalendarDay, getBarPosition, getTaskColorTheme } from '@/lib/date-utils';

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
  const [showAssignee, setShowAssignee] = useState(false); // クライアント提出のためデフォルト非表示
  const [showTodos, setShowTodos] = useState(false);       // クライアント提出のためデフォルト非表示
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              進行管理表 PDF / 印刷出力
            </h2>
            <p className="text-xs text-slate-500">
              クライアント提出用 A4横向きレイアウト
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 設定バー */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-6 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">出力オプション:</span>
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAssignee}
                onChange={e => setShowAssignee(e.target.checked)}
                className="rounded-sm text-blue-600 focus:ring-blue-500"
              />
              <span>担当者名を含める（社内用）</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTodos}
                onChange={e => setShowTodos(e.target.checked)}
                className="rounded-sm text-blue-600 focus:ring-blue-500"
              />
              <span>TODOセクションを含める</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>印刷 / PDF保存</span>
            </button>
          </div>
        </div>

        {/* プレビュー領域 */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          <div
            id="printable-schedule"
            className="bg-white p-8 rounded-lg shadow-sm border border-slate-300 max-w-[1100px] mx-auto text-xs text-slate-800"
          >
            {/* 提出用ヘッダー */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {project.project_name} 進行管理表
                </h1>
                <div className="flex items-center space-x-4 text-xs text-slate-600 mt-1">
                  <span>クライアント: <strong>{project.client_name}</strong> 御中</span>
                  <span>期間: {project.start_date} 〜 {project.end_date}</span>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>発行日: {todayStr}</div>
                {showAssignee && <div>担当: {project.owner}</div>}
              </div>
            </div>

            {/* スケジュールテーブル */}
            <div className="border border-slate-300 rounded-xs overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
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
                            ? 'bg-slate-200/70 font-bold text-slate-900'
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
                        <td className="p-2 border-r border-slate-300 text-center">
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

            {/* TODOセクション（オプション） */}
            {showTodos && todos.length > 0 && (
              <div className="border border-slate-300 rounded-xs overflow-hidden">
                <div className="bg-slate-100 p-2 font-bold border-b border-slate-300 text-[11px]">
                  主要タスク・マイルストーン TODO
                </div>
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="p-2 border-r border-slate-200">内容</th>
                      <th className="p-2 border-r border-slate-200 w-24 text-center">期日</th>
                      <th className="p-2 border-r border-slate-200 w-20 text-center">状態</th>
                      {showAssignee && <th className="p-2 border-r border-slate-200 w-24">担当</th>}
                      <th className="p-2">メモ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todos.map(t => (
                      <tr key={t.todo_id}>
                        <td className="p-2 border-r border-slate-200 font-medium">{t.title}</td>
                        <td className="p-2 border-r border-slate-200 text-center">{t.due_date}</td>
                        <td className="p-2 border-r border-slate-200 text-center">
                          {t.status === 'completed' ? '完了' : '未完了'}
                        </td>
                        {showAssignee && (
                          <td className="p-2 border-r border-slate-200">{t.assignee}</td>
                        )}
                        <td className="p-2 text-slate-500">{t.memo || '-'}</td>
                      </tr>
                    ))}
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
