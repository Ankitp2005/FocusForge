import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useTaskStore } from '@/store/taskStore';
import toast from 'react-hot-toast';

export const useUser = () => {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const data = await fetchApi<{
        id: string;
        email: string;
        name: string;
        plan: string;
        timezone: string;
        preferences?: {
          workStartHour?: number;
          workEndHour?: number;
          preferredFocusSessionMins?: number;
          enableSmartReminders?: boolean;
          productivityStyle?: string;
          aiCoachingTone?: string;
        } | null;
      }>('/user/me');
      return data;
    },
  });
};
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  priorityScore: number;
  category: string | null;
  tags: string[];
  dueDate: string | null;
  estimatedMins: number | null;
  isRecurring: boolean;
  reminders: { id: string; remindAt: string; channel: string; status: string }[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TasksResponse {
  tasks: Task[];
}

interface CreateTaskInput {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  category?: string;
  estimatedMins?: number;
  tags?: string[];
  rawInput?: string;
  parseWithAI?: boolean;
}

export const useTasks = (params?: Record<string, string>) => {
  const { setTasks } = useTaskStore();
  const queryString = params ? new URLSearchParams(params).toString() : '';

  return useQuery<TasksResponse>({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const data = await fetchApi<TasksResponse>(`/tasks${queryString ? `?${queryString}` : ''}`);
      setTasks(data.tasks);
      return data;
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { addTask } = useTaskStore();

  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      fetchApi<{ task: Task }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);

      const tempTask: Task = {
        id: `temp-${Date.now()}`,
        title: newTask.title || newTask.rawInput || 'New Task',
        description: newTask.description || null,
        status: 'PENDING',
        priority: newTask.priority || 'MEDIUM',
        priorityScore: 50,
        category: newTask.category || null,
        tags: newTask.tags || [],
        dueDate: newTask.dueDate || null,
        estimatedMins: newTask.estimatedMins || null,
        isRecurring: false,
        reminders: [],
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addTask(tempTask);

      queryClient.getQueryCache().findAll({ queryKey: ['tasks'] }).forEach((query) => {
        queryClient.setQueryData<any>(query.queryKey, (old: any) => {
          if (!old || !Array.isArray(old.tasks)) return old;
          return {
            ...old,
            tasks: [tempTask, ...old.tasks],
          };
        });
      });

      return { previousTasks, tempTaskId: tempTask.id };
    },
    onSuccess: (data, _variables, context) => {
      const { tempTaskId } = context as { tempTaskId: string };
      const { removeTask, addTask: addRealTask } = useTaskStore.getState();
      removeTask(tempTaskId);
      addRealTask(data.task);

      queryClient.getQueryCache().findAll({ queryKey: ['tasks'] }).forEach((query) => {
        queryClient.setQueryData<any>(query.queryKey, (old: any) => {
          if (!old || !Array.isArray(old.tasks)) return old;
          return {
            ...old,
            tasks: old.tasks.map((t: any) => (t.id === tempTaskId ? data.task : t)),
          };
        });
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'], refetchType: 'all' });
      toast.success('TASK INITIALIZED');
    },
    onError: (err: any, _variables, context) => {
      if (context) {
        const { tempTaskId } = context as { tempTaskId: string };
        const { removeTask } = useTaskStore.getState();
        removeTask(tempTaskId);

        queryClient.getQueryCache().findAll({ queryKey: ['tasks'] }).forEach((query) => {
          queryClient.setQueryData<any>(query.queryKey, (old: any) => {
            if (!old || !Array.isArray(old.tasks)) return old;
            return {
              ...old,
              tasks: old.tasks.filter((t: any) => t.id !== tempTaskId),
            };
          });
        });
      }
      toast.error(err.message || 'FAILED TO CREATE TASK');
    },
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();
  const { updateTask } = useTaskStore();

  return useMutation({
    mutationFn: (taskId: string) =>
      fetchApi<{ task: Task; celebrationMessage: string }>(`/tasks/${taskId}/complete`, {
        method: 'POST',
      }),
    onSuccess: (data, taskId) => {
      updateTask(taskId, { status: 'COMPLETED' });
      
      // Instantly remove task from all active queries starting with ['tasks'] in React Query cache
      queryClient.getQueryCache().findAll({ queryKey: ['tasks'] }).forEach((query) => {
        queryClient.setQueryData<any>(query.queryKey, (old: any) => {
          if (!old || !Array.isArray(old.tasks)) return old;
          return {
            ...old,
            tasks: old.tasks.filter((t: any) => t.id !== taskId),
          };
        });
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'], refetchType: 'all' });
      toast.success(data.celebrationMessage || 'TASK COMPLETE');
    },
    onError: (err: any) => {
      toast.error(err.message || 'FAILED TO COMPLETE TASK');
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { updateTask } = useTaskStore();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateTaskInput & { status: string }>) =>
      fetchApi<{ task: Task }>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      updateTask(data.task.id, data.task);
      queryClient.invalidateQueries({ queryKey: ['tasks'], refetchType: 'all' });
    },
    onError: (err: any) => {
      toast.error(err.message || 'FAILED TO UPDATE TASK');
    },
  });
};

export const useSnoozeTask = () => {
  const queryClient = useQueryClient();
  const { updateTask } = useTaskStore();

  return useMutation({
    mutationFn: ({ taskId, snoozeUntil, useSmartSnooze }: { taskId: string; snoozeUntil: string; useSmartSnooze?: boolean }) =>
      fetchApi<{ task: Task }>(`/tasks/${taskId}/snooze`, {
        method: 'POST',
        body: JSON.stringify({ snoozeUntil, useSmartSnooze }),
      }),
    onSuccess: (_, variables) => {
      updateTask(variables.taskId, { status: 'SNOOZED' });

      // Instantly remove task from all active queries starting with ['tasks'] in React Query cache
      queryClient.getQueryCache().findAll({ queryKey: ['tasks'] }).forEach((query) => {
        queryClient.setQueryData<any>(query.queryKey, (old: any) => {
          if (!old || !Array.isArray(old.tasks)) return old;
          return {
            ...old,
            tasks: old.tasks.filter((t: any) => t.id !== variables.taskId),
          };
        });
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'], refetchType: 'all' });
      toast.success('TASK SNOOZED');
    },
    onError: (err: any) => {
      toast.error(err.message || 'FAILED TO SNOOZE TASK');
    },
  });
};

export const useSearchTasks = (query: string) => {
  return useQuery<TasksResponse>({
    queryKey: ['tasks', 'search', query],
    queryFn: () => fetchApi<TasksResponse>(`/tasks/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length > 0,
  });
};

export const useTaskDetails = (taskId: string | null) => {
  return useQuery<{ task: Task & { subtasks: Task[] } }>({
    queryKey: ['tasks', taskId],
    queryFn: () => fetchApi<{ task: Task & { subtasks: Task[] } }>(`/tasks/${taskId}`),
    enabled: !!taskId,
  });
};

