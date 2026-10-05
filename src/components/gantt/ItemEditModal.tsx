'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, Link as LinkIcon, Clock } from 'lucide-react';
import { ScheduleItem, ScheduleItemType } from '@/types';

interface ItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Partial<ScheduleItem>) => Promise<void>;
  initialData?: ScheduleItem | null;
  allItems: ScheduleItem[];
  defaultParentId?: string | null;
  defaultType?: ScheduleItemType;
}

export function ItemEditModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  allItems,
  defaultParentId = null,
  defaultType = 'task',
}: ItemEditModalProps) {
  const [name, setName] = useState('');
  const [itemType, setItemType] = useState<ScheduleItemType>('task');
  const [parentId, setParentId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [startDate, setStartDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [dependencyId, setDependencyId] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setItemType(initialData.item_type);
      setParentId(initialData.parent_id);
      setDuration(initialData.duration_business_days || 1);
      setStartDate(initialData.start_date);
      setAssignee(initialData.assignee || '');
      setAutoSchedule(initialData.auto_schedule);
      setDependencyId(initialData.dependency_id);
      setMemo(initialData.memo || '');
    } else {
      setName('');
      setItemType(defaultType);
      setParentId(defaultParentId);
      setDuration(1);
      setStartDate('');
      setAssignee('');
      setAutoSchedule(true);
      setDependencyId(null);
      setMemo('');
    }
    setError(null);
  }, [initialData, isOpen, defaultParentId, defaultType]);

  if (!isOpen) return null;

  // 親アイテムの候補（大項目または中項目）
  const potentialParents = allItems.filter(
    i => (i.item_type === 'category' || i.item_type === 'group') && i.schedule_id !== initialData?.schedule_id
  );

  // 依存先工程の候補（taskのみ）
  const potentialDependencies = allItems.filter(
    i => i.item_type === 'task' && i.schedule_id !== initialData?.schedule_id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('工程名を入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        item_type: itemType,
        parent_id: parentId,
        duration_business_days: itemType === 'task' ? Math.max(1, duration) : duration,
        start_date: startDate,
        assignee: assignee.trim(),
        auto_schedule: autoSchedule,
        dependency_id: dependencyId || null,
        memo: memo.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800">
            {initialData ? '工程の編集' : '工程の新規追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                種別
              </label>
              <select
                value={itemType}
                onChange={e => setItemType(e.target.value as ScheduleItemType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="category">大項目 (Category)</option>
                <option value="group">中項目 (Group)</option>
                <option value="task">工程・タスク (Task)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                親階層
              </label>
              <select
                value={parentId || ''}
                onChange={e => setParentId(e.target.value || null)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">(なし - ルート階層)</option>
                {potentialParents.map(p => (
                  <option key={p.schedule_id} value={p.schedule_id}>
                    {p.item_type === 'category' ? '📁 ' : '└ 📂 '} {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              工程名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: シナリオ制作 / クライアント確認 / コンテ制作"
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {itemType === 'task' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>必要営業日数</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>担当者</span>
                  </label>
                  <input
                    type="text"
                    value={assignee}
                    onChange={e => setAssignee(e.target.value)}
                    placeholder="例: 山田 太郎 / クライアント"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 日程設定モード */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    スケジュール計算方式
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={autoSchedule}
                        onChange={() => setAutoSchedule(true)}
                        className="mr-1 text-blue-600 focus:ring-blue-500"
                      />
                      <span>自動計算（前工程の翌営業日）</span>
                    </label>
                    <label className="inline-flex items-center text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={!autoSchedule}
                        onChange={() => setAutoSchedule(false)}
                        className="mr-1 text-blue-600 focus:ring-blue-500"
                      />
                      <span>手動開始日</span>
                    </label>
                  </div>
                </div>

                {!autoSchedule ? (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>開始日を指定</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center space-x-1">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>特定の先行工程に連動（任意）</span>
                    </label>
                    <select
                      value={dependencyId || ''}
                      onChange={e => setDependencyId(e.target.value || null)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">(直前の先行工程に自動連動)</option>
                      {potentialDependencies.map(dep => (
                        <option key={dep.schedule_id} value={dep.schedule_id}>
                          {dep.name} ({dep.start_date} 〜 {dep.end_date})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>メモ・備考</span>
            </label>
            <textarea
              rows={2}
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="詳細情報や注意点など"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? '保存中...' : initialData ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
