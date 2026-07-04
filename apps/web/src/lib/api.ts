import { env } from './env';

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const fetchApi = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  let token: string | null = null;
  try {
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  } catch(err) {}
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${env.VITE_API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || 'An error occurred',
      data?.error?.code || 'UNKNOWN_ERROR',
      response.status
    );
  }

  return data.data as T;
};
