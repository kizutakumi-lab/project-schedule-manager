'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ConflictWarningModalProps {
  isOpen: boolean;
  onRefresh: () => void;
  message?: string;
}

export function ConflictWarningModal({ isOpen, onRefresh, message }: ConflictWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-amber-200 w-full max-w-md p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">
          同時編集の競合を検知しました
        </h3>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          {message || '他のユーザーによってデータが更新されています。最新の内容を読み込んでから再度変更を行ってください。'}
        </p>
        <button
          onClick={onRefresh}
          className="w-full inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>最新のデータを再読み込み</span>
        </button>
      </div>
    </div>
  );
}
