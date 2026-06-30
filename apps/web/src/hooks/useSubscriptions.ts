import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import toast from 'react-hot-toast';

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: async () => {
      const data = await fetchApi<{ plans: any[] }>('/subscriptions/plans');
      return data;
    },
  });
};

export const useCheckout = () => {
  return useMutation({
    mutationFn: (planId: string) =>
      fetchApi<{ url: string }>('/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: any) => {
      toast.error(err.message || 'CHECKOUT INITIATION FAILED');
    },
  });
};

export const usePortal = () => {
  return useMutation({
    mutationFn: () =>
      fetchApi<{ url: string }>('/subscriptions/portal', { method: 'POST' }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: any) => {
      toast.error(err.message || 'PORTAL INITIATION FAILED');
    },
  });
};
