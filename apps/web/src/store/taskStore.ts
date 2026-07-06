import { create } from 'zustand';
import { syncLocalNotifications } from '../lib/notifications';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  priorityScore: number;
}

interface TaskStore {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  setTasks: (tasks) => {
    syncLocalNotifications(tasks);
    set({ tasks });
  },
  addTask: (task) => set((state) => {
    const updated = [task, ...state.tasks];
    syncLocalNotifications(updated);
    return { tasks: updated };
  }),
  updateTask: (id, data) => set((state) => {
    const updated = state.tasks.map((t) => t.id === id ? { ...t, ...data } : t);
    syncLocalNotifications(updated);
    return { tasks: updated };
  }),
  removeTask: (id) => set((state) => {
    const updated = state.tasks.filter((t) => t.id !== id);
    syncLocalNotifications(updated);
    return { tasks: updated };
  }),
}));
