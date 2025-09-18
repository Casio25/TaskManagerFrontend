import { type FormEvent, useState } from 'react';
import { useAuth } from '../lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const { dictionary } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      nav('/dashboard');
    } catch (e: any) {
      setError(e.message || dictionary.auth.messages.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>{dictionary.auth.register.title}</h2>
      <form onSubmit={onSubmit}>
        <label>
          {dictionary.auth.register.name}
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label>
          {dictionary.auth.register.email}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          {dictionary.auth.register.password}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? dictionary.auth.register.loading : dictionary.auth.register.submit}
        </button>
      </form>
      <p>
        {dictionary.auth.links.toLogin}{' '}
        <Link to="/login">{dictionary.auth.links.login}</Link>
      </p>
    </div>
  );
}
