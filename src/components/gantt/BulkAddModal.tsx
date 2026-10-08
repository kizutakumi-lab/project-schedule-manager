'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  HelpCircle,
  FolderPlus,
  Folder,
  BookmarkPlus,
  Trash2,
  Settings,
  ChevronDown,
  Layers,
  UserCheck,
  Split,
} from 'lucide-react';
import { ScheduleItem } from '@/types';
import { parseBulkScheduleInput } from '@/lib/schedule-engine';
import {
  ScheduleTemplate,
  getSavedTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
} from '@/lib/templates';

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: Partial<ScheduleItem>[]) => Promise<void>;
  projectId: string;
  allItems: ScheduleItem[];
  defaultParentId?: string | null;
  clientName?: string;
}

export function BulkAddModal({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  allItems,
  defaultParentId = null,
  clientName = 'クライアント',
}: BulkAddModalProps) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isTemplateManageOpen, setIsTemplateManageOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // 親指定モード: 'existing' (既存の親階層) | 'new' (新規フォルダを作成)
  const [parentMode, setParentMode] = useState<'existing' | 'new'>(
    defaultParentId ? 'existing' : 'new'
  );
  const [parentId, setParentId] = useState<string | null>(defaultParentId);

  // 新規親階層作成用ステート
  const [newParentType, setNewParentType] = useState<'category' | 'group'>('category');
  const [newParentName, setNewParentName] = useState('アニメーション制作');
  const [newParentBelongTo, setNewParentBelongTo] = useState<string | null>(null);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // テンプレート読み込み
  const reloadTemplates = () => {
    const list = getSavedTemplates();
    setTemplates(list);
    return list;
  };

  useEffect(() => {
    if (isOpen) {
      const list = reloadTemplates();
      // デフォルトテンプレートを初期選択
      if (list.length > 0 && !inputText) {
        applyTemplate(list[0]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 既存の大項目・中項目
  const categories = allItems.filter(i => i.item_type === 'category');
  const potentialParents = allItems.filter(
    i => i.item_type === 'category' || i.item_type === 'group'
  );

  // テンプレート適用
  const applyTemplate = (tpl: ScheduleTemplate) => {
    setSelectedTemplateId(tpl.id);
    setNewParentType(tpl.parentType);
    setNewParentName(tpl.defaultCategoryName);
    // クライアント名を案件のクライアント名に自然に置換
    let content = tpl.content;
    if (clientName && clientName !== 'クライアント') {
      content = content.replace(/クライアント/g, clientName);
    }
    setInputText(content);
  };

  // テンプレート新規保存
  const handleSaveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('テンプレート名を入力してください');
      return;
    }
    if (!inputText.trim()) {
      alert('工程リストの内容を入力してください');
      return;
    }

    const saved = saveCustomTemplate({
      name: newTemplateName.trim(),
      description: 'ユーザー作成テンプレート',
      parentType: newParentType,
      defaultCategoryName: newParentName.trim() || '新規カテゴリ',
      content: inputText.trim(),
    });

    setNewTemplateName('');
    setIsSavingTemplate(false);
    reloadTemplates();
    setSelectedTemplateId(saved.id);
    setSuccessNotice(`テンプレート「${saved.name}」を保存しました！`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // テンプレート削除
  const handleDeleteTemplate = (id: string, name: string) => {
    if (!confirm(`テンプレート「${name}」を削除してもよろしいですか？`)) return;
    deleteCustomTemplate(id);
    const updated = reloadTemplates();
    if (selectedTemplateId === id && updated.length > 0) {
      applyTemplate(updated[0]);
    }
  };

  // 担当者クイック挿入
  const handleInsertAssignee = (nameToInsert: string) => {
    setInputText(prev => {
      if (!prev) return `新規工程 / 3日 / ${nameToInsert}\n`;
      return `${prev.trimEnd()}\n新規工程 / 3日 / ${nameToInsert}\n`;
    });
  };

  // 並行工程クイック挿入
  const handleInsertParallel = () => {
    setInputText(prev => {
      if (!prev) return `並行作業 / 3日 / DLE / 並行\n`;
      return `${prev.trimEnd()}\n並行作業 / 3日 / DLE / 並行\n`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('工程内容を入力してください');
      return;
    }

    if (parentMode === 'new' && !newParentName.trim()) {
      setError('新規作成するフォルダ（大項目・中項目）の名前を入力してください');
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

      // 新規フォルダ（大項目・中項目）を同時作成する場合
      if (parentMode === 'new') {
        // 親フォルダ用の一意なID
        const generatedParentId = `folder-${Date.now()}`;
        targetParentId = generatedParentId;

        const newParentItem: Partial<ScheduleItem> = {
          schedule_id: generatedParentId,
          project_id: projectId,
          parent_id: newParentType === 'group' ? (newParentBelongTo || null) : null,
          item_type: newParentType,
          name: newParentName.trim(),
          duration_business_days: 0, // 親フォルダは子要素から自動集計されるため0
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

  const currentClient = clientName || 'クライアント';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">
              スケジュール一括入力 ＆ フォルダ自動生成
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
          {successNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md font-medium">
              {successNotice}
            </div>
          )}

          {/* 1. テンプレート選択エリア */}
          <div className="bg-gradient-to-r from-amber-50/60 to-blue-50/60 p-3 rounded-lg border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>テンプレートを選択して自動反映（手入力も可能）</span>
              </span>
              <button
                type="button"
                onClick={() => setIsTemplateManageOpen(!isTemplateManageOpen)}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline flex items-center space-x-1 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>テンプレート管理・削除</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedTemplateId}
                onChange={e => {
                  const found = templates.find(t => t.id === e.target.value);
                  if (found) applyTemplate(found);
                }}
                className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                {templates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.isCustom ? '⭐ [自作] ' : '📋 '} {tpl.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsSavingTemplate(!isSavingTemplate)}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md font-semibold text-[11px] shrink-0 cursor-pointer flex items-center space-x-1 shadow-2xs"
                title="現在の入力内容を新しいテンプレートとして保存"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-amber-600" />
                <span>この内容をテンプレ保存</span>
              </button>
            </div>

            {/* テンプレート新規保存フォーム */}
            {isSavingTemplate && (
              <div className="p-2.5 bg-white rounded-md border border-amber-300 space-y-2 animate-in fade-in duration-100">
                <label className="block text-[11px] font-bold text-slate-700">
                  保存する新しいテンプレートの名前:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="例: 社内動画制作・3DCG案件用 など"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAsTemplate}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md cursor-pointer"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSavingTemplate(false)}
                    className="px-2 py-1 text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}

            {/* テンプレート管理（削除など） */}
            {isTemplateManageOpen && (
              <div className="p-2.5 bg-white rounded-md border border-slate-300 space-y-1.5 animate-in fade-in duration-100">
                <div className="font-bold text-[11px] text-slate-700 mb-1">
                  登録済みテンプレート一覧（自作テンプレートは削除可能）:
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100">
                  {templates.map(t => (
                    <div key={t.id} className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-800">
                        {t.isCustom ? '⭐ ' : '📋 '} {t.name}
                      </span>
                      {t.isCustom ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(t.id, t.name)}
                          className="text-rose-600 hover:text-rose-800 p-0.5 rounded cursor-pointer"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">標準組み込み</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. 親階層（フォルダ）の作成・指定 */}
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
                <span>新しいフォルダ（親階層）を作成</span>
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
                <span>既存のフォルダを選択</span>
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
                    <span className="font-semibold text-slate-800">📁 大項目（カテゴリ）</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="parentType"
                      checked={newParentType === 'group'}
                      onChange={() => setNewParentType('group')}
                      className="text-blue-600"
                    />
                    <span className="text-slate-700">📂 中項目（グループ）</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    新しいフォルダの名前 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newParentName}
                    onChange={e => setNewParentName(e.target.value)}
                    placeholder="例: 動画制作、アニメーション、WEBサイト制作 など"
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

          {/* 3. 工程リスト & クイック入力補助 */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                工程リスト（1行につき1工程）
              </label>
              {/* 担当者・並行作業のクイック挿入バッジ */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-slate-500">ワンクリック追加:</span>
                <button
                  type="button"
                  onClick={() => handleInsertAssignee('DLE')}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold cursor-pointer"
                >
                  + DLE担当
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertAssignee(currentClient)}
                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-semibold cursor-pointer truncate max-w-[140px]"
                >
                  + {currentClient}担当
                </button>
                <button
                  type="button"
                  onClick={handleInsertParallel}
                  className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-semibold cursor-pointer"
                  title="直前の工程と同じ期間で並行して進める"
                >
                  + 並行作業
                </button>
              </div>
            </div>

            <textarea
              rows={8}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="シナリオ制作 / 10日 / DLE&#10;確認（監修） / 3日 / クライアント&#10;作画 / 15日 / DLE&#10;音響制作 / 10日 / DLE / 並行"
              className="w-full font-mono text-xs p-3 border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500 leading-relaxed bg-white"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>書式: 「工程名 / 営業日数 / 担当者 / 並行(任意)」</span>
              <span className="text-purple-600 font-medium">※末尾に「並行」を入れると直前工程と同じ開始日で並行進行します</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 text-xs text-amber-900 space-y-1">
            <div className="flex items-center space-x-1 font-semibold text-amber-950">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>自動スケジュール ＆ 並行作業の仕組み</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              登録された各工程は自動的に直前の工程の終了翌営業日から開始されます。「並行」と指定した工程は直前工程と同じ期間・開始日に配置され、後続工程は並行作業のうち最も遅い工程の終了翌営業日から開始されます。
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'フォルダ作成・保存中...' : 'フォルダと連続スケジュールを一括生成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
