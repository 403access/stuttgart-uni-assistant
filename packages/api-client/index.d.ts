export interface ApiErrorBody {
  error?: string;
  detail?: string;
  [key: string]: unknown;
}

export declare class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail?: string;
  readonly body?: unknown;
}

export interface ClientOptions {
  baseUrl?: string;
  token?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  credentials?: 'omit' | 'same-origin' | 'include';
  headers?: Record<string, string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined | Array<string | number>>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface Client {
  request<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  get<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  del<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
}

export type PublicClient = Client & Record<string, (...args: any[]) => Promise<any>>;
export type AdminClient = Client & Record<string, (...args: any[]) => Promise<any>>;

export function createClient(options?: ClientOptions): Client;
export function createPublicClient(options?: ClientOptions): PublicClient;
export function createAdminClient(options?: ClientOptions): AdminClient;
