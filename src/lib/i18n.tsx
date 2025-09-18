import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isClient } from 'next-utils';

const translations = {
  en: {
    app: {
      brand: 'Task Manager',
      nav: {
        login: 'Login',
        register: 'Register',
        dashboard: 'Dashboard',
        createProject: 'Create Project',
        calendar: 'Calendar',
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
    },
    projects: {
      title: 'Create Project',
      name: 'Name',
      description: 'Description (optional)',
      projectDeadline: 'Project deadline',
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
    invites: {
      title: 'Accept Invitation',
      description: 'Paste your invite token or open the invite link you received.',
      token: 'Token',
      placeholder: '<inviteId>.<secret>',
      submit: 'Accept',
      accepting: 'Accepting...',
      success: 'Invitation accepted successfully',
      error: 'Failed to accept invitation',
    },
    deadlines: {
      none: 'No deadline',
      invalid: 'Invalid date',
      daysLeft: '{{count}} days left',
      dayLeft: '1 day left',
      dueToday: 'Due today',
      overdueOne: 'Overdue by 1 day',
      overdueMany: 'Overdue by {{count}} days',
    },
    errors: {
      loading: 'Loading...',
    },
  },
  uk: {
    app: {
      brand: 'Керування Завданнями',
      nav: {
        login: 'Вхід',
        register: 'Реєстрація',
        dashboard: 'Панель',
        createProject: 'Створити проєкт',
        calendar: 'Календар',
        acceptInvite: 'Прийняти запрошення',
      },
      themeToggle: {
        dark: 'Темна тема',
        light: 'Світла тема',
        darkIcon: '🌙',
        lightIcon: '☀️',
      },
      languageLabel: 'Мова',
    },
    welcome: {
      title: 'Вітаємо',
      description: 'Увійдіть або зареєструйтеся, щоб продовжити.',
    },
    auth: {
      login: {
        title: 'Вхід',
        email: 'Електронна пошта',
        password: 'Пароль',
        submit: 'Увійти',
        loading: 'Виконуємо вхід...',
      },
      register: {
        title: 'Реєстрація',
        name: 'Імʼя',
        email: 'Електронна пошта',
        password: 'Пароль',
        submit: 'Створити акаунт',
        loading: 'Створюємо...',
      },
      links: {
        toRegister: 'Немає акаунта?',
        toLogin: 'Вже маєте акаунт?',
        register: 'Зареєструватися',
        login: 'Увійти',
      },
      logout: 'Вийти',
      signedIn: 'Ви ввійшли як {{name}} ({{email}})',
      messages: {
        loginFailed: 'Не вдалося увійти',
        registerFailed: 'Не вдалося зареєструватися',
      },
    },
    dashboard: {
      title: 'Панель',
      adminProjects: 'Проєкти (Адміністратор)',
      memberProjects: 'Проєкти (Учасник)',
      noAdminProjects: 'Немає адміністрованих проєктів',
      noMemberProjects: 'Немає проєктів учасника',
      noTasks: 'Немає завдань',
      tasksSummary: 'Завдання ({{count}})',
      createdLabel: 'Створено',
      deadlineLabel: 'Дедлайн',
      deadlineLink: 'Переглянути в календарі',
      loadFailed: 'Не вдалося завантажити проєкти',
    },
    projects: {
      title: 'Створити проєкт',
      name: 'Назва',
      description: 'Опис (необовʼязково)',
      projectDeadline: 'Дедлайн проєкту',
      initialTasks: 'Початкові завдання',
      addTask: 'Додати завдання',
      removeTask: 'Видалити',
      task: 'Завдання №{{index}}',
      taskTitle: 'Назва',
      taskDescription: 'Опис (необовʼязково)',
      taskDeadline: 'Дедлайн завдання',
      tags: 'Теги',
      submit: 'Створити проєкт',
      creating: 'Створюємо...',
      success: 'Проєкт успішно створено',
      errors: {
        chooseDeadline: 'Оберіть дедлайн проєкту',
        invalidDeadline: 'Невірний дедлайн проєкту',
        fillTask: 'Заповніть назву та оберіть теги для завдання №{{index}}',
        setTaskDeadline: 'Вкажіть дедлайн для завдання №{{index}}',
        invalidTaskDeadline: 'Невірний дедлайн для завдання №{{index}}',
        taskAfterProject: 'Дедлайн завдання №{{index}} не може бути пізніше дедлайну проєкту',
        createFailed: 'Не вдалося створити проєкт',
      },
    },
    calendar: {
      title: 'Мій календар',
      description: 'Переглядайте завдання, призначені вам чи вашим групам, з дедлайнами.',
      filter: {
        from: 'Від',
        to: 'До',
        apply: 'Застосувати',
        reset: 'Скинути',
      },
      toolbar: {
        previous: 'Попередній місяць',
        next: 'Наступний місяць',
        today: 'Сьогодні',
      },
      weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
      table: {
        noTasks: 'Немає завдань з дедлайнами у цьому діапазоні.',
        task: 'Завдання',
        project: 'Проєкт',
        deadline: 'Дедлайн',
        status: 'Статус',
        remaining: 'Залишилось',
        group: 'Група: {{name}}',
      },
      projectDeadlines: {
        title: 'Дедлайни проєктів',
      },
      calendarItem: {
        project: 'Дедлайн проєкту: {{name}}',
        more: '+{{count}} ще',
      },
      loadFailed: 'Не вдалося завантажити календар',
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
  },
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
