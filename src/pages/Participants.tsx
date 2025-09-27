import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  type AssignTaskResponse,
  type Colleague,
  type ColleagueList,
  type ProjectOverview,
  type ProjectTaskDetail,
} from '../lib/api';
import { useI18n } from '../lib/i18n';

function sanitizeColleague(payload: Colleague | AssignTaskResponse): Colleague {
  const { lastAssignedTask, ...rest } = payload as AssignTaskResponse;
  return rest as Colleague;
}



export default function ParticipantsPage() {
  const { dictionary, t } = useI18n();
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [projects, setProjects] = useState<ProjectOverview[]>([]);
  const [lists, setLists] = useState<ColleagueList[]>([]);
  const [projectTasks, setProjectTasks] = useState<Record<number, ProjectTaskDetail[]>>({});
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [projectSelections, setProjectSelections] = useState<Record<number, number | ''>>({});
  const [assigningProject, setAssigningProject] = useState<Record<number, boolean>>({});
  const [taskProjectSelections, setTaskProjectSelections] = useState<Record<number, number | ''>>({});
  const [taskSelections, setTaskSelections] = useState<Record<number, number | ''>>({});
  const [assigningTask, setAssigningTask] = useState<Record<number, boolean>>({});
  const [newColleagueLists, setNewColleagueLists] = useState<number[]>([]);
  const [listsPickerOpen, setListsPickerOpen] = useState(false);
  const [listSelections, setListSelections] = useState<Record<number, number | ''>>({});
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [deletingList, setDeletingList] = useState<Record<number, boolean>>({});
  const [removingFromList, setRemovingFromList] = useState<Record<string, boolean>>({});

  const ICON_SPINNER = '\u23F3';
  const ICON_TRASH = '\u{1F5D1}';

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        const [colleagueData, projectData, listData] = await Promise.all([
          api.colleaguesList(),
          api.projectsMine(),
          api.colleagueLists(),
        ]);
        setColleagues(colleagueData);
        setProjects(projectData.admin);
        setLists(listData);
      } catch (err: any) {
        setError(err.message || dictionary.projects.errors.createFailed);
      } finally {
        setLoading(false);
      }
    })();
  }, [dictionary.projects.errors.createFailed]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setNewColleagueLists((prev) => prev.filter((id) => lists.some((list) => list.id === id)));
    if (lists.length === 0) {
      setListsPickerOpen(false);
    }
  }, [lists]);

  const availableProjectsByColleague = useMemo(() => {
    const map: Record<number, ProjectOverview[]> = {};
    colleagues.forEach((colleague) => {
      const ids = new Set(colleague.assignedProjects.map((project) => project.id));
      map[colleague.id] = projects.filter((project) => !ids.has(project.id));
    });
    return map;
  }, [colleagues, projects]);

  const availableListsByColleague = useMemo(() => {
    const map: Record<number, ColleagueList[]> = {};
    colleagues.forEach((colleague) => {
      const ids = new Set(colleague.lists.map((item) => item.id));
      map[colleague.id] = lists.filter((list) => !ids.has(list.id));
    });
    return map;
  }, [colleagues, lists]);

  const selectedLists = useMemo(() => lists.filter((list) => newColleagueLists.includes(list.id)), [lists, newColleagueLists]);
  const selectedListCount = selectedLists.length;
  const hasLists = lists.length > 0;
  const listSelectionSummary = selectedListCount > 0
    ? t('participants.listSelectionCount', { count: selectedListCount })
    : dictionary.participants.addListsHint;

  const ensureProjectTasks = async (projectId: number, force = false) => {
    if (!force && projectTasks[projectId]) return;
    const data = await api.tasksByProject(projectId);
    setProjectTasks((prev) => ({ ...prev, [projectId]: data }));
  };

  const handleToggleNewColleagueList = (listId: number) => {
    setNewColleagueLists((prev) => (prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]));
  };

  const handleAddColleague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setNotice(null);
    setAdding(true);
    try {
      const result = await api.addColleague(email.trim(), newColleagueLists);
      setColleagues((prev) => [sanitizeColleague(result), ...prev]);
      setEmail('');
      setNewColleagueLists([]);
      setListsPickerOpen(false);
      setNotice(dictionary.participants.successAdd);
    } catch (err: any) {
      setError(err.message || dictionary.participants.errors.addFailed);
    } finally {
      setAdding(false);
    }
  };

  const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setError(null);
    setNotice(null);
    setCreatingList(true);
    try {
      const list = await api.createColleagueList(name);
      setLists((prev) => [...prev, list]);
      setNewListName('');
      setNotice(dictionary.participants.createListSuccess);
    } catch (err: any) {
      setError(err.message || dictionary.participants.errors.createListFailed);
    } finally {
      setCreatingList(false);
    }
  };

  const handleAddToList = async (colleagueId: number) => {
    const listId = listSelections[colleagueId];
    if (!listId) return;
    setError(null);
    setNotice(null);
    try {
      const { list, colleague } = await api.addColleagueToList(listId, colleagueId);
      setLists((prev) => {
        const exists = prev.some((item) => item.id === list.id);
        return exists ? prev.map((item) => (item.id === list.id ? list : item)) : [...prev, list];
      });
      const sanitized = sanitizeColleague(colleague);
      setColleagues((prev) => prev.map((item) => (item.id === sanitized.id ? sanitized : item)));
      setListSelections((prev) => ({ ...prev, [colleagueId]: '' }));
      setNotice(dictionary.participants.addToListSuccess);
    } catch (err: any) {
      setError(err.message || dictionary.participants.errors.addToListFailed);
    }
  };

  const handleRemoveFromList = async (listId: number, colleagueId: number) => {
    setError(null);
    setNotice(null);
    const key = `${listId}:${colleagueId}`;
    setRemovingFromList((prev) => ({ ...prev, [key]: true }));
    try {
      const { list, colleague } = await api.removeColleagueFromList(listId, colleagueId);
      setLists((prev) => prev.map((item) => (item.id === list.id ? list : item)));
      const sanitized = sanitizeColleague(colleague);
      setColleagues((prev) => prev.map((item) => (item.id === sanitized.id ? sanitized : item)));
      setNotice(dictionary.participants.removeFromListSuccess);
    } catch (err: any) {
      setError(err.message || dictionary.participants.errors.removeFromListFailed);
    } finally {
      setRemovingFromList((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleDeleteList = async (list: ColleagueList) => {
    if (!window.confirm(t('participants.deleteListConfirm', { name: list.name }))) return;
    setError(null);
    setNotice(null);
    setDeletingList((prev) => ({ ...prev, [list.id]: true }));
    try {
      await api.deleteColleagueList(list.id);
      const refreshed = await api.colleagueLists();
      setLists(refreshed);
      setNewColleagueLists((prev) => prev.filter((id) => refreshed.some((listItem) => listItem.id === id)));
      if (refreshed.length === 0) {
        setListsPickerOpen(false);
      }
      setColleagues((prev) =>
        prev.map((item) => ({
          ...item,
          lists: item.lists.filter((memberList) => refreshed.some((listItem) => listItem.id === memberList.id)),
        }))
      );
      setNotice(dictionary.participants.deleteListSuccess);
    } catch (err: any) {
      setError(err.message || dictionary.participants.errors.deleteListFailed);
    } finally {
      setDeletingList((prev) => {
        const next = { ...prev };
        delete next[list.id];
        return next;
      });
    }
  };

  const handleAssignProject = async (colleague: Colleague) => {
    const projectId = projectSelections[colleague.id];
    if (!projectId) return;
    setError(null);
    setNotice(null);
    setAssigningProject((prev) => ({ ...prev, [colleague.id]: true }));
    try {
      const response = await api.assignColleagueToProject(colleague.id, projectId);
      setColleagues((prev) => prev.map((item) => (item.id === response.id ? response : item)));
      setProjectSelections((prev) => ({ ...prev, [colleague.id]: '' }));
      setNotice(dictionary.participants.successAssignProject);
    } catch (err: any) {
      setError(err.message || dictionary.participants.errors.assignProjectFailed);
    } finally {
      setAssigningProject((prev) => ({ ...prev, [colleague.id]: false }));
    }
  };

  const handleTaskProjectChange = async (colleagueId: number, projectId: number | '') => {
    setTaskProjectSelections((prev) => ({ ...prev, [colleagueId]: projectId }));
    setTaskSelections((prev) => ({ ...prev, [colleagueId]: '' }));
    if (typeof projectId === 'number') {
      try {
        await ensureProjectTasks(projectId);
      } catch (err) {
        // ignore task load errors here
      }
    }
  };

  const handleAssignTask = async (colleague: Colleague) => {
    const projectId = taskProjectSelections[colleague.id];
    const taskId = taskSelections[colleague.id];
    if (!projectId || !taskId) return;
    setError(null);
    setNotice(null);
    setAssigningTask((prev) => ({ ...prev, [colleague.id]: true }));
    try {
      const response = await api.assignColleagueToTask(colleague.id, taskId);
      setColleagues((prev) => prev.map((item) => (item.id === response.id ? sanitizeColleague(response) : item)));
      setTaskSelections((prev) => ({ ...prev, [colleague.id]: '' }));
      await ensureProjectTasks(projectId, true);
      setNotice(dictionary.participants.successAssignTask);
    } catch (err: any) {
      setError(err.message || dictionary.participants.errors.assignTaskFailed);
    } finally {
      setAssigningTask((prev) => ({ ...prev, [colleague.id]: false }));
    }
  };

  const renderAssignedProjects = (colleague: Colleague) => {
    if (!colleague.assignedProjects.length) return <span className="muted small">{dictionary.participants.emptyProjects}</span>;
    return (
      <ul className="tag-list">
        {colleague.assignedProjects.map((project) => (
          <li key={project.id} className="tag-chip active readonly">{project.name}</li>
        ))}
      </ul>
    );
  };

  const renderAssignedTasks = (colleague: Colleague) => {
    if (!colleague.assignedTasks.length) return <span className="muted small">{dictionary.participants.emptyTasks}</span>;
    return (
      <ul className="task-list compact">
        {colleague.assignedTasks.map((task) => {
          const projectName = projects.find((project) => project.id === task.projectId)?.name ?? `#${task.projectId}`;
          return (
            <li key={task.id}>
              <div className="task-title">{task.title}</div>
              <div className="muted small">{projectName}</div>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderListsManager = () => (
    <div className="participants-card participants-sidebar-card">
      <h3 className="participants-card-title">{dictionary.participants.listsTitle}</h3>
      <form className="participants-side-form" onSubmit={handleCreateList}>
        <label>
          {dictionary.participants.newListLabel}
          <input
            value={newListName}
            onChange={(event) => setNewListName(event.target.value)}
            placeholder={dictionary.participants.newListPlaceholder}
            required
          />
        </label>
        <button type="submit" disabled={creatingList}>
          {creatingList ? dictionary.projects.creating : dictionary.participants.createListButton}
        </button>
      </form>
      {lists.length === 0 ? (
        <p className="muted">{dictionary.participants.noLists}</p>
      ) : (
        <ul className="participants-side-list">
          {lists.map((list) => {
            const isDeleting = Boolean(deletingList[list.id]);
            return (
              <li key={list.id}>
                <div className="list-header">
                  <div className="list-header-info">
                    <span className="list-name">{list.name}</span>
                    <span className="muted small">{t('participants.listMembersCount', { count: list.members.length })}</span>
                  </div>
                  <button
                    type="button"
                    className="list-remove list-delete"
                    onClick={() => handleDeleteList(list)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? ICON_SPINNER : ICON_TRASH}
                    <span className="sr-only">{dictionary.participants.deleteList}</span>
                  </button>
                </div>
                {list.members.length === 0 ? (
                  <p className="muted small">{dictionary.participants.listEmpty}</p>
                ) : (
                  <ul className="list-members">
                    {list.members.map((member) => {
                      const displayName = member.colleague?.contact?.name || member.colleague?.email || dictionary.participants.unknownUser;
                      const email = member.colleague?.contact?.email || member.colleague?.email || '';
                      const key = `${list.id}:${member.colleagueId}`;
                      const isRemoving = Boolean(removingFromList[key]);
                      return (
                        <li key={member.id} className="list-member">
                          <div className="list-member-info">
                            <span className="list-member-name">{displayName}</span>
                            {email && <span className="muted small">{email}</span>}
                          </div>
                          <button
                            type="button"
                            className="list-remove"
                            onClick={() => handleRemoveFromList(list.id, member.colleagueId)}
                            disabled={isRemoving}
                          >
                            {isRemoving ? ICON_SPINNER : ICON_TRASH}
                            <span className="sr-only">{dictionary.participants.removeFromList}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="container participants-page">
      <div className="participants-header">
        <h2>{dictionary.participants.title}</h2>
        <p className="muted">{dictionary.participants.description}</p>
      </div>

      <div className="participants-layout">
        <aside className="participants-sidebar">
          {renderListsManager()}
        </aside>
        <div className="participants-main">
          <section className="participants-add-card">
            <h3 className="participants-card-title">{dictionary.participants.addSectionTitle}</h3>
            <form className="participants-add-form" onSubmit={handleAddColleague}>
              <div className="participants-add-row">
                <label className="sr-only" htmlFor="add-colleague-email">{dictionary.participants.addLabel}</label>
                <input
                  id="add-colleague-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={dictionary.participants.addPlaceholder}
                  required
                />
                <button type="submit" disabled={adding}>
                  {adding ? dictionary.projects.creating : dictionary.participants.addButton}
                </button>
                <button
                  type="button"
                  className="list-picker-toggle"
                  onClick={() => setListsPickerOpen((prev) => !prev)}
                  disabled={!hasLists}
                  aria-expanded={listsPickerOpen}
                  aria-controls={hasLists ? 'participants-list-picker' : undefined}
                >
                  <span className="list-picker-text">
                    <span className="primary">{dictionary.participants.addListsLabel}</span>
                    <span className="secondary">{listSelectionSummary}</span>
                  </span>
                  <span className="list-picker-meta">
                    {selectedListCount > 0 && <span className="badge">{selectedListCount}</span>}
                    <span className={`chevron ${listsPickerOpen ? 'open' : ''}`} aria-hidden="true">v</span>
                  </span>
                </button>
              </div>
              {selectedListCount > 0 && (
                <ul className="tag-list compact" aria-label={dictionary.participants.selectedListsLabel}>
                  {selectedLists.map((list) => (
                    <li key={list.id} className="tag-chip active readonly">{list.name}</li>
                  ))}
                </ul>
              )}
              {listsPickerOpen && hasLists && (
                <div id="participants-list-picker" className="participants-list-picker" role="group" aria-label={dictionary.participants.addListsLabel}>
                  <div className="checkbox-grid">
                    {lists.map((list) => (
                      <label key={list.id} className="checkbox list-picker-option">
                        <input
                          type="checkbox"
                          checked={newColleagueLists.includes(list.id)}
                          onChange={() => handleToggleNewColleagueList(list.id)}
                        />
                        <span>{list.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {!hasLists && (
                <p className="muted small">{dictionary.participants.noLists}</p>
              )}
            </form>
          </section>

          {(notice || error) && (
            <div className="participants-feedback">
              {notice && <div className="notice">{notice}</div>}
              {error && <div className="error">{error}</div>}
            </div>
          )}

          {loading ? (
            <p>{dictionary.errors.loading}</p>
          ) : (
            <div className="participants-grid">
              {colleagues.map((colleague) => {
                const registered = Boolean(colleague.contact);
                const availableProjects = availableProjectsByColleague[colleague.id] ?? [];
                const projectId = projectSelections[colleague.id] ?? '';
                const taskProjectId = taskProjectSelections[colleague.id] ?? '';
                const tasksForProject = typeof taskProjectId === 'number' ? projectTasks[taskProjectId] ?? [] : [];
                const colleagueUserId = colleague.contact?.id;
                const filteredTasks = tasksForProject.filter((task) => !task.assignedTo || task.assignedTo.id === colleagueUserId);
                const taskId = taskSelections[colleague.id] ?? '';
                const availableLists = availableListsByColleague[colleague.id] ?? [];
                const listSelection = listSelections[colleague.id] ?? '';

                return (
                  <section key={colleague.id} className="colleague-card">
                    <div className="colleague-header">
                      <div>
                        <div className="colleague-name">{colleague.contact?.name ?? colleague.email}</div>
                        <div className="muted small">{colleague.email}</div>
                      </div>
                      <span className={`status-badge ${registered ? 'ok' : 'pending'}`}>
                        {registered ? dictionary.participants.statusRegistered : dictionary.participants.statusPending}
                      </span>
                    </div>

                    <div className="assign-block">
                      <h4>{dictionary.participants.assignProject}</h4>
                      <div className="assign-row">
                        <select
                          value={projectId}
                          onChange={(event) => setProjectSelections((prev) => ({ ...prev, [colleague.id]: event.target.value ? Number(event.target.value) : '' }))}
                          disabled={!registered || availableProjects.length === 0 || assigningProject[colleague.id]}
                        >
                          <option value="">{dictionary.participants.projectPlaceholder}</option>
                          {availableProjects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssignProject(colleague)}
                          disabled={!registered || !projectId || assigningProject[colleague.id]}
                        >
                          {assigningProject[colleague.id] ? dictionary.projects.creating : dictionary.participants.assignProjectButton}
                        </button>
                      </div>
                      {!registered && <div className="muted small">{dictionary.participants.disabledAssign}</div>}
                      {registered && availableProjects.length === 0 && (
                        <div className="muted small">{dictionary.participants.emptyProjects}</div>
                      )}
                    </div>

                    <div className="assign-block">
                      <h4>{dictionary.participants.assignTask}</h4>
                      <div className="assign-row stack">
                        <select
                          value={taskProjectId}
                          onChange={(event) => handleTaskProjectChange(colleague.id, event.target.value ? Number(event.target.value) : '')}
                          disabled={!registered || projects.length === 0 || assigningTask[colleague.id]}
                        >
                          <option value="">{dictionary.participants.taskProjectPlaceholder}</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                        <select
                          value={taskId}
                          onChange={(event) => setTaskSelections((prev) => ({ ...prev, [colleague.id]: event.target.value ? Number(event.target.value) : '' }))}
                          disabled={!registered || !taskProjectId || filteredTasks.length === 0 || assigningTask[colleague.id]}
                        >
                          <option value="">{dictionary.participants.taskPlaceholder}</option>
                          {filteredTasks.map((task) => (
                            <option key={task.id} value={task.id}>{task.title}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssignTask(colleague)}
                          disabled={!registered || !taskId || assigningTask[colleague.id]}
                        >
                          {assigningTask[colleague.id] ? dictionary.projects.creating : dictionary.participants.assignTaskButton}
                        </button>
                      </div>
                      {registered && taskProjectId && filteredTasks.length === 0 && (
                        <div className="muted small">{dictionary.participants.emptyTasks}</div>
                      )}
                    </div>

                    <div className="assign-block">
                      <h5>{dictionary.participants.colleagueListsTitle}</h5>
                      {colleague.lists.length === 0 ? (
                        <p className="muted small">{dictionary.participants.colleagueNoLists}</p>
                      ) : (
                        <ul className="tag-list">
                          {colleague.lists.map((list) => (
                            <li key={list.id} className="tag-chip active readonly">{list.name}</li>
                          ))}
                        </ul>
                      )}
                      <div className="assign-row">
                        <select
                          value={listSelection}
                          onChange={(event) => setListSelections((prev) => ({ ...prev, [colleague.id]: event.target.value ? Number(event.target.value) : '' }))}
                          disabled={availableLists.length === 0}
                        >
                          <option value="">{dictionary.participants.addToListPlaceholder}</option>
                          {availableLists.map((list) => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddToList(colleague.id)}
                          disabled={!listSelection}
                        >
                          {dictionary.participants.addToListButton}
                        </button>
                      </div>
                      {availableLists.length === 0 && (
                        <div className="muted small">{dictionary.participants.colleagueAllLists}</div>
                      )}
                    </div>

                    <div className="assign-block">
                      <h5>{dictionary.participants.assignedProjectsTitle}</h5>
                      {renderAssignedProjects(colleague)}
                    </div>
                    <div className="assign-block">
                      <h5>{dictionary.participants.assignedTasksTitle}</h5>
                      {renderAssignedTasks(colleague)}
                    </div>
                  </section>
                );
              })}
              {colleagues.length === 0 && !loading && (
                <p className="muted">{dictionary.participants.noColleagues}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
