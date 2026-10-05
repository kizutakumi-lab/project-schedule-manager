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
  const project = await fetchProjectByIdAction(id);

  if (!project) {
    notFound();
  }

  const [items, todos] = await Promise.all([
    fetchScheduleItemsAction(id),
    fetchTodosAction(id),
  ]);

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
