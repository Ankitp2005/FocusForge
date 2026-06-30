import { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { fetchApi } from '@/lib/api';
import { useUser } from '@clerk/clerk-react';
import { MockupLayout } from '@/components/MockupLayout';
import toast from 'react-hot-toast';
import { Plus, Search, X, Star } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  targetDate: string | null;
  milestones: Milestone[];
  createdAt: string;
}

export const Goals = () => {
  const { user } = useUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation tabs: 'CREATED', 'INVITED', 'PUBLIC', 'SUBMITTED'
  const [activeTab, setActiveFilterTab] = useState<'CREATED' | 'INVITED' | 'PUBLIC' | 'SUBMITTED'>('CREATED');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedMilestonesGoalId, setExpandedMilestonesGoalId] = useState<string | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newMilestones, setNewMilestones] = useState<string[]>([]);
  const [milestoneInput, setMilestoneInput] = useState('');
  const [eachMilestoneInput, setEachMilestoneInput] = useState<{ [goalId: string]: string }>({});

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const data = await fetchApi<{ goals: Goal[] }>('/goals');
      setGoals(data.goals || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch goals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddMilestone = () => {
    if (!milestoneInput.trim()) return;
    setNewMilestones((prev) => [...prev, milestoneInput.trim()]);
    setMilestoneInput('');
  };

  const handleAddMilestoneToGoal = async (goal: Goal) => {
    const title = eachMilestoneInput[goal.id]?.trim();
    if (!title) return;

    try {
      const order = goal.milestones.length;
      const response = await fetchApi<{ goal: Goal }>(`/goals/${goal.id}/milestones`, {
        method: 'POST',
        body: JSON.stringify({
          milestones: [{ title, order }],
        }),
      });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? response.goal : g)));
      setEachMilestoneInput((prev) => ({ ...prev, [goal.id]: '' }));
      toast.success('MILESTONE ADDED');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add milestone');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tempId = `temp-goal-${Date.now()}`;
    const tempGoal: Goal = {
      id: tempId,
      title: newTitle,
      description: newDesc || null,
      category: newCategory || null,
      status: 'ACTIVE',
      targetDate: newTargetDate ? new Date(newTargetDate).toISOString() : null,
      milestones: newMilestones.map((title, idx) => ({
        id: `temp-ms-${idx}-${Date.now()}`,
        title,
        isCompleted: false,
        dueDate: null,
      })),
      createdAt: new Date().toISOString(),
    };

    setGoals((prev) => [tempGoal, ...prev]);
    setNewTitle('');
    setNewDesc('');
    setNewCategory('');
    setNewTargetDate('');
    setNewMilestones([]);
    setMilestoneInput('');
    setShowAddForm(false);

    try {
      const response = await fetchApi<{ goal: Goal }>('/goals', {
        method: 'POST',
        body: JSON.stringify({
          title: tempGoal.title,
          description: tempGoal.description,
          category: tempGoal.category,
          targetDate: tempGoal.targetDate,
        }),
      });
      const goal = response.goal;
      let finalGoal = { ...goal, milestones: goal.milestones || [] };
      const filteredMilestones = tempGoal.milestones.map((m) => m.title);
      
      if (filteredMilestones.length > 0) {
        const milestonesData = await fetchApi<{ goal: Goal }>(`/goals/${goal.id}/milestones`, {
          method: 'POST',
          body: JSON.stringify({
            milestones: filteredMilestones.map((title, order) => ({ title, order })),
          }),
        });
        finalGoal = milestonesData.goal;
      }
      setGoals((prev) => prev.map((g) => (g.id === tempId ? finalGoal : g)));
      toast.success('CHALLENGE CREATED 🏆');
    } catch (err: any) {
      setGoals((prev) => prev.filter((g) => g.id !== tempId));
      toast.error(err.message || 'Creation failed');
    }
  };

  const handleToggleMilestone = async (goalId: string, milestoneId: string, isCompleted: boolean) => {
    try {
      const data = await fetchApi<{ goal: Goal }>(`/goals/${goalId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCompleted }),
      });
      setGoals((prev) => prev.map((g) => (g.id === goalId ? data.goal : g)));
      toast.success(isCompleted ? 'MILESTONE ACHIEVED' : 'MILESTONE REOPENED');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update milestone');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('PURGE THIS CHALLENGE?')) return;
    try {
      await fetchApi(`/goals/${goalId}`, { method: 'DELETE' });
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      toast.success('CHALLENGE PURGED');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete goal');
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      const data = await fetchApi<{ goal: Goal }>(`/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      setGoals((prev) => prev.map((g) => (g.id === goalId ? data.goal : g)));
      toast.success('CHALLENGE CONQUERED! 🏆');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete goal');
    }
  };

  // Filter list
  const filteredGoals = goals.filter((g) => {
    if (activeTab === 'CREATED') {
      if (g.status !== 'ACTIVE') return false;
    } else if (activeTab === 'SUBMITTED') {
      if (g.status !== 'COMPLETED') return false;
    } else {
      return false; // mock empty lists for Invited and Public
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatches = g.title.toLowerCase().includes(q);
      const descMatches = g.description?.toLowerCase().includes(q) || false;
      const catMatches = g.category?.toLowerCase().includes(q) || false;
      return titleMatches || descMatches || catMatches;
    }

    return true;
  });

  // User details
  const fullName = user?.fullName || 'Sepideh Yazdi';
  const username = user?.username || user?.primaryEmailAddress?.emailAddress.split('@')[0] || 'Sepidy';
  const imageUrl = user?.imageUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sepideh';

  // Floating plus button element
  const plusButton = (
    <button
      onClick={() => {
        setShowAddForm((prev) => !prev);
        setNewTitle('');
        setNewDesc('');
        setNewCategory('');
        setNewTargetDate('');
        setNewMilestones([]);
        setMilestoneInput('');
      }}
      className="w-12 h-12 bg-[#FFD600] border-[2.5px] border-black rounded-full flex items-center justify-center shadow-[3px_3px_0px_#000] hover:bg-black hover:text-[#FFD600] transition-colors cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shrink-0"
      title="Add New Challenge"
    >
      {showAddForm ? <X className="w-5 h-5 text-black" /> : <Plus className="w-5 h-5 text-black" />}
    </button>
  );

  return (
    <MockupLayout activeTab="challenges" floatingButton={plusButton}>
      <div className="flex flex-col gap-4 font-body relative">
        
        {/* Search Bar matching reference */}
        <div className="relative border-[3px] border-black rounded-[14px] bg-white px-3.5 py-3 flex items-center gap-2 shadow-[3px_3px_0px_#000] focus-within:translate-x-[1px] focus-within:translate-y-[1px] focus-within:shadow-[2px_2px_0px_#000] transition-all">
          <Search className="w-5 h-5 text-black shrink-0" />
          <input
            type="text"
            placeholder="Search by Name or Creator"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-black focus:outline-none placeholder-gray-400 font-bold"
          />
        </div>

        {/* Tab Controls exact style */}
        <div className="flex border-b-[2.5px] border-black font-label text-[10px] font-black uppercase tracking-wider pb-1 mb-2 select-none overflow-x-auto gap-4">
          {(['CREATED', 'INVITED', 'PUBLIC', 'SUBMITTED'] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilterTab(tab)}
                className={`py-1 relative px-0.5 whitespace-nowrap cursor-pointer transition-colors ${
                  active ? 'text-black font-black' : 'text-gray-400 hover:text-black'
                }`}
              >
                {tab}
                {active && (
                  <span className="absolute bottom-[-5px] left-0 right-0 h-[3.5px] bg-[#FFD600] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Goal Creator Form Card Overlay */}
        {showAddForm && (
          <div className="border-[3px] border-black bg-white rounded-[24px] p-5 shadow-[4px_4px_0px_#000] animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-4">
              <span className="font-display font-black text-sm uppercase">Create Challenge</span>
              <button 
                onClick={() => setShowAddForm(false)} 
                className="w-6 h-6 border-[2px] border-black rounded-full flex items-center justify-center bg-gray-100 hover:bg-black hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-1">Challenge Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Day [1/7] - UI Challenge"
                  className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2.5 text-xs font-body focus:outline-none focus:border-[#FFD600]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Details & rules..."
                  className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2.5 text-xs font-body focus:outline-none focus:border-[#FFD600] h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. DESIGN"
                    className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2.5 text-xs font-body focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2.5 text-xs font-body focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-label font-black text-gray-400 uppercase mb-1">Milestones</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={milestoneInput}
                    onChange={(e) => setMilestoneInput(e.target.value)}
                    placeholder="e.g. Design UI layout"
                    className="flex-1 bg-[#FAF7F2] border-[2px] border-black rounded-xl p-2.5 text-xs font-body focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMilestone();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-3 py-2 bg-[#FFD600] border-[2px] border-black rounded-xl text-xs font-label font-black shadow-[2px_2px_0px_#000] hover:bg-black hover:text-[#FFD600]"
                  >
                    ADD
                  </button>
                </div>
                
                {/* List of added milestones */}
                {newMilestones.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {newMilestones.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#FAF7F2] border border-gray-300 rounded-lg p-2 text-xs">
                        <span className="font-bold text-black">{idx + 1}. {m}</span>
                        <button
                          type="button"
                          onClick={() => setNewMilestones((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="w-full py-3 bg-[#FFD600] text-black font-display font-black text-xs uppercase tracking-wider rounded-xl border-[2px] border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-black hover:text-[#FFD600] transition-colors disabled:opacity-50"
              >
                COMMIT CHALLENGE
              </button>
            </form>
          </div>
        )}

        {/* Goal Card List */}
        {isLoading ? (
          <div className="text-center font-display font-bold text-sm tracking-widest animate-pulse py-12">
            SCANNING CHALLENGES...
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="text-center text-gray-400 font-body text-xs border-[3px] border-dashed border-gray-300 py-16 rounded-[24px] bg-white">
            NO CHALLENGES FOUND IN THIS STATE
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGoals.map((goal) => {
              const milestones = goal.milestones || [];
              const total = milestones.length;
              const completed = milestones.filter((m) => m.isCompleted).length;
              
              // Calculate stars (Priority maps to stars: Critical=5, High=4, Medium=3, Low=2)
              const starsCount = goal.category?.toUpperCase() === 'WORK' ? 5 : total > 2 ? 4 : 3;

              // Date starts/ends calculation
              const daysLeft = goal.targetDate ? differenceInDays(new Date(goal.targetDate), new Date()) : 3;
              const startsText = "starts Today";
              const endsText = daysLeft < 0 ? `ended ${Math.abs(daysLeft)} days ago` : `ends in ${daysLeft} days`;

              const isMilestonesExpanded = expandedMilestonesGoalId === goal.id;

              return (
                <div
                  key={goal.id}
                  className="border-[3px] border-black rounded-[24px] p-5 bg-white shadow-[4px_4px_0px_#000] relative flex flex-col justify-between"
                >
                  
                  {/* Difficulty label & Stars */}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-label font-black text-gray-400 uppercase tracking-wide">Difficulty</span>
                    <div className="flex text-[#FFD600] text-sm">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star 
                          key={idx} 
                          className="w-3.5 h-3.5" 
                          fill={idx < starsCount ? '#FFD600' : 'none'} 
                          stroke="#FFD600" 
                        />
                      ))}
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="font-display font-black text-lg text-black leading-tight tracking-tight mt-1">
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-gray-500 text-xs mt-1.5 leading-relaxed font-body">
                      {goal.description}
                    </p>
                  )}

                  {/* Creator Avatar Block */}
                  <div className="flex items-center gap-2 mt-3 p-2 bg-[#FAF7F2] rounded-xl border-2 border-black/5 select-none">
                    <div className="w-7 h-7 rounded-full border border-black overflow-hidden bg-white shrink-0">
                      <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover scale-105" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-display font-black text-[11px] leading-tight text-[#0A0A0A]">{fullName}</span>
                      <span className="text-green-800 font-semibold text-[9px] leading-none">@{username}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between items-center mt-3 text-[10px] font-label font-black text-gray-400 uppercase border-b border-gray-100 pb-2.5">
                    <span>{completed}/{total} Milestones</span>
                    <span>0 Submissions</span>
                  </div>

                  {/* Dates with red highlights */}
                  <div className="flex gap-4 mt-2 text-[10px] font-label font-black select-none">
                    <span className="text-red-500">{startsText}</span>
                    <span className="text-red-500">{endsText}</span>
                  </div>

                  {/* Action Buttons: EDIT (Toggles Milestones Checklist) & SHARE (Purges) */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => setExpandedMilestonesGoalId(isMilestonesExpanded ? null : goal.id)}
                      className="py-2.5 border-[2.5px] border-black bg-[#FFD600] text-black font-display font-black text-[11px] uppercase tracking-wider rounded-xl shadow-[3px_3px_0px_#000] hover:bg-black hover:text-[#FFD600] transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                      {isMilestonesExpanded ? 'CLOSE EDIT' : 'EDIT'}
                    </button>
                    
                    <button
                      onClick={() => {
                        if (goal.status !== 'COMPLETED') {
                          handleCompleteGoal(goal.id);
                        } else {
                          handleDeleteGoal(goal.id);
                        }
                      }}
                      className="py-2.5 border-[2.5px] border-black bg-[#4CD9E3] text-black font-display font-black text-[11px] uppercase tracking-wider rounded-xl shadow-[3px_3px_0px_#000] hover:bg-black hover:text-[#4CD9E3] transition-colors active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                      {goal.status === 'COMPLETED' ? 'PURGE' : 'SHARE'}
                    </button>
                  </div>

                  {/* Milestone Checklist Overlay */}
                  {isMilestonesExpanded && (
                    <div className="mt-4 border-t-2 border-black/10 pt-3 animate-in fade-in duration-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-label font-black text-gray-400">Milestone List</span>
                        {goal.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleCompleteGoal(goal.id)}
                            className="text-[9px] font-label font-black text-green-700 bg-green-50 px-1.5 py-0.5 border border-green-300 rounded hover:bg-green-700 hover:text-white"
                          >
                            Mark Goal Completed
                          </button>
                        )}
                      </div>
                      
                      {total > 0 ? (
                        <div className="space-y-1.5">
                          {goal.milestones.map((m) => (
                            <label
                              key={m.id}
                              className={`flex items-center gap-2 font-body text-xs cursor-pointer select-none p-2 bg-[#FAF7F2] rounded-lg border border-black/5 hover:border-black transition-colors ${
                                m.isCompleted ? 'line-through text-gray-400 opacity-60' : 'font-bold'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={m.isCompleted}
                                onChange={(e) => handleToggleMilestone(goal.id, m.id, e.target.checked)}
                                className="w-3.5 h-3.5 border-2 border-black rounded-none text-[#4CD9E3] focus:ring-0 cursor-pointer"
                              />
                              <span>{m.title}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-[10px] text-gray-400 italic mb-2">
                          No milestones set for this challenge.
                        </div>
                      )}

                      {/* Add new milestone to existing goal (Single task at a time) */}
                      {goal.status !== 'COMPLETED' && (
                        <div className="flex gap-2 mt-3 pt-2.5 border-t border-black/5">
                          <input
                            type="text"
                            placeholder="Add a new milestone..."
                            value={eachMilestoneInput[goal.id] || ''}
                            onChange={(e) => setEachMilestoneInput(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            className="flex-1 bg-[#FAF7F2] border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:border-[#FFD600]"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddMilestoneToGoal(goal);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddMilestoneToGoal(goal)}
                            className="px-3 py-1 bg-[#FFD600] border border-black rounded-lg text-[10px] font-label font-black shadow-[1px_1px_0px_#000] hover:bg-black hover:text-[#FFD600]"
                          >
                            ADD
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </MockupLayout>
  );
};
