import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white flex flex-col select-none">
      {/* ツールバー スケルトン */}
      <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="space-y-1.5">
            <div className="w-48 h-4 bg-slate-200 rounded animate-pulse" />
            <div className="w-32 h-3 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md font-medium animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>スケジュールデータを読込中...</span>
          </div>
          <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse" />
          <div className="w-24 h-8 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </header>

      {/* サマリーバー スケルトン */}
      <div className="h-10 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-28 h-4 bg-slate-200 rounded animate-pulse" />
          <div className="w-40 h-4 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="w-36 h-4 bg-slate-200 rounded animate-pulse" />
      </div>

      {/* ガントチャート本体 スケルトン */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左側ツリーカラム */}
        <div className="w-[360px] border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="h-12 border-b border-slate-200 bg-slate-50/80 px-3 flex items-center justify-between">
            <div className="w-24 h-3.5 bg-slate-200 rounded animate-pulse" />
            <div className="w-16 h-3 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-slate-100 p-2 space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="flex items-center space-x-2 py-2">
                <div className="w-4 h-4 rounded bg-slate-100 animate-pulse" />
                <div
                  className="h-4 bg-slate-100 rounded animate-pulse"
                  style={{ width: `${(i % 3 + 1) * 28 + 30}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 右側タイムラインカラム */}
        <div className="flex-1 bg-slate-50/30 flex flex-col overflow-hidden">
          {/* 日付ヘッダー */}
          <div className="h-12 border-b border-slate-200 bg-white flex flex-col">
            <div className="h-6 border-b border-slate-100 flex items-center px-4">
              <div className="w-32 h-3 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-6 flex items-center space-x-2 px-2 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-8 h-3 bg-slate-100 rounded animate-pulse shrink-0" />
              ))}
            </div>
          </div>

          {/* バープレースホルダー */}
          <div className="flex-1 p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="relative h-7 flex items-center">
                <div
                  className="h-6 rounded-md bg-blue-100/60 border border-blue-200/50 animate-pulse"
                  style={{
                    marginLeft: `${(i * 12) % 40}%`,
                    width: `${25 + (i * 7) % 35}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
