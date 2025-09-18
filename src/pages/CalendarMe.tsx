import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { api, type ProjectOverview } from '../lib/api';
import { useI18n } from '../lib/i18n';

type CalendarTask = {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  project: { id: number; name: string };
  assignedTo?: { id: number; name: string; email: string } | null;
  assignedGroup?: { id: number; name: string } | null;
};

type ProjectSummary = Pick<ProjectOverview, 'id' | 'name' | 'deadline'>;

type RemainingTone = 'ok' | 'warn' | 'danger' | 'muted';
type DayEvent =
  | { type: 'task'; task: CalendarTask }
  | { type: 'project'; project: ProjectSummary };

type RangeFilter = { from?: Date; to?: Date };

type Translate = (key: string, vars?: Record<string, string | number>) => string;

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
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

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
        setTasks(taskData);
        const map = new Map<number, ProjectSummary>();
        projectData.admin.forEach((p) => {
          map.set(p.id, { id: p.id, name: p.name, deadline: p.deadline ?? null });
        });
        projectData.member.forEach((p) => {
          if (!map.has(p.id)) {
            map.set(p.id, { id: p.id, name: p.name, deadline: p.deadline ?? null });
          }
        });
        setProjects(Array.from(map.values()));
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

    tasks.forEach((task) => {
      const date = safeDate(task.deadline);
      if (!date) return;
      addEvent(date, { type: 'task', task });
    });

    projects.forEach((project) => {
      const date = safeDate(project.deadline);
      if (!date) return;
      if (rangeFilter.from && date < rangeFilter.from) return;
      if (rangeFilter.to && date > rangeFilter.to) return;
      addEvent(date, { type: 'project', project });
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
      .map((project) => ({ project, date: safeDate(project.deadline) }))
      .filter((entry) => {
        if (!entry.date) return false;
        if (rangeFilter.from && entry.date < rangeFilter.from) return false;
        if (rangeFilter.to && entry.date > rangeFilter.to) return false;
        return true;
      })
      .sort((a, b) => (a.date!.getTime() - b.date!.getTime()));
  }, [projects, rangeFilter]);

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
                ].join(' ').trim()}
              >
                <div className="calendar-date">{format(day, 'd')}</div>
                <div className="calendar-items">
                  {dayEvents.slice(0, 3).map((event) => {
                    if (event.type === 'task') {
                      return (
                        <span key={`task-${event.task.id}`} className="calendar-item">
                          {(event.task.project?.name ?? dictionary.calendar.table.project)}: {event.task.title}
                        </span>
                      );
                    }
                    return (
                      <span key={`project-${event.project.id}`} className="calendar-item project">
                        {t('calendar.calendarItem.project', { name: event.project.name })}
                      </span>
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
                  <li key={project.id}>
                    <span className="project-name">{project.name}</span>
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
