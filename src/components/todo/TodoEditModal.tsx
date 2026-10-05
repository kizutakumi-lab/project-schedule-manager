'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, User, CheckCircle2, Clock } from 'lucide-react';
import { Todo, TodoStatus } from '@/types';

interface TodoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (todo: Partial<Todo>) => Promise<void>;
  initialData?: Todo | null;
  projectId: string;
  defaultAssignee?: string;
  defaultDueDate?: string;
}

export function TodoEditModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  projectId,
  defaultAssignee = '',
  defaultDueDate = '',
}: TodoEditModalProps) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TodoStatus>('open');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setAssignee(initialData.assignee || '');
      setDueDate(initialData.due_date);
      setStatus(initialData.status);
      setMemo(initialData.memo || '');
    } else {
      setTitle('');
      setAssignee(defaultAssignee);
      setDueDate(defaultDueDate || new Date().toISOString().split('T')[0]);
      setStatus('open');
      setMemo('');
    }
    setError(null);
  }, [initialData, isOpen, defaultAssignee, defaultDueDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('TODO内容を入力してください');
      return;
    }
    if (!dueDate) {
      setError('期日を入力してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        project_id: projectId,
        title: title.trim(),
        assignee: assignee.trim() || '未設定',
        due_date: dueDate,
        status,
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
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800">
            {initialData ? 'TODOの確認・編集' : '新規TODOの追加'}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              TODO内容 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: クライアントからロゴデータを受領"
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>担当者</span>
              </label>
              <input
                type="text"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                placeholder="例: 山田 太郎"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>期日 <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ステータス
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TodoStatus)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="open">未完了 (Open)</option>
              <option value="completed">完了 (Completed)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              メモ・備考
            </label>
            <textarea
              rows={2}
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="詳細情報など"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
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
              {loading ? '保存中...' : initialData ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
