import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isClient } from 'next-utils';

const en = {
    app: {
      brand: 'Task Manager',
      nav: {
        login: 'Login',
        register: 'Register',
        dashboard: 'Dashboard',
        createProject: 'Create Project',
        calendar: 'Calendar',
        participants: 'Participants',
        acceptInvite: 'Accept Invite',
      },
      themeToggle: {
        dark: 'Dark mode',
        light: 'Light mode',
        darkIcon: '🌙',
        lightIcon: '☀️',
      },
      languageLabel: 'Language',
    },
    welcome: {
      title: 'Welcome',
      description: 'Please login or register to continue.',
    },
    auth: {
      login: {
        title: 'Login',
        email: 'Email',
        password: 'Password',
        submit: 'Login',
        loading: 'Logging in...',
      },
      register: {
        title: 'Register',
        name: 'Name',
        email: 'Email',
        password: 'Password',
        submit: 'Create account',
        loading: 'Creating...',
      },
      links: {
        toRegister: 'No account?',
        toLogin: 'Have an account?',
        register: 'Register',
        login: 'Login',
      },
      logout: 'Logout',
      signedIn: 'Signed in as {{name}} ({{email}})',
      messages: {
        loginFailed: 'Login failed',
        registerFailed: 'Registration failed',
      },
    },
    dashboard: {
      title: 'Dashboard',
      adminProjects: 'Projects (Admin)',
      memberProjects: 'Projects (Member)',
      noAdminProjects: 'No admin projects',
      noMemberProjects: 'No member projects',
      noTasks: 'No tasks',
      tasksSummary: 'Tasks ({{count}})',
      createdLabel: 'Created',
      deadlineLabel: 'Deadline',
      deadlineLink: 'View in calendar',
      loadFailed: 'Failed to load projects',
      deleteProject: 'Delete project',
      deleteConfirm: 'Delete project "{{name}}"? This action cannot be undone.',
      deleteSuccess: 'Project deleted successfully',
      deleteFailed: 'Failed to delete project',
      deleteProgress: 'Deleting...',
      cancelDelete: 'Cancel',
      taskAssignedTo: 'Assigned to {{name}}',
      taskUnassigned: 'Not assigned',
      assignFromList: 'Assign from list',
      selectList: 'Select list',
      selectPerson: 'Select person',
      assignButton: 'Assign',
      assignSuccess: 'Assignee updated',
      assignFailed: 'Could not update assignment',
      noAssignableUsers: 'No available colleagues in this list',
    },
    projects: {
      title: 'Create Project',
      name: 'Name',
      description: 'Description (optional)',
      projectDeadline: 'Project deadline',
      colorLabel: 'Project color',
      colorHint: 'Choose how this project appears in the calendar.',
      colorOption: 'Select color {{color}}',
      initialTasks: 'Initial Tasks',
      addTask: 'Add task',
      removeTask: 'Remove',
      task: 'Task #{{index}}',
      taskTitle: 'Title',
      taskDescription: 'Description (optional)',
      taskDeadline: 'Task deadline',
      tags: 'Tags',
      submit: 'Create project',
      creating: 'Creating...',
      success: 'Project created successfully',
      errors: {
        chooseDeadline: 'Please choose a project deadline',
        invalidDeadline: 'Invalid project deadline',
        fillTask: 'Fill title and choose tags for task #{{index}}',
        setTaskDeadline: 'Set a deadline for task #{{index}}',
        invalidTaskDeadline: 'Invalid deadline for task #{{index}}',
        taskAfterProject: 'Task #{{index}} deadline cannot exceed project deadline',
        createFailed: 'Failed to create project',
      },
    },
    calendar: {
      title: 'My Calendar',
      description: 'View all tasks assigned to you (or your groups) with upcoming deadlines.',
      filter: {
        from: 'From',
        to: 'To',
        apply: 'Apply',
        reset: 'Reset',
      },
      toolbar: {
        previous: 'Previous month',
        next: 'Next month',
        today: 'Today',
      },
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      table: {
        noTasks: 'No tasks with deadlines in this range.',
        task: 'Task',
        project: 'Project',
        deadline: 'Deadline',
        status: 'Status',
        remaining: 'Remaining',
        group: 'Group: {{name}}',
      },
      projectDeadlines: {
        title: 'Project Deadlines',
      },
      calendarItem: {
        project: 'Project deadline: {{name}}',
        more: '+{{count}} more',
      },
      loadFailed: 'Failed to load calendar',
    },
    participants: {
      title: 'Учасники',
      description: 'Запрошуйте колег за email і призначайте їх на проєкти або завдання.',
      addLabel: 'Email',
      addButton: 'Додати колегу',
      addSectionTitle: 'Додати колегу',
      addPlaceholder: 'name@example.com',
      addListsLabel: 'Додати до списків',
      addListsHint: 'За бажанням: оберіть списки, до яких одразу додати цього колегу.',
      listSelectionCount: 'Обрано списків: {{count}}',
      selectedListsLabel: 'Вибрані списки',
      statusPending: 'Очікує реєстрації',
      statusRegistered: 'Зареєстрований користувач',
      assignProject: 'Призначити на проєкт',
      assignTask: 'Призначити на завдання',
      projectPlaceholder: 'Оберіть проєкт',
      taskProjectPlaceholder: 'Оберіть проєкт',
      taskPlaceholder: 'Оберіть завдання',
      assignProjectButton: 'Призначити',
      assignTaskButton: 'Призначити',
      assignedProjectsTitle: 'Закріплені проєкти',
      assignedTasksTitle: 'Закріплені завдання',
      emptyProjects: 'Немає доступних проєктів.',
      emptyTasks: 'Немає доступних завдань.',
      successAdd: 'Колегу додано',
      successAssignProject: 'Призначено на проєкт',
      successAssignTask: 'Завдання призначено',
      disabledAssign: 'Доступно після реєстрації колеги.',
      addToListPlaceholder: 'Оберіть список',
      addToListButton: 'Додати до списку',
      addToListSuccess: 'Колегу додано до списку',
      removeFromList: 'Видалити зі списку',
      deleteList: 'Видалити список',
      deleteListProgress: 'Видаляємо список...',
      deleteListSuccess: 'Список видалено',
      removeFromListProgress: 'Видаляємо...',
      removeFromListSuccess: 'Колегу видалено зі списку',
      colleagueListsTitle: 'Списки',
      colleagueNoLists: 'Ще не входить до жодного списку.',
      colleagueAllLists: 'Вже у всіх списках.',
      listsTitle: 'Списки',
      newListLabel: 'Назва списку',
      newListPlaceholder: 'Улюблені, Backend, ...',
      createListButton: 'Створити список',
      createListSuccess: 'Список успішно створено',
      listMembersCount: 'Учасників: {{count}}',
      deleteListConfirm: 'Видалити список "{{name}}"? Учасники будуть відʼєднані.',
      listEmpty: 'Поки що немає учасників.',
      noLists: 'Списків ще немає. Створіть перший вище.',
      unknownUser: 'Невідомий користувач',
      noColleagues: 'Ви ще не додали колег.',
      errors: {
        addFailed: 'Не вдалося додати колегу',
        assignProjectFailed: 'Не вдалося призначити на проєкт',
        assignTaskFailed: 'Не вдалося призначити на завдання',
        createListFailed: 'Не вдалося створити список',
        addToListFailed: 'Не вдалося додати до списку',
        removeFromListFailed: 'Не вдалося видалити зі списку',
        deleteListFailed: 'Не вдалося видалити список',
      },
    },
    invites: {
      title: 'Прийняти запрошення',
      description: 'Вставте токен запрошення або відкрийте отримане посилання.',
      token: 'Токен',
      placeholder: '<inviteId>.<secret>',
      submit: 'Прийняти',
      accepting: 'Приймаємо...',
      success: 'Запрошення успішно прийнято',
      error: 'Не вдалося прийняти запрошення',
    },
    deadlines: {
      none: 'Без дедлайну',
      invalid: 'Невірна дата',
      daysLeft: 'Залишилось {{count}} днів',
      dayLeft: 'Залишився 1 день',
      dueToday: 'Завершити сьогодні',
      overdueOne: 'Прострочено на 1 день',
      overdueMany: 'Прострочено на {{count}} днів',
    },
    errors: {
      loading: 'Завантаження...',
    },
} as const;

const translations = {
  en,
  uk: en,
} as const;

export type Language = keyof typeof translations;

type Dictionary = (typeof translations)[Language];

type I18nContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dictionary: Dictionary;
};

const STORAGE_KEY = 'task-manager-language';

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function resolveKey(path: string, language: Language): string {
  const segments = path.split('.');
  let value: any = translations[language];
  for (const segment of segments) {
    value = value?.[segment];
    if (value === undefined || value === null) {
      return path;
    }
  }
  if (typeof value === 'string') return value;
  return path;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return Object.entries(vars).reduce((acc, [key, val]) => acc.replaceAll(`{{${key}}}`, String(val)), template);
}

function getInitialLanguage(): Language {
  if (isClient()) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'uk') return stored as Language;
    const navigatorLang = window.navigator.language?.toLowerCase();
    if (navigatorLang?.startsWith('uk')) return 'uk';
  }
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    if (isClient()) {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'en' ? 'uk' : 'en'));
  }, []);

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template = resolveKey(key, language);
      return interpolate(template, vars);
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t: translate, dictionary: translations[language] }),
    [language, translate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export type TranslationDictionary = Dictionary;
