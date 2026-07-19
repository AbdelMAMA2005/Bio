import axios, { AxiosError } from 'axios';

import { getAuthToken } from '@/api/authToken';
import { API_BASE_URL } from '@/api/config';

export class ApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[] }>) => {
    const status = error.response?.status ?? null;
    const raw = error.response?.data?.message;
    const message = Array.isArray(raw) ? raw.join(' ') : (raw ?? error.message);
    return Promise.reject(new ApiError(message, status));
  },
);
