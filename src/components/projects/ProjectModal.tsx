'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Building, FolderGit2 } from 'lucide-react';
import { Project, ProjectStatus } from '@/types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    project_name: string;
    client_name: string;
    owner: string;
    start_date: string;
    end_date: string;
    status: ProjectStatus;
  }) => Promise<void>;
  initialData?: Project | null;
}

export function ProjectModal({ isOpen, onClose, onSubmit, initialData }: ProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [owner, setOwner] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('planning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setProjectName(initialData.project_name);
      setClientName(initialData.client_name);
      setOwner(initialData.owner);
      setStartDate(initialData.start_date);
      setEndDate(initialData.end_date);
      setStatus(initialData.status);
    } else {
      const today = new Date().toISOString().split('T')[0];
      // デフォルトは3ヶ月後
      const future = new Date();
      future.setMonth(future.getMonth() + 3);
      const futureStr = future.toISOString().split('T')[0];

      setProjectName('');
      setClientName('');
      setOwner('');
      setStartDate(today);
      setEndDate(futureStr);
      setStatus('planning');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('案件名を入力してください');
      return;
    }
    if (!startDate || !endDate) {
      setError('開始日と終了予定日を入力してください');
      return;
    }
    if (startDate > endDate) {
      setError('開始日は終了日以前の日付を指定してください');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        project_name: projectName.trim(),
        client_name: clientName.trim() || '未設定',
        owner: owner.trim() || '未設定',
        start_date: startDate,
        end_date: endDate,
        status,
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
          <div className="flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">
              {initialData ? '案件情報の編集' : '新規案件の作成'}
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
              案件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="例: 2025年度 クリエイティブ総合プロデュース案件"
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>クライアント名</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="例: 株式会社グローバルメディア"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>担当者 (Owner)</span>
              </label>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="例: 山田 太郎"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>開始日 <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>終了予定日 <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
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
              onChange={e => setStatus(e.target.value as ProjectStatus)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="planning">計画中 (Planning)</option>
              <option value="in_progress">進行中 (In Progress)</option>
              <option value="review">レビュー中 (Review)</option>
              <option value="completed">完了 (Completed)</option>
              <option value="on_hold">保留 (On Hold)</option>
            </select>
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
              {loading ? '保存中...' : initialData ? '更新する' : '作成する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
