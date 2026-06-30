import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';

export interface CalendarStatus {
  connected: boolean;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  email: string | null;
}

export const useCalendarStatus = () => {
  return useQuery({
    queryKey: ['calendar', 'status'],
    queryFn: async () => {
      const data = await fetchApi<{
        connected: boolean;
        syncEnabled: boolean;
        lastSyncedAt: string | null;
        email: string | null;
      }>('/calendar/status');
      return data;
    },
  });
};

export const useConnectCalendar = () => {
  return useMutation({
    mutationFn: () =>
      fetchApi<{ url: string }>('/calendar/connect', { method: 'POST' }),
    onSuccess: (data) => {
      // Redirect to Google OAuth screen
      window.location.href = data.url;
    },
    onError: (err: any) => {
      toast.error(err.message || 'FAILED TO INITIATE CONNECTION');
    },
  });
};

export const useDisconnectCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApi<{ message: string }>('/calendar/disconnect', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('CALENDAR DISCONNECTED');
    },
    onError: (err: any) => {
      toast.error(err.message || 'FAILED TO DISCONNECT');
    },
  });
};

export const useSyncCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchApi<{ message: string; eventsFetched: number }>('/calendar/sync', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success(`SYNC COMPLETE: ${data.eventsFetched} EVENTS FOUND`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'SYNC FAILED');
    },
  });
};

export const useCalendarEvents = () => {
  return useQuery({
    queryKey: ['calendar', 'events'],
    queryFn: async () => {
      const data = await fetchApi<any[]>('/calendar/events');
      return data || [];
    },
  });
};
