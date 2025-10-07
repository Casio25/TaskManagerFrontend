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
    assignFailed: 'Failed to update assignee',
    noAssignableUsers: 'No available colleagues in this list',
    status: {
      NEW: 'New',
      IN_PROGRESS: 'In progress',
      SUBMITTED: 'Submitted',
      HELP_REQUESTED: 'Help requested',
      DECLINED: 'Declined',
      COMPLETED: 'Completed',
    },
    submittedInfo: 'Submitted by {{name}} on {{date}}',
    completedInfo: 'Completed by {{name}} on {{date}}',
    unknownUser: 'Unknown user',
    submitPendingInfo: 'Waiting for an admin to review.',
    submitInProgress: 'Submitting...',
    submitTask: 'Submit task',
    approveTask: 'Approve task',
    completeTask: 'Mark complete',
    reopenTask: 'Reopen task',
    updatingTask: 'Updating...',
    updateFailed: 'Failed to update task',
    markProjectComplete: 'Complete project',
    reopenProject: 'Reopen project',
    updatingProject: 'Updating...',
    projectStatusLabel: 'Project status',
    projectStatusLabels: {
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
    },
    projectStatusUpdateFailed: 'Failed to update project status',
    projectCompleteSuccess: 'Project marked as completed',
    projectReopenSuccess: 'Project reopened',
    submitSuccess: 'Task submitted',
    approveSuccess: 'Task approved',
    completeSuccess: 'Task completed',
    reopenSuccess: 'Task reopened',
    projectCompletedInfo: 'Project completed by {{name}} on {{date}}',
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
    title: 'Participants',
    description: 'Invite colleagues by email and assign them to projects or tasks.',
    addLabel: 'Email',
    addButton: 'Add colleague',
    addSectionTitle: 'Add colleague',
    addPlaceholder: 'name@example.com',
    addListsLabel: 'Add to lists',
    addListsHint: 'Optionally pick lists to add this colleague to right away.',
    listSelectionCount: 'Selected lists: {{count}}',
    selectedListsLabel: 'Selected lists',
    statusPending: 'Registration pending',
    statusRegistered: 'Registered user',
    assignProject: 'Assign to project',
    assignTask: 'Assign to task',
    projectPlaceholder: 'Choose project',
    taskProjectPlaceholder: 'Choose project',
    taskPlaceholder: 'Choose task',
    assignProjectButton: 'Assign',
    assignTaskButton: 'Assign',
    assignedProjectsTitle: 'Assigned projects',
    assignedTasksTitle: 'Assigned tasks',
    emptyProjects: 'No available projects.',
    emptyTasks: 'No available tasks.',
    successAdd: 'Colleague added',
    successAssignProject: 'Assigned to project',
    successAssignTask: 'Task assigned',
    disabledAssign: 'Available after the colleague registers.',
    addToListPlaceholder: 'Choose list',
    addToListButton: 'Add to list',
    addToListSuccess: 'Colleague added to list',
    removeFromList: 'Remove from list',
    deleteList: 'Delete list',
    deleteListProgress: 'Deleting list...',
    deleteListSuccess: 'List deleted',
    removeFromListProgress: 'Removing...',
    removeFromListSuccess: 'Colleague removed from list',
    colleagueListsTitle: 'Lists',
    colleagueNoLists: 'Not in any lists yet.',
    colleagueAllLists: 'In all lists.',
    listsTitle: 'Lists',
    newListLabel: 'List name',
    newListPlaceholder: 'e.g. QA, Backend, ...',
    createListButton: 'Create list',
    createListSuccess: 'List created successfully',
    listMembersCount: 'Members: {{count}}',
    deleteListConfirm: 'Delete list "{{name}}"? The members will be detached.',
    listEmpty: 'This list has no members.',
    noLists: 'No lists yet. Create one above.',
    unknownUser: 'Unknown user',
    noColleagues: 'You have not added colleagues yet.',
    completedProjectsLabel: 'Completed projects',
    completedTasksLabel: 'Completed tasks',
    performanceTitle: 'Performance by tags',
    performanceEmpty: 'No ratings collected yet.',
    performanceMetrics: {
      punctuality: 'Punctuality',
      teamwork: 'Teamwork',
      quality: 'Quality',
    },
    performanceLastRating: 'Last rating {{date}} for task #{{taskId}}',
    performanceNoRatings: 'No ratings yet.',
    performanceRatingsCount: '{{count}} ratings recorded',
    errors: {
      addFailed: 'Failed to add colleague',
      assignProjectFailed: 'Failed to assign to project',
      assignTaskFailed: 'Failed to assign to task',
      createListFailed: 'Failed to create list',
      addToListFailed: 'Failed to add to list',
      removeFromListFailed: 'Failed to remove from list',
      deleteListFailed: 'Failed to delete list',
    },
  },
  invites: {
    title: 'Accept Invite',
    description: 'Paste the invitation token or open the received link.',
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
} as const;

const uk = {
  app: {
    brand: 'Менеджер завдань',
    nav: {
      login: 'Увійти',
      register: 'Реєстрація',
      dashboard: 'Дашборд',
      createProject: 'Створити проєкт',
      calendar: 'Календар',
      participants: 'Учасники',
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
    description: 'Будь ласка, увійдіть або зареєструйтесь, щоб продовжити.',
  },
  auth: {
    login: {
      title: 'Вхід',
      email: 'Email',
      password: 'Пароль',
      submit: 'Увійти',
      loading: 'Входимо...',
    },
    register: {
      title: 'Реєстрація',
      name: 'Імʼя',
      email: 'Email',
      password: 'Пароль',
      submit: 'Створити акаунт',
      loading: 'Створюємо...',
    },
    links: {
      toRegister: 'Ще немає акаунта?',
      toLogin: 'Вже маєте акаунт?',
      register: 'Зареєструватися',
      login: 'Увійти',
    },
    logout: 'Вийти',
    signedIn: 'Ви увійшли як {{name}} ({{email}})',
    messages: {
      loginFailed: 'Не вдалося увійти',
      registerFailed: 'Не вдалося зареєструватися',
    },
  },
  dashboard: {
    title: 'Дашборд',
    adminProjects: 'Проєкти (адмін)',
    memberProjects: 'Проєкти (учасник)',
    noAdminProjects: 'Немає проєктів, де ви адмін',
    noMemberProjects: 'Немає проєктів, де ви учасник',
    noTasks: 'Немає завдань',
    tasksSummary: 'Завдання ({{count}})',
    createdLabel: 'Створено',
    deadlineLabel: 'Дедлайн',
    deadlineLink: 'Переглянути в календарі',
    loadFailed: 'Не вдалося завантажити проєкти',
    deleteProject: 'Видалити проєкт',
    deleteConfirm: 'Видалити проєкт "{{name}}"? Цю дію неможливо скасувати.',
    deleteSuccess: 'Проєкт успішно видалено',
    deleteFailed: 'Не вдалося видалити проєкт',
    deleteProgress: 'Видаляємо...',
    cancelDelete: 'Скасувати',
    taskAssignedTo: 'Призначено {{name}}',
    taskUnassigned: 'Не призначено',
    assignFromList: 'Призначити зі списку',
    selectList: 'Оберіть список',
    selectPerson: 'Оберіть учасника',
    assignButton: 'Призначити',
    assignSuccess: 'Виконавця оновлено',
    assignFailed: 'Не вдалося оновити виконавця',
    noAssignableUsers: 'У цьому списку немає доступних колег',
    status: {
      NEW: 'Нове',
      IN_PROGRESS: 'У роботі',
      SUBMITTED: 'Надіслано',
      HELP_REQUESTED: 'Потрібна допомога',
      DECLINED: 'Відхилено',
      COMPLETED: 'Завершено',
    },
    submittedInfo: 'Надіслано {{name}} {{date}}',
    completedInfo: 'Завершено {{name}} {{date}}',
    unknownUser: 'Невідомий користувач',
    submitPendingInfo: 'Очікує перевірки адміністратора.',
    submitInProgress: 'Надсилаємо...',
    submitTask: 'Надіслати завдання',
    approveTask: 'Підтвердити завдання',
    completeTask: 'Позначити виконаним',
    reopenTask: 'Повернути в роботу',
    updatingTask: 'Оновлюємо...',
    updateFailed: 'Не вдалося оновити завдання',
    markProjectComplete: 'Завершити проєкт',
    reopenProject: 'Повернути проєкт',
    updatingProject: 'Оновлюємо...',
    projectStatusLabel: 'Статус проєкту',
    projectStatusLabels: {
      ACTIVE: 'Активний',
      COMPLETED: 'Завершений',
    },
    projectStatusUpdateFailed: 'Не вдалося оновити статус проєкту',
    projectCompleteSuccess: 'Проєкт позначено завершеним',
    projectReopenSuccess: 'Проєкт знову активний',
    submitSuccess: 'Завдання надіслано',
    approveSuccess: 'Завдання підтверджено',
    completeSuccess: 'Завдання завершено',
    reopenSuccess: 'Завдання повернуто в роботу',
    projectCompletedInfo: 'Проєкт завершив {{name}} {{date}}',
  },
  projects: {
    title: 'Створити проєкт',
    name: 'Назва',
    description: 'Опис (необовʼязково)',
    projectDeadline: 'Дедлайн проєкту',
    colorLabel: 'Колір проєкту',
    colorHint: 'Оберіть, як проєкт виглядатиме в календарі.',
    colorOption: 'Обрати колір {{color}}',
    initialTasks: 'Початкові завдання',
    addTask: 'Додати завдання',
    removeTask: 'Видалити',
    task: 'Завдання #{{index}}',
    taskTitle: 'Назва',
    taskDescription: 'Опис (необовʼязково)',
    taskDeadline: 'Дедлайн завдання',
    tags: 'Теги',
    submit: 'Створити проєкт',
    creating: 'Створюємо...',
    success: 'Проєкт успішно створено',
    errors: {
      chooseDeadline: 'Будь ласка, оберіть дедлайн проєкту',
      invalidDeadline: 'Некоректний дедлайн проєкту',
      fillTask: 'Заповніть назву й виберіть теги для завдання #{{index}}',
      setTaskDeadline: 'Вкажіть дедлайн для завдання #{{index}}',
      invalidTaskDeadline: 'Некоректний дедлайн для завдання #{{index}}',
      taskAfterProject: 'Дедлайн завдання #{{index}} не може перевищувати дедлайн проєкту',
      createFailed: 'Не вдалося створити проєкт',
    },
  },
  calendar: {
    title: 'Мій календар',
    description: 'Переглядайте всі завдання, призначені вам або вашим командам, з майбутніми дедлайнами.',
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
      noTasks: 'Немає завдань з дедлайнами в цьому діапазоні.',
      task: 'Завдання',
      project: 'Проєкт',
      deadline: 'Дедлайн',
      status: 'Статус',
      remaining: 'Залишилось',
      group: 'Команда: {{name}}',
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
    completedProjectsLabel: 'Завершені проєкти',
    completedTasksLabel: 'Завершені завдання',
    performanceTitle: 'Показники за тегами',
    performanceEmpty: 'Оцінок поки немає.',
    performanceMetrics: {
      punctuality: 'Пунктуальність',
      teamwork: 'Командна робота',
      quality: 'Якість',
    },
    performanceLastRating: 'Остання оцінка {{date}} для завдання #{{taskId}}',
    performanceNoRatings: 'Оцінок ще не було.',
    performanceRatingsCount: 'Залишено оцінок: {{count}}',
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
    submit: 'Підтвердити',
    accepting: 'Підтверджуємо...',
    success: 'Запрошення успішно прийнято',
    error: 'Не вдалося прийняти запрошення',
  },
  deadlines: {
    none: 'Без дедлайну',
    invalid: 'Некоректна дата',
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
  uk,
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
