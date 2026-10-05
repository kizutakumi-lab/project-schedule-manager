'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { createProjectAction } from '@/app/actions/projects';
import { Project, ProjectStatus } from '@/types';
import { useRouter } from 'next/navigation';

interface HomeClientWrapperProps {
  initialProjects: Project[];
}

export function HomeClientWrapper({ initialProjects }: HomeClientWrapperProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const handleCreate = async (data: {
    project_name: string;
    client_name: string;
    owner: string;
    start_date: string;
    end_date: string;
    status: ProjectStatus;
  }) => {
    try {
      const created = await createProjectAction(data);
      // 即座に画面上の案件一覧を更新
      setProjects(prev => [created, ...prev.filter(p => p.project_id !== created.project_id)]);
      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert('案件の作成に失敗しました: ' + (err?.message || '不明なエラー'));
    }
  };

  return (
    <>
      <Header onOpenCreateModal={() => setIsModalOpen(true)} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">案件一覧</h1>
            <p className="text-xs text-slate-500 mt-1">
              進行中の案件および進行管理シートへアクセスできます
            </p>
          </div>
        </div>

        <ProjectList
          projects={projects}
          setProjects={setProjects}
          onOpenCreateModal={() => setIsModalOpen(true)}
        />
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}
