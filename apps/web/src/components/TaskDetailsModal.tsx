import React, { useState } from 'react';
import { useTaskDetails, useCompleteTask, useSnoozeTask } from '@/hooks/useTasks';
import { X, Sparkles, Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { fetchApi } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface TaskDetailsModalProps {
  taskId: string;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ taskId, onClose, onTaskUpdated }) => {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useTaskDetails(taskId);
  const completeTask = useCompleteTask();
  const snoozeTask = useSnoozeTask();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-[#FAF7F2] border-[3px] border-black p-8 text-center rounded-[24px] shadow-[6px_6px_0px_#000] w-full max-w-sm">
          <div className="animate-spin w-6 h-6 border-2 border-[#4CD9E3] border-t-transparent inline-block mb-3 rounded-full" />
          <p className="font-display font-black text-xs uppercase tracking-widest text-black">RETRIEVING TARGET DATA...</p>
        </div>
      </div>
    );
  }

  const task = data?.task;
  if (!task) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-white border-[3px] border-black p-6 text-center rounded-[24px] shadow-[6px_6px_0px_#000] w-full max-w-sm">
          <AlertCircle className="w-8 h-8 text-[#FF4B55] mx-auto mb-2" />
          <p className="font-bold text-xs">Target specification not found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-[#FFD600] border-2 border-black rounded-lg text-xs font-bold shadow-[2px_2px_0px_#000]">
            CLOSE
          </button>
        </div>
      </div>
    );
  }

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s: any) => s.status === 'COMPLETED').length;
  const totalSubtasks = subtasks.length;

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      await fetchApi(`/tasks/${subtaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: isCompleted ? 'COMPLETED' : 'PENDING' }),
      });
      refetch();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subtask');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || isAddingSubtask) return;

    setIsAddingSubtask(true);
    try {
      await fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          parentTaskId: task.id,
          priority: task.priority,
          category: task.category,
        }),
      });
      setNewSubtaskTitle('');
      refetch();
      if (onTaskUpdated) onTaskUpdated();
      toast.success('SUBTASK CONFIGURED');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add subtask');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleSnoozeOption = async (option: '30m' | '2h' | 'tomorrow' | 'smart') => {
    let snoozeUntil = '';
    const now = new Date();

    if (option === '30m') {
      snoozeUntil = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    } else if (option === '2h') {
      snoozeUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    } else if (option === 'tomorrow') {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
      snoozeUntil = tomorrow.toISOString();
    }

    try {
      await snoozeTask.mutateAsync({
        taskId: task.id,
        snoozeUntil: snoozeUntil || new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        useSmartSnooze: option === 'smart',
      });
      if (onTaskUpdated) onTaskUpdated();
      onClose();
    } catch (err) {}
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border-[3px] border-black rounded-[28px] p-6 w-full max-w-sm relative shadow-[6px_6px_0px_#000] flex flex-col justify-between max-h-[85vh] overflow-y-auto scrollbar-thin">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 border-[2px] border-black bg-white rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tag Header */}
        <div className="select-none mb-3">
          <span className="font-label text-[8px] uppercase font-black tracking-widest bg-black text-white px-2 py-0.5 border border-white rounded-md">
            TARGET_SPECIFICATION
          </span>
        </div>

        {/* Title & Desc */}
        <h2 className="font-display font-black text-lg text-black leading-tight tracking-tight uppercase">
          {task.title}
        </h2>
        {task.description && (
          <p className="text-gray-500 text-[11px] leading-relaxed font-body mt-2 bg-[#FAF7F2] p-3 border border-black/5 rounded-xl">
            {task.description}
          </p>
        )}

        {/* Divider */}
        <div className="border-b border-gray-100 my-3.5" />

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3 text-xs font-body select-none">
          <div>
            <span className="block text-[9px] font-label font-black text-gray-400 uppercase tracking-wide">Priority</span>
            <span className="font-bold text-black uppercase">▮ {task.priority}</span>
          </div>
          <div>
            <span className="block text-[9px] font-label font-black text-gray-400 uppercase tracking-wide">AI Priority Score</span>
            <span className="font-bold text-[#FF4B55]">{task.priorityScore ? `${Math.round(task.priorityScore)}/100` : 'N/A'}</span>
          </div>
          <div>
            <span className="block text-[9px] font-label font-black text-gray-400 uppercase tracking-wide">Due Date</span>
            <span className="font-bold text-black font-mono">
              {task.dueDate ? format(new Date(task.dueDate), 'EEE MMM d, h:mma').toUpperCase() : 'NO DEADLINE'}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-label font-black text-gray-400 uppercase tracking-wide">Effort Est.</span>
            <span className="font-bold text-black">
              {task.estimatedMins ? `${task.estimatedMins} Mins` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="mt-3.5 select-none">
            <span className="block text-[9px] font-label font-black text-gray-400 uppercase tracking-wide mb-1.5">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((t, idx) => (
                <span key={idx} className="bg-[#FAF7F2] border border-black/10 px-2 py-0.5 rounded-full text-[9px] font-bold text-gray-600 uppercase">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Subtasks Section */}
        <div className="mt-4 pt-3.5 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2 select-none">
            <span className="text-[10px] font-label font-black text-gray-400 uppercase">
              Subtasks ({completedSubtasks}/{totalSubtasks})
            </span>
            <button
              onClick={() => navigate(`/coach?prompt=Break down task "${task.title}"`)}
              className="text-[9px] font-label font-black text-green-700 bg-green-50 px-1.5 py-0.5 border border-green-200 rounded hover:bg-green-700 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5" />
              AI BREAKDOWN
            </button>
          </div>

          {/* Subtasks checklist */}
          {totalSubtasks > 0 ? (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {subtasks.map((sub: any) => {
                const isSubCompleted = sub.status === 'COMPLETED';
                return (
                  <label
                    key={sub.id}
                    className={`flex items-center gap-2 font-body text-xs cursor-pointer select-none p-2 bg-[#FAF7F2] rounded-lg border border-black/5 hover:border-black transition-colors ${
                      isSubCompleted ? 'line-through text-gray-400 opacity-60' : 'font-bold'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSubCompleted}
                      onChange={(e) => handleToggleSubtask(sub.id, e.target.checked)}
                      className="w-3.5 h-3.5 border-2 border-black rounded-none text-[#4CD9E3] focus:ring-0 cursor-pointer"
                    />
                    <span>{sub.title}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-gray-400 italic mb-2 select-none">No subtasks added yet.</p>
          )}

          {/* Quick Subtask Input Form */}
          <form onSubmit={handleAddSubtask} className="flex gap-2 mt-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add subtask..."
              className="flex-1 bg-[#FAF7F2] border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-[#FFD600]"
              disabled={isAddingSubtask}
            />
            <button
              type="submit"
              disabled={!newSubtaskTitle.trim() || isAddingSubtask}
              className="px-2.5 py-1.5 bg-[#FFD600] border border-black rounded-lg text-[10px] font-label font-black shadow-[1.5px_1.5px_0px_#000] hover:bg-black hover:text-[#FFD600] shrink-0 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-3.5 border-t border-gray-100 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Snooze Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSnoozeOpen((prev) => !prev)}
                className="w-full py-2.5 border-[2px] border-black bg-gray-100 font-display font-black text-[10px] uppercase rounded-xl shadow-[2.5px_2.5px_0px_#000] hover:bg-black hover:text-white cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              >
                SNOOZE
              </button>
              
              {snoozeOpen && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border-2 border-black rounded-xl p-1 shadow-[4px_4px_0px_#000] z-45 text-[9px] font-label font-black uppercase flex flex-col gap-0.5 animate-in slide-in-from-bottom-2 duration-150">
                  <button type="button" onClick={() => handleSnoozeOption('30m')} className="text-left px-2 py-1.5 rounded hover:bg-gray-100">30 Mins</button>
                  <button type="button" onClick={() => handleSnoozeOption('2h')} className="text-left px-2 py-1.5 rounded hover:bg-gray-100">2 Hours</button>
                  <button type="button" onClick={() => handleSnoozeOption('tomorrow')} className="text-left px-2 py-1.5 rounded hover:bg-gray-100">Tomorrow</button>
                  <button type="button" onClick={() => handleSnoozeOption('smart')} className="text-left px-2 py-1.5 rounded hover:bg-[#D4F087] text-[#1E3B06] flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#FFD600]" />
                    Smart Snooze
                  </button>
                </div>
              )}
            </div>

            {/* Complete Task */}
            <button
              type="button"
              onClick={async () => {
                await completeTask.mutateAsync(task.id);
                if (onTaskUpdated) onTaskUpdated();
                onClose();
              }}
              disabled={completeTask.isPending}
              className="w-full py-2.5 border-[2px] border-black bg-[#4CD9E3] font-display font-black text-[10px] uppercase rounded-xl shadow-[2.5px_2.5px_0px_#000] hover:bg-black hover:text-[#4CD9E3] cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50"
            >
              COMPLETE
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
