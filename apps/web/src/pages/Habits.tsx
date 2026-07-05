import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { MockupLayout } from '@/components/MockupLayout';
import toast from 'react-hot-toast';
import { Search, Check } from 'lucide-react';

interface HabitLog {
  id: string;
  completedOn: string;
  note: string | null;
}

interface Habit {
  id: string;
  title: string;
  frequency: 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM';
  targetDaysOfWeek: number[];
  reminderTime: string | null;
  currentStreak: number;
  longestStreak: number;
  logs: HabitLog[];
  createdAt: string;
}

const HABIT_ICONS: { [key: string]: string } = {
  work: '💻',
  study: '📚',
  code: '⚡',
  exercise: '🏋️',
  gym: '💪',
  run: '🏃',
  water: '💧',
  read: '📖',
  meditate: '🧘',
  sleep: '😴',
};

const getHabitIcon = (title: string) => {
  const t = title.toLowerCase();
  for (const [key, icon] of Object.entries(HABIT_ICONS)) {
    if (t.includes(key)) return icon;
  }
  return '🎯'; // default icon
};

export const Habits = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form toggles
  const [showAddForm, setShowAddForm] = useState(false);

  // Form inputs
  const [newTitle, setNewTitle] = useState('');
  const [newFreq, setNewFreq] = useState<'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'CUSTOM'>('DAILY');
  const [newReminderTime, setNewReminderTime] = useState('');

  const fetchHabits = async () => {
    setIsLoading(true);
    try {
      const data = await fetchApi<{ habits: Habit[] }>('/habits');
      setHabits(data.habits || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch habits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tempId = `temp-habit-${Date.now()}`;
    const tempHabit: Habit = {
      id: tempId,
      title: newTitle,
      frequency: newFreq,
      targetDaysOfWeek: [],
      reminderTime: newReminderTime || null,
      currentStreak: 0,
      longestStreak: 0,
      logs: [],
      createdAt: new Date().toISOString(),
    };

    setHabits((prev) => [tempHabit, ...prev]);
    setNewTitle('');
    setNewFreq('DAILY');
    setNewReminderTime('');
    setShowAddForm(false);

    try {
      const data = await fetchApi<{ habit: Habit }>('/habits', {
        method: 'POST',
        body: JSON.stringify({
          title: tempHabit.title,
          frequency: tempHabit.frequency,
          reminderTime: tempHabit.reminderTime,
        }),
      });
      const finalHabit = { ...data.habit, logs: data.habit.logs || [] };
      setHabits((prev) => prev.map((h) => (h.id === tempId ? finalHabit : h)));
      toast.success('HABIT CONFIGURED');
    } catch (err: any) {
      setHabits((prev) => prev.filter((h) => h.id !== tempId));
      toast.error(err.message || 'Failed to create habit');
    }
  };

  const handleToggleToday = async (habit: Habit) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const logs = habit.logs || [];
    const loggedToday = logs.some((l) => l.completedOn.startsWith(todayStr));

    const updatedHabit = {
      ...habit,
      currentStreak: loggedToday ? Math.max(0, habit.currentStreak - 1) : habit.currentStreak + 1,
      logs: loggedToday
        ? logs.filter((l) => !l.completedOn.startsWith(todayStr))
        : [...logs, { id: `temp-log-${Date.now()}`, completedOn: todayStr, note: null }],
    };

    setHabits((prev) => prev.map((h) => (h.id === habit.id ? updatedHabit : h)));

    try {
      if (loggedToday) {
        await fetchApi(`/habits/${habit.id}/log`, {
          method: 'DELETE',
          body: JSON.stringify({ completedOn: todayStr }),
        });
        toast.success('HABIT PROGRESS UNLOGGED');
      } else {
        await fetchApi(`/habits/${habit.id}/log`, {
          method: 'POST',
          body: JSON.stringify({ completedOn: todayStr }),
        });
        toast.success('DAILY DISCIPLINE LOGGED 🔥');
      }
      fetchHabits();
    } catch (err: any) {
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
      toast.error(err.message || 'Toggle log failed');
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm('ARCHIVE AND PURGE HABIT?')) return;
    try {
      await fetchApi(`/habits/${habitId}`, { method: 'DELETE' });
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      toast.success('HABIT ARCHIVED');
    } catch (err: any) {
      toast.error(err.message || 'Archive failed');
    }
  };

  // Split habits into Incomplete and Completed today
  const todayStr = new Date().toISOString().split('T')[0];
  
  const filteredHabits = habits.filter((habit) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return habit.title.toLowerCase().includes(q) || habit.frequency.toLowerCase().includes(q);
    }
    return true;
  });

  const incompleteHabits = filteredHabits.filter((h) => {
    const logs = h.logs || [];
    return !logs.some((l) => l.completedOn.startsWith(todayStr));
  });

  const completedHabits = filteredHabits.filter((h) => {
    const logs = h.logs || [];
    return logs.some((l) => l.completedOn.startsWith(todayStr));
  });

  return (
    <MockupLayout activeTab="friends">
      <div className="flex flex-col gap-4 font-body select-none">
        
        {/* Top green banner card exactly like "Can't find your friends? Invite them now!" */}
        <div className="border-[3px] border-black rounded-[24px] bg-[#D4F087] p-4 flex items-center justify-between shadow-[3px_3px_0px_#000] gap-3">
          <div className="flex-1">
            <h3 className="font-display font-black text-[13px] text-[#1E3B06] uppercase leading-snug">
              Can't find your habits?
            </h3>
            <p className="text-[10px] text-[#1E3B06]/85 font-semibold leading-none mt-1">
              Build your disciplines now!
            </p>
          </div>
          
          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-4 py-2 border-[2px] border-black bg-[#FFD600] text-black font-display font-black text-[11px] uppercase rounded-xl shadow-[2px_2px_0px_#000] hover:bg-black hover:text-[#FFD600] cursor-pointer transition-colors shrink-0 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            CREATE
          </button>
        </div>

        {/* Dynamic Add Form */}
        {showAddForm && (
          <div className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000] animate-in fade-in slide-in-from-top-4 duration-200">
            <h3 className="font-display font-black text-sm uppercase border-b border-gray-100 pb-2 mb-3">
              Configure Habit
            </h3>
            <form onSubmit={handleCreateHabit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-1">Habit Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 90 Minutes Deep Work"
                  className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-xs font-body focus:outline-none focus:border-[#FFD600]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-1">Frequency</label>
                  <select
                    value={newFreq}
                    onChange={(e) => setNewFreq(e.target.value as any)}
                    className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-xs font-body focus:outline-none"
                  >
                    <option value="DAILY">DAILY</option>
                    <option value="WEEKDAYS">WEEKDAYS</option>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-1">Reminder</label>
                  <input
                    type="time"
                    value={newReminderTime}
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2 text-xs font-body focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="w-full py-2.5 bg-[#FFD600] text-black font-display font-black text-xs uppercase tracking-wider rounded-xl border-[2px] border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-black hover:text-[#FFD600] transition-colors"
              >
                CREATE DISCIPLINE
              </button>
            </form>
          </div>
        )}

        {/* Search Input */}
        <div className="relative border-[4px] border-black rounded-[10px] bg-white px-3.5 py-3 flex items-center gap-2 shadow-[5px_5px_0px_#000]">
          <Search className="w-5 h-5 text-black shrink-0" />
          <input
            type="text"
            placeholder="SEARCH BY NAME OR USERNAME"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-black focus:outline-none placeholder-black/30 font-black uppercase tracking-wide"
          />
        </div>

        {/* Incomplete Habits Section (styled like "Received Requests") */}
        <div className="flex flex-col gap-3 mt-1">
          <span className="font-display font-black text-xs uppercase text-black/80 tracking-wider">
            Received Requests ({incompleteHabits.length})
          </span>
          
          {isLoading ? (
            <div className="text-center font-display font-bold text-xs tracking-widest py-8">SCANNING ENGINE...</div>
          ) : incompleteHabits.length === 0 ? (
            <div className="text-center font-display font-black text-sm border-[4px] border-black py-10 rounded-[10px] bg-white shadow-[7px_7px_0px_#000] uppercase tracking-wider">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-black text-xs">All disciplines done!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {incompleteHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="border-[3px] border-black rounded-[10px] p-4 bg-white shadow-[5px_5px_0px_#000] flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Cute graphic/emoji placeholder avatar */}
                    <div className="w-10 h-10 rounded-[8px] border-[2px] border-black bg-[#FAF7F2] flex items-center justify-center text-lg shadow-[2px_2px_0px_#000] shrink-0">
                      {getHabitIcon(habit.title)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display font-black text-[13px] leading-tight text-[#0A0A0A] truncate">
                          {habit.title}
                        </span>
                        <span className="bg-[#C3EE52] text-[#1E3B06] border border-black px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-tight leading-none uppercase shrink-0">
                          @{habit.frequency}
                        </span>
                      </div>
                      <span className="text-[10px] font-label font-black text-black/50 block mt-1 leading-none tracking-tight">
                        Streak: {habit.currentStreak} days • Record: {habit.longestStreak} days
                      </span>
                    </div>
                  </div>

                  {/* Actions: Green checkmark button & Archive archive label */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="text-[9px] font-label font-black text-[#FF4B55] uppercase border-[1.5px] border-[#FF4B55] px-2 py-1 rounded hover:bg-[#FF4B55] hover:text-white transition-colors"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => handleToggleToday(habit)}
                      className="w-8 h-8 rounded-full border-[2.5px] border-black bg-[#D4F087] hover:bg-black hover:text-white flex items-center justify-center shadow-[2px_2px_0px_#000] transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      title="Log completion today"
                    >
                      <Check className="w-4 h-4 text-black hover:text-[#D4F087]" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Habits Section (styled like "Sent Requests") */}
        <div className="flex flex-col gap-3 mt-2">
          <span className="font-display font-black text-xs uppercase text-black/80 tracking-wider">
            Sent Requests ({completedHabits.length})
          </span>
          
          {completedHabits.length === 0 ? (
            <div className="text-center font-display font-black text-sm border-[4px] border-black py-10 rounded-[10px] bg-white shadow-[7px_7px_0px_#000] uppercase tracking-wider">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-black text-xs">No completions yet</div>
            </div>
          ) : (
            <div className="space-y-3">
              {completedHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="border-[3px] border-black rounded-[10px] p-4 bg-[#FAF7F2] shadow-[3px_3px_0px_#000] flex items-center justify-between gap-3 opacity-75"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[8px] border-[2px] border-black bg-white flex items-center justify-center text-lg shrink-0 shadow-[2px_2px_0px_#000]">
                      🔥
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display font-black text-[13px] leading-tight text-gray-500 line-through truncate">
                          {habit.title}
                        </span>
                        <span className="bg-gray-100 text-black border-[1.5px] border-black px-1.5 py-0.5 rounded text-[8px] font-black tracking-tight leading-none uppercase shrink-0 line-through">
                          @{habit.frequency}
                        </span>
                      </div>
                      <span className="text-[10px] font-label font-black text-black/50 block mt-1 leading-none tracking-tight">
                        Completed today! Streak: {habit.currentStreak} 🔥
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                       onClick={() => handleToggleToday(habit)}
                       className="text-[9px] font-label font-black text-black/50 uppercase border-[1.5px] border-black/30 px-2 py-1 rounded hover:bg-black hover:text-white transition-colors"
                     >
                       Undo
                     </button>
                    {/* Circle icon on right showing completed status check */}
                    <div className="w-8 h-8 rounded-full border-[2.5px] border-black bg-[#C3EE52] flex items-center justify-center shadow-[1px_1px_0px_#000]">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </MockupLayout>
  );
};
