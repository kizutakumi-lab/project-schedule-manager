'use client';

import React, { useState } from 'react';
import { X, Sparkles, HelpCircle } from 'lucide-react';
import { ScheduleItem } from '@/types';
import { parseBulkScheduleInput } from '@/lib/schedule-engine';

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: Partial<ScheduleItem>[]) => Promise<void>;
  projectId: string;
  allItems: ScheduleItem[];
  defaultParentId?: string | null;
}

const DEFAULT_SAMPLE_TEXT = `シナリオ制作 / 10日 / 佐藤 花子
確認（監修） / 3日 / クライアント
動画コンテ制作 / 8日 / 田中 一郎
確認（監修） / 3日 / クライアント
作画・アニメーション / 15日 / 鈴木 次郎
確認（監修） / 3日 / クライアント
編集・仕上げ / 5日 / 山田 太郎`;

export function BulkAddModal({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  allItems,
  defaultParentId = null,
}: BulkAddModalProps) {
  const [inputText, setInputText] = useState(DEFAULT_SAMPLE_TEXT);
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 親アイテムの候補（大項目または中項目）
  const potentialParents = allItems.filter(
    i => i.item_type === 'category' || i.item_type === 'group'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('工程内容を入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const maxSort = allItems.length > 0
        ? Math.max(...allItems.map(i => i.sort_order || 0))
        : 0;

      const items = parseBulkScheduleInput(
        inputText,
        projectId,
        parentId,
        maxSort + 1
      );

      if (items.length === 0) {
        setError('有効な工程が解析できませんでした');
        return;
      }

      await onSubmit(items);
      onClose();
    } catch (err: any) {
      setError(err?.message || '一括作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800">
              スケジュール一括入力
            </h2>
          </div>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              追加先の親階層
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                工程リスト（1行につき1工程）
              </label>
              <span className="text-[11px] text-slate-500">
                書式: 「工程名 / 営業日数 / 担当者(任意)」
              </span>
            </div>
            <textarea
              rows={8}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="シナリオ制作 / 10日 / 佐藤&#10;監修 / 3日 / クライアント&#10;コンテ制作 / 8日 / 田中"
              className="w-full font-mono text-xs p-3 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/70 text-xs text-amber-800 space-y-1">
            <div className="flex items-center space-x-1 font-semibold text-amber-900">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>自動スケジュール機能</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              登録された各工程は自動的に直前の工程の終了翌営業日から開始されるよう連続設定されます。土日祝日は除外されて営業日ベースで計算されます。
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
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
              {loading ? '生成・保存中...' : '連続スケジュールを生成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
