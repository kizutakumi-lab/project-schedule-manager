'use client';

import React, { useState } from 'react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = async (data: {
    project_name: string;
    client_name: string;
    owner: string;
    start_date: string;
    end_date: string;
    status: ProjectStatus;
  }) => {
    const created = await createProjectAction(data);
    setIsModalOpen(false);
    router.refresh();
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

        <ProjectList initialProjects={initialProjects} />
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}
