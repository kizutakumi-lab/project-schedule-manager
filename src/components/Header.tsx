'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarRange, Database, Plus, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchSystemInfoAction } from '@/app/actions/system';

interface HeaderProps {
  onOpenCreateModal?: () => void;
}

export function Header({ onOpenCreateModal }: HeaderProps) {
  const pathname = usePathname();
  const [systemInfo, setSystemInfo] = useState<{
    isGoogle: boolean;
    spreadsheetId: string;
    storageName: string;
    sheetsStatus: 'connected' | 'mock' | 'error';
    errorMessage?: string | null;
  } | null>(null);

  useEffect(() => {
    fetchSystemInfoAction().then(setSystemInfo).catch(console.error);
  }, []);

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5 text-slate-900 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                案件進行管理くん
              </span>
              <span className="text-[10px] text-slate-500 font-medium">中長期プロジェクト・工程一元管理</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                pathname === '/'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              案件一覧
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {/* データ保存状態バッジ */}
          {systemInfo && (
            <div
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                systemInfo.sheetsStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : systemInfo.sheetsStatus === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={
                systemInfo.errorMessage
                  ? `エラー: ${systemInfo.errorMessage}`
                  : `保存先: ${systemInfo.storageName} (ID: ${systemInfo.spreadsheetId})`
              }
            >
              {systemInfo.sheetsStatus === 'connected' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Sheets 接続中</span>
                </>
              ) : systemInfo.sheetsStatus === 'error' ? (
                <Link
                  href="/api/sheets-status"
                  target="_blank"
                  className="flex items-center space-x-1 hover:underline text-rose-700"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sheets接続エラー (診断を開く)</span>
                </Link>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-600" />
                  <span>ローカルメモリ稼働中</span>
                </>
              )}
            </div>
          )}

          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新規案件作成</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
