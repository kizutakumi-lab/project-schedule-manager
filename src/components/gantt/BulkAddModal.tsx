'use client';

import React, { useState } from 'react';
import { X, Sparkles, HelpCircle, FolderPlus, Folder } from 'lucide-react';
import { ScheduleItem, ScheduleItemType } from '@/types';
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
  // 親指定モード: 'existing' (既存の親階層) | 'new' (新規フォルダを作成)
  const [parentMode, setParentMode] = useState<'existing' | 'new'>(defaultParentId ? 'existing' : 'new');
  const [parentId, setParentId] = useState<string | null>(defaultParentId);

  // 新規親階層作成用ステート
  const [newParentType, setNewParentType] = useState<'category' | 'group'>('category');
  const [newParentName, setNewParentName] = useState('');
  const [newParentBelongTo, setNewParentBelongTo] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 既存の大項目・中項目
  const categories = allItems.filter(i => i.item_type === 'category');
  const potentialParents = allItems.filter(
    i => i.item_type === 'category' || i.item_type === 'group'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('工程内容を入力してください');
      return;
    }

    if (parentMode === 'new' && !newParentName.trim()) {
      setError('新規作成する親階層（フォルダ）の名前を入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const maxSort = allItems.length > 0
        ? Math.max(...allItems.map(i => i.sort_order || 0))
        : 0;

      const itemsToCreate: Partial<ScheduleItem>[] = [];
      let targetParentId = parentId;

      // 新規親階層を同時作成する場合
      if (parentMode === 'new') {
        const generatedParentId = `item-${Date.now()}`;
        targetParentId = generatedParentId;

        const newParentItem: Partial<ScheduleItem> = {
          schedule_id: generatedParentId,
          project_id: projectId,
          parent_id: newParentType === 'group' ? (newParentBelongTo || null) : null,
          item_type: newParentType,
          name: newParentName.trim(),
          duration_business_days: 0,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          assignee: '',
          sort_order: maxSort + 1,
          auto_schedule: true,
          dependency_id: null,
          memo: '',
        };

        itemsToCreate.push(newParentItem);
      }

      // 工程リストをパースして追加
      const baseSort = maxSort + (parentMode === 'new' ? 2 : 1);
      const tasks = parseBulkScheduleInput(
        inputText,
        projectId,
        targetParentId,
        baseSort
      );

      if (tasks.length === 0) {
        setError('有効な工程が解析できませんでした');
        return;
      }

      itemsToCreate.push(...tasks);

      await onSubmit(itemsToCreate);
      onClose();
    } catch (err: any) {
      setError(err?.message || '一括作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {/* 親階層の指定（ご要望: 新規フォルダ作成機能を内蔵） */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              追加先の親階層（フォルダ）
            </label>

            {/* モード選択 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setParentMode('new')}
                className={`py-2 px-3 rounded-md border flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
                  parentMode === 'new'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold ring-1 ring-blue-500'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FolderPlus className="w-4 h-4 text-blue-600" />
                <span>新しい親階層を作成</span>
              </button>

              <button
                type="button"
                onClick={() => setParentMode('existing')}
                className={`py-2 px-3 rounded-md border flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
                  parentMode === 'existing'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold ring-1 ring-blue-500'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Folder className="w-4 h-4 text-slate-500" />
                <span>既存の親階層を選択</span>
              </button>
            </div>

            {/* A. 新規親階層を作成する場合 */}
            {parentMode === 'new' && (
              <div className="pt-2 space-y-2.5 text-xs animate-in fade-in duration-100">
                <div className="flex items-center space-x-4">
                  <span className="text-[11px] text-slate-600 font-semibold">階層の種類:</span>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="parentType"
                      checked={newParentType === 'category'}
                      onChange={() => setNewParentType('category')}
                      className="text-blue-600"
                    />
                    <span className="font-semibold text-slate-800">大項目（カテゴリ）</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="parentType"
                      checked={newParentType === 'group'}
                      onChange={() => setNewParentType('group')}
                      className="text-blue-600"
                    />
                    <span className="text-slate-700">中項目（グループ）</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    新しい親階層（フォルダ）の名前 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newParentName}
                    onChange={e => setNewParentName(e.target.value)}
                    placeholder="例: 動画制作、イベント運営、WEB制作 など"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                  />
                </div>

                {newParentType === 'group' && categories.length > 0 && (
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      所属先の大項目（任意）
                    </label>
                    <select
                      value={newParentBelongTo || ''}
                      onChange={e => setNewParentBelongTo(e.target.value || null)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden bg-white"
                    >
                      <option value="">(最上位の大項目にする)</option>
                      {categories.map(c => (
                        <option key={c.schedule_id} value={c.schedule_id}>
                          📁 {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* B. 既存の親階層を選択する場合 */}
            {parentMode === 'existing' && (
              <div className="pt-2 animate-in fade-in duration-100">
                <select
                  value={parentId || ''}
                  onChange={e => setParentId(e.target.value || null)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">(なし - 最上位ルート階層に配置)</option>
                  {potentialParents.map(p => (
                    <option key={p.schedule_id} value={p.schedule_id}>
                      {p.item_type === 'category' ? '📁 大項目: ' : '└ 📂 中項目: '} {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 工程リスト */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                工程リスト（1行につき1工程）
              </label>
              <span className="text-[11px] text-slate-500">
                書式: 「工程名 / 営業日数 / 担当者」
              </span>
            </div>
            <textarea
              rows={7}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="シナリオ制作 / 10日 / 佐藤&#10;確認（監修） / 3日 / クライアント&#10;コンテ制作 / 8日 / 田中"
              className="w-full font-mono text-xs p-3 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 leading-relaxed bg-white"
            />
          </div>

          <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 text-xs text-amber-900 space-y-1">
            <div className="flex items-center space-x-1 font-semibold text-amber-950">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>自動スケジュール機能</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              登録された各工程は自動的に直前の工程の終了翌営業日から開始されるよう連続設定されます。土日祝日は除外されて営業日ベースで計算されます。
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? '生成・保存中...' : '親階層と連続スケジュールを生成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
