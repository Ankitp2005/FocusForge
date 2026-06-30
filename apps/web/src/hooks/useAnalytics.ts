import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';

export const useAnalyticsSummary = () => {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const data = await fetchApi<{
        totalTasks: number;
        completedToday: number;
        criticalRemaining: number;
        productivityScore: number;
      }>('/analytics/summary');
      return data;
    },
  });
};

export const useAnalyticsTrends = () => {
  return useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: async () => {
      const data = await fetchApi<{
        trends: { date: string; completed: number }[];
      }>('/analytics/completion-trends');
      return data;
    },
  });
};
