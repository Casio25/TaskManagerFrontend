export type User = {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
};

export type ProjectTaskSummary = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  deadline: string | null;
  tags: string[];
  assignedTo?: { id: number; name: string; email: string } | null;
};

export type ProjectOverview = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  deadline?: string | null;
  tasks: ProjectTaskSummary[];
};

export type NewProjectTaskPayload = {
  title: string;
  description?: string | null;
  tags: string[];
  deadline: string;
};

export type CreateProjectPayload = {
  name: string;
  description?: string;
  groupId?: number;
  deadline: string;
  tasks: NewProjectTaskPayload[];
};

export type ParticipantProject = { id: number; name: string };
export type ParticipantTask = { id: number; title: string; projectId: number };

export type Colleague = {
  id: number;
  email: string;
  createdAt: string;
  updatedAt: string;
  contact: { id: number; email: string; name: string; role: 'ADMIN' | 'MEMBER' } | null;
  assignedProjects: ParticipantProject[];
  assignedTasks: ParticipantTask[];
  lists: { id: number; name: string }[];
};

export type ColleagueListMember = {
  id: number;
  colleagueId: number;
  colleague: {
    id: number;
    email: string;
    contact: { id: number; email: string; name: string; role: 'ADMIN' | 'MEMBER' } | null;
  } | null;
};

export type ColleagueList = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  members: ColleagueListMember[];
};

export type ProjectTaskDetail = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  deadline: string | null;
  assignedTo?: { id: number; name: string; email: string } | null;
  project: { id: number; name: string };
};

export type AssignTaskResponse = Colleague & { lastAssignedTask?: ProjectTaskDetail };

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
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || res.statusText };
    }
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

  projectsMine: () => http<{ admin: ProjectOverview[]; member: ProjectOverview[] }>(
    '/projects/mine',
    { headers: getHeaders(true) },
  ),

  createProject: (data: CreateProjectPayload) =>
    http<ProjectOverview>('/projects', { method: 'POST', headers: getHeaders(true), body: JSON.stringify(data) }),

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

  colleaguesList: () => http<Colleague[]>(
    '/colleagues',
    { headers: getHeaders(true) },
  ),

  colleagueLists: () => http<ColleagueList[]>(
    '/colleagues/lists',
    { headers: getHeaders(true) },
  ),

  createColleagueList: (name: string) =>
    http<ColleagueList>('/colleagues/lists', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ name }),
    }),

  addColleagueToList: (listId: number, colleagueId: number) =>
    http<{ list: ColleagueList; colleague: Colleague }>(`/colleagues/lists/${listId}/members`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ colleagueId }),
    }),

  addColleague: (email: string, listIds: number[] = []) =>
    http<Colleague>('/colleagues', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(listIds.length ? { email, listIds } : { email }),
    }),

  assignColleagueToProject: (colleagueId: number, projectId: number) =>
    http<Colleague>(`/colleagues/${colleagueId}/assign-project`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ projectId }),
    }),

  assignColleagueToTask: (colleagueId: number, taskId: number) =>
    http<AssignTaskResponse>(`/colleagues/${colleagueId}/assign-task`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ taskId }),
    }),

  tasksByProject: (projectId: number) =>
    http<ProjectTaskDetail[]>(`/tasks/project/${projectId}`, { headers: getHeaders(true) }),
};


