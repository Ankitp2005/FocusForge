import { create } from 'zustand';

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
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, data) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...data } : t),
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),
}));
