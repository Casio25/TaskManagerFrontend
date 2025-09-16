export type User = {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: User;
  access_token: string;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getHeaders(auth = false) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { message: text || res.statusText }; }
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (data: { email: string; password: string; name: string; role?: 'ADMIN' | 'MEMBER' }) =>
    http<AuthResponse>('/auth/register', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    http<AuthResponse>('/auth/login', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }),

  me: () => http<User>('/auth/me', { headers: getHeaders(true) }),

  projectsMine: () => http<{ admin: any[]; member: any[] }>(
    '/projects/mine',
    { headers: getHeaders(true) },
  ),

  createProject: (data: { name: string; description?: string; groupId?: number; deadline: string }) =>
    http<any>('/projects', { method: 'POST', headers: getHeaders(true), body: JSON.stringify(data) }),

  createProjectInvite: (projectId: number, data: { email: string; expiresInDays?: number }) =>
    http<{ invite: any; link: string }>(`/projects/${projectId}/invitations`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    }),

  acceptProjectInvite: (token: string) =>
    http<{ invitation: any }>(`/projects/invitations/accept`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ token }),
    }),

  calendarMe: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const suffix = query.size ? `?${query.toString()}` : '';
    return http<any[]>(`/calendar/me${suffix}`, { headers: getHeaders(true) });
  },

  calendarProject: (projectId: number, params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const suffix = query.size ? `?${query.toString()}` : '';
    return http<any[]>(`/calendar/project/${projectId}${suffix}`, { headers: getHeaders(true) });
  },

  deleteProject: (projectId: number) =>
    http<{ success: boolean }>(`/projects/${projectId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    }),
};
