import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { api, type CalendarTask, type ProjectOverview } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { ARCHIVE_STORAGE_KEY, loadArchivedProjectIds } from '../lib/archive';

type ProjectSummary = Pick<ProjectOverview, 'id' | 'name' | 'deadline' | 'color'>;

type RemainingTone = 'ok' | 'warn' | 'danger' | 'muted';
type DayEvent =
  | { type: 'task'; task: CalendarTask }
  | { type: 'project'; project: ProjectSummary };

type RangeFilter = { from?: Date; to?: Date };

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const DEFAULT_PROJECT_COLOR = '#2563EB';

function normalizeColor(value?: string | null) {
  const hex = value?.trim();
  return hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : DEFAULT_PROJECT_COLOR;
}

function hexToRgb(hex: string) {
  const normalized = normalizeColor(hex).replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function lightenColor(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));
  const mix = (channel: number) => clamp(channel + (255 - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function getCalendarItemStyle(color?: string | null) {
  const normalized = normalizeColor(color);
  return {
    backgroundColor: lightenColor(normalized, 0.75),
    color: '#0f172a',
    border: `1px solid ${lightenColor(normalized, 0.4)}`,
  } as const;
}

function getDeadlineItemStyle(color?: string | null) {
  const normalized = normalizeColor(color);
  return {
    borderColor: lightenColor(normalized, 0.35),
    backgroundColor: lightenColor(normalized, 0.85),
    color: '#0f172a',
  } as const;
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDeadline(deadline: string | null | undefined, t: Translate) {
  const date = safeDate(deadline);
  if (!date) return t('deadlines.none');
  return date.toLocaleString();
}

function computeRemaining(deadline: string | null | undefined, t: Translate): { label: string; tone: RemainingTone } {
  const date = safeDate(deadline);
  if (!date) return { label: t('deadlines.none'), tone: 'muted' };
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return { label: t('deadlines.daysLeft', { count: diffDays }), tone: 'ok' };
  if (diffDays === 1) return { label: t('deadlines.dayLeft'), tone: 'warn' };
  if (diffDays === 0) return { label: t('deadlines.dueToday'), tone: 'warn' };
  const overdue = Math.abs(diffDays);
  if (overdue === 1) return { label: t('deadlines.overdueOne'), tone: 'danger' };
  return { label: t('deadlines.overdueMany', { count: overdue }), tone: 'danger' };
}

function parseRangeParams(params?: { from?: string; to?: string }): RangeFilter {
  const range: RangeFilter = {};
  if (params?.from) {
    const from = new Date(params.from);
    if (!Number.isNaN(from.getTime())) range.from = from;
  }
  if (params?.to) {
    const to = new Date(params.to);
    if (!Number.isNaN(to.getTime())) range.to = to;
  }
  return range;
}

export default function CalendarMePage() {
  const { dictionary, t } = useI18n();
  const [allTasks, setAllTasks] = useState<CalendarTask[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectOverview[]>([]);
  const [archivedIds, setArchivedIds] = useState<number[]>(() => loadArchivedProjectIds());
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const archivedSet = useMemo(() => new Set(archivedIds), [archivedIds]);
  const tasks = useMemo(
    () => allTasks.filter((task) => !archivedSet.has(task.project.id)),
    [allTasks, archivedSet],
  );
  const projects = useMemo(
    () => allProjects.filter((project) => !archivedSet.has(project.id)),
    [allProjects, archivedSet],
  );

  const initialViewDate = useMemo(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = safeDate(dateParam);
      if (parsed) return parsed;
    }
    const monthParam = searchParams.get('month');
    if (monthParam) {
      const parsed = safeDate(`${monthParam}-01T00:00:00`);
      if (parsed) return parsed;
    }
    return new Date();
  }, [searchParams]);

  const [viewDate, setViewDateState] = useState<Date>(initialViewDate);

  useEffect(() => {
    setViewDateState(initialViewDate);
  }, [initialViewDate]);

  const updateMonthQuery = useCallback(
    (date: Date) => {
      const next = new URLSearchParams(searchParams);
      next.set('month', format(date, 'yyyy-MM'));
      next.delete('date');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const changeViewDate = useCallback(
    (date: Date) => {
      setViewDateState(date);
      updateMonthQuery(date);
    },
    [updateMonthQuery],
  );

  const fetchData = useCallback(
    async (params?: { from?: string; to?: string }) => {
      setLoading(true);
      setError(null);
      const range = parseRangeParams(params);
      setRangeFilter(range);
      try {
        const [taskData, projectData] = await Promise.all([api.calendarMe(params), api.projectsMine()]);
        setAllTasks(taskData);
        const dedup = new Map<number, ProjectOverview>();
        projectData.admin.forEach((project) => {
          dedup.set(project.id, project);
        });
        projectData.member.forEach((project) => {
          if (!dedup.has(project.id)) {
            dedup.set(project.id, project);
          }
        });
        setAllProjects(Array.from(dedup.values()));
      } catch (e: any) {
        setError(e.message || dictionary.calendar.loadFailed);
      } finally {
        setLoading(false);
      }
    },
    [dictionary.calendar.loadFailed],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ARCHIVE_STORAGE_KEY) {
        setArchivedIds(loadArchivedProjectIds());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const onFilter = (event: FormEvent) => {
    event.preventDefault();
    const params: { from?: string; to?: string } = {};
    if (from) params.from = from;
    if (to) params.to = to;
    fetchData(params);
  };

  const onReset = () => {
    setFrom('');
    setTo('');
    fetchData();
  };

  const eventsByDate = useMemo(() => {
    const map: Record<string, DayEvent[]> = {};
    const addEvent = (date: Date, event: DayEvent) => {
      const key = format(date, 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(event);
    };

    const withinRange = (date: Date) => {
      if (rangeFilter.from && date < rangeFilter.from) return false;
      if (rangeFilter.to && date > rangeFilter.to) return false;
      return true;
    };

    const seenTaskIds = new Set<number>();

    tasks.forEach((task) => {
      const date = safeDate(task.deadline);
      if (!date || !withinRange(date)) return;
      seenTaskIds.add(task.id);
      addEvent(date, { type: 'task', task });
    });

    projects.forEach((project) => {
      project.tasks.forEach((task) => {
        if (seenTaskIds.has(task.id)) return;
        const date = safeDate(task.deadline ?? null);
        if (!date || !withinRange(date)) return;
        const calendarTask: CalendarTask = {
          id: task.id,
          title: task.title,
          status: task.status,
          deadline: task.deadline ?? null,
          project: { id: project.id, name: project.name, color: project.color },
          assignedTo: task.assignedTo ?? null,
        };
        addEvent(date, { type: 'task', task: calendarTask });
      });

      const projectDeadline = safeDate(project.deadline ?? null);
      if (projectDeadline && withinRange(projectDeadline)) {
        addEvent(projectDeadline, {
          type: 'project',
          project: {
            id: project.id,
            name: project.name,
            deadline: project.deadline ?? null,
            color: project.color ?? null,
          },
        });
      }
    });

    return map;
  }, [tasks, projects, rangeFilter]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [viewDate]);

  const goPrevMonth = () => changeViewDate(subMonths(viewDate, 1));
  const goNextMonth = () => changeViewDate(addMonths(viewDate, 1));
  const goToday = () => changeViewDate(new Date());

  const projectDeadlines = useMemo(() => {
    return projects
      .map((project) => ({
        project: {
          id: project.id,
          name: project.name,
          deadline: project.deadline ?? null,
          color: project.color ?? null,
        },
        date: safeDate(project.deadline ?? null),
      }))
      .filter((entry) => {
        if (!entry.date) return false;
        if (rangeFilter.from && entry.date < rangeFilter.from) return false;
        if (rangeFilter.to && entry.date > rangeFilter.to) return false;
        return true;
      })
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());
  }, [projects, rangeFilter]);

  const selectedDayEvents = selectedDay ? eventsByDate[selectedDay] ?? [] : [];
  const selectedTasks = selectedDayEvents.filter(
    (event): event is { type: 'task'; task: CalendarTask } => event.type === 'task',
  );
  const selectedDateLabel = selectedDay ? format(new Date(selectedDay), 'MMMM d, yyyy') : '';

  const handleSelectDay = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    setSelectedDay((prev) => (prev === key ? null : key));
  };

  const weekdays = dictionary.calendar.weekdays;

  return (
    <div className="container">
      <h2>{dictionary.calendar.title}</h2>
      <p className="muted">{dictionary.calendar.description}</p>

      <form className="filter" onSubmit={onFilter}>
        <div className="filter-field">
          <label>
            {dictionary.calendar.filter.from}
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
        </div>
        <div className="filter-field">
          <label>
            {dictionary.calendar.filter.to}
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        <div className="filter-actions">
          <button type="submit" disabled={loading}>{dictionary.calendar.filter.apply}</button>
          <button type="button" className="secondary" onClick={onReset} disabled={loading}>
            {dictionary.calendar.filter.reset}
          </button>
        </div>
      </form>

      <section className="calendar-card">
        <div className="calendar-toolbar">
          <button type="button" onClick={goPrevMonth} aria-label={dictionary.calendar.toolbar.previous}>
            &lt;
          </button>
          <div className="calendar-title">{format(viewDate, 'MMMM yyyy')}</div>
          <button type="button" onClick={goNextMonth} aria-label={dictionary.calendar.toolbar.next}>
            &gt;
          </button>
          <button type="button" className="secondary" onClick={goToday}>
            {dictionary.calendar.toolbar.today}
          </button>
        </div>
        <div className="calendar-grid">
          {weekdays.map((day) => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
          {calendarDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[key] || [];
            const inMonth = isSameMonth(day, viewDate);
            const today = isSameDay(day, new Date());
            return (
              <div
                key={key}
                className={[
                  'calendar-cell',
                  inMonth ? '' : 'outside',
                  today ? 'today' : '',
                  dayEvents.length ? 'has-tasks' : '',
                  selectedDay === key ? 'selected' : '',
                ].join(' ').trim()}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectDay(day)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelectDay(day);
                  }
                }}
              >
                <div className="calendar-date">{format(day, 'd')}</div>
                <div className="calendar-items">
                  {dayEvents.slice(0, 3).map((event) => {
                    if (event.type === 'task') {
                      return (
                        <span
                          key={`task-${event.task.id}`}
                          className="calendar-item"
                          style={getCalendarItemStyle(event.task.project?.color)}
                        >
                          {(event.task.project?.name ?? dictionary.calendar.table.project)}: {event.task.title}
                        </span>
                      );
                    }
                    return (
                      <Link
                        key={`project-${event.project.id}`}
                        className="calendar-item project"
                        to={`/dashboard?project=${event.project.id}`}
                        onClick={(event) => event.stopPropagation()}
                        style={getDeadlineItemStyle(event.project.color)}
                      >
                        {t('calendar.calendarItem.project', { name: event.project.name })}
                      </Link>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="calendar-item more">
                      {t('calendar.calendarItem.more', { count: dayEvents.length - 3 })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="calendar-details">
        <div className="calendar-details-head">
          <h3>
            {selectedDay
              ? t('calendar.detailsTitle', { date: selectedDateLabel })
              : dictionary.calendar.detailsPlaceholder}
          </h3>
          {selectedDay && (
            <button type="button" className="secondary" onClick={() => setSelectedDay(null)}>
              {dictionary.calendar.detailsClear}
            </button>
          )}
        </div>
        {selectedDay ? (
          selectedTasks.length === 0 ? (
            <p className="muted small">{dictionary.calendar.detailsNoTasks}</p>
          ) : (
            <ul className="calendar-details-list">
              {selectedTasks.map((entry) => (
                <li key={entry.task.id}>
                  <div>
                    <div className="task-title">{entry.task.title}</div>
                    <div className="muted small">{entry.task.project?.name ?? dictionary.calendar.table.project}</div>
                  </div>
                  <div className="muted small">
                    {entry.task.assignedTo
                      ? entry.task.assignedTo.name || entry.task.assignedTo.email
                      : dictionary.dashboard.taskUnassigned}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="muted small">{dictionary.calendar.detailsInstructions}</p>
        )}
      </section>

      {loading && <p>{dictionary.errors.loading}</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="table-wrapper">
            {tasks.length === 0 ? (
              <p className="muted">{dictionary.calendar.table.noTasks}</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{dictionary.calendar.table.task}</th>
                    <th>{dictionary.calendar.table.project}</th>
                    <th>{dictionary.calendar.table.deadline}</th>
                    <th>{dictionary.calendar.table.status}</th>
                    <th>{dictionary.calendar.table.remaining}</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const remaining = computeRemaining(task.deadline, t);
                    return (
                      <tr key={task.id}>
                        <td>
                          <div className="task-title">{task.title}</div>
                          {task.assignedGroup && (
                            <div className="muted small">
                              {t('calendar.table.group', { name: task.assignedGroup.name })}
                            </div>
                          )}
                        </td>
                        <td>{task.project?.name ?? '-'}</td>
                        <td>{formatDeadline(task.deadline, t)}</td>
                        <td>{task.status}</td>
                        <td>
                          <span className={`badge badge-${remaining.tone}`}>{remaining.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {projectDeadlines.length > 0 && (
            <section className="calendar-card" style={{ marginTop: 16 }}>
              <h3>{dictionary.calendar.projectDeadlines.title}</h3>
              <ul className="project-deadline-list">
                {projectDeadlines.map(({ project, date }) => (
                  <li key={project.id} style={getDeadlineItemStyle(project.color)}>
                    <Link to={`/dashboard?project=${project.id}`} className="project-name-link">{project.name}</Link>
                    <span>{date!.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
