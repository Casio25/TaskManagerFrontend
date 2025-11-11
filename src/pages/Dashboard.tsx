import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  api,
  mapTaskDetailToSummary,
  type ProjectOverview,
  type ProjectTaskSummary,
  type ProjectTaskDetail,
  type ColleagueList,
  type TaskStatus,
  type ProjectStatus,
} from '../lib/api';
import { useI18n, type TranslationDictionary } from '../lib/i18n';
import { loadArchivedProjectIds, saveArchivedProjectIds } from '../lib/archive';

type Project = ProjectOverview;
type ProjectTask = ProjectTaskSummary;

type DeadlineInfo = { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' };

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type AssignmentControls = {
  projectId: number;
  lists: ColleagueList[];
  lastSelectedListId?: number | null;
  listSelections: Record<number, number | ''>;
  userSelections: Record<number, number | ''>;
  assigning: Record<number, boolean>;
  onListChange: (taskId: number, listId: number | '') => void;
  onUserChange: (taskId: number, colleagueId: number | '') => void;
  onAssign: (taskId: number) => void;
};

type TasksListProps = {
  tasks: ProjectTask[];
  t: Translate;
  dictionary: TranslationDictionary;
  assignment?: AssignmentControls;
  renderActions?: (task: ProjectTask) => ReactNode;
  taskStatusFilter: string;
};

function computeDeadlineInfo(deadline: string | null | undefined, t: Translate): DeadlineInfo {
  if (!deadline) return { label: t('deadlines.none'), tone: 'muted' };
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return { label: t('deadlines.invalid'), tone: 'muted' };
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return { label: t('deadlines.daysLeft', { count: diffDays }), tone: 'ok' };
  if (diffDays === 1) return { label: t('deadlines.dayLeft'), tone: 'warn' };
  if (diffDays === 0) return { label: t('deadlines.dueToday'), tone: 'warn' };
  const overdue = Math.abs(diffDays);
  if (overdue === 1) return { label: t('deadlines.overdueOne'), tone: 'danger' };
  return { label: t('deadlines.overdueMany', { count: overdue }), tone: 'danger' };
}

function formatDateTime(value: string | null | undefined, t: Translate) {
  if (!value) return t('deadlines.none');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? t('deadlines.invalid') : date.toLocaleString();
}

function TasksList({ tasks, t, dictionary, assignment, renderActions, taskStatusFilter }: TasksListProps) {
  const availableLists = assignment
    ? assignment.lists.filter((list) => list.members.some((member) => member.colleague?.contact))
    : [];
  const lastSelectedListId = assignment?.lastSelectedListId ?? null;
  const lastSelectedList =
    lastSelectedListId !== null
      ? availableLists.find((list) => list.id === lastSelectedListId) ?? undefined
      : undefined;
  const orderedLists = lastSelectedList
    ? [lastSelectedList, ...availableLists.filter((list) => list.id !== lastSelectedList.id)]
    : availableLists;

  const getMembers = (listId: number | '') => {
    if (!assignment || typeof listId !== 'number') return [];
    const list = availableLists.find((item) => item.id === listId);
    if (!list) return [];
    return list.members.filter((member) => member.colleague?.contact);
  };

  return (
    <details className="project-details" open>
      <summary>{t('dashboard.tasksSummary', { count: tasks.length })}</summary>
      <ul className="task-list">
        {tasks.map((task) => {
          const statusKey = (task.status || 'NEW').toString().toUpperCase();
          const statusLabel =
            // @ts-expect-error runtime lookup for status dictionary
            dictionary.dashboard.status?.[statusKey] ?? task.status;
          const badge = computeDeadlineInfo(task.deadline, t);
          const rawListId = assignment?.listSelections[task.id] ?? '';
          const listId =
            typeof rawListId === 'number' && orderedLists.some((list) => list.id === rawListId)
              ? rawListId
              : '';
          const memberOptions = getMembers(listId);
          const rawSelectedUser = assignment?.userSelections[task.id] ?? '';
          const selectedUser =
            typeof rawSelectedUser === 'number' &&
            memberOptions.some((member) => member.colleagueId === rawSelectedUser)
              ? rawSelectedUser
              : '';
          const listOptions = orderedLists.map((list, index) => {
            const label =
              lastSelectedList && index === 0
                ? t('dashboard.lastSelectedTeam', { name: list.name })
                : t('dashboard.teamOption', {
                    index: lastSelectedList ? index : index + 1,
                    name: list.name,
                  });
            return { list, label };
          });
          return (
            <li key={task.id}>
              <div className="task-head">
                <span className="task-title">{task.title}</span>
                <span className={`badge badge-${badge.tone}`}>{badge.label}</span>
              </div>
              {task.description && <div className="muted small">{task.description}</div>}
              <div className="task-meta">
                <span>{dictionary.dashboard.deadlineLabel}: {formatDateTime(task.deadline, t)}</span>
                <div className="task-tags readonly">
                  {task.tags.map((tag) => (
                    <span key={tag} className="tag-chip active readonly">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="task-assignee muted small">
                {task.assignedTo
                  ? t('dashboard.taskAssignedTo', { name: task.assignedTo.name || task.assignedTo.email })
                  : dictionary.dashboard.taskUnassigned}
              </div>
              <div className="task-status-row">
                <span className={`status-chip status-${statusKey.toLowerCase()}`}>{statusLabel}</span>
                {task.submittedAt && (
                  <span className="muted small">
                    {t('dashboard.submittedInfo', {
                      name: task.submittedBy?.name || task.submittedBy?.email || dictionary.dashboard.unknownUser,
                      date: formatDateTime(task.submittedAt, t),
                    })}
                  </span>
                )}
                {task.completedAt && (
                  <span className="muted small">
                    {t('dashboard.completedInfo', {
                      name: task.completedBy?.name || task.completedBy?.email || dictionary.dashboard.unknownUser,
                      date: formatDateTime(task.completedAt, t),
                    })}
                  </span>
                )}
                {!task.submittedAt && statusKey === 'SUBMITTED' && (
                  <span className="muted small">{dictionary.dashboard.submitPendingInfo}</span>
                )}
              </div>
              {renderActions && (
                <div className="task-actions">
                  {renderActions(task)}
                </div>
              )}
              {assignment && !task.assignedTo && (
                <div className="task-assign">
                  <select
                    aria-label={dictionary.dashboard.selectList}
                    value={listId}
                    onChange={(event) => assignment.onListChange(task.id, event.target.value ? Number(event.target.value) : '')}
                    disabled={assignment.assigning[task.id] || orderedLists.length === 0}
                  >
                    <option value="">{dictionary.dashboard.selectList}</option>
                    {listOptions.map(({ list, label }) => (
                      <option key={list.id} value={list.id}>{label}</option>
                    ))}
                  </select>
                  <select
                    aria-label={dictionary.dashboard.selectPerson}
                    value={selectedUser}
                    onChange={(event) => assignment.onUserChange(task.id, event.target.value ? Number(event.target.value) : '')}
                    disabled={typeof listId !== 'number' || memberOptions.length === 0 || assignment.assigning[task.id]}
                  >
                    <option value="">{dictionary.dashboard.selectPerson}</option>
                    {memberOptions.map((member) => {
                      const contact = member.colleague?.contact;
                      if (!contact) return null;
                      return (
                        <option key={member.id} value={member.colleagueId}>
                          {contact.name || contact.email}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => assignment.onAssign(task.id)}
                    disabled={typeof listId !== 'number' || !selectedUser || assignment.assigning[task.id]}
                  >
                    {assignment.assigning[task.id] ? dictionary.dashboard.deleteProgress : dictionary.dashboard.assignButton}
                  </button>
                  {orderedLists.length === 0 && (
                    <span className="muted small">{dictionary.dashboard.noAssignableUsers}</span>
                  )}
                  {typeof listId === 'number' && memberOptions.length === 0 && orderedLists.length > 0 && (
                    <span className="muted small">{dictionary.dashboard.noAssignableUsers}</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {tasks.length === 0 && taskStatusFilter !== 'all' && (
        <p className="muted small">{dictionary.dashboard.noTasksForStatus}</p>
      )}
    </details>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { dictionary, t } = useI18n();
  const [searchParams] = useSearchParams();
  const [focusedProjectId, setFocusedProjectId] = useState<number | null>(() => {
    const param = searchParams.get('project');
    const parsed = param ? Number.parseInt(param, 10) : Number.NaN;
    return Number.isNaN(parsed) ? null : parsed;
  });
  const [admin, setAdmin] = useState<Project[]>([]);
  const [member, setMember] = useState<Project[]>([]);
  const [lists, setLists] = useState<ColleagueList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [archivedProjectIds, setArchivedProjectIds] = useState<number[]>(() => loadArchivedProjectIds());
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [taskListSelections, setTaskListSelections] = useState<Record<number, number | ''>>({});
  const [taskUserSelections, setTaskUserSelections] = useState<Record<number, number | ''>>({});
  const [assigningFromList, setAssigningFromList] = useState<Record<number, boolean>>({});
  const [lastListByProject, setLastListByProject] = useState<Record<number, number | null>>({});
  const [taskUpdating, setTaskUpdating] = useState<Record<number, boolean>>({});
  const [projectStatusUpdating, setProjectStatusUpdating] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    saveArchivedProjectIds(archivedProjectIds);
  }, [archivedProjectIds]);

  const archiveProject = useCallback(
    (projectId: number) => {
      setArchivedProjectIds((prev) => {
        if (prev.includes(projectId)) return prev;
        return [...prev, projectId];
      });
      setLastListByProject((prev) => {
        if (!(projectId in prev)) return prev;
        const { [projectId]: _removed, ...rest } = prev;
        return rest;
      });
      const sourceProject = admin.find((item) => item.id === projectId);
      if (sourceProject?.tasks.length) {
        setTaskListSelections((prev) => {
          let changed = false;
          const next = { ...prev };
          sourceProject.tasks.forEach((task) => {
            if (next[task.id] !== undefined) {
              delete next[task.id];
              changed = true;
            }
          });
          return changed ? next : prev;
        });
        setTaskUserSelections((prev) => {
          let changed = false;
          const next = { ...prev };
          sourceProject.tasks.forEach((task) => {
            if (next[task.id] !== undefined) {
              delete next[task.id];
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
      setNotice(dictionary.dashboard.archiveSuccess);
    },
    [admin, dictionary.dashboard.archiveSuccess],
  );

  const restoreProject = useCallback(
    (projectId: number) => {
      setArchivedProjectIds((prev) => prev.filter((id) => id !== projectId));
      setNotice(dictionary.dashboard.restoreSuccess);
    },
    [dictionary.dashboard.restoreSuccess],
  );

  useEffect(() => {
    const param = searchParams.get('project');
    const parsed = param ? Number.parseInt(param, 10) : Number.NaN;
    setFocusedProjectId(Number.isNaN(parsed) ? null : parsed);
  }, [searchParams]);

  useEffect(() => {
    if (!focusedProjectId) return;
    const element = document.getElementById(`project-${focusedProjectId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedProjectId, admin, member]);


  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      console.log('[Dashboard] fetching projects and colleague lists');
      const [projectData, listData] = await Promise.all([
        api.projectsMine(),
        api.colleagueLists(),
      ]);
      console.log('[Dashboard] projects response', projectData);
      console.log('[Dashboard] colleague lists response', listData);
      setAdmin(projectData.admin);
      setMember(projectData.member);
      setLists(listData);
      setArchivedProjectIds((prev) => {
        const validIds = new Set(
          [...projectData.admin, ...projectData.member].map((project) => project.id),
        );
        const hasInvalid = prev.some((id) => !validIds.has(id));
        if (!hasInvalid) return prev;
        return prev.filter((id) => validIds.has(id));
      });
      setLastListByProject((prev) => {
        if (Object.keys(prev).length === 0) return prev;
        const validListIds = new Set(listData.map((list) => list.id));
        const next: Record<number, number | null> = {};
        for (const [projectIdStr, listId] of Object.entries(prev)) {
          const projectId = Number(projectIdStr);
          next[projectId] = listId && validListIds.has(listId) ? listId : null;
        }
        return next;
      });
      const listsWithMembersIds = new Set(
        listData
          .filter((list) => list.members.some((member) => member.colleague?.contact))
          .map((list) => list.id),
      );
      const invalidTaskIds: number[] = [];
      setTaskListSelections((prev) => {
        let changed = false;
        const next: Record<number, number | ''> = {};
        for (const [taskIdStr, value] of Object.entries(prev)) {
          const taskId = Number(taskIdStr);
          if (typeof value === 'number' && !listsWithMembersIds.has(value)) {
            next[taskId] = '';
            invalidTaskIds.push(taskId);
            changed = true;
          } else {
            next[taskId] = value;
          }
        }
        return changed ? next : prev;
      });
      if (invalidTaskIds.length > 0) {
        setTaskUserSelections((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const taskId of invalidTaskIds) {
            if (next[taskId]) {
              next[taskId] = '';
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    } catch (e: any) {
      console.error('[Dashboard] failed to load data', e);
      setError(e.message || dictionary.dashboard.loadFailed);
    } finally {
      console.log('[Dashboard] load finished');
      setLoading(false);
    }
  }, [dictionary.dashboard.loadFailed]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const requestDelete = (projectId: number) => {
    setNotice(null);
    setError(null);
    setConfirming(projectId);
  };

  const cancelDelete = () => {
    setConfirming(null);
  };

  const handleDelete = async (projectId: number) => {
    setError(null);
    setNotice(null);
    setDeleting(projectId);
    try {
      console.log('[Dashboard] deleting project', projectId);
      await api.deleteProject(projectId);
      setAdmin((prev) => prev.filter((project) => project.id !== projectId));
      console.log('[Dashboard] delete success', projectId);
      setNotice(t('dashboard.deleteSuccess'));
    } catch (e: any) {
      console.error('[Dashboard] delete failed', projectId, e);
      setError(e.message || t('dashboard.deleteFailed'));
    } finally {
      console.log('[Dashboard] delete finished', projectId);
      setDeleting(null);
      setConfirming(null);
    }
  };

  const handleListChange = (taskId: number, listId: number | '') => {
    setTaskListSelections((prev) => ({ ...prev, [taskId]: listId }));
    setTaskUserSelections((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleUserChange = (taskId: number, colleagueId: number | '') => {
    setTaskUserSelections((prev) => ({ ...prev, [taskId]: colleagueId }));
  };

  const updateTaskAssignment = (projectId: number, taskId: number, assignedTo: { id: number; name: string; email: string } | null) => {
    const updater = (projects: Project[]) =>
      projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) => (task.id === taskId ? { ...task, assignedTo } : task)),
            }
          : project,
      );
    setAdmin((prev) => updater(prev));
    setMember((prev) => updater(prev));
  };

  const handleAssignFromList = async (projectId: number, taskId: number) => {
    const colleagueId = taskUserSelections[taskId];
    const listId = taskListSelections[taskId];
    if (!colleagueId || !listId) return;
    console.log('[Dashboard] assigning from list', { projectId, taskId, colleagueId, listId });
    setError(null);
    setNotice(null);
    setAssigningFromList((prev) => ({ ...prev, [taskId]: true }));
    try {
      const response = await api.assignColleagueToTask(colleagueId, taskId);
      console.log('[Dashboard] assign response', response);
      const assignedUser = response.lastAssignedTask?.assignedTo;
      if (!assignedUser) {
        setError(t('dashboard.assignFailed'));
        return;
      }
      updateTaskAssignment(projectId, taskId, assignedUser);
      await loadDashboardData();
      setLastListByProject((prev) => ({ ...prev, [projectId]: listId }));
      setTaskListSelections((prev) => ({ ...prev, [taskId]: '' }));
      setTaskUserSelections((prev) => ({ ...prev, [taskId]: '' }));
      setNotice(t('dashboard.assignSuccess'));
    } catch (e: any) {
      console.error('[Dashboard] assign from list failed', { projectId, taskId, colleagueId, listId, error: e });
      setError(e.message || t('dashboard.assignFailed'));
    } finally {
      setAssigningFromList((prev) => ({ ...prev, [taskId]: false }));
      console.log('[Dashboard] assign from list finished', { projectId, taskId });
    }
  };

  const applyTaskDetail = (detail: ProjectTaskDetail) => {
    const summary = mapTaskDetailToSummary(detail);
    const projectId = detail.project.id;
    const apply = (projects: Project[]) =>
      projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) => (task.id === summary.id ? { ...task, ...summary } : task)),
            }
          : project,
      );
    setAdmin((prev) => apply(prev));
    setMember((prev) => apply(prev));
  };

  const applyProjectOverview = (overview: ProjectOverview) => {
    const apply = (projects: Project[]) =>
      projects.map((project) => (project.id === overview.id ? overview : project));
    setAdmin((prev) => apply(prev));
    setMember((prev) => apply(prev));
  };

  const updateTask = async (
    _projectId: number,
    taskId: number,
    action: () => Promise<ProjectTaskDetail>,
    successKey: keyof typeof dictionary.dashboard,
  ) => {
    setError(null);
    setNotice(null);
    setTaskUpdating((prev) => ({ ...prev, [taskId]: true }));
    try {
      const detail = await action();
      applyTaskDetail(detail);
      await loadDashboardData();
      const successMessage = dictionary.dashboard[successKey];
      if (typeof successMessage === 'string') {
        setNotice(successMessage);
      }
    } catch (e: any) {
      setError(e.message || dictionary.dashboard.updateFailed);
    } finally {
      setTaskUpdating((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleSubmitTask = (projectId: number, taskId: number) =>
    updateTask(projectId, taskId, () => api.completeTask(taskId), 'submitSuccess');

  const handleApproveTask = (projectId: number, taskId: number) =>
    updateTask(projectId, taskId, () => api.completeTask(taskId), 'approveSuccess');

  const handleCompleteTask = (projectId: number, taskId: number) =>
    updateTask(projectId, taskId, () => api.completeTask(taskId), 'completeSuccess');

  const handleReopenTask = (projectId: number, taskId: number) =>
    updateTask(projectId, taskId, () => api.reopenTask(taskId), 'reopenSuccess');

  const handleProjectStatusChange = async (projectId: number, status: ProjectStatus) => {
    setError(null);
    setNotice(null);
    setProjectStatusUpdating((prev) => ({ ...prev, [projectId]: true }));
    try {
      const updated = await api.updateProjectStatus(projectId, status);
      applyProjectOverview(updated);
      await loadDashboardData();
      const successKey =
        status === 'COMPLETED' ? 'projectCompleteSuccess' : 'projectReopenSuccess';
      const successMessage = dictionary.dashboard[successKey];
      if (typeof successMessage === 'string') {
        setNotice(successMessage);
      }
    } catch (e: any) {
      setError(e.message || dictionary.dashboard.projectStatusUpdateFailed);
    } finally {
      setProjectStatusUpdating((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const renderAdminTaskActions = (projectId: number, task: ProjectTaskSummary) => {
    const statusKey = (task.status || 'NEW').toString().toUpperCase() as TaskStatus;
    const pending = !!taskUpdating[task.id];
    const buttons: ReactNode[] = [];

    if (statusKey === 'SUBMITTED') {
      buttons.push(
        <button
          key="approve"
          type="button"
          onClick={() => handleApproveTask(projectId, task.id)}
          disabled={pending}
        >
          {pending ? dictionary.dashboard.updatingTask : dictionary.dashboard.approveTask}
        </button>,
      );
      buttons.push(
        <button
          key="reopen"
          type="button"
          className="secondary"
          onClick={() => handleReopenTask(projectId, task.id)}
          disabled={pending}
        >
          {pending ? dictionary.dashboard.updatingTask : dictionary.dashboard.reopenTask}
        </button>,
      );
    } else if (statusKey === 'COMPLETED') {
      buttons.push(
        <button
          key="reopen"
          type="button"
          className="secondary"
          onClick={() => handleReopenTask(projectId, task.id)}
          disabled={pending}
        >
          {pending ? dictionary.dashboard.updatingTask : dictionary.dashboard.reopenTask}
        </button>,
      );
    } else {
      buttons.push(
        <button
          key="complete"
          type="button"
          onClick={() => handleCompleteTask(projectId, task.id)}
          disabled={pending}
        >
          {pending ? dictionary.dashboard.updatingTask : dictionary.dashboard.completeTask}
        </button>,
      );
    }

    if (!buttons.length) return null;
    return buttons;
  };

  const renderMemberTaskActions = (projectId: number, task: ProjectTaskSummary) => {
    const statusKey = (task.status || 'NEW').toString().toUpperCase() as TaskStatus;
    const isAssignee = task.assignedTo?.id === user?.id;
    const pending = !!taskUpdating[task.id];
    if (!isAssignee) return null;
    if (statusKey === 'COMPLETED') return null;
    if (statusKey === 'SUBMITTED') {
      return <span className="muted small">{dictionary.dashboard.submitPendingInfo}</span>;
    }

    return (
      <button
        type="button"
        onClick={() => handleSubmitTask(projectId, task.id)}
        disabled={pending}
      >
        {pending ? dictionary.dashboard.submitInProgress : dictionary.dashboard.submitTask}
      </button>
    );
  };

  const renderProjects = (projects: Project[], showDelete = false) => (
    <ul className="project-list">
      {projects.map((project) => {
        const badge = computeDeadlineInfo(project.deadline ?? null, t);
        const deadlineDate = project.deadline ? new Date(project.deadline) : null;
        const deadlineIso = deadlineDate ? deadlineDate.toISOString() : '';
        const statusKey = (project.status || 'ACTIVE').toString().toUpperCase();
        const projectStatusLabel =
          // @ts-expect-error runtime lookup
          dictionary.dashboard.projectStatusLabels?.[statusKey] ?? project.status;
        const projectStatusPending = !!projectStatusUpdating[project.id];
        const renderTaskActionsForProject = showDelete
          ? (task: ProjectTaskSummary) => renderAdminTaskActions(project.id, task)
          : (task: ProjectTaskSummary) => renderMemberTaskActions(project.id, task);
        const listsWithMembers = lists.filter((list) => list.members.some((member) => member.colleague?.contact));

        return (
          <li key={project.id} id={`project-${project.id}`} className={`project-item${project.id === focusedProjectId ? " project-focused" : ""}`}>
            <div className="project-title">{project.name}</div>
            <div className="project-meta">
              <span>{dictionary.dashboard.createdLabel}: {formatDateTime(project.createdAt, t)}</span>
              {deadlineDate ? (
                <span>
                  {dictionary.dashboard.deadlineLabel}:{' '}
                  <Link to={`/calendar?date=${encodeURIComponent(deadlineIso)}`} title={dictionary.dashboard.deadlineLink}>
                    {deadlineDate.toLocaleString()}
                  </Link>{' '}
                  <span className={`badge badge-${badge.tone}`}>{badge.label}</span>
                </span>
              ) : (
                <span className="muted">{t('deadlines.none')}</span>
              )}
            </div>
            <div className="project-status-block">
              <div className="project-status-row">
                <span>{dictionary.dashboard.projectStatusLabel}: </span>
                <span className={`status-chip status-${statusKey.toLowerCase()}`}>{projectStatusLabel}</span>
              </div>
              {project.completedAt && (
                <span className="muted small">
                  {t('dashboard.projectCompletedInfo', {
                    name: project.completedBy?.name || project.completedBy?.email || dictionary.dashboard.unknownUser,
                    date: formatDateTime(project.completedAt, t),
                  })}
                </span>
              )}
              {showDelete && (
                <div className="project-status-actions">
                  {project.status === 'COMPLETED' ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleProjectStatusChange(project.id, 'ACTIVE')}
                      disabled={projectStatusPending}
                    >
                      {projectStatusPending
                        ? dictionary.dashboard.updatingProject
                        : dictionary.dashboard.reopenProject}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleProjectStatusChange(project.id, 'COMPLETED')}
                      disabled={projectStatusPending}
                    >
                      {projectStatusPending
                        ? dictionary.dashboard.updatingProject
                        : dictionary.dashboard.markProjectComplete}
                    </button>
                  )}
                </div>
              )}
            </div>
            {showDelete && (
              <div className="project-actions">
                {archivedProjectIds.includes(project.id) ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => restoreProject(project.id)}
                    title={dictionary.dashboard.restoreProject}
                    aria-label={dictionary.dashboard.restoreProject}
                  >
                    {dictionary.dashboard.restoreProject}
                  </button>
                ) : (
                  project.status === 'COMPLETED' && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => archiveProject(project.id)}
                      title={dictionary.dashboard.archiveProject}
                      aria-label={dictionary.dashboard.archiveProject}
                    >
                      {dictionary.dashboard.archiveProject}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() => requestDelete(project.id)}
                  title={dictionary.dashboard.deleteProject}
                  aria-label={dictionary.dashboard.deleteProject}
                  disabled={deleting === project.id}
                >
                  <span aria-hidden>{'🗑️'}</span>
                </button>
                {confirming === project.id && (
                  <div className="confirm-card">
                    <p>{t('dashboard.deleteConfirm', { name: project.name })}</p>
                    <div className="confirm-actions">
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDelete(project.id)}
                        disabled={deleting === project.id}
                      >
                        {deleting === project.id ? dictionary.dashboard.deleteProgress : dictionary.dashboard.deleteProject}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={cancelDelete}
                        disabled={deleting === project.id}
                      >
                        {dictionary.dashboard.cancelDelete}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <TasksList
              tasks={project.tasks}
              t={t}
              dictionary={dictionary}
              taskStatusFilter={taskStatusFilter}
              assignment={
              showDelete && !archivedProjectIds.includes(project.id)
                ? {
                    projectId: project.id,
                    lists: listsWithMembers,
                    lastSelectedListId: lastListByProject[project.id] ?? null,
                    listSelections: taskListSelections,
                    userSelections: taskUserSelections,
                    assigning: assigningFromList,
                    onListChange: handleListChange,
                    onUserChange: handleUserChange,
                    onAssign: (taskId) => handleAssignFromList(project.id, taskId),
                  }
                : undefined
            }
              renderActions={renderTaskActionsForProject}
            />
          </li>
        );
      })}
    </ul>
  );

  const normalizeTag = (value: string) => value.trim().toLowerCase();

  const availableTags = useMemo(() => {
    const map = new Map<string, string>();
    [...admin, ...member].forEach((project) => {
      project.tasks.forEach((task) => {
        task.tags.forEach((tag) => {
          const normalized = normalizeTag(tag);
          if (!normalized) return;
          if (!map.has(normalized)) {
            map.set(normalized, tag);
          }
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [admin, member]);

  const filterProjectsByTag = useCallback(
    (projects: Project[]): Project[] => {
      if (!tagFilter) return projects;
      const normalized = normalizeTag(tagFilter);
      return projects
        .map((project) => {
          const filteredTasks = project.tasks.filter((task) =>
            task.tags.some((tag) => normalizeTag(tag) === normalized),
          );
          if (filteredTasks.length === 0) return null;
          return { ...project, tasks: filteredTasks } as Project;
        })
        .filter((project): project is Project => project !== null);
    },
    [tagFilter],
  );

  const applyProjectFilters = useCallback(
    (projects: Project[]): Project[] => {
      const tagged = filterProjectsByTag(projects);
      const now = Date.now();
      return tagged
        .map((project) => {
          const isArchived = archivedProjectIds.includes(project.id);
          const statusKey = (project.status || '').toString().toUpperCase();
          const isCompleted = statusKey === 'COMPLETED';
          const deadlineTime = project.deadline ? new Date(project.deadline).getTime() : NaN;
          const hasValidDeadline = Number.isFinite(deadlineTime);
          const isOverdue = !isCompleted && hasValidDeadline && deadlineTime < now;

          let include = false;
          switch (projectStatusFilter) {
            case 'archived':
              include = isArchived;
              break;
            case 'completed':
              include = !isArchived && isCompleted;
              break;
            case 'overdue':
              include = !isArchived && isOverdue;
              break;
            case 'active':
              include = !isArchived && !isCompleted && !isOverdue;
              break;
            default:
              include = !isArchived;
          }

          if (!include) return null;

          const filteredTasks = project.tasks.filter((task) => {
            if (taskStatusFilter === 'all') return true;
            if (taskStatusFilter === 'overdue') {
              if ((task.status || '').toString().toUpperCase() === 'COMPLETED') return false;
              const taskDeadline = task.deadline ? new Date(task.deadline).getTime() : NaN;
              return Number.isFinite(taskDeadline) && taskDeadline < now;
            }
            return (task.status || '').toString().toUpperCase() === taskStatusFilter;
          });

          return { ...project, tasks: filteredTasks };
        })
        .filter((project): project is Project => project !== null);
    },
    [filterProjectsByTag, archivedProjectIds, projectStatusFilter, taskStatusFilter],
  );

  const filteredAdminProjects = useMemo(
    () => applyProjectFilters(admin),
    [admin, applyProjectFilters],
  );

  const filteredMemberProjects = useMemo(
    () => applyProjectFilters(member),
    [member, applyProjectFilters],
  );

  const tagFilterActive = Boolean(tagFilter);
  const projectStatusFilterActive = projectStatusFilter !== 'all';
  const taskStatusFilterActive = taskStatusFilter !== 'all';

  const getEmptyProjectsMessage = (isAdminView: boolean) => {
    if (projectStatusFilter === 'archived') return dictionary.dashboard.noArchivedProjects;
    if (projectStatusFilterActive) return dictionary.dashboard.noProjectsForStatus;
    if (taskStatusFilterActive) return dictionary.dashboard.noProjectsForTaskStatus;
    if (tagFilterActive) return t('dashboard.noProjectsForTag', { tag: tagFilter });
    return isAdminView ? dictionary.dashboard.noAdminProjects : dictionary.dashboard.noMemberProjects;
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>{dictionary.dashboard.title}</h2>
          <div className="muted">{t('auth.signedIn', { name: user?.name ?? '', email: user?.email ?? '' })}</div>
        </div>
        <button onClick={logout}>{dictionary.auth.logout}</button>
      </div>
      {notice && <div className="notice">{notice}</div>}
      {error && !loading && <p className="error">{error}</p>}
      {loading && <p>{dictionary.errors.loading}</p>}
      {!loading && !error && (
        <>
          {availableTags.length > 0 && (
            <section className="filter tag-filter">
              <div className="filter-field">
                <label htmlFor="tag-filter">{dictionary.dashboard.tagFilterLabel}</label>
                <select
                  id="tag-filter"
                  value={tagFilter}
                  onChange={(event) => setTagFilter(event.target.value)}
                >
                  <option value="">{dictionary.dashboard.tagFilterAll}</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
              {tagFilterActive && (
                <div className="filter-actions">
                  <span className="muted small">
                    {t('dashboard.tagFilterActive', { tag: tagFilter })}
                  </span>
                  <button type="button" className="secondary" onClick={() => setTagFilter('')}>
                    {dictionary.dashboard.tagFilterClear}
                  </button>
                </div>
              )}
            </section>
          )}
          <section className="filter status-filter">
            <div className="filter-field">
              <label htmlFor="project-status-filter">{dictionary.dashboard.projectStatusFilterLabel}</label>
              <select
                id="project-status-filter"
                value={projectStatusFilter}
                onChange={(event) => setProjectStatusFilter(event.target.value)}
              >
                <option value="all">{dictionary.dashboard.projectStatusAll}</option>
                <option value="active">{dictionary.dashboard.projectStatusActive}</option>
                <option value="completed">{dictionary.dashboard.projectStatusCompleted}</option>
                <option value="overdue">{dictionary.dashboard.projectStatusOverdue}</option>
                <option value="archived">{dictionary.dashboard.projectStatusArchived}</option>
              </select>
            </div>
            <div className="filter-field">
              <label htmlFor="task-status-filter">{dictionary.dashboard.taskStatusFilterLabel}</label>
              <select
                id="task-status-filter"
                value={taskStatusFilter}
                onChange={(event) => setTaskStatusFilter(event.target.value)}
              >
                <option value="all">{dictionary.dashboard.taskStatusAll}</option>
                <option value="NEW">{dictionary.dashboard.taskStatusNew}</option>
                <option value="IN_PROGRESS">{dictionary.dashboard.taskStatusInProgress}</option>
                <option value="SUBMITTED">{dictionary.dashboard.taskStatusSubmitted}</option>
                <option value="HELP_REQUESTED">{dictionary.dashboard.taskStatusHelp}</option>
                <option value="DECLINED">{dictionary.dashboard.taskStatusDeclined}</option>
                <option value="COMPLETED">{dictionary.dashboard.taskStatusCompleted}</option>
                <option value="overdue">{dictionary.dashboard.taskStatusOverdue}</option>
              </select>
            </div>
          </section>
          <div className="grid">
            <section>
              <h3>{dictionary.dashboard.adminProjects}</h3>
              {filteredAdminProjects.length === 0 ? (
                <p className="muted">
                  {getEmptyProjectsMessage(true)}
                </p>
              ) : (
                renderProjects(filteredAdminProjects, true)
              )}
            </section>
            <section>
              <h3>{dictionary.dashboard.memberProjects}</h3>
              {filteredMemberProjects.length === 0 ? (
                <p className="muted">
                  {getEmptyProjectsMessage(false)}
                </p>
              ) : (
                renderProjects(filteredMemberProjects)
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}



