import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

type Project = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  deadline?: string | null;
};

type DeadlineInfo = { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' };

function computeDeadlineInfo(deadline?: string | null): DeadlineInfo {
  if (!deadline) return { label: 'No deadline', tone: 'muted' };
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return { label: 'Invalid date', tone: 'muted' };
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return { label: `${diffDays} days left`, tone: 'ok' };
  if (diffDays === 1) return { label: '1 day left', tone: 'warn' };
  if (diffDays === 0) return { label: 'Due today', tone: 'warn' };
  const overdue = Math.abs(diffDays);
  return { label: `Overdue by ${overdue} day${overdue === 1 ? '' : 's'}`, tone: 'danger' };
}

function renderProject(projects: Project[]) {
  return (
    <ul className="project-list">
      {projects.map((p) => {
        const info = computeDeadlineInfo(p.deadline);
        const deadlineDate = p.deadline ? new Date(p.deadline) : null;
        const deadlineParam = deadlineDate ? deadlineDate.toISOString() : null;
        return (
          <li key={p.id} className="project-item">
            <div className="project-title">{p.name}</div>
            <div className="project-meta">
              <span>Created: {new Date(p.createdAt).toLocaleString()}</span>
              {deadlineDate ? (
                <span>
                  Deadline:
                  {' '}
                  <Link to={`/calendar?date=${encodeURIComponent(deadlineParam!)}`}>
                    {deadlineDate.toLocaleString()}
                  </Link>
                  {' '}
                  <span className={`badge badge-${info.tone}`}>{info.label}</span>
                </span>
              ) : (
                <span className="muted">No deadline</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
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
        setError(e.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>Dashboard</h2>
          <div className="muted">Signed in as {user?.name} ({user?.email})</div>
        </div>
        <button onClick={logout}>Logout</button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <div className="grid">
          <section>
            <h3>Projects (Admin)</h3>
            {admin.length === 0 ? <p className="muted">No admin projects</p> : renderProject(admin)}
          </section>
          <section>
            <h3>Projects (Member)</h3>
            {member.length === 0 ? <p className="muted">No member projects</p> : renderProject(member)}
          </section>
        </div>
      )}
    </div>
  );
}
