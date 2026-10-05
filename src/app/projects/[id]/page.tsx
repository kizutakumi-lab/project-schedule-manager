import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building, Calendar, User, Clock } from 'lucide-react';
import { Header } from '@/components/Header';
import { GanttContainer } from '@/components/gantt/GanttContainer';
import { fetchProjectByIdAction } from '@/app/actions/projects';
import { fetchScheduleItemsAction } from '@/app/actions/schedules';
import { fetchTodosAction } from '@/app/actions/todos';

export const dynamic = 'force-dynamic';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await fetchProjectByIdAction(id);

  if (!project) {
    notFound();
  }

  const [items, todos] = await Promise.all([
    fetchScheduleItemsAction(id),
    fetchTodosAction(id),
  ]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* サブヘッダー: 案件基本情報バー */}
      <div className="no-print bg-slate-900 text-white px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="inline-flex items-center space-x-1 text-slate-300 hover:text-white px-2 py-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>案件一覧</span>
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <h1 className="font-bold text-sm tracking-tight text-white flex items-center space-x-2">
            <span>{project.project_name}</span>
          </h1>
        </div>

        <div className="flex items-center space-x-4 text-slate-300 text-[11px]">
          <div className="flex items-center space-x-1">
            <Building className="w-3 h-3 text-slate-400" />
            <span>{project.client_name}</span>
          </div>
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3 text-slate-400" />
            <span>{project.owner}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{project.start_date} 〜 {project.end_date}</span>
          </div>
        </div>
      </div>

      {/* ガントチャート本体 */}
      <main className="flex-1 overflow-hidden">
        <GanttContainer
          project={project}
          initialItems={items}
          initialTodos={todos}
        />
      </main>
    </div>
  );
}
