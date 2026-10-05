'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Calendar,
  Building,
  User,
  ArrowRight,
  MoreVertical,
  Edit2,
  Trash2,
  Plus,
  Clock,
  Layers,
} from 'lucide-react';
import { Project, ProjectStatus } from '@/types';
import { ProjectModal } from './ProjectModal';
import {
  createProjectAction,
  updateProjectAction,
  deleteProjectAction,
} from '@/app/actions/projects';

const STATUS_LABELS: Record<ProjectStatus, { text: string; bg: string; textCol: string; border: string }> = {
  planning: { text: '計画中', bg: 'bg-slate-100', textCol: 'text-slate-700', border: 'border-slate-200' },
  in_progress: { text: '進行中', bg: 'bg-blue-50', textCol: 'text-blue-700', border: 'border-blue-200' },
  review: { text: 'レビュー中', bg: 'bg-amber-50', textCol: 'text-amber-700', border: 'border-amber-200' },
  completed: { text: '完了', bg: 'bg-emerald-50', textCol: 'text-emerald-700', border: 'border-emerald-200' },
  on_hold: { text: '保留', bg: 'bg-rose-50', textCol: 'text-rose-700', border: 'border-rose-200' },
};

interface ProjectListProps {
  initialProjects?: Project[];
  projects?: Project[];
  setProjects?: React.Dispatch<React.SetStateAction<Project[]>>;
  onOpenCreateModal?: () => void;
}

export function ProjectList({
  initialProjects = [],
  projects: controlledProjects,
  setProjects: controlledSetProjects,
  onOpenCreateModal,
}: ProjectListProps) {
  const [internalProjects, setInternalProjects] = useState<Project[]>(initialProjects);

  React.useEffect(() => {
    setInternalProjects(initialProjects);
  }, [initialProjects]);

  const projects = controlledProjects !== undefined ? controlledProjects : internalProjects;
  const setProjects = controlledSetProjects !== undefined ? controlledSetProjects : setInternalProjects;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // ユニークなクライアントと担当者のリスト
  const clients = useMemo(() => {
    return Array.from(new Set(projects.map(p => p.client_name).filter(Boolean)));
  }, [projects]);

  const owners = useMemo(() => {
    return Array.from(new Set(projects.map(p => p.owner).filter(Boolean)));
  }, [projects]);

  // フィルタリング処理（1000件規模でも軽量）
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (statusFilter !== 'all' && project.status !== statusFilter) return false;
      if (clientFilter !== 'all' && project.client_name !== clientFilter) return false;
      if (ownerFilter !== 'all' && project.owner !== ownerFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = project.project_name.toLowerCase().includes(q);
        const matchClient = project.client_name.toLowerCase().includes(q);
        const matchOwner = project.owner.toLowerCase().includes(q);
        if (!matchName && !matchClient && !matchOwner) return false;
      }

      return true;
    });
  }, [projects, statusFilter, clientFilter, ownerFilter, searchQuery]);

  const handleCreateOrUpdate = async (data: {
    project_name: string;
    client_name: string;
    owner: string;
    start_date: string;
    end_date: string;
    status: ProjectStatus;
  }) => {
    if (editingProject) {
      const res = await updateProjectAction(
        editingProject.project_id,
        data,
        editingProject.updated_at
      );
      if (res.conflict) {
        alert(res.message);
        return;
      }
      if (res.data) {
        setProjects(prev =>
          prev.map(p => (p.project_id === editingProject.project_id ? res.data! : p))
        );
      }
    } else {
      const newProj = await createProjectAction(data);
      setProjects(prev => [newProj, ...prev]);
    }
  };

  const handleDelete = async (project: Project) => {
    if (
      !confirm(
        `案件「${project.project_name}」を削除してもよろしいですか？\n紐づく工程やTODOも削除されます。`
      )
    ) {
      return;
    }
    const ok = await deleteProjectAction(project.project_id);
    if (ok) {
      setProjects(prev => prev.filter(p => p.project_id !== project.project_id));
    } else {
      alert('削除に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      {/* 検索・絞り込みフィルターバー */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="案件名・クライアント・担当者で検索..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>絞り込み:</span>
            </div>

            {/* ステータス */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              <option value="all">すべてのステータス</option>
              <option value="planning">計画中</option>
              <option value="in_progress">進行中</option>
              <option value="review">レビュー中</option>
              <option value="completed">完了</option>
              <option value="on_hold">保留</option>
            </select>

            {/* クライアント */}
            {clients.length > 0 && (
              <select
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-700 max-w-[150px] truncate"
              >
                <option value="all">全クライアント</option>
                {clients.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* 担当者 */}
            {owners.length > 0 && (
              <select
                value={ownerFilter}
                onChange={e => setOwnerFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-700"
              >
                <option value="all">全担当者</option>
                {owners.map(o => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}

            {(statusFilter !== 'all' || clientFilter !== 'all' || ownerFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setClientFilter('all');
                  setOwnerFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 font-medium cursor-pointer"
              >
                リセット
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>表示中: <strong className="text-slate-800 font-semibold">{filteredProjects.length}</strong> 件 （全 {projects.length} 件）</span>
        </div>
      </div>

      {/* 案件一覧テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">該当する案件が見つかりませんでした</p>
            <p className="text-slate-400 text-xs mt-1">検索条件を変更するか、新規案件を作成してください</p>
            <button
              onClick={() => {
                setEditingProject(null);
                setIsModalOpen(true);
              }}
              className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新規案件を作成</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">案件名</th>
                  <th className="py-3 px-4">クライアント</th>
                  <th className="py-3 px-4">担当者</th>
                  <th className="py-3 px-4">期間</th>
                  <th className="py-3 px-4">ステータス</th>
                  <th className="py-3 px-4">最終更新</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map(project => {
                  const statusInfo = STATUS_LABELS[project.status] || STATUS_LABELS.planning;
                  const updatedDate = project.updated_at
                    ? new Date(project.updated_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-';

                  return (
                    <tr
                      key={project.project_id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <Link
                          href={`/projects/${project.project_id}`}
                          className="hover:text-blue-600 hover:underline flex items-center space-x-2"
                        >
                          <span>{project.project_name}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1 text-slate-700">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{project.client_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1 text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{project.owner}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{project.start_date} 〜 {project.end_date}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.textCol} ${statusInfo.border}`}
                        >
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{updatedDate}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Link
                            href={`/projects/${project.project_id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="進行管理（ガントチャート）を開く"
                          >
                            <span className="sr-only">開く</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setEditingProject(project);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="案件編集"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(project)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="案件削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 案件作成・編集モーダル */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingProject}
      />
    </div>
  );
}
