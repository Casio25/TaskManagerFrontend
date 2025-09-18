import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api, type ProjectOverview, type ProjectTaskSummary } from '../lib/api';
import { useI18n, type TranslationDictionary } from '../lib/i18n';

type Project = ProjectOverview;
type ProjectTask = ProjectTaskSummary;

type DeadlineInfo = { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' };

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type TasksListProps = {
  tasks: ProjectTask[];
  t: Translate;
  dictionary: TranslationDictionary;
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

function TasksList({ tasks, t, dictionary }: TasksListProps) {
  if (!tasks.length) return <p className="muted small">{dictionary.dashboard.noTasks}</p>;
  return (
    <details className="project-details" open>
      <summary>{t('dashboard.tasksSummary', { count: tasks.length })}</summary>
      <ul className="task-list">
        {tasks.map((task) => {
          const badge = computeDeadlineInfo(task.deadline, t);
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
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { dictionary, t } = useI18n();
  const [admin, setAdmin] = useState<Project[]>([]);
  const [member, setMember] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.projectsMine();
        setAdmin(data.admin);
        setMember(data.member);
      } catch (e: any) {
        setError(e.message || dictionary.dashboard.loadFailed);
      } finally {
        setLoading(false);
      }
    })();
  }, [dictionary.dashboard.loadFailed]);

  const renderProjects = useMemo(
    () =>
      (projects: Project[]) => (
        <ul className="project-list">
          {projects.map((project) => {
            const badge = computeDeadlineInfo(project.deadline ?? null, t);
            const deadlineDate = project.deadline ? new Date(project.deadline) : null;
            const deadlineIso = deadlineDate ? deadlineDate.toISOString() : '';
            return (
              <li key={project.id} className="project-item">
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
                <TasksList tasks={project.tasks} t={t} dictionary={dictionary} />
              </li>
            );
          })}
        </ul>
      ),
    [dictionary, t],
  );

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>{dictionary.dashboard.title}</h2>
          <div className="muted">{t('auth.signedIn', { name: user?.name ?? '', email: user?.email ?? '' })}</div>
        </div>
        <button onClick={logout}>{dictionary.auth.logout}</button>
      </div>
      {loading && <p>{dictionary.errors.loading}</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <div className="grid">
          <section>
            <h3>{dictionary.dashboard.adminProjects}</h3>
            {admin.length === 0 ? (
              <p className="muted">{dictionary.dashboard.noAdminProjects}</p>
            ) : (
              renderProjects(admin)
            )}
          </section>
          <section>
            <h3>{dictionary.dashboard.memberProjects}</h3>
            {member.length === 0 ? (
              <p className="muted">{dictionary.dashboard.noMemberProjects}</p>
            ) : (
              renderProjects(member)
            )}
          </section>
        </div>
      )}
    </div>
  );
}
