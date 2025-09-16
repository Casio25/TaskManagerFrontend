import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type Project = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  deadline?: string | null;
};

type DeadlineBadge = { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' };
function computeDeadline(deadline?: string | null): DeadlineBadge {
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

export default function ProjectsPage() {
  const [admin, setAdmin] = useState<Project[]>([]);
  const [member, setMember] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  const [inviteEmail, setInviteEmail] = useState<Record<number, string>>({});
  const [inviteDays, setInviteDays] = useState<Record<number, number>>({});
  const [inviteLink, setInviteLink] = useState<Record<number, string>>({});
  const [inviteLoading, setInviteLoading] = useState<Record<number, boolean>>({});
  const [inviteError, setInviteError] = useState<Record<number, string | null>>({});
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.projectsMine();
      setAdmin(data.admin);
      setMember(data.member);
    } catch (e: any) {
      setError(e.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!deadline) {
      alert('Please choose a deadline');
      return;
    }
    const deadlineIso = new Date(deadline);
    if (Number.isNaN(deadlineIso.getTime())) {
      alert('Invalid deadline');
      return;
    }
    setCreating(true);
    try {
      const project = await api.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        deadline: deadlineIso.toISOString(),
      });
      setAdmin([project, ...admin]);
      setName('');
      setDescription('');
      setDeadline('');
    } catch (e: any) {
      alert(e.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const submitInvite = async (projectId: number) => {
    const email = inviteEmail[projectId]?.trim();
    const days = inviteDays[projectId] ?? 7;
    if (!email) return;
    setInviteError((s) => ({ ...s, [projectId]: null }));
    setInviteLoading((s) => ({ ...s, [projectId]: true }));
    try {
      const res = await api.createProjectInvite(projectId, { email, expiresInDays: days });
      setInviteLink((s) => ({ ...s, [projectId]: res.link }));
    } catch (e: any) {
      setInviteError((s) => ({ ...s, [projectId]: e.message || 'Failed to invite' }));
    } finally {
      setInviteLoading((s) => ({ ...s, [projectId]: false }));
    }
  };

  const onDelete = async (projectId: number) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    setDeleting((s) => ({ ...s, [projectId]: true }));
    try {
      await api.deleteProject(projectId);
      setAdmin((list) => list.filter((p) => p.id !== projectId));
      setMember((list) => list.filter((p) => p.id !== projectId));
    } catch (e: any) {
      alert(e.message || 'Failed to delete project');
    } finally {
      setDeleting((s) => ({ ...s, [projectId]: false }));
    }
  };

  const renderProjects = (projects: Project[], allowManage = false) => (
    <ul className="project-list">
      {projects.map((p) => {
        const badge = computeDeadline(p.deadline);
        const deadlineDate = p.deadline ? new Date(p.deadline) : null;
        const deadlineIso = deadlineDate ? deadlineDate.toISOString() : '';
        return (
          <li key={p.id} className="project-item">
            <div className="project-title">{p.name}</div>
            <div className="project-meta">
              <span>Created: {new Date(p.createdAt).toLocaleString()}</span>
              {deadlineDate ? (
                <span>
                  Deadline:
                  {' '}
                  <Link to={`/calendar?date=${encodeURIComponent(deadlineIso)}`}>{deadlineDate.toLocaleString()}</Link>
                  {' '}
                  <span className={`badge badge-${badge.tone}`}>{badge.label}</span>
                </span>
              ) : (
                <span className="muted">No deadline</span>
              )}
            </div>
            {allowManage && (
              <div className="project-actions">
                <div className="invite-box">
                  <div className="muted small">Invite user</div>
                  <div className="invite-fields">
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail[p.id] || ''}
                      onChange={(e) => setInviteEmail((s) => ({ ...s, [p.id]: e.target.value }))}
                    />
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={inviteDays[p.id] ?? 7}
                      onChange={(e) => setInviteDays((s) => ({ ...s, [p.id]: Number(e.target.value) }))}
                    />
                    <button onClick={() => submitInvite(p.id)} disabled={inviteLoading[p.id] === true}>
                      {inviteLoading[p.id] ? 'Sending...' : 'Send invite'}
                    </button>
                  </div>
                  {inviteError[p.id] && <div className="error">{inviteError[p.id]}</div>}
                  {inviteLink[p.id] && (
                    <div className="muted small">Share link: <code>{inviteLink[p.id]}</code></div>
                  )}
                </div>
                <button
                  type="button"
                  className="danger"
                  onClick={() => onDelete(p.id)}
                  disabled={deleting[p.id] === true}
                >
                  {deleting[p.id] ? 'Deleting...' : 'Delete project'}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="container">
      <h2>My Projects</h2>
      <section className="auth-card" style={{ marginTop: 16 }}>
        <h3>Create Project</h3>
        <form onSubmit={onCreate}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" required />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </label>
          <label>
            Deadline
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
        </form>
      </section>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="grid" style={{ marginTop: 16 }}>
          <section>
            <h3>Projects (Admin)</h3>
            {admin.length === 0 ? <p className="muted">No admin projects</p> : renderProjects(admin, true)}
          </section>
          <section>
            <h3>Projects (Member)</h3>
            {member.length === 0 ? <p className="muted">No member projects</p> : renderProjects(member)}
          </section>
        </div>
      )}
    </div>
  );
}
