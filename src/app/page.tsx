import { fetchProjectsAction } from '@/app/actions/projects';
import { ProjectList } from '@/components/projects/ProjectList';
import { HomeClientWrapper } from '@/components/projects/HomeClientWrapper';

// サーバーコンポーネントとしてSSR高速描画
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const initialProjects = await fetchProjectsAction();

  return (
    <main className="min-h-screen bg-slate-50/60 pb-16">
      <HomeClientWrapper initialProjects={initialProjects} />
    </main>
  );
}
