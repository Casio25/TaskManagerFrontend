import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api, type ProjectOverview } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { loadArchivedProjectIds, saveArchivedProjectIds } from '../lib/archive';

const ICON_TRASH = '\u{1F5D1}';
const ICON_SPINNER = '\u23F3';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { dictionary, t } = useI18n();
  const [serverArchived, setServerArchived] = useState<ProjectOverview[]>([]);
  const [projectIndex, setProjectIndex] = useState<Record<number, ProjectOverview>>({});
  const [localArchivedIds, setLocalArchivedIds] = useState<number[]>(() => loadArchivedProjectIds());
  const [restoring, setRestoring] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [archivedData, mineData] = await Promise.all([api.projectsArchived(), api.projectsMine()]);
      setServerArchived(archivedData);
      const combined = [...mineData.admin, ...mineData.member];
      const map: Record<number, ProjectOverview> = {};
      combined.forEach((project) => {
        map[project.id] = project;
      });
      setProjectIndex(map);
      setLocalArchivedIds(loadArchivedProjectIds());
    } catch (err: any) {
      setError(err.message || dictionary.history.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [dictionary.history.loadFailed]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const serverIds = useMemo(
    () => new Set(serverArchived.map((project) => project.id)),
    [serverArchived],
  );

  const localArchivedProjects = useMemo(() => {
    const projects: ProjectOverview[] = [];
    localArchivedIds.forEach((id) => {
      if (serverIds.has(id)) return;
      const project = projectIndex[id];
      if (project) {
        projects.push(project);
      }
    });
    return projects;
  }, [localArchivedIds, projectIndex, serverIds]);

  const combinedProjects = useMemo(
    () => [...serverArchived, ...localArchivedProjects],
    [serverArchived, localArchivedProjects],
  );

  const persistLocalArchive = (next: number[]) => {
    saveArchivedProjectIds(next);
    setLocalArchivedIds(next);
  };

  const handleRestore = async (project: ProjectOverview) => {
    const isServer = serverIds.has(project.id);
    if (isServer) {
      setRestoring((prev) => ({ ...prev, [project.id]: true }));
      try {
        await api.updateProjectStatus(project.id, 'ACTIVE');
        setServerArchived((prev) => prev.filter((item) => item.id !== project.id));
        setNotice(dictionary.history.restoreSuccess);
      } catch (err: any) {
        setError(err.message || dictionary.dashboard.projectStatusUpdateFailed);
      } finally {
        setRestoring((prev) => {
          const next = { ...prev };
          delete next[project.id];
          return next;
        });
      }
    } else {
      persistLocalArchive(localArchivedIds.filter((id) => id !== project.id));
      setNotice(dictionary.history.restoreSuccess);
    }
  };

  const handleDelete = async (project: ProjectOverview) => {
    if (!window.confirm(t('dashboard.deleteConfirm', { name: project.name }))) return;
    setDeleting((prev) => ({ ...prev, [project.id]: true }));
    try {
      await api.deleteProject(project.id);
      setServerArchived((prev) => prev.filter((item) => item.id !== project.id));
      persistLocalArchive(localArchivedIds.filter((id) => id !== project.id));
      setNotice(dictionary.dashboard.deleteSuccess);
    } catch (err: any) {
      setError(err.message || dictionary.dashboard.deleteFailed);
    } finally {
      setDeleting((prev) => {
        const next = { ...prev };
        delete next[project.id];
        return next;
      });
    }
  };

  const renderProjectCard = (project: ProjectOverview) => {
    const isServer = serverIds.has(project.id);
    const archivedAt = project.completedAt || project.updatedAt || project.deadline || project.createdAt;
    const hasTasks = (project.tasks ?? []).length > 0;
    const expanded = expandedProjectId === project.id;
    return (
      <li key={project.id} className="project-item">
        <div className="project-title">{project.name}</div>
        <div className="project-meta">
          {isServer ? (
            <>
              <span>{dictionary.history.archivedOn}: {formatDateTime(archivedAt)}</span>
              {project.completedBy && (
                <span className="muted small">
                  {t('history.archivedBy', {
                    name: project.completedBy.name || project.completedBy.email || '',
                  })}
                </span>
              )}
            </>
          ) : (
            <span className="muted small">{dictionary.history.localBadge}</span>
          )}
        </div>
        {project.description && <p className="muted small">{project.description}</p>}
        {hasTasks && (
          <div className="project-status-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setExpandedProjectId((prev) => (prev === project.id ? null : project.id))}
            >
              {expanded ? dictionary.history.hideDetails : dictionary.history.viewDetails}
            </button>
            <span className="muted small">{dictionary.history.tasksLabel.replace('{{count}}', String(project.tasks?.length ?? 0))}</span>
          </div>
        )}
        {hasTasks && expanded && (
          <ul className="task-list compact history-task-list">
            {project.tasks?.map((task) => {
              const statusKey = (task.status || 'NEW').toString().toUpperCase();
              const statusLabel =
                // @ts-expect-error runtime lookup
                dictionary.dashboard.status?.[statusKey] ?? task.status;
              return (
                <li key={task.id}>
                  <div className="task-head">
                    <span className="task-title">{task.title}</span>
                    <span className={`status-chip status-${statusKey.toLowerCase()}`}>{statusLabel}</span>
                  </div>
                  {task.description && <div className="muted small">{task.description}</div>}
                  <div className="task-meta">
                    <span>{dictionary.dashboard.deadlineLabel}: {formatDateTime(task.deadline)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="project-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => handleRestore(project)}
            disabled={Boolean(restoring[project.id]) || Boolean(deleting[project.id])}
          >
            {restoring[project.id] ? dictionary.history.restoring : dictionary.history.restore}
          </button>
          <button
            type="button"
            className="icon-button danger"
            onClick={() => handleDelete(project)}
            disabled={Boolean(deleting[project.id])}
            title={dictionary.history.delete}
            aria-label={dictionary.history.delete}
          >
            <span aria-hidden>{deleting[project.id] ? ICON_SPINNER : ICON_TRASH}</span>
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>{dictionary.history.title}</h2>
          <p className="muted">{dictionary.history.description}</p>
        </div>
        <button onClick={logout}>{dictionary.auth.logout}</button>
      </div>
      {notice && <div className="notice">{notice}</div>}
      {error && !loading && <p className="error">{error}</p>}
      {loading ? (
        <p>{dictionary.errors.loading}</p>
      ) : combinedProjects.length === 0 ? (
        <p className="muted">{dictionary.history.empty}</p>
      ) : (
        <ul className="project-list">
          {combinedProjects.map(renderProjectCard)}
        </ul>
      )}
      <div className="project-actions" style={{ marginTop: '16px' }}>
        <button type="button" className="secondary" onClick={() => navigate('/dashboard')}>
          {dictionary.history.backToDashboard}
        </button>
      </div>
    </div>
  );
}
