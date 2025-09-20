import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from './lib/theme';
import { useI18n, type Language } from './lib/i18n';
import './styles/global.scss';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { dictionary, language, setLanguage } = useI18n();
  useEffect(() => {
    document.title = dictionary.app.brand;
  }, [dictionary.app.brand]);


  const themeLabel = theme === 'light' ? dictionary.app.themeToggle.dark : dictionary.app.themeToggle.light;
  const themeIcon = theme === 'light' ? dictionary.app.themeToggle.darkIcon : dictionary.app.themeToggle.lightIcon;

  return (
    <div className="app">
      <header className="header">
        <NavLink to="/" className="brand">{dictionary.app.brand}</NavLink>
        <nav className="nav">
          <NavLink to="/login">{dictionary.app.nav.login}</NavLink>
          <NavLink to="/register">{dictionary.app.nav.register}</NavLink>
          <NavLink to="/dashboard">{dictionary.app.nav.dashboard}</NavLink>
          <NavLink to="/projects">{dictionary.app.nav.createProject}</NavLink>
          <NavLink to="/participants">{dictionary.app.nav.participants}</NavLink>
          <NavLink to="/calendar">{dictionary.app.nav.calendar}</NavLink>
          <NavLink to="/invites/accept">{dictionary.app.nav.acceptInvite}</NavLink>
          <button type="button" className="theme-toggle" onClick={toggleTheme}>
            <span aria-hidden>{themeIcon}</span>
            <span>{themeLabel}</span>
          </button>
          <label className="language-select">
            <span className="sr-only">{dictionary.app.languageLabel}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
              <option value="en">EN</option>
              <option value="uk">УКР</option>
            </select>
          </label>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer" />
    </div>
  );
}





