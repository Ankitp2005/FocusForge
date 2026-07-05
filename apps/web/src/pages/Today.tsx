import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTasks, useCompleteTask, useUpdateTask, useCreateTask } from '@/hooks/useTasks';
import { useUser } from '@/components/AuthProvider';
import { MockupLayout } from '@/components/MockupLayout';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { RotateCcw, Sparkles, ChevronRight, Plus } from 'lucide-react';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';

const StarRating = ({ priority }: { priority: string }) => {
  const starsCount = priority === 'CRITICAL' ? 5 : priority === 'HIGH' ? 4 : priority === 'MEDIUM' ? 3 : 2;
  return (
    <div className="flex gap-0.5 select-none">
      {Array.from({ length: 5 }).map((_, idx) => (
        <span key={idx} className={idx < starsCount ? 'text-black' : 'text-black/20'}>{idx < starsCount ? '★' : '☆'}</span>
      ))}
    </div>
  );
};

export const Today = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { data, isLoading } = useTasks({ status: 'PENDING,IN_PROGRESS', sort: 'priorityScore', order: 'desc' });
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();
  const [dailyPlan, setDailyPlan] = useState<any | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState('');
  const createTask = useCreateTask();

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    try {
      await createTask.mutateAsync({ rawInput: quickAdd, parseWithAI: true });
      setQuickAdd('');
    } catch (err) {
      // Caught and displayed by mutation toast
    }
  };

  const handleGeneratePlan = async () => {
    setIsPlanning(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const data = await fetchApi<any>('/ai/plan-day', {
        method: 'POST',
        body: JSON.stringify({
          date: todayStr,
          includeCalendar: true,
          includeHabits: true,
        }),
      });
      setDailyPlan(data);
      toast.success('DAILY PLAN OPTIMIZED BY AI');
    } catch (err: any) {
      toast.error(err.message || 'PLAN GENERATION FAILED');
    } finally {
      setIsPlanning(false);
    }
  };

  const tasks = data?.tasks ?? [];
  const focusTask = tasks.find((t) => t.priority === 'CRITICAL') || tasks[0];

  const initialPomodoroSecs = 25 * 60;
  const [pomodoroSecs, setPomodoroSecs] = useState(initialPomodoroSecs);
  const [isRunning, setIsRunning] = useState(false);
  const [inFocusSession, setInFocusSession] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setPomodoroSecs((s) => {
        if (s <= 1) {
          setIsRunning(false);
          toast.success('FOCUS SESSION COMPLETE — TAKE A BREAK');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStartFocus = useCallback(async () => {
    if (!focusTask) return;
    if (focusTask.status !== 'IN_PROGRESS') {
      await updateTask.mutateAsync({ id: focusTask.id, status: 'IN_PROGRESS' });
    }
    setIsRunning(true);
    setInFocusSession(true);
  }, [focusTask, updateTask]);

  const handleComplete = useCallback(async () => {
    if (!focusTask) return;
    await completeTask.mutateAsync(focusTask.id);
    setIsRunning(false);
    setPomodoroSecs(initialPomodoroSecs);
    setInFocusSession(false);
    setSubmissionUrl('');
    toast.success('GOAL CONQUERED! SUBMISSION RECORDED.');
  }, [focusTask, completeTask, initialPomodoroSecs]);

  const handleResetTimer = () => {
    setIsRunning(false);
    setPomodoroSecs(initialPomodoroSecs);
    setInFocusSession(false);
  };


  // Extract user details for layout card
  const fullName = user?.fullName || 'Sepideh Yazdi';
  const username = user?.username || user?.primaryEmailAddress?.emailAddress.split('@')[0] || 'Sepidy';
  const imageUrl = user?.imageUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sepideh';

  // Compute countdown block digits
  const h = Math.floor(pomodoroSecs / 3600);
  const m = Math.floor((pomodoroSecs % 3600) / 60);
  const s = pomodoroSecs % 60;

  return (
    <MockupLayout activeTab="home">
      <div className="flex flex-col gap-4 font-body relative">
        {/* Quick Add Bar */}
        <form 
          onSubmit={handleQuickAdd} 
          className="flex flex-col sm:flex-row gap-0 border-[3px] border-black bg-white rounded-2xl overflow-hidden shadow-[3px_3px_0px_#000] focus-within:shadow-[5px_5px_0px_#000] transition-shadow shrink-0"
        >
          <div className="flex-1 flex items-center bg-white px-3 py-1">
            <Sparkles className="w-4 h-4 text-blue-600 animate-pulse mr-2 shrink-0" />
            <input
              type="text"
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              placeholder="Add task... e.g. 'Testing sound today 12:45 am'"
              className="w-full py-2.5 font-body text-xs bg-transparent text-black focus:outline-none placeholder:text-gray-400 placeholder:italic"
              disabled={createTask.isPending}
            />
          </div>
          <button
            type="submit"
            disabled={createTask.isPending || !quickAdd.trim()}
            className="px-4 py-2.5 bg-[#FFD600] text-black border-t-2 sm:border-t-0 sm:border-l-2 border-black shrink-0 flex items-center justify-center gap-1 font-label font-black text-xs uppercase cursor-pointer hover:bg-black hover:text-[#FFD600] transition-colors"
          >
            {createTask.isPending ? (
              <>
                <span className="w-1.5 h-1.5 bg-black animate-ping rounded-full inline-block" />
                ...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                ADD
              </>
            )}
          </button>
        </form>

        {isLoading ? (
          <div className="border-[3px] border-black rounded-[24px] p-12 text-center bg-[#FAF7F2] shadow-[4px_4px_0px_#000]">
            <div className="animate-spin w-8 h-8 border-4 border-[#4CD9E3] border-t-transparent inline-block mb-4 rounded-full" />
            <p className="font-label font-black text-sm uppercase tracking-widest">CONNECTING COGNITIVE FLOW...</p>
          </div>
        ) : !focusTask ? (
          <div className="border-[3px] border-black rounded-[24px] p-8 text-center bg-white shadow-[4px_4px_0px_#000]">
            <Sparkles className="w-12 h-12 mx-auto text-[#FFD600] mb-4 animate-pulse" />
            <h2 className="font-display font-black text-xl uppercase mb-2">ALL QUEUES NEUTRALIZED</h2>
            <p className="text-gray-500 text-xs leading-relaxed mb-4">
              No active targets require immediate focus. Navigate to the Challenges directory to commit new objectives.
            </p>
            <button 
              onClick={() => navigate('/goals')}
              className="px-4 py-2 border-[2px] border-black bg-[#FFD600] text-black font-label font-bold text-xs uppercase rounded-xl shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-black hover:text-[#FFD600] transition-colors"
            >
              GO TO CHALLENGES
            </button>
          </div>
        ) : (
          <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000] flex flex-col justify-between">
            
            {/* Header / Stats */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setSelectedTaskId(focusTask.id)}
                className="text-[10px] font-label font-black uppercase tracking-widest border-[2px] border-black px-2.5 py-1 rounded-full bg-[#FAF7F2] shadow-[1px_1px_0px_#000] hover:bg-black hover:text-white transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1 cursor-pointer"
              >
                <span>SPECS 🔍</span>
              </button>
              <StarRating priority={focusTask.priority} />
            </div>

            {/* Title */}
            <h2 className="font-display font-black text-xl text-black leading-tight tracking-tight capitalize mb-2">
              {focusTask.title}
            </h2>

            {/* Author Block inside the Card */}
            <div className="flex items-center gap-2.5 p-2 bg-[#FAF7F2] rounded-2xl border-[2px] border-black mb-4 select-none shadow-[1px_1px_0px_#000]">
              <div className="w-8 h-8 rounded-full border-[1.5px] border-black overflow-hidden bg-white shrink-0">
                <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover scale-105" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-[12px] leading-tight text-[#0A0A0A]">{fullName}</span>
                <span className="text-black/50 font-black text-[10px] leading-none font-label tracking-tight">@{username}</span>
              </div>
            </div>

            {/* Mock stats */}
            <div className="flex justify-between items-center text-[10px] font-label font-black text-black/60 uppercase tracking-widest border-b-[2px] border-black/10 pb-3 mb-4 select-none">
              <span>0/1 Participants</span>
              <span>0 Submissions</span>
            </div>

            {/* Big digit countdown blocks exactly like reference */}
            <div className="flex items-center justify-center gap-3 my-4 select-none">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-white border-[3px] border-black rounded-[14px] shadow-[3px_3px_0px_#000] flex items-center justify-center font-display font-black text-2xl">
                  {h.toString().padStart(2, '0')}
                </div>
                <span className="text-[9px] font-label font-black text-red-500 mt-2 uppercase tracking-wide">Hours</span>
              </div>
              <span className="font-display font-black text-2xl text-red-500 mb-5">:</span>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-white border-[3px] border-black rounded-[14px] shadow-[3px_3px_0px_#000] flex items-center justify-center font-display font-black text-2xl animate-pulse">
                  {m.toString().padStart(2, '0')}
                </div>
                <span className="text-[9px] font-label font-black text-red-500 mt-2 uppercase tracking-wide">Mins</span>
              </div>
              <span className="font-display font-black text-2xl text-red-500 mb-5">:</span>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 bg-white border-[3px] border-black rounded-[14px] shadow-[3px_3px_0px_#000] flex items-center justify-center font-display font-black text-2xl">
                  {s.toString().padStart(2, '0')}
                </div>
                <span className="text-[9px] font-label font-black text-red-500 mt-2 uppercase tracking-wide">Secs</span>
              </div>
            </div>

            {/* Submission Input Box */}
            <input 
              type="text" 
              placeholder="Paste Submission URL Here" 
              value={submissionUrl} 
              onChange={(e) => setSubmissionUrl(e.target.value)}
              className="w-full bg-white border-[3px] border-black rounded-[14px] p-3 text-xs font-body focus:outline-none focus:border-[#FFD600] placeholder-gray-400 mt-2 shadow-[2px_2px_0px_#000]"
            />

            {/* Timer controls */}
            <div className="flex gap-2 mt-4 w-full">
              {!inFocusSession ? (
                <button
                  onClick={handleStartFocus}
                  className="flex-1 py-3 border-[3px] border-black bg-[#4CD9E3] text-black font-display font-black text-sm uppercase tracking-wider rounded-2xl shadow-[3px_3px_0px_#000] hover:bg-black hover:text-[#4CD9E3] transition-colors active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  ENGAGE TIMER
                </button>
              ) : (
                <div className="flex-1 flex gap-2">
                  <button
                    onClick={() => setIsRunning((r) => !r)}
                    className="flex-1 py-3 border-[3px] border-black bg-[#FFD600] text-black font-display font-black text-sm uppercase tracking-wider rounded-2xl shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-black hover:text-[#FFD600] transition-colors"
                  >
                    {isRunning ? 'PAUSE TIMER' : 'RESUME TIMER'}
                  </button>
                  <button
                    onClick={handleResetTimer}
                    className="py-3 px-4 border-[3px] border-black bg-gray-100 text-black hover:bg-black hover:text-white transition-colors rounded-2xl shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Complete I'M DONE yellow button */}
            <button
              onClick={handleComplete}
              disabled={completeTask.isPending}
              className="w-full py-4 border-[3px] border-black bg-[#FFD600] text-black font-display font-black text-sm uppercase tracking-widest rounded-2xl shadow-[4px_4px_0px_#000] hover:bg-black hover:text-[#FFD600] transition-colors active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 mt-3"
            >
              I'M DONE!
            </button>

          </div>
        )}

        {/* Collapsible/Scrollable AI Planner & Queue sections */}
        <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000] select-none">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
            <span className="font-display font-black text-sm uppercase text-black flex items-center gap-1.5">
              ⚡ AI DAILY TIMELINE
            </span>
            {dailyPlan && (
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate('/coach')}
                  className="text-[10px] font-label font-black text-green-700 hover:underline"
                >
                  COACH
                </button>
                <button 
                  onClick={handleGeneratePlan}
                  className="text-[10px] font-label font-bold text-blue-600 hover:underline"
                >
                  REGEN
                </button>
              </div>
            )}
          </div>

          {!dailyPlan ? (
            <button
              onClick={handleGeneratePlan}
              disabled={isPlanning}
              className="w-full py-5 border-[3px] border-black hover:border-black rounded-2xl bg-[#FAF7F2] hover:bg-[#FFD600] text-black/60 hover:text-black font-label font-black text-[11px] uppercase tracking-wider text-center transition-colors flex flex-col items-center justify-center gap-1.5 shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              {isPlanning ? (
                <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>GENERATE PLAN</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3 relative pl-4 border-l-[3px] border-black/20 my-2">
              {dailyPlan.timeBlocks.slice(0, 3).map((block: any, idx: number) => (
                <div key={idx} className="relative">
                  <div className="border-[2px] border-black p-2.5 bg-[#FAF7F2] rounded-xl shadow-[2px_2px_0px_#000] text-[11px]">
                    <div className="flex justify-between items-center text-[9px] font-label font-black">
                      <span className="uppercase text-black bg-[#C3EE52] px-1.5 py-0.5 border-[1.5px] border-black rounded tracking-wider">{block.type}</span>
                      <span className="text-black/60 font-mono">{block.start} - {block.end}</span>
                    </div>
                    <p className="font-bold text-black leading-tight mt-1.5 truncate">{block.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Up List */}
        {tasks.length > 1 && (
          <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000]">
            <span className="font-display font-black text-sm uppercase text-black block border-b border-gray-100 pb-2 mb-3">
              🎯 NEXT IN PIPELINE
            </span>
            <div className="space-y-2">
              {tasks.slice(1, 4).map((task, idx) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="border-[2px] border-black p-3 bg-[#FAF7F2] hover:bg-[#FFD600] rounded-xl shadow-[2px_2px_0px_#000] transition-all flex items-center justify-between cursor-pointer group text-[11px] hover:shadow-[3px_3px_0px_#000] brutal-card-hover"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] font-label font-black text-[#FF4B55] uppercase tracking-widest block">
                      #{idx + 2} {task.priority}
                    </span>
                    <p className="font-bold text-black truncate mt-0.5">{task.title}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black/40 shrink-0 ml-2 group-hover:text-black transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target Specification Modal */}
        {selectedTaskId && (
          <TaskDetailsModal 
            taskId={selectedTaskId} 
            onClose={() => setSelectedTaskId(null)} 
          />
        )}

      </div>
    </MockupLayout>
  );
};
