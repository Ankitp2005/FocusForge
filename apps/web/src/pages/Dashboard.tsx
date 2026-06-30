import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTasks, useCreateTask, useCompleteTask } from '@/hooks/useTasks';
import { format, isToday, isPast } from 'date-fns';
import { Navbar } from '@/components/Navbar';
import { 
  Plus, 
  Flame, 
  MessageSquareCode, 
  CheckSquare, 
  Sparkles, 
  Clock, 
  Calendar as CalendarIcon, 
  Terminal, 
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

const PRIORITY_CONFIG = {
  CRITICAL: {
    bg: 'bg-lmls-red-bg dark:bg-[rgba(255,26,37,0.08)]',
    border: 'border-l-[6px] border-l-lmls-red border-2 border-lmls-black',
    badgeBg: 'bg-lmls-red text-lmls-white',
    shadow: 'shadow-brutal-red',
    text: 'text-lmls-red',
  },
  HIGH: {
    bg: 'bg-lmls-yellow-bg dark:bg-[rgba(255,224,0,0.08)]',
    border: 'border-l-[6px] border-l-lmls-yellow border-2 border-lmls-black',
    badgeBg: 'bg-lmls-yellow text-lmls-black',
    shadow: 'shadow-brutal-sm',
    text: 'text-lmls-yellow dark:text-[#FFE000]',
  },
  MEDIUM: {
    bg: 'bg-lmls-paper dark:bg-[#141414]',
    border: 'border-2 border-lmls-black',
    badgeBg: 'bg-transparent text-lmls-black dark:text-lmls-white border-2 border-lmls-black dark:border-lmls-white',
    shadow: 'shadow-brutal-sm',
    text: 'text-lmls-black dark:text-lmls-white',
  },
  LOW: {
    bg: 'bg-lmls-white dark:bg-lmls-black',
    border: 'border-2 border-lmls-concrete',
    badgeBg: 'bg-transparent text-lmls-concrete border-2 border-lmls-concrete',
    shadow: 'none',
    text: 'text-lmls-concrete',
  },
} as const;

const CountdownDisplay = ({ dueDate }: { dueDate: string }) => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const hours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
  const mins = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));

  if (overdue) {
    return (
      <span className="countdown-critical font-body font-bold text-xs px-2.5 py-1 border-2 border-lmls-red flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5" />
        OVERDUE {hours}h {mins}m
      </span>
    );
  }

  if (isToday(due)) {
    return (
      <span className="font-body font-bold text-xs px-2.5 py-1 border-2 border-lmls-black bg-lmls-yellow text-lmls-black flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {hours}h {mins}m LEFT
      </span>
    );
  }

  return (
    <span className="font-body text-xs text-lmls-concrete flex items-center gap-1">
      <CalendarIcon className="w-3.5 h-3.5" />
      DUE {format(due, 'EEE MMM d, h:mma').toUpperCase()}
    </span>
  );
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [quickAdd, setQuickAdd] = useState('');
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const { data, isLoading } = useTasks({ status: 'PENDING,IN_PROGRESS', sort: 'priorityScore', order: 'desc' });
  const createTask = useCreateTask();

  useEffect(() => {
    if (searchParams.get('focus') === 'task-input') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [searchParams]);
  const completeTask = useCompleteTask();

  const tasks = data?.tasks ?? [];
  const criticalCount = tasks.filter((t) => t.priority === 'CRITICAL').length;
  const highCount = tasks.filter((t) => t.priority === 'HIGH').length;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    await createTask.mutateAsync({ rawInput: quickAdd, parseWithAI: true });
    setQuickAdd('');
  };

  const suggestions = [
    "Break down 'Complete pending homework'",
    "What should I prioritize today?",
    "Plan a 90-minute study session",
  ];

  return (
    <div className="theme-dashboard min-h-screen bg-lmls-white text-lmls-black flex flex-col">
      <Navbar />

      {/* ─── Dashboard Title / Stats Ticker ────────────────────────────────── */}
      <div className="border-b-4 border-lmls-black px-6 py-5 bg-lmls-paper dark:bg-[#141414] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-4xl tracking-tighter uppercase leading-none flex items-center gap-3">
            OPERATOR QUEUE
          </h1>
          <p className="font-body text-xs font-bold text-lmls-concrete uppercase tracking-wider mt-1.5 flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="text-lmls-red bg-lmls-red-bg px-2 py-0.5 border border-lmls-red flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                {criticalCount} CRITICAL STATUS
              </span>
            )}
            {criticalCount > 0 && highCount > 0 && '•'}
            {highCount > 0 && (
              <span className="text-lmls-black dark:text-lmls-white bg-lmls-yellow-bg dark:bg-[#2A2200] px-2 py-0.5 border border-lmls-black dark:border-lmls-white">
                {highCount} HIGH INFLUENCE
              </span>
            )}
            {criticalCount === 0 && highCount === 0 && `${tasks.length} OPERATIONS CONFIGURED`}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <span className="font-label text-xs uppercase tracking-widest font-black border-4 border-lmls-black bg-lmls-white dark:bg-lmls-black text-lmls-black dark:text-lmls-white px-4 py-2 shadow-brutal-sm">
            {tasks.length} BLOCKS REMAINING
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* ─── Main Task Grid ──────────────────────────────── */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Quick Add Bar */}
          <form 
            onSubmit={handleQuickAdd} 
            className="mb-8 flex flex-col sm:flex-row gap-0 border-4 border-lmls-black shadow-brutal-electric transition-shadow focus-within:shadow-brutal-lg"
          >
            <div className="flex-1 flex items-center bg-lmls-white dark:bg-lmls-black px-4 py-1">
              <Sparkles className="w-5 h-5 text-lmls-electric animate-pulse mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={quickAdd}
                onChange={(e) => setQuickAdd(e.target.value)}
                placeholder="Instruct FocusForge AI... e.g. 'Complete homework by tonight 9pm #study ~120min'"
                className="w-full py-3.5 font-body text-sm bg-transparent text-lmls-black dark:text-lmls-white focus:outline-none placeholder:text-lmls-concrete placeholder:italic"
                disabled={createTask.isPending}
              />
            </div>
            <button
              type="submit"
              disabled={createTask.isPending || !quickAdd.trim()}
              className="px-8 py-4 bg-lmls-electric text-lmls-white font-display font-black text-sm uppercase tracking-widest hover:bg-lmls-black hover:text-lmls-white transition-colors disabled:opacity-50 border-t-4 sm:border-t-0 sm:border-l-4 border-lmls-black shrink-0 flex items-center justify-center gap-2"
            >
              {createTask.isPending ? (
                <>
                  <span className="w-2 h-2 bg-lmls-white animate-ping rounded-full inline-block" />
                  PARSING...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  ADD TASK
                </>
              )}
            </button>
          </form>

          {/* Tasks */}
          {isLoading ? (
            <div className="border-4 border-dashed border-lmls-black p-20 text-center bg-lmls-paper dark:bg-[#141414]">
              <div className="animate-spin w-8 h-8 border-4 border-lmls-electric border-t-transparent inline-block mb-4" />
              <p className="font-body font-bold tracking-widest text-sm uppercase">SCANNING PRIORITY STACKS...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="border-4 border-dashed border-lmls-black bg-lmls-paper dark:bg-[#141414] p-20 text-center shadow-brutal-sm">
              <CheckSquare className="w-12 h-12 mx-auto text-lmls-green mb-4" />
              <h3 className="font-display font-black text-2xl uppercase mb-2">OPERATIONAL CLEARANCE</h3>
              <p className="font-body text-sm text-lmls-concrete max-w-sm mx-auto leading-relaxed">
                Zero active targets detected. Use the command bar above to parse raw schedule entries.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tasks.map((task) => {
                const cfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.MEDIUM;
                const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'COMPLETED';
                const isHovered = hoveredTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`task-card relative p-5 transition-all duration-150 cursor-pointer ${cfg.bg} ${cfg.border} ${isOverdue ? 'overdue' : ''}`}
                    style={{ 
                      boxShadow: isHovered ? '2px 2px 0px #0A0A0A' : (isOverdue ? '8px 8px 0px #8B0000' : '6px 6px 0px #0A0A0A'),
                      transform: isHovered ? 'translate(4px, 4px)' : 'translate(0px, 0px)'
                    }}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                  >
                    {/* Header: Priority & Completion */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-label font-black text-[10px] uppercase tracking-widest px-2.5 py-1 border-2 border-lmls-black ${cfg.badgeBg}`}>
                        ▮ {task.priority}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          completeTask.mutate(task.id);
                        }}
                        title="Complete task"
                        className="w-7 h-7 border-2 border-lmls-black bg-lmls-white dark:bg-lmls-black hover:bg-lmls-green hover:text-lmls-white dark:hover:bg-lmls-green text-lmls-black dark:text-lmls-white flex items-center justify-center transition-colors shadow-brutal-sm hover:shadow-brutal-hover active:translate-y-[2px]"
                      >
                        ✓
                      </button>
                    </div>

                    {/* Task Title */}
                    <h3 className="font-body font-black text-md leading-snug mt-2 mb-4 dark:text-lmls-white">
                      {task.title}
                    </h3>

                    {/* Info Divider */}
                    <div className="border-t-2 border-lmls-black dark:border-[rgba(245,240,232,0.15)] mb-3" />

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-body text-lmls-concrete font-bold">
                      <div className="flex items-center gap-2">
                        {task.category && (
                          <span className="bg-lmls-paper dark:bg-lmls-black text-lmls-black dark:text-lmls-white border border-lmls-concrete px-1.5 py-0.5 text-[10px]">
                            #{task.category.toUpperCase()}
                          </span>
                        )}
                        {task.estimatedMins && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {task.estimatedMins} MINS
                          </span>
                        )}
                      </div>
                      {task.dueDate && <CountdownDisplay dueDate={task.dueDate} />}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/today');
                        }}
                        className="flex-1 py-2.5 border-2 border-lmls-black bg-lmls-black text-lmls-white font-label font-black text-xs uppercase tracking-widest hover:bg-lmls-white hover:text-lmls-black dark:hover:bg-lmls-paper transition-colors flex items-center justify-center gap-1.5 shadow-brutal-sm"
                      >
                        <Flame className="w-4 h-4 text-lmls-yellow" />
                        FOCUS TIME
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/coach');
                        }}
                        className="flex-1 py-2.5 border-2 border-lmls-electric text-lmls-electric font-label font-black text-xs uppercase tracking-widest hover:bg-lmls-electric hover:text-lmls-white transition-colors flex items-center justify-center gap-1.5 shadow-brutal-sm"
                      >
                        <MessageSquareCode className="w-4 h-4" />
                        ASK COACH
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ─── AI Coach Sidebar Dashboard Widget ───────────────────────────────── */}
        <aside className="w-full lg:w-80 border-t-4 lg:border-t-0 lg:border-l-4 border-lmls-black bg-lmls-black text-lmls-white flex flex-col">
          <div className="border-b-2 border-[rgba(245,240,232,0.15)] px-6 py-4 flex items-center justify-between">
            <span className="font-label font-black text-xs uppercase tracking-widest text-lmls-electric flex items-center gap-2">
              <Terminal className="w-4 h-4 text-lmls-electric" />
              AI_COACH_LOGS
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-body bg-lmls-green bg-opacity-15 text-lmls-green border border-lmls-green px-2 py-0.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-lmls-green animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="flex-1 px-6 py-5 space-y-6">
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(245,240,232,0.1)] p-4 font-body text-xs leading-relaxed text-lmls-concrete">
              <p className="text-lmls-electric font-bold mb-1.5">COACH STATUS RECOMMENDATION:</p>
              {criticalCount > 0
                ? `CRITICAL THREAD INITIATED. You have ${criticalCount} critical task${criticalCount > 1 ? 's' : ''} blocking pipeline execution. Engage FOCUS MODE immediately.`
                : tasks.length > 0
                ? `System healthy. ${tasks.length} items configured in scheduler. Recommend planning workflow sequence using AI coach prompts.`
                : 'All queues clear. Focus metrics high. Ready for next sprint parameters.'}
            </div>

            {/* Quick Prompts/Suggestions */}
            <div className="space-y-3">
              <h4 className="font-label text-xs uppercase tracking-wider text-lmls-white font-bold flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-lmls-yellow" />
                SUGGESTED DISPATCH
              </h4>
              <div className="space-y-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(`/coach?prompt=${encodeURIComponent(s)}`)}
                    className="w-full text-left p-3 border border-[rgba(245,240,232,0.15)] hover:border-lmls-electric hover:bg-[rgba(0,87,255,0.05)] text-lmls-white text-xs font-body leading-snug transition-colors flex items-start gap-2"
                  >
                    <span className="text-lmls-electric font-bold shrink-0">&gt;</span>
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t-2 border-[rgba(245,240,232,0.2)] bg-[#111111]">
            <Button 
              variant="electric" 
              className="w-full py-6 flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest border-2 border-lmls-electric"
              onClick={() => navigate('/coach')}
            >
              <MessageSquareCode className="w-5 h-5" />
              ENGAGE AI COACH
            </Button>
          </div>
        </aside>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 bg-lmls-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-lmls-white dark:bg-[#141414] border-4 border-lmls-black p-6 w-full max-w-md relative shadow-brutal-lg animate-in fade-in zoom-in-95 duration-150"
            style={{ boxShadow: '10px 10px 0px #0A0A0A' }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 w-8 h-8 border-2 border-lmls-black bg-lmls-white dark:bg-lmls-black hover:bg-lmls-red hover:text-white dark:hover:bg-lmls-red text-lmls-black dark:text-lmls-white flex items-center justify-center font-bold shadow-brutal-sm cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Title */}
            <span className="font-label text-[9px] uppercase font-black tracking-widest bg-lmls-black text-lmls-white px-2 py-0.5 border border-lmls-white mb-3 inline-block select-none">
              TARGET_SPECIFICATION
            </span>
            <h2 className="font-display font-black text-xl md:text-2xl uppercase mt-1 mb-4 dark:text-lmls-white">
              {selectedTask.title}
            </h2>

            {/* Details */}
            <div className="space-y-4 font-body text-xs text-lmls-concrete dark:text-[#C8C2B8]">
              {selectedTask.description ? (
                <div>
                  <span className="block font-label text-[10px] font-black uppercase text-lmls-black dark:text-lmls-white tracking-widest mb-1 select-none">
                    DESCRIPTION:
                  </span>
                  <p className="bg-lmls-paper dark:bg-lmls-black border border-lmls-concrete p-3 leading-relaxed text-lmls-black dark:text-lmls-white font-mono whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="block font-label text-[10px] font-black uppercase text-lmls-black dark:text-lmls-white tracking-widest mb-1 select-none">
                    DESCRIPTION:
                  </span>
                  <p className="bg-lmls-paper dark:bg-lmls-black border border-dashed border-lmls-concrete p-3 text-center leading-relaxed text-lmls-concrete font-mono">
                    NO ADDITIONAL DETAILS PROVIDED
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block font-label text-[10px] font-black uppercase text-lmls-black dark:text-lmls-white tracking-widest mb-0.5 select-none">
                    PRIORITY:
                  </span>
                  <p className="font-bold text-lmls-black dark:text-lmls-white uppercase">
                    ▮ {selectedTask.priority}
                  </p>
                </div>

                <div>
                  <span className="block font-label text-[10px] font-black uppercase text-lmls-black dark:text-lmls-white tracking-widest mb-0.5 select-none">
                    AI PRIORITY SCORE:
                  </span>
                  <p className="font-bold text-lmls-electric dark:text-lmls-electric uppercase">
                    {selectedTask.priorityScore ? `${Math.round(selectedTask.priorityScore)}/100` : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block font-label text-[10px] font-black uppercase text-lmls-black dark:text-lmls-white tracking-widest mb-0.5 select-none">
                    DUE DATE:
                  </span>
                  <p className="font-bold text-lmls-black dark:text-lmls-white uppercase">
                    {selectedTask.dueDate 
                      ? format(new Date(selectedTask.dueDate), 'EEE MMM d, h:mma').toUpperCase()
                      : 'NO DEADLINE CONFIGURED'}
                  </p>
                </div>

                <div>
                  <span className="block font-label text-[10px] font-black uppercase text-lmls-black dark:text-lmls-white tracking-widest mb-0.5 select-none">
                    ESTIMATED EFFORT:
                  </span>
                  <p className="font-bold text-lmls-black dark:text-lmls-white uppercase">
                    {selectedTask.estimatedMins ? `${selectedTask.estimatedMins} MINUTES` : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div>
                  <span className="block font-label text-[10px] font-black uppercase text-lmls-black dark:text-lmls-white tracking-widest mb-1.5 select-none">
                    TAGS:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTask.tags.map((t: string, idx: number) => (
                      <span key={idx} className="bg-lmls-paper dark:bg-lmls-black text-lmls-black dark:text-lmls-white border border-lmls-concrete px-2 py-0.5 text-[9px] font-black uppercase">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 mt-6 border-t-2 border-lmls-black dark:border-[rgba(245,240,232,0.15)] pt-4">
              <button
                onClick={() => {
                  completeTask.mutate(selectedTask.id);
                  setSelectedTask(null);
                }}
                className="flex-1 py-3 border-2 border-lmls-black bg-lmls-green text-lmls-white font-label font-black text-xs uppercase tracking-widest hover:bg-lmls-white hover:text-lmls-green transition-colors flex items-center justify-center gap-1.5 shadow-brutal-sm cursor-pointer"
              >
                COMPLETE TARGET
              </button>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  navigate('/today');
                }}
                className="flex-1 py-3 border-2 border-lmls-black bg-lmls-yellow text-lmls-black font-label font-black text-xs uppercase tracking-widest hover:bg-lmls-white hover:text-lmls-black transition-colors flex items-center justify-center gap-1.5 shadow-brutal-sm cursor-pointer"
              >
                ENGAGE FOCUS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
