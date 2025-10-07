export type User = {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
};

export type ProjectStatus = 'ACTIVE' | 'COMPLETED';

export type TaskStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'HELP_REQUESTED'
  | 'DECLINED'
  | 'COMPLETED';

type TaskUserRef = { id: number; name: string; email: string };

export type ProjectTaskSummary = {
  id: number;
  title: string;
  description?: string | null;
  status: TaskStatus | string;
  deadline: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  submittedBy?: TaskUserRef | null;
  completedBy?: TaskUserRef | null;
  tags: string[];
  assignedTo?: TaskUserRef | null;
};

export type TagPerformanceSummary = {
  tag: { id: number; name: string };
  averages: { punctuality: number; teamwork: number; quality: number };
  ratingsCount: number;
  lastRating: {
    taskId?: number | null;
    ratedAt?: string | null;
    punctuality?: number | null;
    teamwork?: number | null;
    quality?: number | null;
  } | null;
};

export type ProjectOverview = {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  deadline?: string | null;
  status: ProjectStatus | string;
  completedAt?: string | null;
  completedBy?: TaskUserRef | null;
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
  color?: string;
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
  completedProjects?: number;
  completedTasks?: number;
  performanceSummary?: TagPerformanceSummary[];
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
  status: TaskStatus | string;
  deadline: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  submittedBy?: TaskUserRef | null;
  completedBy?: TaskUserRef | null;
  assignedTo?: TaskUserRef | null;
  tags: string[];
  project: { id: number; name: string; color?: string | null };
};

export type TaskRatingPerformance = {
  tagId: number;
  tagName: string;
  summary: {
    averagePunctuality: number;
    averageTeamwork: number;
    averageQuality: number;
    ratingsCount: number;
    lastPunctuality?: number | null;
    lastTeamwork?: number | null;
    lastQuality?: number | null;
    lastTaskId?: number | null;
    lastRatedAt?: string | null;
  } | null;
};

export type TaskRatingResponse = {
  rating: {
    id: number;
    punctuality: number;
    teamwork: number;
    quality: number;
    comments?: string | null;
    userId?: number | null;
    projectId?: number | null;
    taskId?: number | null;
    createdAt: string;
    updatedAt: string;
  };
  performances: TaskRatingPerformance[];
};

export type CalendarTask = {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  project: { id: number; name: string; color?: string | null };
  assignedTo?: { id: number; name: string; email: string } | null;
  assignedGroup?: { id: number; name: string } | null;
};
export type AssignTaskResponse = Colleague & { lastAssignedTask?: ProjectTaskDetail };

export type AuthResponse = {
  user: User;
  access_token: string;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const toUserRef = (user: any | null | undefined): TaskUserRef | null => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
  };
};

const toTagNames = (tags: any[] | undefined): string[] =>
  (tags ?? [])
    .map((link) => link?.tag?.name ?? link?.name ?? link)
    .filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);

const toProjectTaskDetail = (task: any): ProjectTaskDetail => ({
  id: task.id,
  title: task.title,
  description: task.description ?? null,
  status: (task.status ?? 'NEW') as TaskStatus,
  deadline: task.deadline ?? null,
  submittedAt: task.submittedAt ?? null,
  completedAt: task.completedAt ?? null,
  submittedBy: toUserRef(task.submittedBy),
  completedBy: toUserRef(task.completedBy),
  assignedTo: toUserRef(task.assignedTo),
  tags: toTagNames(task.tags),
  project: {
    id: task.project?.id ?? task.projectId ?? 0,
    name: task.project?.name ?? '',
    color: task.project?.color ?? null,
  },
});

export const mapTaskDetailToSummary = (
  detail: ProjectTaskDetail,
): ProjectTaskSummary => ({
  id: detail.id,
  title: detail.title,
  description: detail.description ?? null,
  status: detail.status,
  deadline: detail.deadline,
  submittedAt: detail.submittedAt ?? null,
  completedAt: detail.completedAt ?? null,
  submittedBy: detail.submittedBy ?? null,
  completedBy: detail.completedBy ?? null,
  tags: detail.tags,
  assignedTo: detail.assignedTo ?? null,
});

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
    return http<CalendarTask[]>(`/calendar/me${suffix}`, { headers: getHeaders(true) });
  },

  calendarProject: (projectId: number, params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const suffix = query.size ? `?${query.toString()}` : '';
    return http<CalendarTask[]>(`/calendar/project/${projectId}${suffix}`, { headers: getHeaders(true) });
  },

  deleteProject: (projectId: number) =>
    http<{ success: boolean }>(`/projects/${projectId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    }),

  updateProjectStatus: (projectId: number, status: 'ACTIVE' | 'COMPLETED') =>
    http<ProjectOverview>(`/projects/${projectId}/status`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify({ status }),
    }),

  completeTask: (taskId: number) =>
    http<any>(`/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: getHeaders(true),
    }).then(toProjectTaskDetail),

  reopenTask: (taskId: number) =>
    http<any>(`/tasks/${taskId}/reopen`, {
      method: 'POST',
      headers: getHeaders(true),
    }).then(toProjectTaskDetail),

  rateTask: (taskId: number, data: { punctuality: number; teamwork: number; quality: number; comments?: string }) =>
    http<TaskRatingResponse>(`/tasks/${taskId}/rate`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
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

  removeColleagueFromList: (listId: number, colleagueId: number) =>
    http<{ list: ColleagueList; colleague: Colleague }>(`/colleagues/lists/${listId}/members/${colleagueId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    }),

  deleteColleagueList: (listId: number) =>
    http<{ deletedId: number }>(`/colleagues/lists/${listId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
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
    }).then((response) =>
      response.lastAssignedTask
        ? { ...response, lastAssignedTask: toProjectTaskDetail(response.lastAssignedTask) }
        : response,
    ),

  tasksByProject: (projectId: number) =>
    http<any[]>(`/tasks/project/${projectId}`, { headers: getHeaders(true) }).then((tasks) =>
      tasks.map(toProjectTaskDetail),
    ),
};
