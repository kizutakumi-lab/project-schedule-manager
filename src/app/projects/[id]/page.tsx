import { notFound } from 'next/navigation';
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

  // ウォーターフォールを解消し、プロジェクト情報・工程・TODOを並列で高速取得
  const [project, items, todos] = await Promise.all([
    fetchProjectByIdAction(id),
    fetchScheduleItemsAction(id),
    fetchTodosAction(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white flex flex-col">
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
