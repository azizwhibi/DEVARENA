export type ProblemDetails = {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: string[];
  [key: string]: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;

  constructor(status: number, problem: ProblemDetails) {
    super(typeof problem.detail === 'string' ? problem.detail
      : typeof problem.title === 'string' ? problem.title : `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

export type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'developer' | 'recruiter';
  status: 'active' | 'suspended';
};

export async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  // A Bearer token must only be sent to this application's API origin.
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\') || /[\u0000-\u001f\u007f]/.test(path)) {
    throw new TypeError('API paths must be local absolute paths');
  }
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error('NEXT_PUBLIC_API_URL is required');
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  else headers.delete('Authorization');
  const response = await fetch(base.replace(/\/$/, '') + path, {
    ...init, headers, cache: 'no-store', redirect: 'error',
  });
  if (!response.ok) {
    let problem: ProblemDetails = { status: response.status, title: response.statusText || 'Request failed' };
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        problem = { ...body, status: response.status };
      }
    } catch {
      // Gateways may return HTML; callers still receive a typed HTTP failure.
    }
    throw new ApiError(response.status, problem);
  }
  if (response.status === 204 || init.method?.toUpperCase() === 'HEAD') return undefined as T;
  return response.json() as Promise<T>;
}
