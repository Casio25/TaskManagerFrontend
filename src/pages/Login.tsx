import { type FormEvent, useState } from 'react';
import { useAuth } from '../lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { dictionary } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (e: any) {
      setError(e.message || dictionary.auth.messages.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>{dictionary.auth.login.title}</h2>
      <form onSubmit={onSubmit}>
        <label>
          {dictionary.auth.login.email}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          {dictionary.auth.login.password}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? dictionary.auth.login.loading : dictionary.auth.login.submit}
        </button>
      </form>
      <p>
        {dictionary.auth.links.toRegister}{' '}
        <Link to="/register">{dictionary.auth.links.register}</Link>
      </p>
    </div>
  );
}
