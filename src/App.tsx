import { NavLink, Outlet } from 'react-router-dom';
import './styles/global.scss';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <NavLink to="/" className="brand">Task Manager</NavLink>
        <nav className="nav">
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Register</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/calendar">Calendar</NavLink>
          <NavLink to="/invites/accept">Accept Invite</NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer" />
    </div>
  );
}
