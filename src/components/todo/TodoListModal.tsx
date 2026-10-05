'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  User,
  Trash2,
  Edit2,
  CheckSquare,
} from 'lucide-react';
import { Todo } from '@/types';
import { TodoEditModal } from './TodoEditModal';

interface TodoListModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: Todo[];
  projectId: string;
  onCreateTodo: (todo: Partial<Todo>) => Promise<void>;
  onUpdateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
}

export function TodoListModal({
  isOpen,
  onClose,
  todos,
  projectId,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
}: TodoListModalProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('all');

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = todos.filter(t => {
    if (filter === 'open') return t.status === 'open';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const toggleStatus = async (todo: Todo) => {
    const nextStatus = todo.status === 'completed' ? 'open' : 'completed';
    await onUpdateTodo(todo.todo_id, { status: nextStatus });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">
              案件TODO一覧
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
              {todos.filter(t => t.status === 'open').length} 件未完了
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setEditingTodo(null);
                setIsEditOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>TODOを追加</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* フィルター */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center space-x-2 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            すべて ({todos.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filter === 'open'
                ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            未完了 ({todos.filter(t => t.status === 'open').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              filter === 'completed'
                ? 'bg-white text-emerald-600 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            完了 ({todos.filter(t => t.status === 'completed').length})
          </button>
        </div>

        {/* リスト */}
        <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              該当するTODOはありません
            </div>
          ) : (
            filtered.map(todo => {
              const isOverdue = todo.status === 'open' && todo.due_date < todayStr;
              const isToday = todo.status === 'open' && todo.due_date === todayStr;

              return (
                <div
                  key={todo.todo_id}
                  className="py-3 flex items-start justify-between group hover:bg-slate-50/60 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleStatus(todo)}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {todo.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4 hover:text-blue-500" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-medium ${
                            todo.status === 'completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-800'
                          }`}
                        >
                          {todo.title}
                        </span>

                        {isOverdue && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-rose-100 text-rose-700 font-bold border border-rose-200">
                            期限超過
                          </span>
                        )}
                        {isToday && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-100 text-amber-800 font-bold border border-amber-200">
                            本日締切
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{todo.assignee}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className={isOverdue ? 'text-rose-600 font-semibold' : ''}>
                            {todo.due_date}
                          </span>
                        </span>
                        {todo.memo && (
                          <span className="text-slate-400 truncate max-w-xs">
                            ({todo.memo})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingTodo(todo);
                        setIsEditOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-sm cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTodo(todo.todo_id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <TodoEditModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingTodo(null);
        }}
        onSubmit={async data => {
          if (editingTodo) {
            await onUpdateTodo(editingTodo.todo_id, data);
          } else {
            await onCreateTodo(data);
          }
        }}
        initialData={editingTodo}
        projectId={projectId}
      />
    </div>
  );
}
