import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';

export default function AcceptInvitePage() {
  const [search] = useSearchParams();
  const initialToken = search.get('token') || '';
  const { dictionary } = useI18n();
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialToken) {
      onAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const onAccept = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.acceptProjectInvite(token);
      setSuccess(dictionary.invites.success);
    } catch (e: any) {
      setError(e.message || dictionary.invites.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 680 }}>
      <h2>{dictionary.invites.title}</h2>
      <p className="muted">{dictionary.invites.description}</p>
      <div className="auth-card">
        <label>
          {dictionary.invites.token}
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder={dictionary.invites.placeholder}
          />
        </label>
        <button onClick={onAccept} disabled={loading || !token}>
          {loading ? dictionary.invites.accepting : dictionary.invites.submit}
        </button>
        {success && <p style={{ color: '#34d399' }}>{success}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
