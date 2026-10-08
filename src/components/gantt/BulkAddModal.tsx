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
  RotateCcw,
  Calendar,
  UserPlus,
} from 'lucide-react';
import { ScheduleItem } from '@/types';
import { parseBulkScheduleInput } from '@/lib/schedule-engine';
import {
  ScheduleTemplate,
  getSavedTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  resetTemplatesToDefault,
} from '@/lib/templates';
import {
  getAssigneeOptions,
  addAssigneeOption,
} from '@/lib/assignees';

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: Partial<ScheduleItem>[]) => Promise<void>;
  projectId: string;
  allItems: ScheduleItem[];
  defaultParentId?: string | null;
  clientName?: string;
  projectStartDate?: string;
}

export function BulkAddModal({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  allItems,
  defaultParentId = null,
  clientName = 'クライアント',
  projectStartDate,
}: BulkAddModalProps) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isTemplateManageOpen, setIsTemplateManageOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // 担当者候補一覧
  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([]);
  const [newAssigneeInput, setNewAssigneeInput] = useState('');
  const [isAddingAssignee, setIsAddingAssignee] = useState(false);

  // 親指定モード: 'new' (新規フォルダを作成) | 'existing' (既存の親階層)
  const [parentMode, setParentMode] = useState<'new' | 'existing'>(
    defaultParentId ? 'existing' : 'new'
  );
  const [parentId, setParentId] = useState<string | null>(defaultParentId);

  // 新規親階層作成用ステート
  const [newParentType, setNewParentType] = useState<'category' | 'group'>('category');
  const [newParentName, setNewParentName] = useState('アニメーション制作');
  const [newParentBelongTo, setNewParentBelongTo] = useState<string | null>(null);

  // 作業開始日の指定モード: 'specified' (指定日/キックオフ日) | 'continue' (直前工程の後)
  const defaultInitDate = projectStartDate || new Date().toISOString().split('T')[0];
  const [startMode, setStartMode] = useState<'specified' | 'continue'>('specified');
  const [specifiedStartDate, setSpecifiedStartDate] = useState<string>(defaultInitDate);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // テンプレート & 担当者読み込み
  const reloadData = () => {
    const list = getSavedTemplates();
    setTemplates(list);
    const assignees = getAssigneeOptions(clientName);
    setAssigneeOptions(assignees);
    return { list, assignees };
  };

  useEffect(() => {
    if (isOpen) {
      const { list } = reloadData();
      if (list.length > 0 && !inputText) {
        applyTemplate(list[0]);
      }
      setSpecifiedStartDate(projectStartDate || new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, projectStartDate]);

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
    reloadData();
    setSelectedTemplateId(saved.id);
    setSuccessNotice(`テンプレート「${saved.name}」を保存しました！`);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // テンプレート削除（標準・カスタム問わず可能）
  const handleDeleteTemplate = (id: string, name: string) => {
    if (!confirm(`テンプレート「${name}」を削除してもよろしいですか？`)) return;
    deleteCustomTemplate(id);
    const { list } = reloadData();
    if (selectedTemplateId === id && list.length > 0) {
      applyTemplate(list[0]);
    } else if (list.length === 0) {
      setSelectedTemplateId('');
    }
  };

  // テンプレート初期化リセット
  const handleResetTemplates = () => {
    if (!confirm('テンプレートを初期標準セットに戻しますか？')) return;
    const resetList = resetTemplatesToDefault();
    setTemplates(resetList);
    if (resetList.length > 0) applyTemplate(resetList[0]);
  };

  // 担当者候補の新規追加
  const handleAddAssignee = () => {
    if (!newAssigneeInput.trim()) return;
    const updated = addAssigneeOption(newAssigneeInput.trim(), clientName);
    setAssigneeOptions(updated);
    setNewAssigneeInput('');
    setIsAddingAssignee(false);
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
        const generatedParentId = `folder-${Date.now()}`;
        targetParentId = generatedParentId;

        const newParentItem: Partial<ScheduleItem> = {
          schedule_id: generatedParentId,
          project_id: projectId,
          parent_id: newParentType === 'group' ? (newParentBelongTo || null) : null,
          item_type: newParentType,
          name: newParentName.trim(),
          duration_business_days: 0,
          start_date: startMode === 'specified' ? specifiedStartDate : new Date().toISOString().split('T')[0],
          end_date: startMode === 'specified' ? specifiedStartDate : new Date().toISOString().split('T')[0],
          assignee: '',
          sort_order: maxSort + 1,
          auto_schedule: true,
          dependency_id: null,
          memo: '',
        };

        itemsToCreate.push(newParentItem);
      }

      // 工程リストをパースして追加（開始日指定がある場合は先頭工程に反映）
      const baseSort = maxSort + (parentMode === 'new' ? 2 : 1);
      const effectiveStartDate = startMode === 'specified' ? specifiedStartDate : null;

      const tasks = parseBulkScheduleInput(
        inputText,
        projectId,
        targetParentId,
        baseSort,
        effectiveStartDate
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94vh]">
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
                <span>テンプレートを選択（標準も自由に削除可能）</span>
              </span>
              <button
                type="button"
                onClick={() => setIsTemplateManageOpen(!isTemplateManageOpen)}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline flex items-center space-x-1 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>テンプレートの削除・整理</span>
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
                {templates.length === 0 ? (
                  <option value="">(登録済みテンプレートはありません)</option>
                ) : (
                  templates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      📋 {tpl.name}
                    </option>
                  ))
                )}
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
                    placeholder="例: 自社アニメ制作・動画案件用 など"
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

            {/* テンプレート管理（標準含め全削除可能 ＋ 初期化リセット機能） */}
            {isTemplateManageOpen && (
              <div className="p-2.5 bg-white rounded-md border border-slate-300 space-y-2 animate-in fade-in duration-100">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-bold text-[11px] text-slate-700">
                    テンプレート一覧（不要なものは標準・自作問わず削除できます）:
                  </span>
                  <button
                    type="button"
                    onClick={handleResetTemplates}
                    className="text-[10px] text-slate-500 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
                    title="初期標準セットを再読み込み"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>初期セットに戻す</span>
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-100">
                  {templates.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-1">
                      テンプレートはありません。「初期セットに戻す」か「この内容をテンプレ保存」で追加できます。
                    </div>
                  ) : (
                    templates.map(t => (
                      <div key={t.id} className="pt-1 flex items-center justify-between text-[11px]">
                        <span className="text-slate-800 truncate pr-2">
                          📋 {t.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(t.id, t.name)}
                          className="text-rose-600 hover:text-rose-800 p-1 rounded-sm hover:bg-rose-50 cursor-pointer shrink-0 flex items-center space-x-0.5"
                          title="このテンプレートを削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px]">削除</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. 作業開始日（キックオフ日等）の指定（ご要望対応） */}
          <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>作業開始日（キックオフ日）の設定</span>
              </label>
              <span className="text-[10px] text-emerald-800 font-medium">
                ※ 複数フォルダを同じキックオフから並行開始できます
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStartMode('specified')}
                className={`py-2 px-3 rounded-md border text-left cursor-pointer transition-all ${
                  startMode === 'specified'
                    ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-bold ring-1 ring-emerald-500'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs">📅 開始日（キックオフ日）を指定</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  案件開始日や今日、特定の日からスタート
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStartMode('continue')}
                className={`py-2 px-3 rounded-md border text-left cursor-pointer transition-all ${
                  startMode === 'continue'
                    ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-bold ring-1 ring-emerald-500'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs">🔄 直前工程の後から連動</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  既存の最後の工程の終了翌日から連結
                </div>
              </button>
            </div>

            {startMode === 'specified' && (
              <div className="pt-1.5 flex items-center space-x-3 bg-white p-2.5 rounded-md border border-emerald-300 animate-in fade-in duration-75">
                <span className="text-[11px] font-bold text-slate-700 shrink-0">
                  指定開始日:
                </span>
                <input
                  type="date"
                  value={specifiedStartDate}
                  onChange={e => setSpecifiedStartDate(e.target.value)}
                  className="bg-emerald-50 border border-emerald-300 rounded px-2.5 py-1 text-xs font-bold text-emerald-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setSpecifiedStartDate(projectStartDate || new Date().toISOString().split('T')[0])}
                  className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                >
                  案件開始日に戻す
                </button>
              </div>
            )}
          </div>

          {/* 3. 親階層（フォルダ）の作成・指定 */}
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

          {/* 4. 工程リスト & クイック入力補助 */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                工程リスト（1行につき1工程）
              </label>

              {/* 担当者・並行作業のクイック挿入バッジ */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500">ワンクリック追加:</span>
                {assigneeOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleInsertAssignee(opt)}
                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold cursor-pointer truncate max-w-[120px]"
                    title={`担当者「${opt}」の工程を追加`}
                  >
                    + {opt}
                  </button>
                ))}

                {isAddingAssignee ? (
                  <div className="inline-flex items-center space-x-1">
                    <input
                      type="text"
                      value={newAssigneeInput}
                      onChange={e => setNewAssigneeInput(e.target.value)}
                      placeholder="候補名"
                      className="w-16 px-1.5 py-0.5 text-[10px] border border-blue-400 rounded bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddAssignee}
                      className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold"
                    >
                      追加
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingAssignee(false)}
                      className="text-slate-400 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingAssignee(true)}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] flex items-center space-x-0.5 cursor-pointer"
                    title="新しい担当者候補を追加"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>候補追加</span>
                  </button>
                )}

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
              <span>自動スケジュール ＆ 開始日の指定について</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              「指定した日付から開始」を選ぶと、既存工程の最終日を待たずに指定キックオフ日から即座に工程を開始できます。各工程は営業日（土日祝除外）で自動計算されます。
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
