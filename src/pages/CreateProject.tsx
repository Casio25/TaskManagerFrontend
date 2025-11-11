import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type CreateProjectPayload, type NewProjectTaskPayload } from '../lib/api';
import { useI18n } from '../lib/i18n';

const TAG_OPTIONS = ['Design', 'Development', 'Review', 'Testing', 'AI', 'Research'] as const;
const COLOR_OPTIONS = ['#2563EB', '#22C55E', '#F97316', '#A855F7', '#EF4444', '#0EA5E9', '#FACC15', '#A3A3A3'] as const;

type DeadlineBadge = { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' };

type NewTask = NewProjectTaskPayload;

const createEmptyTask = (): NewTask => ({
  title: '',
  description: '',
  tags: [],
  deadline: '',
});

function computeBadge(deadline: string | undefined, t: (key: string, vars?: Record<string, string | number>) => string): DeadlineBadge {
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

export default function CreateProjectPage() {
  const { dictionary, t } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState<string>(COLOR_OPTIONS[0]);
  const [tasksInput, setTasksInput] = useState<NewTask[]>([createEmptyTask()]);
  const [newTagInputs, setNewTagInputs] = useState<string[]>(['']);
  const [creating, setCreating] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!deadline) {
      setTasksInput((prev) => prev.map((task) => ({ ...task, deadline: '' })));
      return;
    }
    const projectDeadline = new Date(`${deadline}T00:00:00`);
    if (Number.isNaN(projectDeadline.getTime())) return;
    setTasksInput((prev) =>
      prev.map((task) => {
        if (!task.deadline) return task;
        const taskDate = new Date(`${task.deadline}T00:00:00`);
        if (Number.isNaN(taskDate.getTime()) || taskDate.getTime() > projectDeadline.getTime()) {
          return { ...task, deadline: '' };
        }
        return task;
      }),
    );
  }, [deadline]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const addTask = () => {
    setTasksInput((prev) => [...prev, createEmptyTask()]);
    setNewTagInputs((prev) => [...prev, '']);
  };

  const updateTaskField = (index: number, field: keyof NewTask, value: string) => {
    setTasksInput((prev) => prev.map((task, i) => (i === index ? { ...task, [field]: value } : task)));
    setTaskError(null);
  };

  const toggleTag = (index: number, tag: string) => {
    setTasksInput((prev) =>
      prev.map((task, i) => {
        if (i !== index) return task;
        const hasTag = task.tags.some((value) => value.toLowerCase() === tag.toLowerCase());
        const nextTags = hasTag
          ? task.tags.filter((value) => value.toLowerCase() !== tag.toLowerCase())
          : [...task.tags, tag];
        return { ...task, tags: nextTags };
      }),
    );
    setTaskError(null);
  };

  const removeTag = (index: number, tag: string) => {
    setTasksInput((prev) =>
      prev.map((task, i) =>
        i === index
          ? { ...task, tags: task.tags.filter((value) => value.toLowerCase() !== tag.toLowerCase()) }
          : task,
      ),
    );
    setTaskError(null);
  };

  const updateCustomTagInput = (index: number, value: string) => {
    setNewTagInputs((prev) => prev.map((tag, i) => (i === index ? value : tag)));
    setTaskError(null);
  };

  const addCustomTag = (index: number) => {
    const rawValue = (newTagInputs[index] ?? '').trim();
    if (!rawValue) {
      setTaskError(t('projects.errors.tagInvalid'));
      return;
    }
    if (rawValue.length < 2 || rawValue.length > 32) {
      setTaskError(t('projects.errors.tagLength'));
      return;
    }
    const normalized = rawValue.replace(/\s+/g, ' ');
    const existingTags = tasksInput[index]?.tags ?? [];
    const exists = existingTags.some((tag) => tag.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setTaskError(t('projects.errors.tagDuplicate'));
      return;
    }
    setTasksInput((prev) =>
      prev.map((task, i) => (i === index ? { ...task, tags: [...task.tags, normalized] } : task)),
    );
    setNewTagInputs((prev) => prev.map((tag, i) => (i === index ? '' : tag)));
    setTaskError(null);
  };

  const removeTask = (index: number) => {
    setTasksInput((prev) => prev.filter((_, i) => i !== index));
    setNewTagInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setDeadline('');
    setColor(COLOR_OPTIONS[0]);
    setTasksInput([createEmptyTask()]);
    setNewTagInputs(['']);
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);
    if (!deadline) {
      setTaskError(t('projects.errors.chooseDeadline'));
      return;
    }
    const projectDeadline = new Date(`${deadline}T00:00:00`);
    if (Number.isNaN(projectDeadline.getTime())) {
      setTaskError(t('projects.errors.invalidDeadline'));
      return;
    }

    let preparedTasks: NewTask[] = [];
    try {
      preparedTasks = tasksInput.map((task, idx) => {
        const indexLabel = idx + 1;
        const title = task.title.trim();
        const tags = Array.from(new Set(task.tags.map((tag) => tag.trim()).filter(Boolean)));
        if (!title || tags.length === 0) {
          throw new Error(t('projects.errors.fillTask', { index: indexLabel }));
        }
        if (!task.deadline) {
          throw new Error(t('projects.errors.setTaskDeadline', { index: indexLabel }));
        }
        const taskDeadline = new Date(`${task.deadline}T00:00:00`);
        if (Number.isNaN(taskDeadline.getTime())) {
          throw new Error(t('projects.errors.invalidTaskDeadline', { index: indexLabel }));
        }
        if (taskDeadline.getTime() > projectDeadline.getTime()) {
          throw new Error(t('projects.errors.taskAfterProject', { index: indexLabel }));
        }
        const descriptionValue = task.description?.trim();
        return {
          title,
          description: descriptionValue ? descriptionValue : undefined,
          tags,
          deadline: taskDeadline.toISOString(),
        };
      });
    } catch (error: any) {
      setTaskError(error.message || t('projects.errors.createFailed'));
      return;
    }

    setCreating(true);
    try {
      const payload: CreateProjectPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        color: color.toUpperCase(),
        deadline: projectDeadline.toISOString(),
        tasks: preparedTasks,
      };
      const project = await api.createProject(payload);
      setSuccessMessage(t('projects.success'));
      resetForm();
      navigate(`/dashboard?project=${project.id}`);
    } catch (error: any) {
      setTaskError(error.message || t('projects.errors.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const projectDeadlineDate = deadline ? new Date(`${deadline}T00:00:00`) : null;
  const taskDeadlineDisabled = !deadline || Number.isNaN(projectDeadlineDate?.getTime() ?? NaN);
  const taskDeadlineMax = !taskDeadlineDisabled && deadline ? deadline : undefined;

  const badgeTranslator = useMemo(
    () => (deadlineValue: string | undefined) => {
      if (!deadlineValue) return computeBadge(undefined, t);
      const normalized = deadlineValue.includes('T') ? deadlineValue : `${deadlineValue}T00:00:00`;
      return computeBadge(normalized, t);
    },
    [t],
  );

  return (
    <div className="container">
      <h2>{dictionary.projects.title}</h2>
      <section className="auth-card" style={{ marginTop: 16 }}>
        <form onSubmit={onCreate}>
          <label>
            {dictionary.projects.name}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onInput={(event) => event.currentTarget.setCustomValidity('')}
              onInvalid={(event) => event.currentTarget.setCustomValidity(dictionary.projects.errors.nameRequired)}
              placeholder={dictionary.projects.name}
              required
            />
          </label>
          <label>
            {dictionary.projects.description}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={dictionary.projects.description}
            />
          </label>
          <label>
            {dictionary.projects.projectDeadline}
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              onInput={(event) => event.currentTarget.setCustomValidity('')}
              onInvalid={(event) => event.currentTarget.setCustomValidity(dictionary.projects.errors.deadlineRequired)}
              required
            />
          </label>

          <div className="color-picker">
            <div className="color-picker-header">
              <span className="color-picker-label">{dictionary.projects.colorLabel}</span>
              <span className="color-picker-hint muted">{dictionary.projects.colorHint}</span>
            </div>
            <div className="color-options">
              {COLOR_OPTIONS.map((option) => {
                const selected = color === option;
                return (
                  <button
                    key={option}
                    type="button"
                    className={`color-swatch${selected ? ' active' : ''}`}
                    style={{ backgroundColor: option }}
                    onClick={() => setColor(option)}
                    aria-pressed={selected}
                    aria-label={t('projects.colorOption', { color: option })}
                  />
                );
              })}
            </div>
          </div>

          <div className="task-editor">
            <div className="task-header">
              <h4>{dictionary.projects.initialTasks}</h4>
              <button type="button" className="secondary" onClick={addTask}>
                {dictionary.projects.addTask}
              </button>
            </div>
            {taskError && <div className="error">{taskError}</div>}
            {tasksInput.map((task, index) => {
              const badge = badgeTranslator(task.deadline);
              return (
                <div key={index} className="task-row">
                  <div className="task-header">
                    <span className="muted">{t('projects.task', { index: index + 1 })}</span>
                    {tasksInput.length > 1 && (
                      <button type="button" className="secondary" onClick={() => removeTask(index)}>
                        {dictionary.projects.removeTask}
                      </button>
                    )}
                  </div>
                  <label>
                    {dictionary.projects.taskTitle}
                    <input
                      value={task.title}
                      onChange={(e) => updateTaskField(index, 'title', e.target.value)}
                      onInput={(event) => event.currentTarget.setCustomValidity('')}
                      onInvalid={(event) => event.currentTarget.setCustomValidity(dictionary.projects.errors.taskTitleRequired)}
                      placeholder={dictionary.projects.taskTitle}
                      required
                    />
                  </label>
                  <label>
                    {dictionary.projects.taskDescription}
                    <textarea
                      value={task.description ?? ''}
                      onChange={(e) => updateTaskField(index, 'description', e.target.value)}
                      placeholder={dictionary.projects.taskDescription}
                    />
                  </label>
                  <label>
                    {dictionary.projects.taskDeadline}
                    <input
                      type="date"
                      value={task.deadline}
                      onChange={(event) => updateTaskField(index, 'deadline', event.target.value)}
                      onInput={(event) => event.currentTarget.setCustomValidity('')}
                      onInvalid={(event) => event.currentTarget.setCustomValidity(dictionary.projects.errors.taskDeadlineRequired)}
                      disabled={taskDeadlineDisabled}
                      max={taskDeadlineMax}
                      required
                    />
                  </label>
                  <span className={`badge badge-${badge.tone}`} style={{ marginTop: 6 }}>{badge.label}</span>
                  <div>
                    <div className="muted small">{dictionary.projects.selectedTags}</div>
                    <div className="selected-tags">
                      {task.tags.length === 0 ? (
                        <span className="muted small">{dictionary.projects.noTagsSelected}</span>
                      ) : (
                        task.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="tag-chip removable"
                            onClick={() => removeTag(index, tag)}
                            aria-label={t('projects.removeTagAria', { tag })}
                          >
                            <span className="tag-chip-label">{tag}</span>
                            <span aria-hidden className="remove-icon">×</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="muted small">{dictionary.projects.tags}</div>
                    <div className="task-tags">
                      {TAG_OPTIONS.map((tag) => {
                        const active = task.tags.some((value) => value.toLowerCase() === tag.toLowerCase());
                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`tag-chip ${active ? 'active' : ''}`}
                            onClick={() => toggleTag(index, tag)}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="tag-input">
                    <label className="muted small" htmlFor={`custom-tag-${index}`}>
                      {dictionary.projects.newTagLabel}
                    </label>
                    <div className="tag-input-row">
                      <input
                        id={`custom-tag-${index}`}
                        value={newTagInputs[index] ?? ''}
                        onChange={(event) => updateCustomTagInput(index, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addCustomTag(index);
                          }
                        }}
                        placeholder={dictionary.projects.newTagPlaceholder}
                        maxLength={32}
                      />
                      <button type="button" className="secondary" onClick={() => addCustomTag(index)}>
                        {dictionary.projects.addTag}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="submit" disabled={creating}>
            {creating ? dictionary.projects.creating : dictionary.projects.submit}
          </button>
          {successMessage && <p className="muted" style={{ marginTop: 12 }}>{successMessage}</p>}
        </form>
      </section>
    </div>
  );
}
