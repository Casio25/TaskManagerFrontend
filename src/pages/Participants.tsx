import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  type Colleague,
  type ColleagueList,
  type TagPerformanceSummary,
  type PendingProjectRating,
  type ProjectRatingSummary,
  type ProjectRatingAverages,
  type TeamAnalyticsResponse,
} from '../lib/api';
import { useI18n } from '../lib/i18n';

type RatingModalState = {
  colleagueId: number;
  colleagueName: string;
  userId: number;
  project: PendingProjectRating;
  punctuality: number;
  teamwork: number;
  quality: number;
  comments: string;
  submitting: boolean;
};

type TeamAnalyticsPanelState = {
  listId: number;
  listName: string;
  memberCount: number;
  connectedMembers: number;
  data: TeamAnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  filters: { from: string; to: string };
  selectedTagId: number | null;
};

const sanitizeColleague = (colleague: Colleague): Colleague => colleague;



export default function ParticipantsPage() {
  const { dictionary, t } = useI18n();
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [lists, setLists] = useState<ColleagueList[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ratingModal, setRatingModal] = useState<RatingModalState | null>(null);
  const [adding, setAdding] = useState(false);
  const [newColleagueLists, setNewColleagueLists] = useState<number[]>([]);
  const [listsPickerOpen, setListsPickerOpen] = useState(false);
  const [listSelections, setListSelections] = useState<Record<number, number | ''>>({});
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [deletingList, setDeletingList] = useState<Record<number, boolean>>({});
  const [removingFromList, setRemovingFromList] = useState<Record<string, boolean>>({});
  const [teamAnalyticsPanel, setTeamAnalyticsPanel] = useState<TeamAnalyticsPanelState | null>(null);
  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  };
  const formatAverage = (value: number) => value.toFixed(1);
  const formatScore = (value?: number | null) => (typeof value === 'number' ? value.toFixed(1) : '—');
  const formatPercent = (value?: number | null) => (typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '—');

  const ICON_SPINNER = '\u23F3';
  const ICON_TRASH = '\u{1F5D1}';

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        const [colleagueData, listData] = await Promise.all([
          api.colleaguesList(),
          api.colleagueLists(),
        ]);
        setColleagues(colleagueData);
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
  const colleagueByUserId = useMemo(() => {
    const map = new Map<number, Colleague>();
    colleagues.forEach((colleague) => {
      if (colleague.contact?.id) {
        map.set(colleague.contact.id, colleague);
      }
    });
    return map;
  }, [colleagues]);
  const teamTagOptions = useMemo(() => {
    if (!teamAnalyticsPanel) return [];
    const tagMap = new Map<number, string>();
    colleagues.forEach((colleague) => {
      const inList = colleague.lists.some((list) => list.id === teamAnalyticsPanel.listId);
      if (!inList) return;
      (colleague.performanceSummary ?? []).forEach((summary) => {
        tagMap.set(summary.tag.id, summary.tag.name);
      });
    });
    return Array.from(tagMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [colleagues, teamAnalyticsPanel?.listId]);

  const openProjectRatingModal = (colleague: Colleague, project: PendingProjectRating) => {
    if (!colleague.contact?.id) return;
    setRatingModal({
      colleagueId: colleague.id,
      colleagueName: colleague.contact.name || colleague.email,
      userId: colleague.contact.id,
      project,
      punctuality: 8,
      teamwork: 8,
      quality: 8,
      comments: '',
      submitting: false,
    });
  };

  const closeProjectRatingModal = () => {
    setRatingModal(null);
  };

  const updateProjectRatingScore = (field: 'punctuality' | 'teamwork' | 'quality', value: number) => {
    setRatingModal((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateProjectRatingComments = (value: string) => {
    setRatingModal((prev) => (prev ? { ...prev, comments: value } : prev));
  };

  const handleSubmitProjectRating = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ratingModal) return;
    setError(null);
    setRatingModal((prev) => (prev ? { ...prev, submitting: true } : prev));
    try {
      const response = await api.rateProject(ratingModal.project.projectId, {
        userId: ratingModal.userId,
        punctuality: ratingModal.punctuality,
        teamwork: ratingModal.teamwork,
        quality: ratingModal.quality,
        comments: ratingModal.comments.trim() ? ratingModal.comments.trim() : undefined,
      });
      const { rating } = response;
      const historyEntry: ProjectRatingSummary = {
        projectId: ratingModal.project.projectId,
        projectName: ratingModal.project.projectName,
        deadline: ratingModal.project.deadline ?? null,
        completedAt: ratingModal.project.completedAt ?? null,
        color: ratingModal.project.color ?? null,
        rating: {
          id: rating.id,
          punctuality: rating.punctuality,
          teamwork: rating.teamwork,
          quality: rating.quality,
          comments: rating.comments ?? null,
          createdAt: rating.createdAt,
          updatedAt: rating.updatedAt,
          ratedBy: null,
        },
      };
      setColleagues((prev) =>
        prev.map((item) => {
          if (item.id !== ratingModal.colleagueId) return item;
          const pending = (item.pendingProjectRatings ?? []).filter(
            (pendingItem) => pendingItem.projectId !== ratingModal.project.projectId,
          );
          const history = [
            historyEntry,
            ...((item.projectRatings ?? []).filter((entry) => entry.projectId !== historyEntry.projectId)),
          ];
          const ratingValues = history.map((entry) => entry.rating);
          const projectRatingAverages = ratingValues.length
            ? {
                count: ratingValues.length,
                punctuality: ratingValues.reduce((total, value) => total + value.punctuality, 0) / ratingValues.length,
                teamwork: ratingValues.reduce((total, value) => total + value.teamwork, 0) / ratingValues.length,
                quality: ratingValues.reduce((total, value) => total + value.quality, 0) / ratingValues.length,
              }
            : null;
          return {
            ...item,
            pendingProjectRatings: pending,
            projectRatings: history,
            projectRatingAverages,
          };
        }),
      );
      setNotice(dictionary.participants.rateProjectSuccess);
      setRatingModal(null);
    } catch (err: any) {
      setError(err.message || dictionary.participants.rateProjectError);
    } finally {
      setRatingModal((prev) => (prev ? { ...prev, submitting: false } : prev));
    }
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

  const fetchTeamAnalytics = async (listId: number, filters?: { from?: string; to?: string }) => {
    const normalizedFilters: { from?: string; to?: string } = {};
    if (filters?.from) normalizedFilters.from = filters.from;
    if (filters?.to) normalizedFilters.to = filters.to;
    setTeamAnalyticsPanel((prev) =>
      prev && prev.listId === listId ? { ...prev, loading: true, error: null } : prev,
    );
    try {
      const response = await api.teamAnalytics(listId, normalizedFilters);
      setTeamAnalyticsPanel((prev) =>
        prev && prev.listId === listId
          ? {
              ...prev,
              data: response,
              loading: false,
              listName: response.list.name,
              memberCount: response.list.members,
              connectedMembers: response.list.connectedMembers,
            }
          : prev,
      );
    } catch (err: any) {
      setTeamAnalyticsPanel((prev) =>
        prev && prev.listId === listId
          ? {
              ...prev,
              loading: false,
              error: err.message || dictionary.participants.errors.analyticsFailed,
            }
          : prev,
      );
    }
  };

  const openTeamAnalyticsPanel = (list: ColleagueList) => {
    const connectedCount = list.members.filter((member) => Boolean(member.colleague?.contact)).length;
    setTeamAnalyticsPanel({
      listId: list.id,
      listName: list.name,
      memberCount: list.members.length,
      connectedMembers: connectedCount,
      data: null,
      loading: true,
      error: null,
      filters: { from: '', to: '' },
      selectedTagId: null,
    });
    void fetchTeamAnalytics(list.id);
  };

  const closeTeamAnalyticsPanel = () => {
    setTeamAnalyticsPanel(null);
  };

  const updateTeamAnalyticsFilter = (field: 'from' | 'to', value: string) => {
    setTeamAnalyticsPanel((prev) =>
      prev ? { ...prev, filters: { ...prev.filters, [field]: value } } : prev,
    );
  };

  const applyTeamAnalyticsFilters = () => {
    if (!teamAnalyticsPanel) return;
    void fetchTeamAnalytics(teamAnalyticsPanel.listId, {
      from: teamAnalyticsPanel.filters.from || undefined,
      to: teamAnalyticsPanel.filters.to || undefined,
    });
  };

  const clearTeamAnalyticsFilters = () => {
    if (!teamAnalyticsPanel) return;
    setTeamAnalyticsPanel((prev) => (prev ? { ...prev, filters: { from: '', to: '' } } : prev));
    void fetchTeamAnalytics(teamAnalyticsPanel.listId);
  };

  const updateTeamAnalyticsTagFilter = (value: string) => {
    setTeamAnalyticsPanel((prev) =>
      prev ? { ...prev, selectedTagId: value ? Number(value) : null } : prev,
    );
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

  const renderPerformanceSummary = (summary?: TagPerformanceSummary[]) => {
    if (!summary || summary.length === 0) {
      return <p className="muted small">{dictionary.participants.performanceEmpty}</p>;
    }

    return (
      <ul className="performance-list">
        {summary.map((item) => {
          const averages = item.averages;
          const last = item.lastRating;
          return (
            <li key={item.tag.id} className="performance-item">
              <div className="performance-tag">{item.tag.name}</div>
              <div className="performance-metrics">
                <span>{dictionary.participants.performanceMetrics.punctuality}: {formatAverage(averages.punctuality)}</span>
                <span>{dictionary.participants.performanceMetrics.teamwork}: {formatAverage(averages.teamwork)}</span>
                <span>{dictionary.participants.performanceMetrics.quality}: {formatAverage(averages.quality)}</span>
              </div>
              <div className="performance-meta muted small">
                {t('participants.performanceRatingsCount', { count: item.ratingsCount })}
              </div>
              {last && (
                <div className="performance-last muted small">
                  <div>{t('participants.performanceLastRating', {
                    date: formatDateTime(last.ratedAt ?? null) || '',
                    taskId: last.taskId ?? '',
                  })}</div>
                  <div className="performance-last-metrics">
                    <span>{dictionary.participants.performanceMetrics.punctuality}: {formatScore(last.punctuality)}</span>
                    <span>{dictionary.participants.performanceMetrics.teamwork}: {formatScore(last.teamwork)}</span>
                    <span>{dictionary.participants.performanceMetrics.quality}: {formatScore(last.quality)}</span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderTeamAnalyticsModal = () => {
    if (!teamAnalyticsPanel) return null;
    const data = teamAnalyticsPanel.data;
    const memberCount = data?.list.members ?? teamAnalyticsPanel.memberCount;
    const connectedMembers = data?.list.connectedMembers ?? teamAnalyticsPanel.connectedMembers;
    const overdue = data?.taskOverdue;
    const hasDeadlines = Boolean(overdue && overdue.withDeadline > 0);
    const hasFiltersApplied = Boolean(teamAnalyticsPanel.filters.from || teamAnalyticsPanel.filters.to);
    const topPerformers = data?.topPerformers ?? [];
    const sharePercent = hasDeadlines && overdue ? formatPercent(overdue.share) : null;
    const tagOptions = teamTagOptions;
    const filteredTopPerformers =
      teamAnalyticsPanel.selectedTagId && topPerformers.length
        ? topPerformers.filter((performer) => {
            const colleague = colleagueByUserId.get(performer.userId);
            if (!colleague?.performanceSummary) return false;
            return colleague.performanceSummary.some(
              (summary) => summary.tag.id === teamAnalyticsPanel.selectedTagId,
            );
          })
        : topPerformers;
    const hasTopPerformers = filteredTopPerformers.length > 0;

    return (
      <div className="modal-overlay">
        <div className="analytics-modal" role="dialog" aria-modal="true" aria-labelledby="team-analytics-title">
          <div className="analytics-modal-head">
            <div>
              <h3 id="team-analytics-title">
                {t('participants.teamAnalyticsTitle', { name: data?.list.name ?? teamAnalyticsPanel.listName })}
              </h3>
              <p className="muted small">{dictionary.participants.teamAnalyticsDescription}</p>
            </div>
            <button type="button" className="secondary" onClick={closeTeamAnalyticsPanel}>
              {dictionary.participants.teamAnalyticsClose}
            </button>
          </div>

          <form
            className="analytics-filters"
            onSubmit={(event) => {
              event.preventDefault();
              applyTeamAnalyticsFilters();
            }}
          >
            <label>
              <span>{dictionary.participants.teamAnalyticsFilterFrom}</span>
              <input
                type="date"
                value={teamAnalyticsPanel.filters.from}
                onChange={(event) => updateTeamAnalyticsFilter('from', event.target.value)}
              />
            </label>
            <label>
              <span>{dictionary.participants.teamAnalyticsFilterTo}</span>
              <input
                type="date"
                value={teamAnalyticsPanel.filters.to}
                onChange={(event) => updateTeamAnalyticsFilter('to', event.target.value)}
              />
            </label>
            <div className="analytics-filter-actions">
              <button type="submit" disabled={teamAnalyticsPanel.loading}>
                {dictionary.participants.teamAnalyticsApply}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={clearTeamAnalyticsFilters}
                disabled={teamAnalyticsPanel.loading || !hasFiltersApplied}
              >
                {dictionary.participants.teamAnalyticsClear}
              </button>
            </div>
          </form>
          <p className="muted small">{dictionary.participants.teamAnalyticsFiltersHint}</p>

          {tagOptions.length > 0 && (
            <div className="analytics-tag-filter">
              <label htmlFor="analytics-tag-select">{dictionary.participants.teamAnalyticsTagLabel}</label>
              <select
                id="analytics-tag-select"
                value={teamAnalyticsPanel.selectedTagId ?? ''}
                onChange={(event) => updateTeamAnalyticsTagFilter(event.target.value)}
              >
                <option value="">{dictionary.participants.teamAnalyticsTagAll}</option>
                {tagOptions.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="analytics-meta">
            <div className="analytics-meta-item">
              <span className="muted small">{dictionary.participants.teamAnalyticsMembersLabel}</span>
              <span className="analytics-meta-value">{memberCount}</span>
            </div>
            <div className="analytics-meta-item">
              <span className="muted small">{dictionary.participants.teamAnalyticsConnectedLabel}</span>
              <span className="analytics-meta-value">{connectedMembers}</span>
            </div>
          </div>

          {teamAnalyticsPanel.error && <div className="analytics-error">{teamAnalyticsPanel.error}</div>}
          {teamAnalyticsPanel.loading && (
            <div className="analytics-loading">{dictionary.participants.teamAnalyticsLoading}</div>
          )}

          {data && (
            <>
              <div className="analytics-section">
                <div className="analytics-section-title">{dictionary.participants.teamAnalyticsAveragesTitle}</div>
                {data.ratingAverages ? (
                  <>
                    <div className="analytics-metrics-grid">
                      <div className="analytics-metric emphasis">
                        <span>{dictionary.participants.teamAnalyticsOverallLabel}</span>
                        <strong>{formatScore(data.ratingAverages.overall)}</strong>
                        <div className="analytics-bar" aria-hidden>
                          <span
                            className="analytics-bar-fill"
                            style={{ width: `${Math.min(100, (data.ratingAverages.overall / 10) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="analytics-metric">
                        <span>{dictionary.participants.rateProjectPunctuality}</span>
                        <strong>{formatScore(data.ratingAverages.punctuality)}</strong>
                        <div className="analytics-bar" aria-hidden>
                          <span
                            className="analytics-bar-fill"
                            style={{ width: `${Math.min(100, (data.ratingAverages.punctuality / 10) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="analytics-metric">
                        <span>{dictionary.participants.rateProjectTeamwork}</span>
                        <strong>{formatScore(data.ratingAverages.teamwork)}</strong>
                        <div className="analytics-bar" aria-hidden>
                          <span
                            className="analytics-bar-fill"
                            style={{ width: `${Math.min(100, (data.ratingAverages.teamwork / 10) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="analytics-metric">
                        <span>{dictionary.participants.rateProjectQuality}</span>
                        <strong>{formatScore(data.ratingAverages.quality)}</strong>
                        <div className="analytics-bar" aria-hidden>
                          <span
                            className="analytics-bar-fill"
                            style={{ width: `${Math.min(100, (data.ratingAverages.quality / 10) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="muted small">
                      {t('participants.projectRatingsOverallCount', { count: data.ratingAverages.count })}
                    </div>
                  </>
                ) : (
                  <p className="analytics-section-empty">{dictionary.participants.teamAnalyticsAveragesEmpty}</p>
                )}
              </div>

              <div className="analytics-section">
                <div className="analytics-section-title">{dictionary.participants.teamAnalyticsOverdueTitle}</div>
                {hasDeadlines && overdue ? (
                  <div className="analytics-metric">
                    <span>
                      {t('participants.teamAnalyticsOverdueValue', {
                        overdue: overdue.overdue,
                        total: overdue.withDeadline,
                        percent: sharePercent ?? '0%',
                      })}
                    </span>
                  </div>
                ) : (
                  <p className="analytics-section-empty">{dictionary.participants.teamAnalyticsOverdueEmpty}</p>
                )}
              </div>

              <div className="analytics-section">
                <div className="analytics-section-title">{dictionary.participants.teamAnalyticsTopTitle}</div>
                {!hasTopPerformers && (
                  <p className="analytics-section-empty">
                    {teamAnalyticsPanel.selectedTagId
                      ? dictionary.participants.teamAnalyticsTagNoMatches
                      : dictionary.participants.teamAnalyticsTopEmpty}
                  </p>
                )}
                {hasTopPerformers && (
                  <ul className="analytics-top-list">
                    {filteredTopPerformers.map((performer, index) => (
                      <li key={performer.userId} className="analytics-top-item">
                        <div className="analytics-top-head">
                          <div>
                            <div className="analytics-top-name">
                              #{index + 1} · {performer.name || performer.email}
                            </div>
                            <div className="muted small">{performer.email}</div>
                          </div>
                          <div className="analytics-meta-value">{formatScore(performer.overall)}</div>
                        </div>
                        <div className="analytics-top-metrics">
                          <span>
                            {dictionary.participants.rateProjectPunctuality}: {formatScore(performer.punctuality)}
                          </span>
                          <span>
                            {dictionary.participants.rateProjectTeamwork}: {formatScore(performer.teamwork)}
                          </span>
                          <span>
                            {dictionary.participants.rateProjectQuality}: {formatScore(performer.quality)}
                          </span>
                        </div>
                        <div className="muted small">
                          {t('participants.performanceRatingsCount', { count: performer.ratingsCount })}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {hasTopPerformers && (
                  <div className="analytics-section-table">
                    <div className="analytics-section-title">
                      {dictionary.participants.teamAnalyticsTableTitle}
                    </div>
                    <div className="analytics-table-wrapper">
                      <table className="analytics-table">
                        <thead>
                          <tr>
                            <th>{dictionary.participants.teamAnalyticsTableName}</th>
                            <th>{dictionary.participants.teamAnalyticsTableOverall}</th>
                            <th>{dictionary.participants.teamAnalyticsTableRatings}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTopPerformers.map((performer) => (
                            <tr key={`table-${performer.userId}`}>
                              <td>{performer.name || performer.email}</td>
                              <td>{formatScore(performer.overall)}</td>
                              <td>{performer.ratingsCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderProjectRatingAverages = (averages?: ProjectRatingAverages | null) => {
    if (!averages) {
      return <p className="muted small">{dictionary.participants.projectRatingsOverallEmpty}</p>;
    }
    return (
      <div className="project-rating-averages">
        <div className="rating-metrics">
          <span>{dictionary.participants.rateProjectPunctuality}: {formatAverage(averages.punctuality)}</span>
          <span>{dictionary.participants.rateProjectTeamwork}: {formatAverage(averages.teamwork)}</span>
          <span>{dictionary.participants.rateProjectQuality}: {formatAverage(averages.quality)}</span>
        </div>
        <div className="muted small">
          {t('participants.projectRatingsOverallCount', { count: averages.count })}
        </div>
      </div>
    );
  };

  const renderPendingProjectRatings = (colleague: Colleague) => {
    const pending = colleague.pendingProjectRatings ?? [];
    if (pending.length === 0) {
      return <p className="muted small">{dictionary.participants.projectRatingsPendingEmpty}</p>;
    }
    return (
      <ul className="project-rating-list">
        {pending.map((item) => {
          const timeline = item.completedAt
            ? t('participants.projectCompletedOn', { date: formatDateTime(item.completedAt) })
            : item.deadline
              ? t('participants.projectDeadlineOn', { date: formatDateTime(item.deadline) })
              : '';
          return (
            <li key={item.projectId} className="project-rating-item">
              <div className="project-rating-details">
                <div className="task-title">{item.projectName}</div>
                {timeline && <div className="muted small">{timeline}</div>}
              </div>
              <button
                type="button"
                onClick={() => openProjectRatingModal(colleague, item)}
                disabled={!colleague.contact}
              >
                {dictionary.participants.projectRatingsRateAction}
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderProjectRatingsHistory = (ratings?: ProjectRatingSummary[]) => {
    if (!ratings || ratings.length === 0) {
      return <p className="muted small">{dictionary.participants.projectRatingsHistoryEmpty}</p>;
    }
    return (
      <ul className="project-rating-history">
        {ratings.map((entry) => {
          const timeline = entry.completedAt
            ? t('participants.projectCompletedOn', { date: formatDateTime(entry.completedAt) })
            : entry.deadline
              ? t('participants.projectDeadlineOn', { date: formatDateTime(entry.deadline) })
              : '';
          const ratedOn = t('participants.projectRatedOn', {
            date: formatDateTime(entry.rating.updatedAt || entry.rating.createdAt),
          });
          return (
            <li key={`${entry.projectId}-${entry.rating.id}`} className="project-rating-history-item">
              <div className="project-rating-head">
                <div>
                  <div className="task-title">{entry.projectName}</div>
                  {timeline && <div className="muted small">{timeline}</div>}
                </div>
                <div className="muted small">{ratedOn}</div>
              </div>
              <div className="rating-metrics">
                <span>{dictionary.participants.rateProjectPunctuality}: {entry.rating.punctuality}</span>
                <span>{dictionary.participants.rateProjectTeamwork}: {entry.rating.teamwork}</span>
                <span>{dictionary.participants.rateProjectQuality}: {entry.rating.quality}</span>
              </div>
              {entry.rating.comments && (
                <div className="muted small rating-comment">“{entry.rating.comments}”</div>
              )}
              {entry.rating.ratedBy && (
                <div className="muted small">
                  {t('participants.projectRatedBy', {
                    name: entry.rating.ratedBy.name || entry.rating.ratedBy.email,
                  })}
                </div>
              )}
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
                  <div className="list-header-actions">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => openTeamAnalyticsPanel(list)}
                    >
                      {dictionary.participants.listAnalyticsButton}
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => handleDeleteList(list)}
                      disabled={isDeleting}
                    >
                      <span aria-hidden>{isDeleting ? ICON_SPINNER : ICON_TRASH}</span>
                      <span className="sr-only">{dictionary.participants.deleteList}</span>
                    </button>
                  </div>
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
                            className="icon-button danger"
                            onClick={() => handleRemoveFromList(list.id, member.colleagueId)}
                            disabled={isRemoving}
                          >
                            <span aria-hidden>{isRemoving ? ICON_SPINNER : ICON_TRASH}</span>
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
    <>
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
            const availableLists = availableListsByColleague[colleague.id] ?? [];
            const listSelection = listSelections[colleague.id] ?? '';
            const ratingAverages = colleague.projectRatingAverages;

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

                <div className="colleague-stats">
                  <div className="stat-item">
                    <div className="stat-number">{colleague.completedProjects ?? 0}</div>
                    <div className="muted small">{dictionary.participants.completedProjectsLabel}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{colleague.completedTasks ?? 0}</div>
                    <div className="muted small">{dictionary.participants.completedTasksLabel}</div>
                  </div>
                </div>

                <div className="assign-block">
                  <h5>{dictionary.participants.projectRatingsTitle}</h5>
                  <div className="project-ratings-section">
                    <div className="project-ratings-subtitle">{dictionary.participants.projectRatingsOverallTitle}</div>
                    {renderProjectRatingAverages(ratingAverages)}
                  </div>
                  <div className="project-ratings-section">
                    <div className="project-ratings-subtitle">{dictionary.participants.projectRatingsPendingTitle}</div>
                    {renderPendingProjectRatings(colleague)}
                  </div>
                  <div className="project-ratings-section">
                    <div className="project-ratings-subtitle">{dictionary.participants.projectRatingsHistoryTitle}</div>
                    {renderProjectRatingsHistory(colleague.projectRatings)}
                  </div>
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
                  <h5>{dictionary.participants.performanceTitle}</h5>
                  {renderPerformanceSummary(colleague.performanceSummary)}
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
      {renderTeamAnalyticsModal()}
      {ratingModal && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="project-rating-title">
            <h3 id="project-rating-title">{dictionary.participants.rateProjectTitle}</h3>
            <p className="muted small">
              {t('participants.rateProjectFor', {
                colleague: ratingModal.colleagueName,
                project: ratingModal.project.projectName,
              })}
            </p>
            <form className="rating-form" onSubmit={handleSubmitProjectRating}>
              <label>
                <span>{dictionary.participants.rateProjectPunctuality}: {ratingModal.punctuality}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={ratingModal.punctuality}
                  onChange={(event) => updateProjectRatingScore('punctuality', Number(event.target.value))}
                />
              </label>
              <label>
                <span>{dictionary.participants.rateProjectTeamwork}: {ratingModal.teamwork}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={ratingModal.teamwork}
                  onChange={(event) => updateProjectRatingScore('teamwork', Number(event.target.value))}
                />
              </label>
              <label>
                <span>{dictionary.participants.rateProjectQuality}: {ratingModal.quality}</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={ratingModal.quality}
                  onChange={(event) => updateProjectRatingScore('quality', Number(event.target.value))}
                />
              </label>
              <label>
                <span>{dictionary.participants.rateProjectComments}</span>
                <textarea
                  rows={3}
                  placeholder={dictionary.participants.rateProjectCommentsPlaceholder}
                  value={ratingModal.comments}
                  onChange={(event) => updateProjectRatingComments(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={closeProjectRatingModal}
                  disabled={ratingModal.submitting}
                >
                  {dictionary.participants.rateProjectCancel}
                </button>
                <button type="submit" disabled={ratingModal.submitting}>
                  {ratingModal.submitting
                    ? dictionary.participants.rateProjectSubmitting
                    : dictionary.participants.rateProjectSubmit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
